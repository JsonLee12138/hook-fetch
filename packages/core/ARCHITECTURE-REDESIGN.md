# hook-fetch v3 架构重设计方案 (v3)

> 设计原则: "库只提供容器" — 核心只管生命周期管道，一切策略交给插件
> 破坏性更新，不考虑向后兼容

---

## 一、PipelineDecision — 只有 resolve 和 reject

```typescript
export const DECISION = Symbol.for('hookfetch.decision');

export interface ResolveDecision<T = unknown> {
  [DECISION]: 'resolve';
  value: T;
}

export interface RejectDecision<E = unknown> {
  [DECISION]: 'reject';
  error: Error | ResponseError<E>;
}

export type PipelineDecision<T = unknown, E = unknown> =
  | ResolveDecision<T>
  | RejectDecision<E>;

// 工厂
export const createResolve = <T>(value: T): ResolveDecision<T> => ({ [DECISION]: 'resolve', value });
export const createReject = <E>(error: Error | ResponseError<E>): RejectDecision<E> => ({ [DECISION]: 'reject', error });

// 守卫
export function isPipelineDecision(v: unknown): v is PipelineDecision {
  return v != null && typeof v === 'object' && DECISION in (v as object);
}
export function isResolve<T>(v: PipelineDecision<T>): v is ResolveDecision<T> {
  return v[DECISION] === 'resolve';
}
export function isReject<E>(v: PipelineDecision<unknown, E>): v is RejectDecision<E> {
  return v[DECISION] === 'reject';
}
```

没有 `RetryDecision`。Retry 是 retryPlugin 的内部行为，核心不知道"重试"这个概念的存在。

---

## 二、`extra` — 就是全部的状态管理

不需要单独的 `RequestState`。`extra` 同时承载**插件配置**和**用户业务状态**，通过泛型 `E` 实现类型安全：

```typescript
interface MyExtra {
  dedupe?: boolean;        // 插件配置
  userId?: string;         // 业务状态
  __retryAttempt?: number; // retry 插件内部状态
}

const api = hookFetch.create<MyExtra>({ ... });

api.get('/users', params, {
  extra: { dedupe: false, userId: '123' },  // 完整类型检查
});
```

核心不读取 `extra` 中任何字段。`extra` 对核心是透明的黑盒。

---

## 三、统一插件签名 + Context 类型

### 3.1 所有 hook 共享同一个 context 基础模式

```typescript
/** 基础 context — 所有 hook 都有 */
interface BaseCtx<E = unknown> {
  config: RequestConfig<unknown, BodyType, E>;
}

/** 可决策 context — 能返回 PipelineDecision 的 hook 额外拥有 */
interface DecisionCtx<E = unknown> extends BaseCtx<E> {
  resolve: <T>(value: T) => ResolveDecision<T>;
  reject: (error?: Error | ResponseError<E>) => RejectDecision<E>;
}
```

### 3.2 各 hook 的 context

```typescript
// beforeRequest: 可以 resolve（缓存命中）或 reject（校验失败）
interface BeforeRequestCtx<E = unknown> extends DecisionCtx<E> {}

// afterResponse: 可以 resolve（替换结果）或 reject（业务状态码异常）
interface AfterResponseCtx<T = unknown, E = unknown> extends DecisionCtx<E> {
  response: Response;
  responseType: FetchResponseType;
  result: T;
}

// onError: 可以 resolve（降级返回）或 reject（自定义错误）
interface OnErrorCtx<E = unknown> extends DecisionCtx<E> {
  error: ResponseError<E>;
}

// onFinally: 清理，不做决策
interface OnFinallyCtx<E = unknown> extends BaseCtx<E> {}

// beforeStream: 变换流，不做决策
interface BeforeStreamCtx<E = unknown> extends BaseCtx<E> {
  body: ReadableStream;
  response: Response;
}

// transformStreamChunk: 变换 chunk，不做决策
interface TransformChunkCtx<E = unknown> extends BaseCtx<E> {
  chunk: StreamContext;
}

// afterStream: 流结束回调，不做决策
interface AfterStreamCtx<E = unknown> extends BaseCtx<E> {}
```

