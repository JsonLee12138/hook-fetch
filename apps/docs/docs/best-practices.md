---
sidebar_position: 7
---

# 最佳实践

本文档总结了使用 Hook-Fetch 的最佳实践，帮助您构建高效、可维护的应用程序。

## 项目结构

### 推荐的项目结构

```
src/
├── api/
│   ├── index.ts          # API 实例配置
│   ├── endpoints.ts      # 端点定义
│   ├── types.ts          # 类型定义
│   └── plugins/          # 自定义插件
│       ├── auth.ts
│       ├── logger.ts
│       └── retry.ts
├── hooks/
│   ├── useApi.ts         # 通用 API Hook
│   ├── useAuth.ts        # 认证相关 Hook
│   └── useStream.ts      # 流式数据 Hook
└── utils/
    ├── constants.ts      # 常量定义
    └── helpers.ts        # 辅助函数
```

### API 实例配置

```typescript
// src/api/index.ts
import hookFetch from 'hook-fetch';
import { authPlugin } from './plugins/auth';
import { loggerPlugin } from './plugins/logger';
import { retryPlugin } from './plugins/retry';

// 创建主 API 实例
export const api = hookFetch.create({
  baseURL: process.env.REACT_APP_API_URL || 'https://api.example.com',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  },
  plugins: [
    authPlugin(),
    retryPlugin({ maxRetries: 3, delay: 1000 }),
    loggerPlugin()
  ]
});

// 创建专门的流式 API 实例
export const streamApi = hookFetch.create({
  baseURL: process.env.REACT_APP_STREAM_URL || 'https://stream.example.com',
  plugins: [
    authPlugin(),
    sseTextDecoderPlugin({
      json: true,
      prefix: 'data: ',
      doneSymbol: '[DONE]'
    })
  ]
});
```

### 端点定义

```typescript
// src/api/endpoints.ts
export const endpoints = {
  // 用户相关
  users: {
    list: '/users',
    detail: (id: string) => `/users/${id}`,
    create: '/users',
    update: (id: string) => `/users/${id}`,
    delete: (id: string) => `/users/${id}`
  },

  // 认证相关
  auth: {
    login: '/auth/login',
    logout: '/auth/logout',
    refresh: '/auth/refresh',
    profile: '/auth/profile'
  },

  // 流式端点
  stream: {
    chat: '/stream/chat',
    logs: '/stream/logs',
    metrics: '/stream/metrics'
  }
} as const;
```

### 类型定义

```typescript
// src/api/types.ts
export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse<T = any> {
  data: T;
  message: string;
  success: boolean;
  code: number;
}

export interface PaginatedResponse<T = any> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface StreamMessage {
  id: string;
  content: string;
  timestamp: number;
  type: 'user' | 'assistant' | 'system';
}
```

## 错误处理

### 全局错误处理

```typescript
// src/api/plugins/error.ts
export const errorHandlerPlugin = () => ({
  name: 'error-handler',
  async onError(error, config) {
    // 记录错误
    console.error(`[API Error] ${config.method} ${config.url}:`, error);

    // 根据错误类型处理
    if (error.response) {
      const status = error.response.status;

      switch (status) {
        case 401:
          // 未授权，重定向到登录页
          window.location.href = '/login';
          break;
        case 403:
          // 权限不足
          showNotification('权限不足', 'error');
          break;
        case 404:
          // 资源不存在
          showNotification('请求的资源不存在', 'error');
          break;
        case 500:
          // 服务器错误
          showNotification('服务器内部错误，请稍后重试', 'error');
          break;
        default:
          showNotification('请求失败，请检查网络连接', 'error');
      }
    } else if (error.name === 'AbortError') {
      // 请求被取消，通常不需要显示错误
      console.log('Request was aborted');
    } else {
      // 网络错误或其他错误
      showNotification('网络连接失败，请检查网络设置', 'error');
    }

    return error;
  }
});
```

### 组件级错误处理

