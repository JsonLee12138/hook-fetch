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
// 当前只是示例, 建议使用当前库提供的`sseTextDecoderPlugin`插件, 那里做了更完善的处理
const ssePlugin = () => {
  const decoder = new TextDecoder('utf-8');
  return {
    name: 'sse',
    async transformStreamChunk(chunk, config) {
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

#### 插件生命周期示例

```typescript
// 完整的插件示例，展示各个生命周期的使用
const examplePlugin = () => {
  return {
    name: 'example',
    priority: 1, // 优先级，数字越小优先级越高

    // 请求发送前处理
    async beforeRequest(config) {
      // 可以修改请求配置
      config.headers = new Headers(config.headers);
      config.headers.set('authorization', `Bearer ${tokenValue}`);
      return config;
    },

    // 响应接收后处理
    async afterResponse(context, config) {
      // 可以处理响应数据
      if (context.responseType === 'json') {
        if(context.result.code === 200){
          return context
        }else{
          // 具体逻辑自行处理
          return Promise.reject(context)
        }
      }
      return context;
    },

    // 流式请求开始处理, 高级使用方法可以参考 sseTextDecoderPlugin (https://github.com/JsonLee12138/hook-fetch/blob/main/src/plugins/sse.ts)
    async beforeStream(body, config) {
      // 可以转换或包装流
      return body;
    },

    // 流数据块处理, 支持返回迭代器和异步迭代器会自动处理成多条消息
    async transformStreamChunk(chunk, config) {
      // 可以处理每个数据块
      if (!chunk.error) {
        chunk.result = `Processed: ${chunk.result}`;
      }
      return chunk;
    },

    // 错误处理
    async onError(error, config) {
      // 可以处理或转换错误
      if (error.status === 401) {
        // 处理未授权错误
        return new Error('Please login first');
      }
      return error;
    },

    // 请求完成处理
    async onFinally(context, config) {
      // 清理资源或记录日志
      console.log(`Request to ${config.url} completed`);
    }
  };
};
```

#### 业务场景封装示例

```typescript
// 创建一个业务请求实例
const createRequest = () => {
  // 创建基础实例
  const request = hookFetch.create({
    baseURL: 'https://api.example.com',
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json'
    }
  });

  // 响应拦截器
  const responseInterceptor = () => ({
    name: 'response-interceptor',
    async afterResponse(context) {
      const { result } = context;
      // 处理业务响应格式
      if (result.code === 0) {
        return result.data;
      }
      // 处理业务错误
      throw new Error(result.message);
    }
  });

  // 错误处理插件
  const errorHandler = () => ({
    name: 'error-handler',
    async onError(error) {
      // 统一错误处理
      if (error.status === 401) {
        // 处理登录过期
        window.location.href = '/login';
        return;
      }
      if (error.status === 403) {
        // 处理权限不足
        window.location.href = '/403';
        return;
      }
      // 显示错误提示
      console.error(error.message);
      return error;
    }
  });

  // 请求日志插件
  const requestLogger = () => ({
    name: 'request-logger',
    async beforeRequest(config) {
      console.log(`Request: ${config.method} ${config.url}`, config);
      return config;
    },
    async afterResponse(context) {
      console.log(`Response: ${context.response.status}`, context.result);
      return context;
    }
  });

  // 注册插件
  request.use(responseInterceptor());
  request.use(errorHandler());
  request.use(requestLogger());

  // 封装业务方法
  return {
    // 用户相关接口
    user: {
      // 获取用户信息
      getInfo: () => request.get('/user/info'),
      // 更新用户信息
      updateInfo: (data) => request.put('/user/info', data),
      // 修改密码
      changePassword: (data) => request.post('/user/password', data)
    },
    // 订单相关接口
    order: {
      // 获取订单列表
      getList: (params) => request.get('/orders', params),
      // 创建订单
      create: (data) => request.post('/orders', data),
      // 取消订单
      cancel: (id) => request.post(`/orders/${id}/cancel`)
    }
  };
};

// 使用示例
const api = createRequest();

// 获取用户信息
const userInfo = await api.user.getInfo();

// 创建订单
const order = await api.order.create({
  productId: 1,
  quantity: 2
});
```

插件钩子函数：
- `beforeRequest`: 请求发送前处理配置，可以返回新的配置或直接修改配置
- `afterResponse`: 响应接收后处理数据，可以返回新的响应或直接修改响应
- `beforeStream`: 流式请求开始时的处理，用于初始化或转换流
- `transformStreamChunk`: 处理流式数据块，可以返回新的数据块或直接修改数据块
- `onError`: 处理请求错误，可以返回新的错误或直接修改错误
- `onFinally`: 请求完成后的回调，用于清理资源等操作

所有生命周期钩子都支持同步和异步操作，可以根据需要返回 Promise 或直接返回值。每个钩子函数都会接收到当前的配置对象（config），可以用于判断和处理不同的请求场景。

## 泛型支持

Hook-Fetch 提供了完善的TypeScript类型支持，可以为请求和响应定义明确的类型：

```typescript
interface BaseResponseVO {
  code: number;
  data: never;
  message: string;
}

const request = hookFetch.create<BaseResponseVO>({
  baseURL: 'https://example.com',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 5000,
});

// 定义响应数据类型
interface User {
  id: number;
  name: string;
  email: string;
}

// 在请求中使用类型
const res = await request.get<User>('/users/1');
console.log(res.data); // TypeScript提供完整类型提示
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
  beforeRequest?: (config: RequestConfig<P, D, E>) => Promise<RequestConfig<P, D, E>> | RequestConfig<P, D, E>;

  // 响应后处理
  afterResponse?: (context: FetchPluginContext<T, E, P, D>, config: RequestConfig<P, D, E>) => Promise<FetchPluginContext<T, E, P, D>> | FetchPluginContext<T, E, P, D>;

  // 流式请求开始处理
  beforeStream?: (body: ReadableStream<any>, config: RequestConfig<P, D, E>) => Promise<ReadableStream<any>> | ReadableStream<any>;

  // 流数据块转换
  transformStreamChunk?: (chunk: StreamContext<any>, config: RequestConfig<P, D, E>) => Promise<StreamContext> | StreamContext;

  // 错误处理
  onError?: (error: Error, config: RequestConfig<P, D, E>) => Promise<Error | void | ResponseError<E>> | Error | void | ResponseError<E>;

  // 请求完成处理
  onFinally?: (context: FetchPluginContext<T, E, P, D>, config: RequestConfig<P, D, E>) => Promise<void> | void;
}
```


## Vue Hooks

Hook-Fetch 提供了 Vue 组合式 API 的支持，可以更方便地在 Vue 组件中使用：

```typescript
import { useHookFetch } from 'hook-fetch/vue';
import hookFetch from 'hook-fetch';

// 创建请求实例
const api = hookFetch.create({
  baseURL: 'https://api.example.com'
});

// 在组件中使用
const YourComponent = defineComponent({
  setup() {
    // 使用 useHookFetch
    const { request, loading, cancel, text, stream, blob, arrayBufferData, formDataResult, bytesData } = useHookFetch({
      request: api.get,
      onError: (error) => {
        console.error('请求错误:', error);
      }
    });

    // 发起请求
    const fetchData = async () => {
      const response = await request('/users');
      console.log(response);
    };

    // 获取文本响应
    const fetchText = async () => {
      const text = await text('/text');
      console.log(text);
    };

    // 处理流式响应
    const handleStream = async () => {
      for await (const chunk of stream('/stream')) {
        console.log(chunk);
      }
    };

    // 取消请求
    const handleCancel = () => {
      cancel();
    };

    return {
      loading,
      fetchData,
      fetchText,
      handleStream,
      handleCancel
    };
  }
});
```

## React Hooks

Hook-Fetch 同样提供了 React Hooks 的支持，可以在 React 组件中方便地使用：

```typescript
import { useHookFetch } from 'hook-fetch/react';
import hookFetch from 'hook-fetch';

// 创建请求实例
const api = hookFetch.create({
  baseURL: 'https://api.example.com'
});

// 在组件中使用
const YourComponent = () => {
  // 使用 useHookFetch
  const { request, loading, setLoading, cancel, text, stream, blob, arrayBufferData, formDataResult, bytesData } = useHookFetch({
    request: api.get,
    onError: (error) => {
      console.error('请求错误:', error);
    }
  });

  // 发起请求
  const fetchData = async () => {
    const response = await request('/users');
    console.log(response);
  };

  // 获取文本响应
  const fetchText = async () => {
    const text = await text('/text');
    console.log(text);
  };

  // 处理流式响应
  const handleStream = async () => {
    for await (const chunk of stream('/stream')) {
      console.log(chunk);
    }
  };

  // 取消请求
  const handleCancel = () => {
    cancel();
  };

  return (
    <div>
      <div>加载状态: {loading ? '加载中' : '已完成'}</div>
      <button onClick={fetchData}>获取数据</button>
      <button onClick={fetchText}>获取文本</button>
      <button onClick={handleStream}>处理流</button>
      <button onClick={handleCancel}>取消请求</button>
    </div>
  );
};
```

### vscode提示插件的引用路径
```typescript
// 在 src 中创建文件 hook-fetch.d.ts, 内容如下
/// <reference types="hook-fetch/plugins" />
/// <reference types="hook-fetch/react" />
/// <reference types="hook-fetch/vue" />
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

## 联系我们

- [Discord](https://discord.gg/666U6JTCQY)