### 3.3 Plugin 接口

```typescript
interface HookFetchPlugin<T = unknown, E = unknown> {
  name: string;
  priority?: number;

  beforeRequest?:        (ctx: BeforeRequestCtx<E>)    => RequestConfig | PipelineDecision | Promise<RequestConfig | PipelineDecision>;
  afterResponse?:        (ctx: AfterResponseCtx<T, E>) => AfterResponseCtx<T, E> | PipelineDecision | Promise<AfterResponseCtx<T, E> | PipelineDecision>;
  onError?:              (ctx: OnErrorCtx<E>)          => PipelineDecision | void | Promise<PipelineDecision | void>;
  onFinally?:            (ctx: OnFinallyCtx<E>)        => void | Promise<void>;
  beforeStream?:         (ctx: BeforeStreamCtx<E>)     => ReadableStream | Promise<ReadableStream>;
  transformStreamChunk?: (ctx: TransformChunkCtx<E>)   => StreamContext | Promise<StreamContext>;
  afterStream?:          (ctx: AfterStreamCtx<E>)      => void | Promise<void>;
}
```

**与旧设计对比：**
- `beforeRequest(config)` → `beforeRequest({ config, resolve, reject })`
- `afterResponse(context, config)` → `afterResponse({ config, response, result, resolve, reject, ... })`
- `onError(error, config, context?)` → `onError({ error, config, resolve, reject })`
- `onFinally({ config })` → `onFinally({ config })` （不变）
- 新增 `afterStream({ config })`

---

## 四、生命周期

```
 Normal:
   beforeRequest → fetch → afterResponse → result → onFinally
       │                       │
       ↓ resolve/reject        ↓ resolve/reject
     短路返回 → onFinally     短路返回 → onFinally

 Stream:
   beforeRequest → fetch → beforeStream → [transformStreamChunk × N] → afterStream → onFinally
       │
       ↓ resolve/reject
     短路返回 → onFinally

 Error (both):
   → onError → resolve / reject / void(不处理,抛出原始错误) → onFinally
```

**关键：所有路径最终都经过 `onFinally`。**

---

## 五、Retry — 完全在插件中

核心不知道 retry 的存在。没有 `RetryDecision`，没有 `#attempt`，没有 `#restartRequest`。

### 5.1 retryPlugin 设计思路

retry 插件通过 `extra` 传递 attempt 状态，通过 `onError` 内部重新发起请求，最终 `resolve` 或让错误继续传播：

```typescript
import { get, post, request } from 'hook-fetch';

interface RetryPluginOptions {
  maxAttempts?: number;
  delay?: number | ((attempt: number) => number);
  shouldRetry?: (error: ResponseError) => boolean;
}

export function retryPlugin(options: RetryPluginOptions = {}): HookFetchPlugin {
  const {
    maxAttempts = 3,
    delay = 1000,
    shouldRetry = (e) => e.status !== undefined && e.status >= 500,
  } = options;

  const getDelay = typeof delay === 'function' ? delay : () => delay;

  return {
    name: 'retry',

    async onError({ error, config, resolve }) {
      const attempt = (config.extra?.__retryAttempt ?? 0) + 1;
      if (attempt > maxAttempts) return;          // 超限，不处理
      if (!shouldRetry(error)) return;            // 不该重试，不处理

      const ms = getDelay(attempt);
      if (ms > 0) await new Promise(r => setTimeout(r, ms));

      // 通过 hook-fetch 自身重新发起请求（经过完整插件管道）
      const retryResult = await request(config.url, {
        ...config,
        extra: { ...config.extra, __retryAttempt: attempt },
      });

      return resolve(retryResult);
    },
  };
}
```

### 5.2 设计要点

| 问题 | 回答 |
|------|------|
| attempt 谁管理？ | retryPlugin 自己，通过 `extra.__retryAttempt` |
| delay 谁计算？ | retryPlugin 自己 |
| maxAttempts 谁判断？ | retryPlugin 自己 |
| 重试请求走不走插件管道？ | 走。通过 `request()` 发起的请求会经过完整的 beforeRequest → fetch → afterResponse 流程 |
| 无限递归怎么防？ | `extra.__retryAttempt` 每次 +1，超过 maxAttempts 后 `return`（不处理），错误正常抛出 |
| 核心做了什么？ | 什么都没做。核心只知道 onError 返回了 resolve，就用这个值 |