```typescript
// src/hooks/useApi.ts
import { useHookFetch } from 'hook-fetch/react';
import { api } from '../api';

export function useApi() {
  const { request, loading, cancel } = useHookFetch({
    request: api.request,
    onError: (error) => {
      // 组件级错误处理
      if (error.response?.status === 422) {
        // 表单验证错误
        return error.response.json().then(data => {
          showValidationErrors(data.errors);
        });
      }
    }
  });

  return {
    request,
    loading,
    cancel,
    // 封装常用方法
    get: (url: string, params?: any) =>
      request(url, { method: 'GET', params }).json(),
    post: (url: string, data?: any) =>
      request(url, { method: 'POST', data }).json(),
    put: (url: string, data?: any) =>
      request(url, { method: 'PUT', data }).json(),
    delete: (url: string) =>
      request(url, { method: 'DELETE' }).json()
  };
}
```

## 性能优化

### 请求缓存

```typescript
// src/api/plugins/cache.ts
export const cachePlugin = (options = {}) => {
  const defaultOptions = {
    ttl: 5 * 60 * 1000, // 5分钟
    maxSize: 100,
    excludeMethods: ['POST', 'PUT', 'PATCH', 'DELETE']
  };

  const config = { ...defaultOptions, ...options };
  const cache = new Map();

  const getCacheKey = (url: string, params: any) => {
    const paramsStr = params ? JSON.stringify(params) : '';
    return `${url}?${paramsStr}`;
  };

  return {
    name: 'cache',
    async beforeRequest(requestConfig) {
      if (config.excludeMethods.includes(requestConfig.method)) {
        return requestConfig;
      }

      const key = getCacheKey(requestConfig.url, requestConfig.params);
      const cached = cache.get(key);

      if (cached && Date.now() - cached.timestamp < config.ttl) {
        // 返回缓存数据
        throw new Response(JSON.stringify(cached.data), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      return requestConfig;
    },
    async afterResponse(context, requestConfig) {
      if (config.excludeMethods.includes(requestConfig.method)) {
        return context;
      }

      const key = getCacheKey(requestConfig.url, requestConfig.params);

      // 限制缓存大小
      if (cache.size >= config.maxSize) {
        const firstKey = cache.keys().next().value;
        cache.delete(firstKey);
      }

      // 缓存响应
      cache.set(key, {
        data: context.result,
        timestamp: Date.now()
      });

      return context;
    }
  };
};
```

### 请求去重

```typescript
// src/api/plugins/dedupe.ts
export const dedupePlugin = () => {
  const pendingRequests = new Map();

  const getRequestKey = (url: string, method: string, params: any, data: any) => {
    return `${method}:${url}:${JSON.stringify(params)}:${JSON.stringify(data)}`;
  };

  return {
    name: 'dedupe',
    async beforeRequest(config) {
      const key = getRequestKey(config.url, config.method, config.params, config.data);

      if (pendingRequests.has(key)) {
        // 返回已存在的请求
        return pendingRequests.get(key);
      }

      // 创建新请求
      const request = hookFetch(config.url, config);
      pendingRequests.set(key, request);

      // 请求完成后清理
      request.finally(() => {
        pendingRequests.delete(key);
      });

      return request;
    }
  };
};
```

### 批量请求

```typescript
// src/utils/batch.ts
export class BatchRequestManager {
  private batchQueue: Array<{
    url: string;
    params: any;
    resolve: (data: any) => void;
    reject: (error: any) => void;
  }> = [];

  private batchTimeout: NodeJS.Timeout | null = null;

  constructor(
    private api: any,
    private batchSize = 10,
    private delay = 100
  ) {}

  async request(url: string, params: any): Promise<any> {
    return new Promise((resolve, reject) => {
      this.batchQueue.push({ url, params, resolve, reject });

      if (this.batchQueue.length >= this.batchSize) {
        this.processBatch();
      } else if (!this.batchTimeout) {
        this.batchTimeout = setTimeout(() => {
          this.processBatch();
        }, this.delay);
      }
    });
  }

  private async processBatch() {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }

    const currentBatch = this.batchQueue.splice(0, this.batchSize);

    try {
      const batchRequest = {
        requests: currentBatch.map(({ url, params }) => ({ url, params }))
      };

      const response = await this.api.post('/batch', batchRequest);

      response.results.forEach((result: any, index: number) => {
        const { resolve, reject } = currentBatch[index];
        if (result.success) {
          resolve(result.data);
        } else {
          reject(new Error(result.error));
        }
      });
    } catch (error) {
      currentBatch.forEach(({ reject }) => reject(error));
    }
  }
}
```

