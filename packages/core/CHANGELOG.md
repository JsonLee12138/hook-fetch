# hook-fetch

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

## 2.0.0

### Major Changes

- 2527e03: 整理类型，支持插件的类型，支持通过reference去支持插件的引用路径提示
- 2527e03: 新增vue和react的hooks
- 2527e03: 修复hooks的loading状态不正常的bug
- 2527e03: 修改架构为rolldown版本的vite，支持umd，保留sse插件的jsdoc

### Minor Changes

- 818e0fd: 修复json, blob, text, arrayBuffer, formData, bytes方法没有类型推断的问题

### Patch Changes

- 2527e03: 更新sse插件，处理一次性返回多条问题，新增json解析和trim处理功能
