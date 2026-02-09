# hook-fetch Core 设计层面审查

> 本文档关注**架构设计**层面的问题，不涉及代码 bug（已记录在 `ARCHITECTURE-REVIEW.md`）。
> 每个问题附带改进建议和对比分析。

---

## ARCH-1: `extra` 作为无类型插件配置容器 — Service Locator 反模式

### 现状

插件通过 `extra` 字段传递配置，`extra` 类型是 `AnyObject`（即 `Record<string, any>`）：

```typescript
// dedupe 插件读取
config.extra?.dedupeAble   // boolean

// sse 插件读取
config.extra?.sseAble      // boolean

// retry 配置读取（baseClass.ts #getRetryExtra）
config.extra?.retry        // RequestRetryOptions
```

### 问题

1. **无类型安全**: 用户传 `extra: { dedupeabel: false }`（拼写错误），TypeScript 不报错，插件静默使用默认值
2. **隐式契约**: 哪些 key 被哪些插件使用，完全靠文档和约定，代码层面无法发现
3. **命名冲突**: 两个插件都想用 `extra.enabled` 就冲突了
4. **Service Locator**: 插件从全局容器里按 string key 查配置，违反显式依赖原则

### 建议方案

插件配置应该在**插件创建时**通过闭包捕获（这已经是 `retryPlugin()` 和 `dedupePlugin()` 的做法），per-request 覆盖通过插件自己声明的 key 来读取：

```typescript
// 方案: 插件声明自己的 extra key（类型安全）
interface DedupePluginExtra {
  dedupeAble?: boolean;
}

export function dedupePlugin(defaults: DedupePluginOptions = {}): HookFetchPlugin<unknown, DedupePluginExtra> {
  return {
    name: 'dedupe',
    beforeRequest(config) {
      // 插件泛型 E = DedupePluginExtra，config.extra 自动有类型
      const enabled = config.extra?.dedupeAble ?? true;
      // ...
    }
  };
}
```

然后用户侧：

```typescript
const api = hookFetch.create({
  plugins: [dedupePlugin()]
});

// E 泛型自动推导，extra 有类型提示
api.get<UserData, Params>('/users', params, {
  extra: { dedupeAble: false }  // ✅ 有类型检查
});
```

**关键**: `extra.retry` 应该被移除，retry 配置应该全部通过 `retryPlugin({ ... })` 的闭包参数传入，或者通过 `OnErrorContext` 传入。`#getRetryExtra()` 这个从 extra 中"偷读" retry config 的设计是多余的。

---

## ARCH-2: `beforeRequest` 通过 config mutation 实现 early resolve

### 现状

```typescript
// types.ts — RequestConfig 上有一个 resolve 字段
interface RequestConfig {
  resolve?: (() => any) | null;
}

// baseClass.ts #init — 检查 config.resolve
config = await plugin(config);
if (config.resolve) {
  const res = config.resolve();
  resolve(res instanceof Response ? res : new Response(res));
  return;
}
```

`beforeRequest` 插件要短路请求，需要在 config 对象上挂一个 `resolve` 函数。

### 问题

1. **关注点混淆**: `RequestConfig` 是数据描述（url、method、headers 等），`resolve` 是控制流行为，两者不应混在一个对象上
2. **Mutation-based control flow**: 通过 mutate 传入的参数来改变控制流，副作用隐藏在数据结构中
3. **类型不明确**: `resolve?: (() => any) | null` — 返回值是 `any`，类型完全丢失
4. **与 onError 的 resolve 语义重复**: onError 的 `context.resolve(value)` 是显式决策，而 beforeRequest 的 resolve 是隐式 mutation，API 风格不一致

### 建议方案

`beforeRequest` 返回值改为判别联合类型（Discriminated Union）：

```typescript
type BeforeRequestResult<P, D extends BodyType, E> =
  | RequestConfig<P, D, E>                      // 继续请求
  | { resolved: true; value: Response | any };   // 短路

// 使用方式
const cachePlugin: HookFetchPlugin = {
  name: 'cache',
  beforeRequest(config) {
    const cached = cache.get(config.url);
    if (cached) return { resolved: true, value: cached };
    return config;
  }
};
```

这样控制流是**显式的返回值**而不是**隐式的 mutation**，与 `onError` 的 `context.resolve()` 风格一致。

---

