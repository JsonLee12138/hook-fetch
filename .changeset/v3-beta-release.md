---
"hook-fetch": major
---

## v3.0.0 - Context-Based Plugin API

### 💥 Breaking Changes

- **插件 API 全面重构**：所有插件钩子从直接参数改为统一的 Context 对象模式
  - `beforeRequest(ctx)` - 接收 `{ config, resolve, reject }`
  - `afterResponse(ctx)` - 接收 `{ config, response, resolve, reject }`
  - `onError(ctx)` - 接收 `{ error, config, resolve, reject }`
  - `onFinally(ctx)` - 接收 `{ config }`
- **Pipeline Decision 机制**：插件可通过 `resolve()` 短路返回数据或 `reject()` 提前中止请求
- **插件优先级系统**：通过 `priority` 字段控制插件执行顺序（升序，默认 0）

### ✨ 新功能

- **Retry 插件** (`retryPlugin`)：支持指数退避、线性退避、自定义退避策略，可配置重试条件和最大重试次数
- **完整流式处理**：新增 `beforeStream`、`transformStreamChunk`、`afterStream` 生命周期钩子
- **onError 错误恢复**：`onError` 钩子中可调用 `resolve()` 返回降级数据或重试结果（如 401 Token 刷新 → 重试）
- **增强的泛型支持**：`HookFetchPlugin<T, E>`、`OnErrorContext<T, E, S>` 等全面支持状态泛型

### 🔧 改进

- **架构重组**：新增 `decision.ts`（Pipeline 决策）、`pipeline.ts`（插件管道）、`request.ts`（请求生命周期）、`executor.ts`（HTTP 执行器）
- **PluginManager**：插件去重（同名插件取最后注册的）、优先级排序
- **ResponseError 增强**：携带完整请求配置上下文，支持泛型错误类型
- **SSE 插件改进**：集成 `transformStreamChunk` 钩子，支持自定义分隔符和 JSON 解析配置
