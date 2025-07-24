---
sidebar_position: 2
---

# 常见问题

本页面收集了使用 Hook-Fetch 时的常见问题和解决方案。

## 基础使用

### Q: Hook-Fetch 与 Axios 有什么区别？

**A:** Hook-Fetch 相比 Axios 有以下优势：

1. **更轻量**: 基于原生 fetch API，包体积更小
2. **更现代**: 原生支持 Promise 和 async/await
3. **流式处理**: 内置强大的流式数据处理能力
4. **插件系统**: 灵活的插件架构，易于扩展
5. **TypeScript**: 更好的类型支持和类型推断

```typescript
// Axios 风格
const response = await axios.get('/users');
const data = response.data;

// Hook-Fetch 风格
const data = await hookFetch('/users').json();
```

### Q: 如何设置全局配置？

**A:** 使用 `create` 方法创建实例：

```typescript
const api = hookFetch.create({
  baseURL: 'https://api.example.com',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer token'
  }
});
```

### Q: 如何处理错误？

**A:** Hook-Fetch 提供多种错误处理方式：

```typescript
// 1. try-catch
try {
  const data = await api.get('/users').json();
} catch (error) {
  console.error('Request failed:', error);
}

// 2. catch 方法
const data = await api.get('/users')
  .catch(error => {
    console.error('Request failed:', error);
    return { users: [] }; // 默认值
  })
  .json();

// 3. 插件处理
api.use({
  name: 'error-handler',
  async onError(error, config) {
    console.error(`Error in ${config.url}:`, error);
    return error;
  }
});
```

## 流式处理

### Q: 如何处理 Server-Sent Events (SSE)？

**A:** 使用内置的 SSE 插件：

```typescript
import { sseTextDecoderPlugin } from 'hook-fetch/plugins/sse';

const api = hookFetch.create({
  plugins: [
    sseTextDecoderPlugin({
      json: true,
      prefix: 'data: ',
      doneSymbol: '[DONE]'
    })
  ]
});

for await (const chunk of api.get('/sse-endpoint').stream()) {
  console.log(chunk.result);
}
```

### Q: 流式数据处理中如何处理错误？

**A:** 在流式处理中，错误会出现在 `chunk.error` 中：

```typescript
for await (const chunk of request.stream()) {
  if (chunk.error) {
    console.error('Chunk error:', chunk.error);
    continue; // 跳过错误块
  }

  // 处理正常数据
  console.log(chunk.result);
}
```

### Q: 如何中断流式请求？

**A:** 使用 `abort()` 方法：

```typescript
const request = api.get('/stream');

// 5秒后中断
setTimeout(() => {
  request.abort();
}, 5000);

try {
  for await (const chunk of request.stream()) {
    console.log(chunk.result);
  }
} catch (error) {
  if (error.name === 'AbortError') {
    console.log('Stream was aborted');
  }
}
```

## 插件系统

### Q: 如何创建自定义插件？

**A:** 插件是一个包含钩子函数的对象：

```typescript
const myPlugin = () => ({
  name: 'my-plugin',
  priority: 1, // 可选，数字越小优先级越高
  async beforeRequest(config) {
    // 请求前处理
    console.log('Before request:', config.url);
    return config;
  },
  async afterResponse(context, config) {
    // 响应后处理
    console.log('After response:', context.response.status);
    return context;
  }
});

api.use(myPlugin());
```

### Q: 插件的执行顺序是什么？

**A:** 插件按以下顺序执行：

1. **beforeRequest** - 按优先级从高到低
2. **beforeStream** - 仅流式请求
3. **transformStreamChunk** - 流式数据转换
4. **afterResponse** - 按优先级从高到低
5. **onError** - 错误处理
6. **onFinally** - 最终清理

### Q: 如何在插件间共享数据？

**A:** 使用 `config.extra` 字段：

```typescript
const plugin1 = () => ({
  name: 'plugin1',
  async beforeRequest(config) {
    config.extra = { ...config.extra, startTime: Date.now() };
    return config;
  }
});

const plugin2 = () => ({
  name: 'plugin2',
  async afterResponse(context, config) {
    const duration = Date.now() - config.extra.startTime;
    console.log(`Request took ${duration}ms`);
    return context;
  }
});
```

## 框架集成

### Q: 在 React 中如何管理请求状态？

**A:** 使用 `useHookFetch` Hook：

```typescript
import { useHookFetch } from 'hook-fetch/react';

function UserProfile({ userId }) {
  const { request, loading, cancel } = useHookFetch({
    request: (id) => api.get(`/users/${id}`),
    onError: (error) => console.error('Request failed:', error)
  });

  const [user, setUser] = useState(null);

  const loadUser = async () => {
    const userData = await request(userId).json();
    setUser(userData);
  };

  return (
    <div>
      <button onClick={loadUser} disabled={loading}>
        {loading ? 'Loading...' : 'Load User'}
      </button>
      {user && <div>{user.name}</div>}
    </div>
  );
}
```

### Q: Vue 3 中如何使用？

**A:** 使用 Vue 版本的 `useHookFetch`：

```vue
<script setup>
import { ref } from 'vue';
import { useHookFetch } from 'hook-fetch/vue';

const user = ref(null);
const userId = ref('1');

const { request, loading, cancel } = useHookFetch({
  request: (id) => api.get(`/users/${id}`),
  onError: (error) => console.error('Request failed:', error)
});

const loadUser = async () => {
  const userData = await request(userId.value).json();
  user.value = userData;
};
</script>
```

## 性能优化

### Q: 如何避免重复请求？

**A:** 使用去重插件：

