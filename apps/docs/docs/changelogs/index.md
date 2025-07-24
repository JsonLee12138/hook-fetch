---
id: changelog
title: 更新日志
sidebar_position: 1
---

# 更新日志

## 版本历史

### v2.0.3 🎉
**发布日期**: 2025-06-30

#### 💔 破坏性变更
- **移除默认JSON解析**: 不再自动解析JSON响应，需要显式调用 `.json()` 方法
- **更明确的响应处理**: 提供更明确的响应数据处理方式，避免隐式行为

#### 🔧 API 调整
- 所有请求方法现在需要显式调用响应处理方法（如 `.json()`, `.text()` 等）
- 提高了API的明确性和可预测性

#### 📚 文档更新
- 更新了所有示例代码，明确显示 `.json()` 调用
- 改进了响应处理的文档说明

### v1.0.x
**发布日期**: 2025-04

#### 🎯 首次发布
- 基于原生 fetch API 的现代化 HTTP 请求库
- **自动JSON解析**: 默认自动解析JSON响应
- **完整插件系统**: 支持 `beforeRequest`, `afterResponse`, `beforeStream`, `transformStreamChunk`, `onError`, `onFinally` 生命周期钩子
- **Vue Hooks 支持**: 提供 `useHookFetch` Vue 组合式 API
- **React Hooks 支持**: 提供 `useHookFetch` React Hook
- **多种响应处理**: 支持 `json()`, `text()`, `blob()`, `arrayBuffer()`, `formData()`, `bytes()` 方法
- **请求重试机制**: 支持 `.retry()` 方法重试已中断的请求
- **流式数据处理**: 强大的流式响应处理能力
- **请求中断**: 支持 `.abort()` 方法中断请求
- **插件优先级**: 支持插件优先级设置
- **SSE 支持**: 提供 `sseTextDecoderPlugin` 插件
- **完整 TypeScript 支持**: 提供完善的类型定义和泛型支持
- **灵活配置**: 支持超时、baseURL、请求头、参数序列化等配置选项
- **VSCode 智能提示**: 提供专门的类型声明文件

### 即将发布
- 更多内置插件
- 更丰富的插件生态
- 更多框架集成支持
