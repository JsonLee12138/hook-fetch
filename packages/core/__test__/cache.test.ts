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
    beforeRequest({ config, resolve }) {
      const key = getRequestKey(
        config.url,
        config.method,
        (config as any).params,
        (config as any).data,
      );
      const cached = cache.get(key);
      if (cached) {
        if (cached.timestamp + ((config.extra as any)?.ttl ?? 1000) > Date.now()) {
          return resolve(cached.data);
        }
        else {
          cache.delete(key);
        }
      }
      return config;
    },
    afterResponse(ctx) {
      const { config } = ctx;
      const key = getRequestKey(
        config.url,
        config.method,
        (config as any).params,
        (config as any).data,
      );
      cache.set(key, {
        data: ctx.result,
        timestamp: Date.now(),
      });
      return ctx;
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

    const firstResponse = await instance.request<{ message: string; count: number }>('/api/data', {
    }).json();

    expect(firstResponse.count).toBe(1);
    expect(requestCount).toBe(1);

    const secondResponse = await instance.request<{ message: string; count: number }>('/api/data', {
    }).json();

    expect(secondResponse.count).toBe(1);
    expect(requestCount).toBe(1);
  });

  it('should make new request when cache expires', async () => {
    requestCount = 0;
    const instance = hookFetch.create({
      baseURL: server.baseURL,
      plugins: [cachePlugin()],
    });

    const firstResponse = await instance.request<{ message: string; count: number }>('/api/data', {
      extra: { ttl: 100 },
    }).json();

    expect(firstResponse.count).toBe(1);
    expect(requestCount).toBe(1);

    await new Promise(resolve => setTimeout(resolve, 150));

    const secondResponse = await instance.request<{ message: string; count: number }>('/api/data', {
      extra: { ttl: 100 },
    }).json();

    expect(secondResponse.count).toBe(2);
    expect(requestCount).toBe(2);
  });

  it('should use different cache keys for different URLs', async () => {
    requestCount = 0;
    const instance = hookFetch.create({
      baseURL: server.baseURL,
      plugins: [cachePlugin()],
    });

    const response1 = await instance.request<{ message: string; count: number }>('/api/data', {
      extra: { ttl: 5000 },
    }).json();

    const response2 = await instance.request<{ items: any[]; count: number }>('/api/todos', {
      extra: { ttl: 5000 },
    }).json();

    expect(response1.count).toBe(1);
    expect(response2.count).toBe(2);
    expect(requestCount).toBe(2);
  });

  it('should use different cache keys for different methods', async () => {
    requestCount = 0;
    const instance = hookFetch.create({
      baseURL: server.baseURL,
      plugins: [cachePlugin()],
    });

    const getResponse = await instance.get<{ message: string; count: number }>('/api/data', {}, {
      extra: { ttl: 5000 },
    }).json();

    const postResponse = await instance.post<{ message: string; count: number }>('/api/create', void 0, {
      extra: { ttl: 5000 },
    }).json();

    expect(getResponse.count).toBe(1);
    expect(postResponse.count).toBe(2);
    expect(requestCount).toBe(2);
  });

  it('should use different cache keys for different params', async () => {
    requestCount = 0;
    const instance = hookFetch.create({
      baseURL: server.baseURL,
      plugins: [cachePlugin()],
    });

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
    expect(requestCount).toBe(2);
  });

  it('should use different cache keys for different data', async () => {
    requestCount = 0;
    const instance = hookFetch.create({
      baseURL: server.baseURL,
      plugins: [cachePlugin()],
    });

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
    expect(requestCount).toBe(2);
  });

  it('should use default ttl when not specified', async () => {
    requestCount = 0;
    const instance = hookFetch.create({
      baseURL: server.baseURL,
      plugins: [cachePlugin()],
    });

    const firstResponse = await instance.get<{ message: string; count: number }>('/api/data').json();

    expect(firstResponse.count).toBe(1);
    expect(requestCount).toBe(1);

    const secondResponse = await instance.get<{ message: string; count: number }>('/api/data').json();

    expect(secondResponse.count).toBe(1);
    expect(requestCount).toBe(1);
  });

  it('should work with external API', async () => {
    const instance = hookFetch.create({
      plugins: [cachePlugin()],
    });

    const firstResponse = await instance.get<TodoDTO>('https://jsonplaceholder.typicode.com/todos/1', {
      extra: { ttl: 10000 },
    }).json();

    expect(firstResponse.id).toBe(1);
    expect(firstResponse.title).toBeTruthy();

    const secondResponse = await instance.get<TodoDTO>('https://jsonplaceholder.typicode.com/todos/1', {
      extra: { ttl: 10000 },
    }).json();

    expect(secondResponse).toEqual(firstResponse);
  });
});
