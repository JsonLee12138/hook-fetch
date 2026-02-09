## 1. plugins.md 重写（最高优先级）

- [x] 1.1 更新 `HookFetchPlugin` 接口定义 — 改为 `<T, E>` 泛型 + context-based 签名
- [x] 1.2 更新所有 handler 的类型签名 (`beforeRequest`, `afterResponse`, `onError`, `onFinally`, `beforeStream`, `transformStreamChunk`，新增 `afterStream`)
- [x] 1.3 重写 authPlugin 示例 — `beforeRequest({ config })` + 解构返回
- [x] 1.4 重写 loggerPlugin 示例 — `afterResponse(ctx)` 从 ctx 取 config 和 response
- [x] 1.5 重写 cachePlugin 示例 — 使用 `resolve()` 短路机制
- [x] 1.6 重写 errorTransformPlugin 示例 — `onError({ error, config })`
- [x] 1.7 重写 streamTransformPlugin 示例 — `transformStreamChunk({ chunk, config })`
- [x] 1.8 删除旧的 onError 三参数 context 章节（v2.4.0 内容）
- [x] 1.9 新增 onError context 章节 — 展示 `{ error, config, resolve, reject }` + PipelineDecision 用法
- [x] 1.10 新增内置 retryPlugin 文档 — 展示配置选项和用法
- [x] 1.11 更新调试插件示例
- [x] 1.12 更新高级插件模式示例（multiApiPlugin, conditionalPlugin）
- [x] 1.13 新增 PipelineDecision 概念说明（resolve 短路 / reject 中止）

## 2. api-reference.md 更新

- [x] 2.1 更新 `HookFetchPlugin` 接口类型定义
- [x] 2.2 更新 `ResponseError` 类属性（`status`, `statusText`, `config`, 移除 `extra`）
- [x] 2.3 移除 `retry()` 方法文档
- [x] 2.4 新增 `.response` getter 文档
- [x] 2.5 更新 `BaseOptions` / `RequestOptions` 接口

## 3. getting-started.md 修复

- [x] 3.1 修复错误处理示例 — 使用 `error.status`, `error.message` 而非 `error.response.data`
- [x] 3.2 更新请求重试部分 — 移除 `retry()` 方法，改为推荐使用 retryPlugin

## 4. streaming.md 更新

- [x] 4.1 更新自定义聊天流处理插件 — context 签名
- [x] 4.2 更新自动重连插件 — context 签名
- [x] 4.3 更新 beforeStream 示例 — context 签名
- [x] 4.4 更新批处理插件 — context 签名
- [x] 4.5 更新日志流插件 — context 签名

## 5. best-practices.md 更新

- [x] 5.1 更新错误处理插件 — context 签名 + PipelineDecision 返回值
- [x] 5.2 更新缓存插件 — `resolve()` 短路机制
- [x] 5.3 更新性能监控插件 — context 签名
- [x] 5.4 更新认证插件 — context 签名

## 6. 其他文档检查与修复

- [x] 6.1 检查并更新 examples/chat-application.md
- [x] 6.2 检查并更新 reference/faq.md

## 7. i18n 英文版同步

- [x] 7.1 同步 plugins.md 英文版
- [x] 7.2 同步 api-reference.md 英文版
- [x] 7.3 同步 getting-started.md 英文版
- [x] 7.4 同步 streaming.md 英文版
- [x] 7.5 同步 best-practices.md 英文版
- [x] 7.6 同步其他修改的文档英文版
