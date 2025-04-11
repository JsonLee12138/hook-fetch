# Hook-Fetch 🚀

**[English document](https://github.com/JsonLee12138/hook-fetch/blob/main/README.en.md)**

## 介绍

Hook-Fetch 是一个强大的基于原生 fetch API 的请求库，提供了更简洁的语法、更丰富的功能和更灵活的插件系统。它支持请求重试、流式数据处理、中断请求等特性，并且采用Promise链式调用风格，使API请求变得更加简单和可控。

## 安装

```bash
# 使用 npm
npm install hook-fetch

# 使用 yarn
yarn add hook-fetch

# 使用 pnpm
pnpm add hook-fetch
```

## 基础使用

### 发起简单请求

```typescript
import hookFetch from 'hook-fetch';

// 发起 GET 请求
const response = await hookFetch('https://example.com/api/data');
console.log(response); // 响应数据已自动解析为JSON

// 使用其他HTTP方法
const postResponse = await hookFetch('https://example.com/api/data', {
  method: 'POST',
  data: { name: 'hook-fetch' }
});
```

### 创建实例

```typescript
// 创建一个配置好基础URL的实例
const api = hookFetch.create({
  baseURL: 'https://example.com',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 5000, // 超时时间 (毫秒)
});

// 使用实例发起请求
const userData = await api.get('/users/1');
```

### HTTP请求方法

```typescript
// GET 请求
const data = await api.get('/users', { page: 1, limit: 10 });

// POST 请求
const newUser = await api.post('/users', { name: 'John', age: 30 });

// PUT 请求
const updatedUser = await api.put('/users/1', { name: 'John Doe' });

// PATCH 请求
const patchedUser = await api.patch('/users/1', { age: 31 });

// DELETE 请求
const deleted = await api.delete('/users/1');

// HEAD 请求
const headers = await api.head('/users/1');

// OPTIONS 请求
const options = await api.options('/users');
```

## 高级功能

### 响应处理

Hook-Fetch 支持多种响应数据处理方式：

```typescript
const req = hookFetch('https://example.com/api/data');

// JSON 解析 (默认)
const jsonData = await req;

// 文本解析
const textData = await req.text();

// Blob 处理
const blobData = await req.blob();

// ArrayBuffer 处理
const arrayBufferData = await req.arrayBuffer();

// FormData 处理
const formDataResult = await req.formData();

// 字节流处理
const bytesData = await req.bytes();
```

### 中断请求

```typescript
const req = api.get('/long-running-process');

// 稍后中断请求
setTimeout(() => {
  req.abort();
}, 1000);
```

### 请求重试

```typescript
// 发起请求
const req = api.get('/users/1');

// 中断请求
req.abort();

// 重试请求
const newReq = req.retry();
const result = await newReq;
```

### 流式数据处理

```typescript
const req = hookFetch('https://sse.dev/test');

// 处理流式数据
for await (const chunk of req.stream()) {
  console.log(chunk.result);
}
```

### 插件系统

Hook-Fetch 提供了强大的插件系统，可以在请求生命周期的各个阶段进行干预：

```typescript
// 自定义插件示例：SSE文本解码插件
// 当前只是示例, 您可以直接饮用我提供的插件`sseTextDecoderPlugin`
const ssePlugin = () => {
  const decoder = new TextDecoder('utf-8');
  return {
    name: 'sse',
    async transformStreamChunk(chunk) {
      if (!chunk.error) {
        chunk.result = decoder.decode(chunk.result, { stream: true });
      }
      return chunk;
    }
  }
};

// 注册插件
api.use(ssePlugin());

// 使用带插件的请求
const req = api.get('/sse-endpoint');
for await (const chunk of req.stream<string>()) {
  console.log(chunk.result); // 已被插件处理成文本
}
```

插件钩子函数：
- `beforeRequest`: 请求发送前处理配置
- `afterResponse`: 响应接收后处理数据
- `transformStreamChunk`: 处理流式数据块
- `onError`: 处理请求错误
- `onFinally`: 请求完成后的回调

## 泛型支持

Hook-Fetch 提供了完善的TypeScript类型支持，可以为请求和响应定义明确的类型：

```typescript
// 定义响应数据类型
interface User {
  id: number;
  name: string;
  email: string;
}

// 在请求中使用类型
const user = await api.get<User>('/users/1');
console.log(user.name); // TypeScript提供完整类型提示
```

## 完整API

### 请求配置选项

```typescript
interface RequestOptions {
  // 请求基础URL
  baseURL: string;

  // 请求超时时间 (毫秒)
  timeout: number;

  // 请求头
  headers: HeadersInit;

  // 插件列表
  plugins: Array<HookFetchPlugin>;

  // 是否携带凭证 (cookies等)
  withCredentials: boolean;

  // URL参数
  params: any;

  // 请求体数据
  data: any;

  // 控制器 (用于中断请求)
  controller: AbortController;

  // 额外数据 (可传递给插件)
  extra: any;

  // 数组参数序列化格式
  qsArrayFormat: 'indices' | 'brackets' | 'repeat' | 'comma';

  // 请求方法
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
}
```

### 插件类型

```typescript
interface HookFetchPlugin<T = unknown, E = unknown, P = unknown, D = unknown> {
  // 插件名称
  name: string;

  // 优先级 (数字越小优先级越高)
  priority?: number;

  // 请求前处理
  beforeRequest?: (config: RequestConfig) => Promise<RequestConfig>;

  // 响应后处理
  afterResponse?: (context: FetchPluginContext) => Promise<FetchPluginContext>;

  // 流数据块转换
  transformStreamChunk?: (chunk: StreamContext) => Promise<StreamContext>;

  // 错误处理
  onError?: (error: Error) => Promise<Error | void | ResponseError>;

  // 请求完成处理
  onFinally?: (context: FetchPluginContext) => Promise<void>;
}
```

## 注意事项

1. Hook-Fetch 默认会自动解析JSON响应
2. 所有的请求方法都返回Promise对象
3. 可以通过`.retry()`方法重试已中断的请求
4. 插件按照优先级顺序执行

## 预计开发内容
- `umd` 支持
- 更多的插件支持

## 📝 贡献指南
欢迎提交`issue`或`pull request`，共同完善`Hook-Fetch`。

## 📄 许可证

MIT
