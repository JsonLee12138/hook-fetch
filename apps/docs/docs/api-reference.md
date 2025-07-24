---
sidebar_position: 3
---

# API 参考

本文档提供了 Hook-Fetch 的完整 API 参考，包括所有方法、配置选项和类型定义。

## 主要导出

```typescript
import hookFetch, {
  get, post, put, patch, del, head, options, upload, request
} from 'hook-fetch';
```

## 默认导出

### `hookFetch(url, options?)`

主要的请求函数。

**参数：**
- `url` (string): 请求的 URL
- `options` (RequestOptions, 可选): 请求配置

**返回值：** `HookFetchRequest<T>` - 请求对象

**示例：**
```typescript
const response = await hookFetch('https://api.example.com/users').json();
```

### `hookFetch.create(options)`

创建一个配置好的 Hook-Fetch 实例。

**参数：**
- `options` (BaseOptions): 实例配置

**返回值：** `HookFetch` - 实例对象

**示例：**
```typescript
const api = hookFetch.create({
  baseURL: 'https://api.example.com',
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json'
  }
});
```

## 便捷方法

### `get(url, params?, options?)`

发起 GET 请求。

**参数：**
- `url` (string): 请求的 URL
- `params` (object, 可选): 查询参数
- `options` (GetOptions, 可选): 请求配置

**示例：**
```typescript
const users = await get('/users', { page: 1, limit: 10 }).json();
```

### `post(url, data?, options?)`

发起 POST 请求。

**参数：**
- `url` (string): 请求的 URL
- `data` (any, 可选): 请求体数据
- `options` (PostOptions, 可选): 请求配置

**示例：**
```typescript
const newUser = await post('/users', { name: 'John', email: 'john@example.com' }).json();
```

### `put(url, data?, options?)`

发起 PUT 请求。

**参数：**
- `url` (string): 请求的 URL
- `data` (any, 可选): 请求体数据
- `options` (PutOptions, 可选): 请求配置

### `patch(url, data?, options?)`

发起 PATCH 请求。

**参数：**
- `url` (string): 请求的 URL
- `data` (any, 可选): 请求体数据
- `options` (PatchOptions, 可选): 请求配置

### `del(url, options?)`

发起 DELETE 请求。

**参数：**
- `url` (string): 请求的 URL
- `options` (DeleteOptions, 可选): 请求配置

### `head(url, params?, options?)`

发起 HEAD 请求。

**参数：**
- `url` (string): 请求的 URL
- `params` (object, 可选): 查询参数
- `options` (HeadOptions, 可选): 请求配置

### `options(url, params?, options?)`

发起 OPTIONS 请求。

**参数：**
- `url` (string): 请求的 URL
- `params` (object, 可选): 查询参数
- `options` (OptionsOptions, 可选): 请求配置

### `upload(url, data?, options?)`

发起文件上传请求。

**参数：**
- `url` (string): 请求的 URL
- `data` (object, 可选): 包含文件的数据对象
- `options` (PostOptions, 可选): 请求配置

**示例：**
```typescript
const result = await upload('/upload', {
  file: fileInput.files[0],
  name: 'My File'
}).json();
```

## HookFetch 实例方法

### `request(url, options?)`

实例的主要请求方法。

### `get(url, params?, options?)`

实例的 GET 请求方法。

### `post(url, data?, options?)`

实例的 POST 请求方法。

### `put(url, data?, options?)`

实例的 PUT 请求方法。

### `patch(url, data?, options?)`

实例的 PATCH 请求方法。

### `delete(url, options?)`

实例的 DELETE 请求方法。

### `head(url, params?, options?)`

实例的 HEAD 请求方法。

### `options(url, params?, options?)`

实例的 OPTIONS 请求方法。

### `upload(url, data?, options?)`

实例的文件上传方法。

### `use(plugin)`

注册插件。

**参数：**
- `plugin` (HookFetchPlugin): 插件对象

**返回值：** `this` - 实例本身（支持链式调用）

**示例：**
```typescript
api.use(myPlugin());
```

### `abortAll()`

中断所有正在进行的请求。

**示例：**
```typescript
api.abortAll();
```

## HookFetchRequest 方法

### 响应处理方法

#### `json()`

将响应解析为 JSON。

**返回值：** `Promise<T>` - 解析后的 JSON 数据

#### `text()`

将响应解析为文本。

**返回值：** `Promise<string>` - 响应文本

#### `blob()`

将响应解析为 Blob。

**返回值：** `Promise<Blob>` - 响应 Blob

#### `arrayBuffer()`

将响应解析为 ArrayBuffer。

**返回值：** `Promise<ArrayBuffer>` - 响应 ArrayBuffer

#### `formData()`

将响应解析为 FormData。

**返回值：** `Promise<FormData>` - 响应 FormData

#### `bytes()`

将响应解析为字节数组。

**返回值：** `Promise<Uint8Array>` - 响应字节数组

### 流式处理方法

#### `stream()`

获取响应的流式数据。

**返回值：** `AsyncIterable<StreamContext<T>>` - 流式数据迭代器

**示例：**
```typescript
for await (const chunk of request.stream()) {
  console.log(chunk.result);
}
```

### 控制方法

#### `abort()`

中断当前请求。

**示例：**
```typescript
const request = api.get('/long-request');
setTimeout(() => request.abort(), 5000);
```

#### `retry()`

重试请求。

**返回值：** `HookFetchRequest<T>` - 新的请求对象

