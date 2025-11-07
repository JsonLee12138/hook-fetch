# hook-fetch

## 2.2.3

### Patch Changes

- 新增请求去重插件并改进错误处理

  ## 新增功能
  - **请求去重插件 (dedupePlugin)**: 新增 `dedupePlugin` 用于防止并发的相同请求。插件会根据 URL、HTTP 方法、参数和请求体数据生成唯一标识,当检测到相同标识的请求正在进行时,后续请求会抛出 `DedupeError`
    - 提供 `isDedupeError` 辅助函数用于判断错误类型
    - 支持通过 `extra.dedupeAble` 选项禁用特定请求的去重功能
    - ⚠️ 官方不推荐在生产环境中使用,建议通过应用层设计(如禁用按钮、防抖节流、状态管理)来避免重复请求

  ## 改进
  - **类型定义完善**: 在 `RequestConfig`、`BaseRequestOptions` 和 `OptionProps` 中添加 `extra` 字段支持,允许传递额外的请求配置
  - **错误处理优化**: 改进 React 和 Vue hooks 的错误处理逻辑,过滤 `AbortError` 和 JSON 解析错误,避免触发不必要的错误回调

  ## 文档更新
  - 添加请求去重插件的完整文档和使用示例
  - 更新中英文文档

## 2.2.2

### Patch Changes

- 1. 修复 vue 和 react 的 hooks 状态管理异常 bug
  2. 允许使用的时候临时传入插件

## 2.2.1

### Patch Changes

- 修改beforeRequest逻辑， 使其支持中断请求直接返回值

  **_主要用途：_**
  - 缓存请求

  example：[cache.test.ts](https://github.com/JsonLee12138/hook-fetch/blob/main/packages/core/__test__/cache.test.ts)

## 2.2.0

### Minor Changes

- ### Major Changes
  - ### 💥 Breaking Changes
    - 移除旧有的 `qsArrayFormat` 配置字段，现改为通过 `qsConfig` 提供完整的 `qs.stringify` 选项；依赖该字段的代码需迁移到新 API。

    ### 更新内容
    - 新增 `qsConfig` 全局配置，允许在 `hookFetch` create 阶段自定义传给 `qs.stringify` 的参数，默认仍为 `arrayFormat: 'repeat'`。
    - 各类请求方法接收 `RequestOptions.qsConfig`，可在单次调用时覆盖全局设置，影响 URL 拼接与 `application/x-www-form-urlencoded` 体序列化。

## 2.1.6

### Patch Changes

- 修复错误异常问题

## 2.1.5

### Patch Changes

- 更新文档

## 2.1.4

### Patch Changes

- 修复beforeRequest中不能抛错的问题

## 2.1.3

### Patch Changes

- 修复stream方法的错误不会走plugin的错误生命周期的bug

## 2.1.2

### Patch Changes

- 修复抛出的HookFetchRequest类型不支持泛型的问题

## 2.1.1

### Patch Changes

- 8d4d6b6: 修复HookFetchRequest实例没有抛出的问题

## 2.1.1-beta.0

### Patch Changes

- 修复HookFetchRequest实例没有抛出的问题

## 3.0.0-beta.0

### Major Changes

- 4b15105: 修改changeset配置, 改用changeset进行发布

## v2.1.0 💥

**发布日期**: 2025-08-08

#### 💔 破坏性变更

- 泛型签名调整：`HookFetch` 与 `hookFetch.create` 的泛型从
  `<R extends AnyObject = AnyObject, K extends keyof R = 'data', E = AnyObject>`
  调整为
  `<R extends AnyObject | null = null, K extends keyof R = never, E = AnyObject>`。
  - 当 `R = null`（默认）时：`json<T>()` 的返回类型为 `T`，不做包裹映射（更贴近原生 fetch 的直觉）。
  - 当你需要“包裹响应”并做键映射时：显式传入响应包裹类型和键名，例如 `hookFetch.create<ResponseVO, 'data'>(...)`，此时 `json<User>()` 的返回类型为 `ResponseVO` 且其中 `data` 为 `User`。

#### 🔧 迁移指南

- 旧代码：

  ```ts
  interface ResponseVO {
    code: number;
    message: string;
    data: never;
  }
  const api = hookFetch.create<ResponseVO>({ baseURL: "..." });
  const res = await api.get<User>("/user").json();
  // res.data: User
  ```

  新代码需显式指定键名：

  ```ts
  const api = hookFetch.create<ResponseVO, "data">({ baseURL: "..." });
  const res = await api.get<User>("/user").json();
  // res.data: User
  ```

- 若无需包裹（直接拿到 `T`）：
  ```ts
  const api = hookFetch.create(); // 等价于 <null, never>
  const user = await api.get<User>("/user").json(); // user: User
  ```

#### 🧰 其他

- 同步更新文档：README 与 API 参考已更新示例，明确 `R | null` 与 `K` 的用法。

### v2.0.7 🛠️

**发布日期**: 2025-08-08

#### 🐛 修复

- 修复 `json`、`text`、`blob`、`arrayBuffer`、`formData`、`bytes` 方法的类型推断缺失问题（更完善的返回值类型提示）。

#### 🧱 基础设施

- 调整与修复发布 CI/CD 流程相关配置。

### v2.0.6

**发布日期**: 2025-08-07

#### 🔧 变更

- 发布流程与版本稳定性相关的调整。

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