## ARCH-3: Retry 配置分散在三层，职责边界模糊

### 现状

```
层1: extra.retry               — 通过 config.extra 传入的静态配置
层2: OnErrorContext.retry()     — 错误处理中的决策 API
层3: retryPlugin()              — 内置插件，在 onError hook 中调用 context.retry()
```

数据流：

```
用户设置 extra.retry
    ↓
baseClass #getRetryExtra() 读取 extra.retry
    ↓
#createOnErrorContext() 用 extra.retry 初始化 maxAttempts
    ↓
errorPlugin 调用 context.retry(options)
    ↓
context.retry() 内部将 extra.retry 和传入的 options merge
    ↓
返回 RetryHandlerDecision
    ↓
#processRetryDecision() 执行 retry
```

### 问题

1. **理解成本高**: 用户要理解三层才能正确使用 retry
2. **配置优先级不明确**: `extra.retry.maxAttempts` 和 `retryPlugin({ maxAttempts })` 和 `context.retry({ maxAttempts })` 三者谁优先？答案藏在 `#mergeRetryOptions` 的实现细节中
3. **职责重叠**: `extra.retry` 是声明式配置，`retryPlugin()` 是命令式插件，两者解决同一个问题但方式不同
4. **核心类耦合 retry 逻辑**: `HookFetchRequest` 内部有 `#getRetryExtra`、`#resolveMaxAttempts`、`#mergeRetryOptions`、`#processRetryDecision`、`#restartRequest` 等大量 retry 相关代码。Retry 是**策略**，不应该硬编码在核心请求类中

### 建议方案

**将 retry 逻辑完全移出 `HookFetchRequest`，核心类只提供"重新发起请求"的原语**：

```
核心类职责:
  - 发起请求
  - 运行 plugin pipeline
  - 在 onError 中提供 context.retry() / resolve() / reject()
  - context.retry() 的实现 = delay + 新建请求

Retry 策略职责（全部在 retryPlugin 内）:
  - 判断是否该 retry（status code / 自定义条件）
  - 计算 delay（backoff 策略）
  - 决定 maxAttempts
  - 调用 context.retry()
```

核心类不需要知道 `extra.retry`，不需要 `#getRetryExtra()`，不需要 `#resolveMaxAttempts()`。这些全是 `retryPlugin` 的内部逻辑。

`OnErrorContext.retry()` 的 API 也可以简化：

```typescript
interface OnErrorContext {
  attempt: number;
  retry: (options?: { delay?: number; overrides?: RetryOverrideOptions }) => RetryDecision;
  resolve: (value) => ResolveDecision;
  reject: (error?) => RejectDecision;
}
```

`maxAttempts` 不再由核心类管理，而是由 retryPlugin 自己判断。核心类的 `context.retry()` 只做"执行一次重试"这个原子操作。

---

## ARCH-4: `onError` 返回值类型过于灵活 — 隐式 duck typing

### 现状

```typescript
type OnErrorHandlerResult<T, E, P, D> =
  | void                          // 继续传递给下一个插件
  | T                             // 解释为 resolve
  | PromiseLike<T>                // 解释为 resolve
  | ResponseError<E>              // 解释为替换错误，继续传递
  | Error                         // normalize 后替换错误，继续传递
  | RetryHandlerDecision          // retry
  | ResolveHandlerDecision        // resolve
  | RejectHandlerDecision         // reject
  | PromiseLike<上面所有类型>;
```

`#interpretOnErrorResult` 用 duck typing 判断返回值类型：

```typescript
if (this.#isDecision(result, RETRY_DECISION_VALUE)) { ... }
if (this.#isDecision(result, RESOLVE_DECISION_VALUE)) { ... }
if (this.#isDecision(result, REJECT_DECISION_VALUE)) { ... }
if (result instanceof ResponseError) { ... }
if (result instanceof Error) { ... }
// 否则当作 resolve value
return { kind: 'resolve', value: result as T };
```

### 问题

1. **最后的 fallback 很危险**: 返回任何非 Error、非 Decision 的值都被当作"resolve"。如果插件误返回了一个调试对象，请求会静默成功
2. **`T` 和 `ResolveHandlerDecision` 语义重复**: 直接 `return data` 和 `return context.resolve(data)` 效果一样，但两种写法并存增加认知负担
3. **类型不安全**: 判断逻辑依赖运行时 duck typing（检查 `__hookFetchDecision__` 字段），编译时无法验证