---

## 六、类拆分

### 6.1 模块划分

```
src/utils/
├── decision.ts         PipelineDecision 类型 + 工厂 + 守卫        ~30 行
├── plugin.ts           PluginManager 注册 / 去重 / 排序 / 分类    ~40 行
├── executor.ts         RequestExecutor fetch + timeout + signal   ~80 行
├── pipeline.ts         管道执行纯函数                              ~70 行
├── request.ts          HookFetchRequest 用户 API 层               ~150 行
├── body.ts             (现有)
├── config.ts           (现有)
└── others.ts           (现有)
```

### 6.2 `pipeline.ts` — 管道执行

```typescript
export async function runBeforeRequest(
  handlers: BeforeRequestHandler[],
  config: RequestConfig,
): Promise<RequestConfig | PipelineDecision> {
  let current = config;
  for (const handler of handlers) {
    const result = await handler({
      config: current,
      resolve: createResolve,
      reject: createReject,
    });
    if (isPipelineDecision(result)) return result;
    current = result;
  }
  return current;
}

export async function runAfterResponse<T, E>(
  handlers: AfterResponseHandler[],
  context: AfterResponseCtx<T, E>,
): Promise<AfterResponseCtx<T, E> | PipelineDecision> {
  let current = context;
  for (const handler of handlers) {
    const result = await handler(current);
    if (isPipelineDecision(result)) return result;
    current = result;
  }
  return current;
}

export async function runOnError<E>(
  handlers: OnErrorHandler[],
  error: ResponseError<E>,
  config: RequestConfig,
): Promise<PipelineDecision | null> {
  for (const handler of handlers) {
    try {
      const result = await handler({
        error,
        config,
        resolve: createResolve,
        reject: (err?) => createReject(err ?? error),
      });
      if (isPipelineDecision(result)) return result;
    } catch {
      // 插件自身抛错，继续下一个插件
    }
  }
  return null;
}

export async function runOnFinally(
  handlers: OnFinallyHandler[],
  config: RequestConfig,
): Promise<void> {
  for (const handler of handlers) {
    try { await handler({ config }); } catch {}
  }
}

export async function runBeforeStream(
  handlers: BeforeStreamHandler[],
  body: ReadableStream,
  config: RequestConfig,
  response: Response,
): Promise<ReadableStream> {
  let current = body;
  for (const handler of handlers) {
    current = await handler({ body: current, config, response });
  }
  return current;
}

export async function runTransformChunk(
  handlers: TransformStreamChunkHandler[],
  chunk: StreamContext,
  config: RequestConfig,
): Promise<StreamContext> {
  let current = chunk;
  for (const handler of handlers) {
    current = await handler({ chunk: current, config });
  }
  return current;
}

export async function runAfterStream(
  handlers: AfterStreamHandler[],
  config: RequestConfig,
): Promise<void> {
  for (const handler of handlers) {
    try { await handler({ config }); } catch {}
  }
}
```

### 6.3 `HookFetchRequest` — 核心编排

