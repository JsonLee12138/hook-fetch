import type { HookFetchPlugin } from '../src/index';
import type { TestServer } from './util';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import hookFetch from '../src/index';
import { startTestSseServer } from './util';

function getRequestKey(url: string, method: string, params: any, data: any) {
  return `${url}::${method}::${JSON.stringify(params)}::${JSON.stringify(data)}`;
}

function cachePlugin(): HookFetchPlugin<unknown, { ttl: number }> {
  const cache = new Map();
  return {
    name: 'cache',
    beforeRequest: (config) => {
      const key = getRequestKey(
        config.url,
        config.method,
        config.params,
        config.data,
      );
      const cached = cache.get(key);
      if (cached) {
        // 修复：如果缓存未过期，返回缓存数据
        if (cached.timestamp + (config.extra?.ttl ?? 1000) > Date.now()) {
          return {
            ...config,
            resolve: () => new Response(JSON.stringify(cached.data), {
              status: 302,
              headers: { 'Content-Type': 'application/json' },
            }),
          };
        }
        else {
          // 缓存已过期，删除缓存
          cache.delete(key);
        }
      }
      return config;
    },
    afterResponse: (context) => {
      const { config } = context;
      const key = getRequestKey(
        config.url,
        config.method,
        config.params,
        config.data,
      );
      cache.set(key, {
        data: context.result,
        timestamp: Date.now(),
      });
      return context;
    },
  };
}

interface TodoDTO {
  userId: number;
  id: number;
  title: string;
  completed: boolean;
}