## 流式数据处理

### 流式数据管理

```typescript
// src/hooks/useStream.ts
import { useRef, useCallback } from 'react';
import { useHookFetch } from 'hook-fetch/react';

export function useStream<T = any>(requestFn: (...args: any[]) => any) {
  const dataRef = useRef<T[]>([]);
  const listenersRef = useRef<Set<(data: T[]) => void>>(new Set());

  const { stream, loading, cancel } = useHookFetch({
    request: requestFn,
    onError: (error) => {
      console.error('Stream error:', error);
    }
  });

  const subscribe = useCallback((listener: (data: T[]) => void) => {
    listenersRef.current.add(listener);

    return () => {
      listenersRef.current.delete(listener);
    };
  }, []);

  const startStream = useCallback(async (...args: any[]) => {
    dataRef.current = [];

    try {
      for await (const chunk of stream(...args)) {
        if (chunk.result) {
          dataRef.current.push(chunk.result);

          // 通知所有监听者
          listenersRef.current.forEach(listener => {
            listener([...dataRef.current]);
          });
        }
      }
    } catch (error) {
      console.error('Stream processing error:', error);
    }
  }, [stream]);

  const clear = useCallback(() => {
    dataRef.current = [];
    listenersRef.current.forEach(listener => {
      listener([]);
    });
  }, []);

  return {
    startStream,
    subscribe,
    clear,
    cancel,
    loading,
    data: dataRef.current
  };
}
```

### 流式数据缓冲

```typescript
// src/utils/streamBuffer.ts
export class StreamBuffer<T> {
  private buffer: T[] = [];
  private flushTimeout: NodeJS.Timeout | null = null;

  constructor(
    private onFlush: (items: T[]) => void,
    private bufferSize = 10,
    private flushInterval = 1000
  ) {}

  add(item: T) {
    this.buffer.push(item);

    if (this.buffer.length >= this.bufferSize) {
      this.flush();
    } else if (!this.flushTimeout) {
      this.flushTimeout = setTimeout(() => {
        this.flush();
      }, this.flushInterval);
    }
  }

  flush() {
    if (this.flushTimeout) {
      clearTimeout(this.flushTimeout);
      this.flushTimeout = null;
    }

    if (this.buffer.length > 0) {
      this.onFlush([...this.buffer]);
      this.buffer = [];
    }
  }

  clear() {
    this.buffer = [];
    if (this.flushTimeout) {
      clearTimeout(this.flushTimeout);
      this.flushTimeout = null;
    }
  }
}
```

## 测试

### 单元测试

```typescript
// src/api/__tests__/api.test.ts
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { api } from '../index';

// 模拟 fetch
global.fetch = vi.fn();

describe('API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should make GET request', async () => {
    const mockResponse = { data: { id: 1, name: 'John' } };

    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });

    const result = await api.get('/users/1').json();

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/users/1'),
      expect.objectContaining({
        method: 'GET'
      })
    );

    expect(result).toEqual(mockResponse);
  });

  it('should handle errors', async () => {
    (fetch as any).mockRejectedValueOnce(new Error('Network error'));

    await expect(api.get('/users/1').json()).rejects.toThrow('Network error');
  });
});
```

### 集成测试

```typescript
// src/hooks/__tests__/useApi.test.ts
import { renderHook, act } from '@testing-library/react';
import { useApi } from '../useApi';

describe('useApi', () => {
  it('should handle loading state', async () => {
    const { result } = renderHook(() => useApi());

    expect(result.current.loading).toBe(false);

    act(() => {
      result.current.get('/users');
    });

    expect(result.current.loading).toBe(true);
  });
});
```

## 安全性

### 认证和授权

