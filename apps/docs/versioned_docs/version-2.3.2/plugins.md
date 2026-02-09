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
      json: true, // 自动解析 JSON
      prefix: 'data: ',
      splitSeparator: '\n\n', // 事件分隔符
      doneSymbol: '[DONE]' // 结束标记
    })
  ]
});

// 使用 SSE
for await (const chunk of api.get('/sse-endpoint').stream()) {
  console.log(chunk.result); // 自动解析的数据
}
```

### 请求去重插件 (不推荐)

:::warning 官方不推荐使用
虽然我们提供了请求去重插件,但**官方并不推荐在生产环境中使用**。去重逻辑会增加系统复杂度,可能导致意外的行为。建议在应用层面通过设计来避免重复请求,例如:

- 禁用按钮防止重复点击
- 使用防抖/节流处理用户输入
- 使用请求状态管理避免并发请求

由于很多开发者有这个场景需求,我们提供了该插件作为临时解决方案,但请谨慎使用。
:::

请求去重插件用于防止并发的相同请求,仅当第一个请求完成后才允许后续相同请求执行:

```typescript
import { dedupePlugin, isDedupeError } from 'hook-fetch/plugins/dedupe';

const api = hookFetch.create({
  baseURL: 'https://api.example.com',
  plugins: [dedupePlugin({})]
});

// 发起多个并发的相同请求
const promises = [
  api.get('/users/1').json(),
  api.get('/users/1').json(), // 会被去重,抛出 DedupeError
  api.get('/users/1').json(), // 会被去重,抛出 DedupeError
];

const results = await Promise.allSettled(promises);

// 检查是否是去重错误
results.forEach((result, index) => {
  if (result.status === 'rejected' && isDedupeError(result.reason)) {
    console.log(`请求 ${index + 1} 被去重`);
  }
  else if (result.status === 'fulfilled') {
    console.log(`请求 ${index + 1} 成功:`, result.value);
  }
});
```

**插件配置选项:**

```typescript
interface DedupePluginOptions {
  // 当前版本暂无配置选项
}
```

**去重规则:**

去重插件通过以下参数组合生成请求的唯一标识:

- URL
- HTTP 方法 (GET, POST 等)
- URL 参数 (params)
- 请求体数据 (data)

当检测到相同标识的请求正在进行时,后续请求会抛出 `DedupeError`。

**禁用特定请求的去重:**

可以通过 `extra.dedupeAble` 选项禁用特定请求的去重功能:

```typescript
// 该请求不会被去重
const response = await api.get('/users/1', {}, {
  extra: { dedupeAble: false }
}).json();
```

**去重行为说明:**

```typescript
const api = hookFetch.create({
  plugins: [dedupePlugin({})]
});

// ✅ 并发相同请求会被去重
Promise.all([
  api.get('/users/1').json(), // 正常执行
  api.get('/users/1').json(), // 被去重,抛出错误
]);

// ✅ 顺序请求不会被去重
await api.get('/users/1').json(); // 第一个请求
await api.get('/users/1').json(); // 第二个请求,正常执行

// ✅ 不同参数的请求不会被去重
Promise.all([
  api.get('/users/1', { params: { page: 1 } }).json(), // 正常执行
  api.get('/users/1', { params: { page: 2 } }).json(), // 正常执行
]);

// ✅ 不同 HTTP 方法的请求不会被去重
Promise.all([
  api.get('/users/1').json(), // 正常执行
  api.post('/users/1').json(), // 正常执行
]);
```

**错误处理:**

```typescript
try {
  const response = await api.get('/users/1').json();
}
catch (error) {
  if (isDedupeError(error)) {
    // 处理去重错误
    console.log('检测到重复请求');
  }
  else {
    // 处理其他错误
    console.error('请求失败:', error);
  }
}
```

## 自定义插件示例

### 1. 认证插件

自动添加认证头：

```typescript
function authPlugin(getToken: () => string) {
  return {
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
  };
}

