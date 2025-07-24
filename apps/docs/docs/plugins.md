---
sidebar_position: 4
---

# 插件系统

Hook-Fetch 的插件系统是其最强大的特性之一，允许您在请求的生命周期中插入自定义逻辑，实现高度可定制的功能。

## 插件概述

插件是一个对象，包含了在请求生命周期不同阶段执行的钩子函数。插件可以：

- 修改请求配置
- 处理响应数据
- 转换流式数据
- 处理错误
- 执行清理操作

## 插件结构

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

## 插件生命周期

插件的执行顺序如下：

1. **beforeRequest** - 请求发送前
2. **beforeStream** - 流式处理前（仅流式请求）
3. **transformStreamChunk** - 流式数据块转换（仅流式请求）
4. **afterResponse** - 响应接收后
5. **onError** - 错误处理
6. **onFinally** - 最终清理

## 使用插件

### 注册插件

```typescript
// 创建实例时注册
const api = hookFetch.create({
  baseURL: 'https://api.example.com',
  plugins: [myPlugin(), anotherPlugin()]
});

// 或者使用 use 方法注册
api.use(myPlugin());
```

### 插件优先级

插件按优先级执行，数字越小优先级越高：

```typescript
const highPriorityPlugin = {
  name: 'high-priority',
  priority: 1,
  beforeRequest(config) {
    // 优先执行
    return config;
  }
};

const lowPriorityPlugin = {
  name: 'low-priority',
  priority: 10,
  beforeRequest(config) {
    // 后执行
    return config;
  }
};
```

## 内置插件

### SSE 文本解码插件

Hook-Fetch 提供了一个内置的 SSE（Server-Sent Events）文本解码插件：

```typescript
import { sseTextDecoderPlugin } from 'hook-fetch/plugins/sse';

const api = hookFetch.create({
  plugins: [
    sseTextDecoderPlugin({
      json: true,                 // 自动解析 JSON
      prefix: 'data: ',
      splitSeparator: '\n\n',    // 事件分隔符
      doneSymbol: '[DONE]'       // 结束标记
    })
  ]
});

// 使用 SSE
for await (const chunk of api.get('/sse-endpoint').stream()) {
  console.log(chunk.result); // 自动解析的数据
}
```

## 自定义插件示例

### 1. 认证插件

自动添加认证头：

```typescript
const authPlugin = (getToken: () => string) => ({
  name: 'auth',
  priority: 1,
  async beforeRequest(config) {
    const token = getToken();
    if (token) {
      config.headers = new Headers(config.headers);
      config.headers.set('Authorization', `Bearer ${token}`);
    }
    return config;
  }
});

// 使用
const api = hookFetch.create({
  plugins: [authPlugin(() => localStorage.getItem('token') || '')]
});
```

### 2. 日志插件

记录请求和响应：

```typescript
const loggerPlugin = () => ({
  name: 'logger',
  async beforeRequest(config) {
    console.log(`[${config.method}] ${config.url}`);
    return config;
  },
  async afterResponse(context, config) {
    console.log(`[${config.method}] ${config.url} - ${context.response.status}`);
    return context;
  },
  async onError(error, config) {
    console.error(`[${config.method}] ${config.url} - Error:`, error.message);
    return error;
  }
});
```

### 3. 重试插件

自动重试失败的请求：

```typescript
const retryPlugin = (maxRetries = 3, delay = 1000) => ({
  name: 'retry',
  async onError(error, config) {
    const retryCount = config.extra?.retryCount || 0;

    if (retryCount < maxRetries && error.response?.status >= 500) {
      // 延迟后重试
      await new Promise(resolve => setTimeout(resolve, delay));

      // 增加重试计数
      config.extra = { ...config.extra, retryCount: retryCount + 1 };

      // 重新发起请求
      const newRequest = hookFetch(config.url, config);
      return newRequest;
    }

    return error;
  }
});
```

### 4. 缓存插件

缓存 GET 请求的响应：

