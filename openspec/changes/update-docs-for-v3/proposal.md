# Change: 更新文档以匹配 v3 Core 重构

## Why

Core 包已完成 v3 重构，插件 API 从 `(value, config)` 双参数签名变更为 `(ctx)` 单一 context 对象签名，并引入了 PipelineDecision (`resolve`/`reject`) 控制流系统。现有文档中的大量插件示例代码仍然使用旧版 API 签名，会误导用户。

## What Changes

### 1. plugins.md — **最关键的改动** (严重过时)

**插件接口定义过时** (行 22-39):
- 旧: `HookFetchPlugin<T, E, P, D>` 有 4 个泛型参数
- 新: `HookFetchPlugin<T, E>` 只有 2 个泛型参数
- 旧: `beforeRequest?(config: RequestConfig) => RequestConfig`
- 新: `beforeRequest?(ctx: BeforeRequestCtx) => RequestConfig | PipelineDecision`
- 旧: `afterResponse?(context, config) => context` (双参数)
- 新: `afterResponse?(ctx: AfterResponseCtx) => ctx | PipelineDecision` (单参数 context)
- 旧: `onError?(error, config) => error` (双参数，返回 error)
- 新: `onError?(ctx: OnErrorCtx) => PipelineDecision | void` (单参数 context，返回 decision)
- 旧: `onFinally?(res) => void`
- 新: `onFinally?(ctx: OnFinallyCtx) => void`
- 旧: `beforeStream?(body, config) => ReadableStream`
- 新: `beforeStream?(ctx: BeforeStreamCtx) => ReadableStream`
- 旧: `transformStreamChunk?(chunk, config) => StreamContext`
- 新: `transformStreamChunk?(ctx: TransformChunkCtx) => StreamContext`
- 新增: `afterStream?(ctx: AfterStreamCtx) => void`

**所有自定义插件示例过时** (行 244-466):
- authPlugin: `beforeRequest(config)` → `beforeRequest({ config })`
- loggerPlugin: `afterResponse(context, config)` → `afterResponse(ctx)`，`onError(error)` → `onError({ error })`
- retryPlugin: 完全重写，旧的手动重试逻辑应替换为新的 context-based 重试
- cachePlugin: `beforeRequest(config)` → `beforeRequest({ config, resolve })`，使用 `resolve()` 短路
- streamTransformPlugin: `transformStreamChunk(chunk, config)` → `transformStreamChunk({ chunk, config })`
- errorTransformPlugin: `onError(error)` → `onError({ error, config })`

**onError 上下文章节完全过时** (行 505-607):
- 旧: `onError(error, config, context)` 三参数 + `context.attempt`/`context.retry()`/`context.resolve()`/`context.reject()`
- 新: `onError({ error, config, resolve, reject })` — 单参数 context 对象，`resolve`/`reject` 直接在 ctx 上
- 没有内置的 `retry()` 和 `attempt` — 重试由 retryPlugin 通过 `config.extra.__retryAttempt` 处理
- "从 v2.4.0 开始" 这个说法应删除

**缓存插件示例使用错误的 resolve** (行 330-408):
- 旧: 返回 `{ ...requestConfig, resolve: () => new Response(...) }` (将 resolve 作为 config 属性)
- 新: 使用 `return resolve(cachedData)` 从 ctx 参数获取 resolve 函数

**内置 Retry 插件缺失** (当前文档未提及):
- 新增了 `retryPlugin` 内置插件 (`hook-fetch/plugins/retry`)
- 支持配置: `retryableStatuses`, `maxAttempts`, `initialDelay`, `maxDelay`, `backoffStrategy`, `jitter`, `shouldRetry`

**调试插件示例过时** (行 660-690):
- `afterResponse(context, config)` → `afterResponse(ctx)`

**高级插件模式示例过时** (行 696-758):
- multiApiPlugin, conditionalPlugin 都使用旧的 `beforeRequest(config)` 签名

---

### 2. api-reference.md — 中度过时

**HookFetchPlugin 接口过时** (行 389-406):
- 与 plugins.md 相同的签名问题
- 缺少 `afterStream` hook

**ResponseError 类过时** (行 416-424):
- 旧: 有 `response`, `config`, `extra` 属性
- 新: 有 `message`, `name`, `status`, `statusText`, `response`, `config` 属性（没有单独的 `extra`）

**HookFetchRequest 方法过时** (行 283-312):
- `retry()` 方法在 v3 中已移除 — HookFetchRequest 不再有 `retry()` 方法
- 应该文档记录 `.response` getter (返回 `Promise<Response>`)

**BaseOptions 接口缺失字段** (行 320-331):
- 缺少 `extra` 和 `qsConfig` 字段

---

### 3. getting-started.md — 轻度过时

**错误处理示例不正确** (行 156-174):
- 旧: 检查 `error.response`, `error.request`, `error.response.data`
- 新: ResponseError 有 `error.status`, `error.statusText`, `error.response`, `error.message`, `error.config`
- 不存在 `error.response.data` 或 `error.request`

**请求重试示例过时** (行 241-254):
- 旧: `request.retry()` 方法
- 新: v3 没有 `retry()` 方法，应展示使用 retryPlugin 或手动创建新请求

---

### 4. streaming.md — 中度过时

**自定义聊天流处理插件** (行 138-163):
- `transformStreamChunk(chunk, config)` → `transformStreamChunk({ chunk, config })`

**自动重连插件** (行 347-373):
- `onError(error, config)` → `onError({ error, config })`
- `error.retryInfo` 不是标准属性

**beforeStream 示例** (行 489-507):
- `beforeStream(body, config)` → `beforeStream({ body, config, response })`

**批处理插件** (行 512-536):
- `transformStreamChunk(chunk, config)` → `transformStreamChunk({ chunk, config })`

**日志流插件** (行 282-311):
- `transformStreamChunk(chunk, config)` → `transformStreamChunk({ chunk, config })`

---

### 5. best-practices.md — 中度过时

**错误处理插件** (行 141-185):
- `onError(error, config)` → `onError({ error, config })`
- 返回 `error` 不再有效，应返回 `void` 或 `PipelineDecision`

**缓存插件** (行 230-308):
- `beforeRequest(requestConfig)` → `beforeRequest({ config, resolve })`
- `afterResponse(context, requestConfig)` → `afterResponse(ctx)`
- 错误的 resolve 使用方式

**性能监控插件** (行 720-753):
- `beforeRequest(config)` → `beforeRequest({ config })`
- `afterResponse(context, config)` → `afterResponse(ctx)`

**认证插件** (行 650-684):
- `beforeRequest(config)` → `beforeRequest({ config })`
- `onError(error)` → `onError({ error, config, resolve })`

---

### 6. framework-integration.md — 基本正确

- 使用方式基本不变，但 useHookFetch 的返回类型文档可以补充

---

### 7. examples/chat-application.md & reference/faq.md — 需检查

- 插件示例代码可能也使用旧签名

---

### 8. i18n 英文翻译 — 同步更新

- 所有中文文档的改动需同步到 `i18n/en/` 下的对应文件

## Impact

- 受影响文档: plugins.md (重写), api-reference.md (大量更新), getting-started.md (小量更新), streaming.md (中量更新), best-practices.md (中量更新), chat-application.md (检查), faq.md (检查)
- 受影响代码: 无（纯文档修改）
- **BREAKING**: 文档中所有插件示例代码签名需从双参数改为单参数 context