describe('test cache plugin', () => {
  let server: TestServer;
  let requestCount = 0;

  beforeAll(async () => {
    server = await startTestSseServer(9998, (app) => {
      app.get('/api/data', (_req, res) => {
        requestCount++;
        res.json({
          message: 'success',
          count: requestCount,
          timestamp: Date.now(),
        });
      });

      app.post('/api/create', (_req, res) => {
        requestCount++;
        res.json({
          message: 'created',
          count: requestCount,
        });
      });

      app.get('/api/todos', (_req, res) => {
        requestCount++;
        res.json({
          items: [{ id: 1, title: 'test' }],
          count: requestCount,
        });
      });
    });
  });

  afterAll(async () => {
    await server.close();
  });

  it('should cache response and return cached data on second request', async () => {
    requestCount = 0;
    const instance = hookFetch.create({
      baseURL: server.baseURL,
      plugins: [cachePlugin()],
    });

    // 第一次请求，应该发起实际请求
    const firstResponse = await instance.request<{ message: string; count: number }>('/api/data', {
      extra: { ttl: 5000 }, // 5秒缓存
    }).json();

    expect(firstResponse.count).toBe(1);
    expect(requestCount).toBe(1);

    // 第二次请求，应该返回缓存数据
    const secondResponse = await instance.request<{ message: string; count: number }>('/api/data', {
      extra: { ttl: 5000 },
    }).json();

    expect(secondResponse.count).toBe(1); // 返回缓存的 count
    expect(requestCount).toBe(1); // 请求计数不增加
  });

  it('should make new request when cache expires', async () => {
    requestCount = 0;
    const instance = hookFetch.create({
      baseURL: server.baseURL,
      plugins: [cachePlugin()],
    });

    // 第一次请求
    const firstResponse = await instance.request<{ message: string; count: number }>('/api/data', {
      extra: { ttl: 100 }, // 100ms 缓存
    }).json();

    expect(firstResponse.count).toBe(1);
    expect(requestCount).toBe(1);

    // 等待缓存过期
    await new Promise(resolve => setTimeout(resolve, 150));

    // 缓存过期后，应该发起新请求
    const secondResponse = await instance.request<{ message: string; count: number }>('/api/data', {
      extra: { ttl: 100 },
    }).json();

    expect(secondResponse.count).toBe(2); // 新的请求返回新的 count
    expect(requestCount).toBe(2); // 请求计数增加
  });

  it('should use different cache keys for different URLs', async () => {
    requestCount = 0;
    const instance = hookFetch.create({
      baseURL: server.baseURL,
      plugins: [cachePlugin()],
    });

    // 请求不同的 URL
    const response1 = await instance.request<{ message: string; count: number }>('/api/data', {
      extra: { ttl: 5000 },
    }).json();

    const response2 = await instance.request<{ items: any[]; count: number }>('/api/todos', {
      extra: { ttl: 5000 },
    }).json();

    expect(response1.count).toBe(1);
    expect(response2.count).toBe(2);
    expect(requestCount).toBe(2); // 两个不同的请求
  });

  it('should use different cache keys for different methods', async () => {
    requestCount = 0;
    const instance = hookFetch.create({
      baseURL: server.baseURL,
      plugins: [cachePlugin()],
    });

    // GET 请求
    const getResponse = await instance.get<{ message: string; count: number }>('/api/data', {}, {
      extra: { ttl: 5000 },
    }).json();

    // POST 请求到同一个路径
    const postResponse = await instance.post<{ message: string; count: number }>('/api/create', void 0, {
      extra: { ttl: 5000 },
    }).json();

    expect(getResponse.count).toBe(1);
    expect(postResponse.count).toBe(2);
    expect(requestCount).toBe(2); // 不同方法应该分别缓存
  });

  it('should use different cache keys for different params', async () => {
    requestCount = 0;
    const instance = hookFetch.create({
      baseURL: server.baseURL,
      plugins: [cachePlugin()],
    });

    // 带不同参数的请求
    const response1 = await instance.get<{ message: string; count: number }>('/api/data', {
      params: { page: 1 },
      extra: { ttl: 5000 },
    }).json();

    const response2 = await instance.get<{ message: string; count: number }>('/api/data', {
      params: { page: 2 },
      extra: { ttl: 5000 },
    }).json();

    expect(response1.count).toBe(1);
    expect(response2.count).toBe(2);
    expect(requestCount).toBe(2); // 不同参数应该分别缓存
  });

  it('should use different cache keys for different data', async () => {
    requestCount = 0;
    const instance = hookFetch.create({
      baseURL: server.baseURL,
      plugins: [cachePlugin()],
    });

    // 带不同 body 数据的请求
    const response1 = await instance.post<{ message: string; count: number }>('/api/create', {
      name: 'test1',
    }, {
      extra: { ttl: 5000 },
    }).json();

    const response2 = await instance.post<{ message: string; count: number }>('/api/create', {
      name: 'test2',
    }, {
      extra: { ttl: 5000 },
    }).json();

    expect(response1.count).toBe(1);
    expect(response2.count).toBe(2);
    expect(requestCount).toBe(2); // 不同 body 应该分别缓存
  });

  it('should use default ttl when not specified', async () => {
    requestCount = 0;
    const instance = hookFetch.create({
      baseURL: server.baseURL,
      plugins: [cachePlugin()],
    });

    // 不指定 ttl，使用默认值 1000ms
    const firstResponse = await instance.get<{ message: string; count: number }>('/api/data').json();

    expect(firstResponse.count).toBe(1);
    expect(requestCount).toBe(1);

    // 在默认 ttl 内再次请求，应该返回缓存
    const secondResponse = await instance.get<{ message: string; count: number }>('/api/data').json();

    expect(secondResponse.count).toBe(1);
    expect(requestCount).toBe(1);
  });

  it('should work with external API', async () => {
    const instance = hookFetch.create({
      plugins: [cachePlugin()],
    });

    // 第一次请求外部 API
    const firstResponse = await instance.get<TodoDTO>('https://jsonplaceholder.typicode.com/todos/1', {
      extra: { ttl: 10000 },
    }).json();

    expect(firstResponse.id).toBe(1);
    expect(firstResponse.title).toBeTruthy();

    // 第二次请求应该返回缓存
    const secondResponse = await instance.get<TodoDTO>('https://jsonplaceholder.typicode.com/todos/1', {
      extra: { ttl: 10000 },
    }).json();

    // 验证返回相同的数据
    expect(secondResponse).toEqual(firstResponse);
  });
});