```typescript
const cachePlugin = (ttl = 5 * 60 * 1000) => {
  const cache = new Map();

  return {
    name: 'cache',
    async beforeRequest(config) {
      if (config.method === 'GET') {
        const key = `${config.url}?${new URLSearchParams(config.params).toString()}`;
        const cached = cache.get(key);

        if (cached && Date.now() - cached.timestamp < ttl) {
          // 返回缓存的响应
          throw new Response(JSON.stringify(cached.data), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      }
      return config;
    },
    async afterResponse(context, config) {
      if (config.method === 'GET' && context.response.ok) {
        const key = `${config.url}?${new URLSearchParams(config.params).toString()}`;
        cache.set(key, {
          data: context.result,
          timestamp: Date.now()
        });
      }
      return context;
    }
  };
};
```

### 5. 流式数据转换插件

转换流式数据：

```typescript
const streamTransformPlugin = () => ({
  name: 'stream-transform',
  async transformStreamChunk(chunk, config) {
    if (!chunk.error && typeof chunk.result === 'string') {
      try {
        // 尝试解析 JSON
        chunk.result = JSON.parse(chunk.result);
      } catch {
        // 如果不是 JSON，保持原样
      }
    }
    return chunk;
  }
});
```

### 6. 错误转换插件

统一错误格式：

```typescript
const errorTransformPlugin = () => ({
  name: 'error-transform',
  async onError(error, config) {
    if (error.response) {
      const errorData = await error.response.json().catch(() => ({}));

      // 创建统一的错误对象
      const customError = new Error(errorData.message || 'Request failed');
      customError.code = errorData.code || error.response.status;
      customError.details = errorData.details;

      return customError;
    }
    return error;
  }
});
```

## 插件开发最佳实践

### 1. 命名规范

- 使用描述性的名称
- 避免与其他插件冲突
- 使用 kebab-case 格式

### 2. 错误处理

```typescript
const safePlugin = () => ({
  name: 'safe-plugin',
  async beforeRequest(config) {
    try {
      // 插件逻辑
      return config;
    } catch (error) {
      console.error('Plugin error:', error);
      return config; // 返回原始配置
    }
  }
});
```

### 3. 性能考虑

- 避免在插件中执行耗时操作
- 使用异步操作时要谨慎
- 考虑缓存计算结果

### 4. 配置验证

```typescript
const configurablePlugin = (options = {}) => {
  const defaultOptions = {
    enabled: true,
    timeout: 5000
  };

  const config = { ...defaultOptions, ...options };

  return {
    name: 'configurable-plugin',
    async beforeRequest(requestConfig) {
      if (!config.enabled) return requestConfig;

      // 插件逻辑
      return requestConfig;
    }
  };
};
```

## 插件组合

可以组合多个插件来实现复杂功能：

```typescript
const api = hookFetch.create({
  plugins: [
    authPlugin(() => getAuthToken()),
    retryPlugin(3, 1000),
    loggerPlugin(),
    cachePlugin(10 * 60 * 1000), // 10分钟缓存
    errorTransformPlugin()
  ]
});
```

## 调试插件

### 插件执行顺序

```typescript
const debugPlugin = () => ({
  name: 'debug',
  priority: -1, // 最低优先级，最后执行
  async beforeRequest(config) {
    console.log('Plugin execution order - beforeRequest');
    return config;
  },
  async afterResponse(context, config) {
    console.log('Plugin execution order - afterResponse');
    return context;
  }
});
```

### 插件状态检查

```typescript
// 检查已注册的插件
const api = hookFetch.create({
  plugins: [plugin1(), plugin2()]
});

// 插件会按优先级排序并存储在实例中
```

## 高级插件模式

### 插件工厂

```typescript
const createApiPlugin = (apiKey: string, baseURL: string) => ({
  name: 'api-plugin',
  async beforeRequest(config) {
    config.headers = new Headers(config.headers);
    config.headers.set('X-API-Key', apiKey);

    if (!config.url.startsWith('http')) {
      config.url = `${baseURL}${config.url}`;
    }

    return config;
  }
});

// 使用
const api = hookFetch.create({
  plugins: [createApiPlugin('my-api-key', 'https://api.example.com')]
});
```

### 条件插件

```typescript
const conditionalPlugin = (condition: () => boolean) => ({
  name: 'conditional',
  async beforeRequest(config) {
    if (condition()) {
      // 只在满足条件时执行
      config.headers = new Headers(config.headers);
      config.headers.set('X-Conditional', 'true');
    }
    return config;
  }
});
```

插件系统为 Hook-Fetch 提供了无限的扩展可能性，让您能够根据具体需求定制请求行为。