```typescript
export class HookFetchRequest<T = unknown, E = unknown> implements PromiseLike<T> {
  #plugins: PluginManager;
  #executor: RequestExecutor;
  #controller: AbortController;
  #config: RequestConfig;
  #promise: Promise<Response> | null = null;
  #result: Promise<any> | null = null;
  #finallyCallbacks: Set<() => void> = new Set();

  constructor(options: BaseRequestOptions) {
    this.#plugins = new PluginManager(options.plugins ?? []);
    this.#executor = new RequestExecutor();
    this.#controller = options.controller ?? new AbortController();
    this.#config = createRequestConfig(options);
    this.#promise = this.#execute();
  }

  // ─── 请求执行 ───

  async #execute(): Promise<Response> {
    const result = await runBeforeRequest(this.#plugins.beforeRequest, this.#config);

    if (isPipelineDecision(result)) {
      if (isReject(result)) throw result.error;
      const value = (result as ResolveDecision).value;
      return value instanceof Response ? value : new Response(JSON.stringify(value));
    }

    this.#config = result;
    return this.#executor.execute({
      config: this.#config,
      signal: this.#controller.signal,
      timeout: this.#config.timeout,
    });
  }

  // ─── Response 消费 ───

  json()        { return this.#consume('json',        r => r.json()); }
  text()        { return this.#consume('text',        r => r.text()); }
  blob()        { return this.#consume('blob',        r => r.blob()); }
  arrayBuffer() { return this.#consume('arrayBuffer', r => r.arrayBuffer()); }
  formData()    { return this.#consume('formData',    r => r.formData()); }
  bytes()       { return this.#consume('bytes',       r => r.bytes()); }

  #consume<R>(type: FetchResponseType, extract: (r: Response) => Promise<R>) {
    this.#result = this.#promise!
      .then(async (response) => {
        const raw = await extract(response.clone());
        const ctx = await runAfterResponse(this.#plugins.afterResponse, {
          config: this.#config, response, responseType: type, result: raw,
          resolve: createResolve, reject: createReject,
        });
        if (isPipelineDecision(ctx)) {
          if (isReject(ctx)) throw ctx.error;
          return (ctx as ResolveDecision).value;
        }
        return ctx.result;
      })
      .catch((error) => this.#handleError(error))
      .finally(() => this.#runFinally());
    return this.#result;
  }

  // ─── 错误处理（极简） ───

  async #handleError(error: unknown) {
    const normalized = error instanceof ResponseError
      ? error
      : RequestExecutor.normalizeError(error, this.#config);
    const decision = await runOnError(this.#plugins.onError, normalized, this.#config);

    if (!decision) throw normalized;            // 没有插件处理，抛原始错误
    if (isResolve(decision)) return decision.value;
    if (isReject(decision)) throw decision.error;
    throw normalized;
  }

  // ─── Stream ───

  async* stream<U = T>() {
    const response = await this.#promise!;
    let body = response.body!;

    body = await runBeforeStream(this.#plugins.beforeStream, body, this.#config, response);

    const reader = body.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = await runTransformChunk(
          this.#plugins.transformStreamChunk,
          { source: value, result: value, error: null },
          this.#config,
        );
        yield chunk as StreamContext<U>;
      }
    } catch (error) {
      const normalized = error instanceof ResponseError
        ? error
        : RequestExecutor.normalizeError(error, this.#config);
      const decision = await runOnError(this.#plugins.onError, normalized, this.#config);

      if (!decision) throw normalized;
      if (isResolve(decision)) return;
      if (isReject(decision)) throw decision.error;
      throw normalized;
    } finally {
      reader.releaseLock();
      await runAfterStream(this.#plugins.afterStream, this.#config);
      this.#runFinally();
    }
  }

  // ─── 控制 ───

  abort() { this.#controller.abort(); }

  get response() { return this.#promise!.then(r => r.clone()); }

  // ─── PromiseLike ───

  get #getResult() {
    if (!this.#result) this.json();
    return this.#result!;
  }

  then<T1 = T, T2 = never>(
    onfulfilled?: ((v: T) => T1 | PromiseLike<T1>) | null,
    onrejected?: ((r: unknown) => T2 | PromiseLike<T2>) | null,
  ): Promise<T1 | T2> {
    return this.#getResult.then(onfulfilled, onrejected);
  }

  catch<T1 = never>(
    onrejected?: ((r: unknown) => T1 | PromiseLike<T1>) | null,
  ): Promise<T | T1> {
    return this.#getResult.catch(onrejected);
  }

  finally(onfinally?: (() => void) | null): this {
    if (onfinally) this.#finallyCallbacks.add(onfinally);
    return this;
  }

  // ─── 内部 ───

  #runFinally() {
    for (const cb of this.#finallyCallbacks) { try { cb(); } catch {} }
    this.#finallyCallbacks.clear();
    runOnFinally(this.#plugins.onFinally, this.#config);
  }
}
```

### 6.4 对比