```typescript
// src/api/plugins/auth.ts
export const authPlugin = () => ({
  name: 'auth',
  priority: 1,
  async beforeRequest(config) {
    const token = localStorage.getItem('authToken');

    if (token) {
      config.headers = new Headers(config.headers);
      config.headers.set('Authorization', `Bearer ${token}`);
    }

    return config;
  },
  async onError(error, config) {
    if (error.response?.status === 401) {
      // Token 过期，尝试刷新
      try {
        const newToken = await refreshToken();
        localStorage.setItem('authToken', newToken);

        // 重试原请求
        config.headers = new Headers(config.headers);
        config.headers.set('Authorization', `Bearer ${newToken}`);

        return hookFetch(config.url, config);
      } catch (refreshError) {
        // 刷新失败，跳转到登录页
        localStorage.removeItem('authToken');
        window.location.href = '/login';
      }
    }

    return error;
  }
});
```

### 请求签名

```typescript
// src/api/plugins/signature.ts
import { createHmac } from 'crypto';

export const signaturePlugin = (secretKey: string) => ({
  name: 'signature',
  async beforeRequest(config) {
    const timestamp = Date.now().toString();
    const nonce = Math.random().toString(36).substring(2);

    // 创建签名字符串
    const signString = `${config.method}${config.url}${timestamp}${nonce}`;
    const signature = createHmac('sha256', secretKey)
      .update(signString)
      .digest('hex');

    config.headers = new Headers(config.headers);
    config.headers.set('X-Timestamp', timestamp);
    config.headers.set('X-Nonce', nonce);
    config.headers.set('X-Signature', signature);

    return config;
  }
});
```

## 监控和调试

### 性能监控

```typescript
// src/api/plugins/performance.ts
export const performancePlugin = () => ({
  name: 'performance',
  async beforeRequest(config) {
    config.extra = {
      ...config.extra,
      startTime: performance.now()
    };
    return config;
  },
  async afterResponse(context, config) {
    const endTime = performance.now();
    const duration = endTime - (config.extra?.startTime || 0);

    // 记录性能指标
    console.log(`[Performance] ${config.method} ${config.url}: ${duration.toFixed(2)}ms`);

    // 发送到监控系统
    if (duration > 5000) { // 超过5秒的请求
      sendToMonitoring({
        type: 'slow_request',
        url: config.url,
        method: config.method,
        duration
      });
    }

    return context;
  }
});
```

### 调试工具

```typescript
// src/utils/debug.ts
export const createDebugger = (namespace: string) => {
  const isDebugEnabled = process.env.NODE_ENV === 'development' ||
                        localStorage.getItem('debug') === 'true';

  return {
    log: (...args: any[]) => {
      if (isDebugEnabled) {
        console.log(`[${namespace}]`, ...args);
      }
    },
    warn: (...args: any[]) => {
      if (isDebugEnabled) {
        console.warn(`[${namespace}]`, ...args);
      }
    },
    error: (...args: any[]) => {
      if (isDebugEnabled) {
        console.error(`[${namespace}]`, ...args);
      }
    }
  };
};
```

## 部署和生产环境

### 环境配置

```typescript
// src/config/index.ts
export const config = {
  apiUrl: process.env.REACT_APP_API_URL || 'https://api.example.com',
  streamUrl: process.env.REACT_APP_STREAM_URL || 'https://stream.example.com',
  timeout: parseInt(process.env.REACT_APP_TIMEOUT || '10000'),
  retryAttempts: parseInt(process.env.REACT_APP_RETRY_ATTEMPTS || '3'),
  debug: process.env.NODE_ENV === 'development'
};
```

### 生产环境优化

```typescript
// src/api/production.ts
import { config } from '../config';

export const productionApi = hookFetch.create({
  baseURL: config.apiUrl,
  timeout: config.timeout,
  plugins: [
    // 生产环境插件
    authPlugin(),
    retryPlugin({ maxRetries: config.retryAttempts }),
    cachePlugin({ ttl: 10 * 60 * 1000 }), // 10分钟缓存
    dedupePlugin(),
    errorHandlerPlugin(),
    ...(config.debug ? [loggerPlugin()] : []) // 只在调试模式下启用日志
  ]
});
```

通过遵循这些最佳实践，您可以构建出高性能、可维护且安全的应用程序。