### 建议方案

**限制返回值为显式决策，移除隐式 resolve 的魔法**：

```typescript
type OnErrorHandlerResult<T, E, P, D> =
  | void                          // 不处理，传递给下一个插件
  | RetryHandlerDecision          // context.retry() 的返回值
  | ResolveHandlerDecision        // context.resolve() 的返回值
  | RejectHandlerDecision;        // context.reject() 的返回值
```

用户必须显式使用 `context.retry()`、`context.resolve()`、`context.reject()` 返回决策。不允许直接 `return data`（会被误解释为 resolve）或 `return error`（会被误解释为替换错误）。

如果想保持向后兼容，至少**移除 fallback resolve**：对于无法识别的返回值类型，应该 `throw` 或 warn，而不是静默 resolve。

---

## ARCH-5: 插件 handler 签名冗余 — config 被传递两次

### 现状

```typescript
// afterResponse: context 里有 config，第二个参数又传了一遍
afterResponse?: (context: FetchPluginContext<T>, config: RequestConfig) => ...
// context.config === config

// onError: error 里有 config，第二个参数又传了一遍
onError?: (error: ResponseError<E>, config: RequestConfig, context?: OnErrorContext) => ...
// error.config === config

// onFinally: 通过 Pick<FetchPluginContext, 'config'> 传
onFinally?: (res: Pick<FetchPluginContext, 'config'>) => ...
```

### 问题

1. **API 不一致**: `beforeRequest(config)`、`afterResponse(context, config)`、`onError(error, config, context?)`、`onFinally({ config })` — 四种 hook 四种签名风格
2. **参数冗余**: `config` 要么在 `context.config` 里，要么在 `error.config` 里，额外再传一次没有增加信息
3. **增加维护成本**: 保持两个 config 引用同步是额外负担

### 建议方案

统一所有 handler 的签名为**单一 context 对象**：

```typescript
// 统一 context 模式
beforeRequest?:         (context: { config }) => ...
afterResponse?:         (context: { config, response, result, responseType, controller }) => ...
onError?:               (context: { error, config, attempt, retry, resolve, reject }) => ...
onFinally?:             (context: { config }) => ...
beforeStream?:          (context: { body, config }) => ...
transformStreamChunk?:  (context: { chunk, config }) => ...
```

好处：
- 每个 hook 签名统一为 `(context) => result`
- 插件只解构自己需要的字段
- 未来扩展 context 不需要改签名（加字段即可）
- 与 `OnErrorContext` 的 retry/resolve/reject 自然合并到同一个对象中

---

## ARCH-6: Stream 和 Normal Response 的生命周期割裂

### 现状

Normal response 生命周期：
```
beforeRequest → fetch → afterResponse → result
                  ↓ (error)
               onError → retry/resolve/reject
                  ↓ (always)
               onFinally
```

Stream 生命周期：
```
beforeRequest → fetch → beforeStream → transformStreamChunk (per chunk) → yield
                  ↓ (error, 仅在 reader level)
               onError → retry (但无法 retry stream)
                  ↓ (always)
               onFinally
```

### 问题

1. **Stream 不经过 `afterResponse`**: `afterResponse` 插件对 stream 请求完全无效。如果用户在 `afterResponse` 中做日志、监控、token 刷新等通用逻辑，stream 请求会被漏掉
2. **Stream retry 语义不清**: normal response 的 retry 会重新发起请求。stream 如果在读取中途出错触发 retry，已经消费的 chunk 怎么处理？当前代码中 stream error 只走 `#runErrorPipeline` 但 resolve 后直接 return，**实际上 retry 对 stream 是无效的**
3. **没有 stream 级别的 `onFinally`**: stream 的 finally 是在 `stream()` generator 的 finally block 中调用 `#execFinally()`，但这和 normal response 共享同一个 finally 流程。如果插件想区分"这是 stream 结束"还是"这是普通请求结束"，做不到
4. **缺少 `onStreamError` hook**: chunk-level 的错误被 catch 后直接 yield `{ error, result: null }`，插件没有机会参与 chunk-level 的错误处理

### 建议方案

增加 stream 生命周期的完整性：