```typescript
const dedupePlugin = () => {
  const pendingRequests = new Map();

  return {
    name: 'dedupe',
    async beforeRequest(config) {
      const key = `${config.method}:${config.url}`;

      if (pendingRequests.has(key)) {
        return pendingRequests.get(key);
      }

      const request = hookFetch(config.url, config);
      pendingRequests.set(key, request);

      request.finally(() => {
        pendingRequests.delete(key);
      });

      return request;
    }
  };
};
```

### Q: 如何实现请求缓存？

**A:** 创建缓存插件：

```typescript
const cachePlugin = (ttl = 5 * 60 * 1000) => {
  const cache = new Map();

  return {
    name: 'cache',
    async beforeRequest(config) {
      if (config.method !== 'GET') return config;

      const key = `${config.url}?${JSON.stringify(config.params)}`;
      const cached = cache.get(key);

      if (cached && Date.now() - cached.timestamp < ttl) {
        throw new Response(JSON.stringify(cached.data), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      return config;
    },
    async afterResponse(context, config) {
      if (config.method !== 'GET') return context;

      const key = `${config.url}?${JSON.stringify(config.params)}`;
      cache.set(key, {
        data: context.result,
        timestamp: Date.now()
      });

      return context;
    }
  };
};
```

### Q: 如何优化大量并发请求？

**A:** 使用批量请求管理器：

```typescript
class BatchRequestManager {
  private queue = [];
  private batchSize = 10;
  private delay = 100;

  async request(url, params) {
    return new Promise((resolve, reject) => {
      this.queue.push({ url, params, resolve, reject });

      if (this.queue.length >= this.batchSize) {
        this.processBatch();
      } else {
        setTimeout(() => this.processBatch(), this.delay);
      }
    });
  }

  private async processBatch() {
    const batch = this.queue.splice(0, this.batchSize);

    try {
      const response = await api.post('/batch', {
        requests: batch.map(({ url, params }) => ({ url, params }))
      });

      response.results.forEach((result, index) => {
        if (result.success) {
          batch[index].resolve(result.data);
        } else {
          batch[index].reject(new Error(result.error));
        }
      });
    } catch (error) {
      batch.forEach(({ reject }) => reject(error));
    }
  }
}
```

## 调试和测试

### Q: 如何调试请求？

**A:** 使用日志插件：

```typescript
const loggerPlugin = () => ({
  name: 'logger',
  async beforeRequest(config) {
    console.log(`→ ${config.method} ${config.url}`, config);
    return config;
  },
  async afterResponse(context, config) {
    console.log(`← ${config.method} ${config.url}`, context.response.status);
    return context;
  },
  async onError(error, config) {
    console.error(`✗ ${config.method} ${config.url}`, error);
    return error;
  }
});
```

### Q: 如何在测试中模拟请求？

**A:** 模拟 fetch API：

```typescript
// 使用 vitest
import { vi } from 'vitest';

// 模拟 fetch
global.fetch = vi.fn();

// 测试中
test('should fetch user data', async () => {
  const mockUser = { id: 1, name: 'John' };

  fetch.mockResolvedValueOnce({
    ok: true,
    json: async () => mockUser
  });

  const user = await api.get('/users/1').json();

  expect(user).toEqual(mockUser);
  expect(fetch).toHaveBeenCalledWith(
    expect.stringContaining('/users/1'),
    expect.objectContaining({ method: 'GET' })
  );
});
```

## 常见错误

### Q: 为什么会出现 "TypeError: Failed to fetch" 错误？

**A:** 这通常是由以下原因造成的：

1. **网络连接问题**: 检查网络连接
2. **CORS 问题**: 确保服务器配置了正确的 CORS 头
3. **URL 错误**: 检查请求 URL 是否正确
4. **SSL 证书问题**: 在开发环境中可能遇到

解决方案：

```typescript
// 添加错误处理
api.use({
  name: 'network-error-handler',
  async onError(error, config) {
    if (error.message === 'Failed to fetch') {
      console.error('Network error. Please check your connection.');
      // 可以显示用户友好的错误消息
    }
    return error;
  }
});
```

### Q: 为什么流式请求没有数据？

**A:** 检查以下几点：

1. **服务器是否支持流式响应**
2. **Content-Type 是否正确** (通常是 `text/plain` 或 `text/event-stream`)
3. **是否使用了正确的插件**

```typescript
// 确保使用 SSE 插件
const api = hookFetch.create({
  plugins: [
    sseTextDecoderPlugin({
      json: true,
      prefix: 'data: '
    })
  ]
});

// 检查响应头
for await (const chunk of api.get('/stream').stream()) {
  console.log('Chunk:', chunk);
}
```

### Q: 为什么插件没有生效？

**A:** 检查以下几点：

1. **插件是否正确注册**
2. **插件名称是否唯一**
3. **优先级设置是否正确**

```typescript
// 确保插件被正确注册
const api = hookFetch.create({
  plugins: [myPlugin()] // 注意要调用函数
});

// 或者使用 use 方法
api.use(myPlugin());

// 检查插件是否注册成功
console.log('Registered plugins:', api.plugins);
```

## 迁移指南

### Q: 如何从 Axios 迁移到 Hook-Fetch？

**A:** 以下是常见的迁移模式：

```typescript
// Axios
const response = await axios.get('/users', { params: { page: 1 } });
const data = response.data;

// Hook-Fetch
const data = await hookFetch('/users', { params: { page: 1 } }).json();

// Axios 拦截器
axios.interceptors.request.use(config => {
  config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Hook-Fetch 插件
api.use({
  name: 'auth',
  async beforeRequest(config) {
    config.headers = new Headers(config.headers);
    config.headers.set('Authorization', `Bearer ${token}`);
    return config;
  }
});
```

如果您有其他问题，请查看 [GitHub Issues](https://github.com/JsonLee12138/hook-fetch/issues) 或提交新的问题。