**示例：**
```typescript
const newRequest = request.retry();
const response = await newRequest.json();
```

#### `catch(callback)`

捕获请求错误。

**参数：**
- `callback` (function): 错误处理回调

**返回值：** `HookFetchRequest<T>` - 请求对象

#### `finally(callback)`

请求完成后执行（无论成功还是失败）。

**参数：**
- `callback` (function): 完成回调

**返回值：** `HookFetchRequest<T>` - 请求对象

## 配置选项

### BaseOptions

创建实例时的配置选项。

```typescript
interface BaseOptions {
  /** 基础 URL | Base URL for requests */
  baseURL?: string;
  /** 超时时间(毫秒) | Request timeout in milliseconds */
  timeout?: number;
  /** 默认请求头 | Default headers */
  headers?: HeadersInit;
  /** 插件数组 | List of plugins */
  plugins?: HookFetchPlugin[];
  /** 是否发送凭证 | Whether to include credentials */
  withCredentials?: boolean;
}
```

### RequestOptions

单个请求的配置选项。

```typescript
interface RequestOptions<P = any, D = any, E = any> {
  /** HTTP 方法 | HTTP method */
  method?: RequestMethod;
  /** 请求头 | Request headers */
  headers?: HeadersInit;
  /** 超时时间 | Request timeout */
  timeout?: number;
  /** 查询参数 | Query parameters */
  params?: P;
  /** 请求体数据 | Request body data */
  data?: D;
  /** 是否发送凭证 | Whether to include credentials */
  withCredentials?: boolean;
  /** 传递给插件的额外数据 | Extra data passed to plugins */
  extra?: E;
  /** 查询参数中数组的序列化格式 | Array format in query string */
  qsArrayFormat?: 'indices' | 'brackets' | 'repeat' | 'comma';
}
```

## 类型定义

### RequestMethod

```typescript
type RequestMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';
```

### FetchResponseType

```typescript
type FetchResponseType = 'json' | 'text' | 'blob' | 'arrayBuffer' | 'formData' | 'bytes';
```

### StreamContext

```typescript
interface StreamContext<T = unknown> {
  /** 当前数据块 | Current data chunk */
  result: T;
  /** 原始字节数据 | Raw byte data */
  source: Uint8Array;
  /** 错误信息 | Error information */
  error: unknown | null;
}
```

### HookFetchPlugin

```typescript
interface HookFetchPlugin<T = unknown, E = unknown, P = unknown, D = unknown> {
  /** 插件名称 (必需) | Plugin name (required) */
  name: string;
  /** 插件优先级, 数字越小越高 (可选) | Plugin priority, smaller number means higher priority (optional) */
  priority?: number;
  /** 请求发送前钩子 | Hook before request is sent */
  beforeRequest?: (config: RequestConfig<P, D, E>) => RequestConfig<P, D, E> | Promise<RequestConfig<P, D, E>>;
  /** 响应接收后钩子 | Hook after response is received */
  afterResponse?: (context: FetchPluginContext<T>, config: RequestConfig<P, D, E>) => FetchPluginContext<T> | Promise<FetchPluginContext<T>>;
  /** 流式处理前钩子 | Hook before stream processing */
  beforeStream?: (body: ReadableStream<any>, config: RequestConfig<P, D, E>) => ReadableStream<any> | Promise<ReadableStream<any>>;
  /** 流式数据块转换钩子 | Hook for transforming stream chunks */
  transformStreamChunk?: (chunk: StreamContext<any>, config: RequestConfig<P, D, E>) => StreamContext | Promise<StreamContext>;
  /** 错误处理钩子 | Hook for error handling */
  onError?: (error: ResponseError, config: RequestConfig<P, D, E>) => Promise<Error | void | ResponseError<E>>;
  /** 请求完成时钩子(无论成功或失败) | Hook when request is finalized (whether success or failure) */
  onFinally?: (res: Pick<FetchPluginContext<unknown, E, P, D>, 'config' | 'response'>) => void | Promise<void>;
}
```

## 错误处理

### ResponseError

Hook-Fetch 会抛出 `ResponseError` 类型的错误：

```typescript
class ResponseError<E = any> extends Error {
  /** 响应对象 | The response object */
  response: Response;
  /** 请求配置 | The request configuration */
  config: RequestConfig;
  /** 额外数据 | Extra data */
  extra?: E;
}
```

### 错误类型

- **网络错误**: 网络连接失败
- **超时错误**: 请求超时
- **中断错误**: 请求被中断
- **HTTP 错误**: HTTP 状态码错误（4xx, 5xx）
- **解析错误**: 响应数据解析失败

## 示例

### 完整的 API 使用示例

```typescript
import hookFetch from 'hook-fetch';

// 创建实例
const api = hookFetch.create({
  baseURL: 'https://api.example.com',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer token'
  }
});

// 使用各种方法
const users = await api.get('/users', { page: 1 }).json();
const newUser = await api.post('/users', { name: 'John' }).json();
const updatedUser = await api.put('/users/1', { name: 'Jane' }).json();
const patchedUser = await api.patch('/users/1', { email: 'jane@example.com' }).json();
const deleted = await api.delete('/users/1').json();

// 流式处理
for await (const chunk of api.get('/stream').stream()) {
  console.log(chunk.result);
}

// 错误处理
try {
  const response = await api.get('/error').json();
} catch (error) {
  console.error('Request failed:', error.message);
}
```
