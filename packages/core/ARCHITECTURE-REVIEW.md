# hook-fetch Core 架构审查记录

> 审查日期: 2026-02-07
> 审查范围: `packages/core/src/` 全部源码
> 当前分支: v3_preview

---

## 一、Bug（需立即修复）

### BUG-1: `hookFetch.create` 中 `bind(this)` 指向错误

**文件**: `src/base.ts:186`

```typescript
const instance = context.request.bind(this);
```

此处位于模块顶层箭头函数内，ESM 中 `this` 是 `undefined`。应为 `context.request.bind(context)`。

### BUG-2: `hookFetch.create` 中 `Object.assign` 无法复制 private fields

**文件**: `src/base.ts:187`

```typescript
Object.assign(instance, HookFetch.prototype, context);
```

`HookFetch` 全部使用 `#private` fields（`#timeout`, `#baseURL`, `#commonHeaders`, `#queue`, `#plugins`, `#withCredentials`, `#qsConfig`），这些都是**设计上不暴露的内部状态**。但 `Object.assign` 无法复制 private fields，导致复制到 `instance` 上的方法（`get`, `post` 等）在调用时找不到对应的 private fields，运行时报错。

**需要重新设计 `create` 的实现策略**，使其兼容 private fields 的封装。例如用 Proxy 或者直接在 `request` 函数上手动挂载 bound 方法。

### BUG-3: `Object.assign(this.#qsConfig, qsConfig)` 会 mutate 全局配置

**文件**: `src/base.ts:67`

```typescript
qsConfig: Object.assign(this.#qsConfig, qsConfig),
```

`Object.assign` 的第一个参数是 target，会直接修改 `this.#qsConfig`。多次请求传不同的 `qsConfig` 会污染全局实例配置。

**修复**: 改为 `Object.assign({}, this.#qsConfig, qsConfig)`。

### BUG-4: `body.ts` 中 `hasOwnProperty` 调用方式错误

**文件**: `src/utils/body.ts:31`

```typescript
if (_data['prototype'].hasOwnProperty.call(key)) {
```

这里试图检查 `_data` 是否拥有属性 `key`，但写法完全错误：
1. `_data['prototype']` 访问的是对象的 `prototype` 属性（普通对象上通常是 `undefined`）
2. 正确写法应为 `Object.prototype.hasOwnProperty.call(_data, key)`

而且此处在 `Object.keys(_data).forEach` 循环里再做 `hasOwnProperty` 检查本身是多余的 — `Object.keys` 已经只返回 own enumerable 属性了。

### BUG-5: `config.ts` 中 `mergeHeaders` 会 mutate 传入的 base headers

**文件**: `src/utils/config.ts:22`

```typescript
const _result = _baseHeaders instanceof Headers ? _baseHeaders : new Headers(_baseHeaders);
```

当 `_baseHeaders` 已经是 `Headers` 实例时，直接在其上 `.set()` 会修改原对象。应始终创建新的 `Headers` 实例。

---

## 二、设计问题（应优化）

### DESIGN-1: `#init()` 使用 `new Promise(async executor)` anti-pattern

**文件**: `src/utils/baseClass.ts:145`

```typescript
return new Promise<Response>(async (resolve, reject) => {
```

async executor 中未被 catch 的异常会变成 unhandled rejection，而不是 reject 该 promise。当前代码有 try/catch 保护，但 finally 块中 `resolve`/`reject` 可能已经被调用过（如 beforeRequest 插件 resolve），控制流脆弱。

**建议**: 改为 async 函数 + deferred pattern，或分离 init 逻辑。

### DESIGN-2: `finally()` 方法不返回 Promise，违反 PromiseLike 协议

**文件**: `src/utils/baseClass.ts:648-651`

```typescript
finally(onfinally?: (() => void) | null | undefined) {
  this.#finallyCallbacks.add(onfinally);
}
```

标准 `Promise.prototype.finally()` 返回一个新 Promise。当前实现无返回值，用户调用 `await request.finally(() => {})` 得到 `undefined`，链式调用 `.finally().then()` 会报错。

### DESIGN-3: timeout promise 永远不 settle

**文件**: `src/utils/baseClass.ts:194-199`

```typescript
const timeoutPromise = new Promise<void>((_) => {
  timeoutId = setTimeout(() => {
    this.#isTimeout = true;
    this.#attemptController?.abort();
  }, timeout);
});
```

这个 promise 永远不 resolve 也不 reject，靠 abort signal 间接让 fetch reject。`Promise.race` 的语义不清晰，且 timeout promise 会成为内存中的 pending promise 直到 GC。

### DESIGN-4: `#response` getter 每次调用 `r.clone()`，无缓存

**文件**: `src/utils/baseClass.ts:659-664`