```
beforeRequest → fetch → beforeStream → [transformStreamChunk × N] → afterStream
                                              ↓ (chunk error)
                                          onStreamError
                  ↓ (reader error)
               onError
                  ↓ (always)
               onFinally (context.isStream = true)
```

具体：
- 增加 `afterStream` hook: stream 完成后触发，对应 `afterResponse` 的位置
- 增加 `onStreamError` hook: chunk-level 错误处理
- `onFinally` context 增加 `isStream` 标识
- 明确文档：stream 场景下 `onError` 中 `context.retry()` 的行为（是重新建立 stream 连接还是不支持）

---

## ARCH-7: `HookFetchRequest` 职责过多 — God Object 倾向

### 现状

`HookFetchRequest` 当前承担的职责：

| 职责 | 相关方法/字段 | 行数 |
|------|-------------|------|
| 请求生命周期管理 | `#init`, constructor | ~100 |
| Response 类型转换 | `json()`, `text()`, `blob()`, `stream()` 等 | ~80 |
| Plugin pipeline 执行 | `#resolve`, `#runWith`, `#then` | ~40 |
| 错误处理 + normalize | `#createNormalizeError`, `#handleError`, `#runErrorPipeline` | ~80 |
| Retry 逻辑 | `#processRetryDecision`, `#restartRequest`, `#mergeFullOptions`, `#mergeRetryOptions` 等 | ~150 |
| Abort 管理 | `#prepareAttemptSignal`, `#cleanupAttemptController`, `abort()` | ~40 |
| PromiseLike 协议 | `then()`, `catch()`, `finally()`, `#getExecutor` | ~30 |
| Merge 工具函数 | `#mergeHeaders`, `#mergeRecord`, `#mergeRetryOverrideOptions` | ~50 |

共 **~570 行**，承担 **8 种职责**。

### 问题

违反 SRP。改任何一个方面（比如 retry 策略、错误处理方式、merge 逻辑）都要改这个类。

### 建议方案

拆分为组合式模块：

```
HookFetchRequest                 // 核心: 生命周期 + PromiseLike（~150 行）
├── RequestExecutor              // 请求发起: #init, timeout, signal 管理
├── PluginPipeline               // 插件执行: beforeRequest → afterResponse → onError → onFinally
├── ErrorHandler                 // 错误 normalize + error pipeline
├── RetryHandler                 // retry 逻辑（或完全移到 retryPlugin）
└── OptionsMerger                // merge 工具函数（可以是纯函数模块）
```

`HookFetchRequest` 只保留：
- 构造函数（组装各模块）
- Response 类型方法（json/text/blob/stream）
- PromiseLike 实现
- abort()

其他逻辑委托给组合的模块。每个模块可独立测试、独立演进。

---

## 总结：核心设计矛盾

当前架构的根本矛盾是：**库试图同时做"最小化核心"和"内置 retry 能力"**。

- 如果目标是"最小化核心"，retry 就不应该硬编码在 `HookFetchRequest` 中，应该完全由插件实现
- 如果目标是"内置 retry"，那 `extra.retry` 的配置路径就不应该存在，应该有一个 first-class 的 retry API

建议选择其一：

| 方案 | 核心类 | Retry | 适合场景 |
|------|--------|-------|----------|
| A: 最小化核心 | 只提供 `context.retry()` 原语 | 完全在 retryPlugin 中 | 库的定位是通用 fetch wrapper |
| B: 内置 retry | 提供 `retry` option 作为 first-class 配置 | 核心类直接支持 | 库的定位是功能完整的 HTTP 客户端 |

当前是 A 和 B 的混合态，导致代码分散、理解成本高。

---

## 优先级建议

| 优先级 | 问题 | 影响 |
|--------|------|------|
| **高** | ARCH-3: Retry 职责分离 | 减少核心类 ~150 行代码，消除 extra.retry |
| **高** | ARCH-7: 拆分 HookFetchRequest | 可维护性和可测试性大幅提升 |
| **中** | ARCH-4: 限制 onError 返回类型 | 消除隐式行为，减少 bug 面 |
| **中** | ARCH-2: beforeRequest resolve 机制 | API 一致性 |
| **中** | ARCH-5: 统一 handler 签名 | DX 和可扩展性 |
| **低** | ARCH-1: extra 类型安全 | 跟随 ARCH-3 解决后影响面减小 |
| **低** | ARCH-6: Stream 生命周期 | 功能完善，非阻塞性问题 |