// 使用
const api = hookFetch.create({
  plugins: [authPlugin(() => localStorage.getItem('token') || '')]
});
```

### 2. 日志插件

记录请求和响应：

```typescript
function loggerPlugin() {
  return {
    name: 'logger',
    async beforeRequest(config) {
      console.log(`[${config.method}] ${config.url}`);
      return config;
    },
    async afterResponse(context, config) {
      console.log(`[${config.method}] ${config.url} - ${context.response.status}`);
      return context;
    },
    async onError(error) {
      console.error(`Error:`, error.message);
      return error;
    }
  };
}
```

### 3. 重试插件

自动重试失败的请求：

```typescript
// 注意：重试插件应该在请求失败后手动调用 retry() 方法
// 或者使用 beforeRequest 钩子来配置重试逻辑
function retryPlugin(maxRetries = 3, delay = 1000) {
  return {
    name: 'retry',
    async onError(error, config) {
      const retryCount = config.extra?.retryCount || 0;

      if (retryCount < maxRetries && error.response?.status >= 500) {
        console.log(`重试请求 (${retryCount + 1}/${maxRetries})`);
        // 延迟后可以让调用者使用 retry() 方法重试
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      return error;
    }
  };
}

// 使用示例：
// const req = api.get('/endpoint');
// try {
//   const data = await req.json();
// } catch (error) {
//   // 手动重试
//   const retryReq = req.retry();
//   const data = await retryReq.json();
// }
```

### 4. 缓存插件

缓存请求的响应：

```typescript
// 内存缓存插件，通过插件参数配置 TTL
// 注意：缓存插件与去重插件功能不同
// - 缓存插件: 存储响应结果，避免重复请求，提高性能
// - 去重插件: 防止并发相同请求，不缓存结果
function cachePlugin(options = {}) {
  const defaultOptions = {
    ttl: 5 * 60 * 1000, // 默认 5 分钟
  };
  const config = { ...defaultOptions, ...options };
  const cache = new Map();

  const getRequestKey = (url: string, method: string, params: any, data: any) => {
    return `${url}::${method}::${JSON.stringify(params)}::${JSON.stringify(data)}`;
  };

  return {
    name: 'cache',
    async beforeRequest(requestConfig) {
      const key = getRequestKey(
        requestConfig.url,
        requestConfig.method,
        requestConfig.params,
        requestConfig.data
      );
      const cached = cache.get(key);

      if (cached) {
        // 检查缓存是否过期
        if (cached.timestamp + config.ttl > Date.now()) {
          // 返回缓存数据，使用 resolve 属性
          return {
            ...requestConfig,
            resolve: () => new Response(JSON.stringify(cached.data), {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            })
          };
        }
        else {
          // 缓存已过期，删除缓存
          cache.delete(key);
        }
      }

      return requestConfig;
    },
    async afterResponse(context, requestConfig) {
      const key = getRequestKey(
        requestConfig.url,
        requestConfig.method,
        requestConfig.params,
        requestConfig.data
      );

      // 缓存响应数据
      cache.set(key, {
        data: context.result,
        timestamp: Date.now()
      });

      return context;
    }
  };
}

// 使用示例：使用默认 5 分钟缓存
const api = hookFetch.create({
  plugins: [cachePlugin()]
});

await api.get('/users/1').json();

// 自定义 TTL（10 秒）
const fastCacheApi = hookFetch.create({
  plugins: [cachePlugin({ ttl: 10 * 1000 })]
});

await fastCacheApi.get('/users/1').json();
```

### 5. 流式数据转换插件

转换流式数据：

```typescript
function streamTransformPlugin() {
  return {
    name: 'stream-transform',
    async transformStreamChunk(chunk, config) {
      if (!chunk.error && typeof chunk.result === 'string') {
        try {
        // 尝试解析 JSON
          chunk.result = JSON.parse(chunk.result);
        }
        catch {
        // 如果不是 JSON，保持原样
        }
      }
      return chunk;
    }
  };
}
```

### 6. 错误转换插件

转换和丰富错误信息：

```typescript
function errorTransformPlugin() {
  return {
    name: 'error-transform',
    async onError(error) {
      // error 是 ResponseError 实例，已包含完整的错误信息
      console.error('请求失败:', {
        message: error.message,
        status: error.status,
        statusText: error.statusText,
        url: error.config?.url,
        method: error.config?.method
      });

      // 可以根据 status 返回不同的友好提示
      if (error.status === 404) {
        error.message = '请求的资源不存在';
      }
      else if (error.status === 403) {
        error.message = '没有权限访问该资源';
      }
      else if (error.status && error.status >= 500) {
        error.message = '服务器错误，请稍后重试';
      }

      return error;
    }
  };
}
```

## 插件开发最佳实践

### 1. 命名规范

- 使用描述性的名称
- 避免与其他插件冲突
- 使用 kebab-case 格式

### 2. 错误处理

插件中的错误会自动被框架捕获，无需在每个插件中单独 try-catch。如果需要特殊的错误处理逻辑，可以使用 `onError` 钩子：

```typescript
function errorHandlingPlugin() {
  return {
    name: 'error-handling',
    async beforeRequest(config) {
      // 验证配置
      if (!config.url) {
        throw new Error('URL is required');
      }
      return config;
    },
    async onError(error) {
      // 统一处理所有错误
      console.error('请求错误:', error.message);

      // 可以进行错误上报
      reportErrorToService(error);

      return error;
    }
  };
}
```

### 3. 性能考虑

- 避免在插件中执行耗时操作
- 使用异步操作时要谨慎
- 考虑缓存计算结果

### 4. 配置验证

```typescript
function configurablePlugin(options = {}) {
  const defaultOptions = {
    enabled: true,
    headerPrefix: 'X-Custom-'
  };

  const config = { ...defaultOptions, ...options };

  return {
    name: 'configurable-plugin',
    async beforeRequest(requestConfig) {
      // 仅在启用时执行插件逻辑
      if (config.enabled) {
        requestConfig.headers = new Headers(requestConfig.headers);
        requestConfig.headers.set(
          `${config.headerPrefix}Timestamp`,
          Date.now().toString()
        );
      }

      return requestConfig;
    }
  };
}
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
function debugPlugin() {
  return {
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
  };
}
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
// 推荐：直接在 baseURL 中配置
const api = hookFetch.create({
  baseURL: 'https://api.example.com',
  headers: {
    'X-API-Key': 'my-api-key'
  }
});

// 仅在需要多个接口代理时使用插件
function multiApiPlugin(apiConfigs: Record<string, { baseURL: string; apiKey: string }>) {
  return {
    name: 'multi-api',
    async beforeRequest(config) {
      // 根据 URL 前缀选择不同的 API 配置
      const apiName = config.extra?.apiName;
      const apiConfig = apiConfigs[apiName];

      if (apiConfig) {
        config.headers = new Headers(config.headers);
        config.headers.set('X-API-Key', apiConfig.apiKey);

        if (!config.url.startsWith('http')) {
          config.url = `${apiConfig.baseURL}${config.url}`;
        }
      }

      return config;
    }
  };
}

// 使用示例：代理多个 API
const api = hookFetch.create({
  plugins: [
    multiApiPlugin({
      github: { baseURL: 'https://api.github.com', apiKey: 'github-key' },
      gitlab: { baseURL: 'https://gitlab.com/api/v4', apiKey: 'gitlab-key' }
    })
  ]
});

// 指定使用哪个 API
await api.get('/users', {}, { extra: { apiName: 'github' } }).json();
await api.get('/projects', {}, { extra: { apiName: 'gitlab' } }).json();
```

### 条件插件

```typescript
function conditionalPlugin(condition: () => boolean) {
  return {
    name: 'conditional',
    async beforeRequest(config) {
      if (condition()) {
      // 只在满足条件时执行
        config.headers = new Headers(config.headers);
        config.headers.set('X-Conditional', 'true');
      }
      return config;
    }
  };
}
```

插件系统为 Hook-Fetch 提供了无限的扩展可能性，让您能够根据具体需求定制请求行为。
