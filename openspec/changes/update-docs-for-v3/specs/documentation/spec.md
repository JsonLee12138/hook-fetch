## ADDED Requirements

### Requirement: V3 Plugin API Documentation
文档 MUST 反映 v3 context-based 插件 API 签名，所有 handler 使用单参数 context 对象。

#### Scenario: 用户查看插件接口定义
- **WHEN** 用户查看 plugins.md 的 HookFetchPlugin 接口定义
- **THEN** 接口显示 `<T, E>` 两个泛型参数
- **AND** 所有 handler 使用 context 对象签名 (`beforeRequest(ctx)`, `afterResponse(ctx)`, `onError(ctx)`, etc.)

#### Scenario: 用户查看 PipelineDecision 文档
- **WHEN** 用户查看插件文档
- **THEN** 文档解释 `resolve()` 用于短路返回成功值，`reject()` 用于提前中止并抛出错误

### Requirement: Built-in RetryPlugin Documentation
文档 MUST 包含内置 retryPlugin 的完整文档和配置说明。

#### Scenario: 用户查看 retryPlugin 文档
- **WHEN** 用户查看 plugins.md 的内置插件部分
- **THEN** 文档包含 retryPlugin 的导入方式、配置选项和使用示例

## MODIFIED Requirements

### Requirement: API Reference Accuracy
api-reference.md MUST 准确反映 v3 的 ResponseError 类、HookFetchRequest 方法和配置选项。

#### Scenario: 用户查看 ResponseError 文档
- **WHEN** 用户查看 api-reference.md 的 ResponseError 部分
- **THEN** 文档显示 `status`, `statusText`, `response`, `config`, `message`, `name` 属性

#### Scenario: 用户查看 HookFetchRequest 方法
- **WHEN** 用户查看 api-reference.md 的 HookFetchRequest 部分
- **THEN** 文档不包含已移除的 `retry()` 方法
- **AND** 文档包含 `.response` getter

## REMOVED Requirements

### Requirement: V2.4.0 onError Context API
**Reason**: v3 已将 `onError(error, config, context)` 三参数模式替换为 `onError({ error, config, resolve, reject })` context 模式。
**Migration**: 使用新的 OnErrorCtx 单参数 context 对象。

### Requirement: HookFetchRequest.retry() Method
**Reason**: v3 已移除 `retry()` 方法，重试功能由 retryPlugin 处理。
**Migration**: 使用内置 retryPlugin 或手动创建新请求实现重试。