```
当前 baseClass.ts:

  HookFetchRequest
  ├── 请求执行           ~100 行
  ├── Response 方法       ~80 行
  ├── Plugin 执行         ~40 行
  ├── 错误处理            ~80 行
  ├── Retry 逻辑         ~150 行  ← 全部删除
  ├── Abort 管理          ~40 行
  ├── Merge 工具          ~50 行  ← 全部删除
  ├── PromiseLike         ~30 行
  └── 其他                ~25 行
  合计                   ~595 行

改后:

  decision.ts             ~30 行
  plugin.ts               ~40 行
  executor.ts             ~80 行
  pipeline.ts             ~70 行
  request.ts             ~150 行
  合计                   ~370 行 (减少 38%)
```

核心类从 ~595 行降到 ~150 行。**移除了全部 retry 代码（~150 行）和 merge 工具（~50 行）**，因为这些现在是 retryPlugin 的职责。

---

## 七、完整使用示例

### 7.1 基础使用

```typescript
import hookFetch from 'hook-fetch';

// 创建实例
const api = hookFetch.create({
  baseURL: 'https://api.example.com',
  timeout: 5000,
  plugins: [retryPlugin({ maxAttempts: 3 }), dedupePlugin()],
});

// 发起请求
const data = await api.get<User>('/users/1');
const text = await api.get('/html').text();
```

### 7.2 缓存插件

```typescript
const cachePlugin = (ttl = 60000): HookFetchPlugin => {
  const cache = new Map<string, { data: any; ts: number }>();
  return {
    name: 'cache',
    beforeRequest({ config, resolve }) {
      const entry = cache.get(config.url);
      if (entry && Date.now() - entry.ts < ttl) {
        return resolve(entry.data);   // PipelineDecision，短路
      }
      return config;                  // 继续请求
    },
    afterResponse(ctx) {
      cache.set(ctx.config.url, { data: ctx.result, ts: Date.now() });
      return ctx;
    },
  };
};
```

### 7.3 Auth 刷新插件

```typescript
const authPlugin = (refreshFn: () => Promise<string>): HookFetchPlugin => ({
  name: 'auth',
  async onError({ error, config, resolve }) {
    if (error.status !== 401) return;
    if (config.extra?.__authRetried) return;   // 已经重试过，放弃

    const newToken = await refreshFn();
    const result = await request(config.url, {
      ...config,
      headers: { ...config.headers, Authorization: `Bearer ${newToken}` },
      extra: { ...config.extra, __authRetried: true },
    });
    return resolve(result);
  },
});
```

### 7.4 请求校验插件

```typescript
const validatorPlugin: HookFetchPlugin = {
  name: 'validator',
  beforeRequest({ config, reject }) {
    if (!config.url) {
      return reject(new Error('URL is required'));   // PipelineDecision，拦截
    }
    return config;
  },
};
```

### 7.5 日志插件

```typescript
const loggingPlugin: HookFetchPlugin = {
  name: 'logging',
  beforeRequest({ config }) {
    console.log('→', config.method, config.url);
    return config;
  },
  afterResponse(ctx) {
    console.log('←', ctx.responseType, ctx.config.url);
    return ctx;
  },
  afterStream({ config }) {
    console.log('← stream end', config.url);
  },
  onFinally({ config }) {
    console.log('✓ done', config.url);
  },
};
```

---

## 八、迁移步骤

| 步骤 | 改动 |
|------|------|
| 1 | 创建 `decision.ts` |
| 2 | 重写 `plugin.ts`（PluginManager + afterStream） |
| 3 | 创建 `executor.ts`（从 baseClass.ts 提取 fetch 逻辑） |
| 4 | 创建 `pipeline.ts`（管道执行纯函数） |
| 5 | 重写 `request.ts`（原 baseClass.ts，~150 行） |
| 6 | 更新 `types.ts`（统一签名，移除 `RequestConfig.resolve`，删除所有 Retry 类型） |
| 7 | 重写 `retryPlugin`（retry 策略完全在插件内，通过 extra 传递 attempt） |
| 8 | 更新 `dedupePlugin`、`ssePlugin` 适配新签名 |
| 9 | 重写 `base.ts`（HookFetch 工厂，修复 create + qsConfig） |
| 10 | 更新测试 |