```typescript
get #response() {
  if (!this.#promise) {
    return Promise.reject(new Error('Response is null'));
  }
  return this.#promise.then(r => r.clone());
}
```

每次访问都 clone 一次。`#createNormalizeError` 和 response 方法（`.json()`, `.text()` 等）都会访问该 getter，导致多次不必要的 clone。

**建议**: 缓存 cloned response，或者在首次消费时决定 response type。

### DESIGN-5: `#execFinally` 中的重新解析判断逻辑有误

**文件**: `src/utils/baseClass.ts:599`

```typescript
if (this.#plugins.finallyPlugins.length !== this.#sourcePlugins?.length) {
  this.#plugins = parsePlugins(this.#sourcePlugins);
}
```

比较 `finallyPlugins.length`（只有 onFinally hook 的插件数）和 `sourcePlugins.length`（总插件数），几乎总是 true，导致每次请求完成都重新 parse。

**建议**: 用 dirty flag 标记是否调用过 `__injectPlugins__`。

### DESIGN-6: `#finallyCallbacks` 允许 null/undefined 但调用时用 `!` 断言

**文件**: `src/utils/baseClass.ts:589`

```typescript
for (const callback of this.#finallyCallbacks) {
  callback!();
}
```

类型 `Set<(() => void) | null | undefined>` 允许 null/undefined 加入，但调用时非空断言。应在 `add` 时过滤或调用时 `callback?.()`。

### DESIGN-7: `__injectPlugins__` 暴露为 public 的内部 API

**文件**: `src/utils/baseClass.ts:719-722`

双下划线命名暗示内部使用，但实际是 public method。注入的插件因 DESIGN-5 的问题在 finally 后被清理，行为不可预测。应明确其生命周期和使用场景，或改为真正的 private API。

### DESIGN-8: `others.ts` 中 `isGenerator`/`isAsyncGenerator` 未做空值检查

**文件**: `src/utils/others.ts:3-8`

```typescript
export function isGenerator(v: any) {
  return v[Symbol.toStringTag] === 'Generator' && ...
}
```

当 `v` 为 `null` 或 `undefined` 时会抛出 `TypeError`。应先检查 `v != null`。

---

## 三、待完善（Incomplete Implementation）

### TODO-1: `HookFetchPluginHandlers` 类未完成

**文件**: `src/utils/plugin.ts:4-21`

构造函数只注册了 `beforeRequest` 和 `afterResponse`，缺少 `onError`、`onFinally`、`beforeStream`、`transformStreamChunk` 四个 hook 的注册。整个类尚未被使用，需要完善实现并替换当前的 `parsePlugins` 函数。

### TODO-2: `HookFetchPluginManager` 类未完成

**文件**: `src/utils/plugin.ts:83-102`

构造函数中 `chain` 的结果赋值给了局部变量 `plugs` 后即丢弃，`#dedupePlugins` 的去重逻辑是"同名保留第一个"而非当前 `parsePlugins` 的"同名保留最后一个"，语义不一致。`upperBound` 工具函数已实现但未被使用。

需要完善此类并明确其与 `parsePlugins` 的关系：是替换还是封装。

---

## 四、代码质量

### QUALITY-1: `dedupe.ts` 中 `onError` handler 参数命名不准确

**文件**: `src/plugins/dedupe.ts:135`

```typescript
onError: (context) => {
  if (context.config) {
```

`OnErrorHandler` 的签名是 `(error, config, context?)`，第一个参数是 `error` 不是 `context`。之所以能工作是因为 `ResponseError` 恰好也有 `config` 属性。参数命名应改为 `error`。

### QUALITY-2: 类型系统中 `any` 使用较多

`HookFetch` 类的 `#plugins` 类型为 `Array<HookFetchPlugin<any, any, any, any>>`，多处泛型参数使用 `any` 降低了类型安全性。`R/K` 泛型机制（通过 `GenericWithNull` 做 response type mapping）理解成本较高，实际使用场景有限。

---

## 五、问题优先级

| 优先级 | 编号 | 说明 |
|--------|------|------|
| P0 | BUG-1, BUG-2 | `hookFetch.create()` 完全不可用 |
| P0 | BUG-3 | qsConfig 全局状态污染 |
| P1 | BUG-4, BUG-5 | 工具函数逻辑错误 / 副作用 |
| P1 | DESIGN-2 | finally() 违反协议，影响用户链式调用 |
| P1 | TODO-1, TODO-2 | Plugin 管理系统需要完善 |
| P2 | DESIGN-1, DESIGN-3 | Promise 使用 anti-pattern |
| P2 | DESIGN-4, DESIGN-5 | 性能和逻辑正确性 |
| P3 | DESIGN-6, DESIGN-7, DESIGN-8 | 防御性编程和 API 设计 |
| P3 | QUALITY-1, QUALITY-2 | 代码可读性和类型安全 |
