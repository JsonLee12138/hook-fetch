import type { TestServer } from './util';
import express from 'express';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import hookFetch from '../src/index';
import { dedupePlugin } from '../src/plugins/dedupe';
import { startTestSseServer } from './util';

describe('test dedup plugin', () => {
  let server: TestServer;
  let requestCount = 0;

  beforeAll(async () => {
    server = await startTestSseServer(9997, (app) => {
      app.use(express.json());

      app.get('/api/data', (_req, res) => {
        // 模拟一个稍慢的请求
        setTimeout(() => {
          requestCount++;
          res.json({
            message: 'success',
            count: requestCount,
            timestamp: Date.now(),
          });
        }, 50);
      });

      app.post('/api/create', (req, res) => {
        setTimeout(() => {
          requestCount++;
          res.json({
            message: 'created',
            count: requestCount,
            data: req.body,
          });
        }, 50);
      });

      app.get('/api/slow', (_req, res) => {
        // 模拟一个更慢的请求
        setTimeout(() => {
          requestCount++;
          res.json({
            message: 'slow response',
            count: requestCount,
          });
        }, 200);
      });
    });
  });

  afterAll(async () => {
    await server.close();
  });

  it('should dedupe concurrent identical requests', async () => {
    requestCount = 0;
    const instance = hookFetch.create({
      baseURL: server.baseURL,
      plugins: [dedupePlugin({})],
    });

    // 发起三个并发的相同请求
    const promises = [
      instance.get<{ message: string; count: number }>('/api/data'),
      instance.get<{ message: string; count: number }>('/api/data'),
      instance.get<{ message: string; count: number }>('/api/data'),
    ];

    const results = await Promise.allSettled(promises.map(p => p.json()));

    // 统计成功和失败的请求
    const fulfilled = results.filter(r => r.status === 'fulfilled');
    const rejected = results.filter(r => r.status === 'rejected');

    // 根据去重逻辑，应该只有第一个请求成功，后续请求应该被去重
    expect(requestCount).toBeLessThan(3);
    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(2);
  });

  it('should allow requests with different URLs', async () => {
    requestCount = 0;
    const instance = hookFetch.create({
      baseURL: server.baseURL,
      plugins: [dedupePlugin({})],
    });

    // 发起并发的不同 URL 请求
    const promises = [
      instance.get<{ message: string; count: number }>('/api/data').json(),
      instance.get<{ message: string; count: number }>('/api/slow').json(),
    ];

    const results = await Promise.all(promises);

    // 不同 URL 的请求不应该被去重
    expect(requestCount).toBe(2);
    expect(results[0]?.count).toBe(1);
    expect(results[1]?.count).toBe(2);
  });

  it('should allow requests with different methods', async () => {
    requestCount = 0;
    const instance = hookFetch.create({
      baseURL: server.baseURL,
      plugins: [dedupePlugin({})],
    });

    // 发起并发的不同方法请求（同一个路径）
    const promises = [
      instance.get<{ message: string; count: number }>('/api/data').json(),
      instance.post<{ message: string; count: number }>('/api/create', {
        name: 'test',
      }).json(),
    ];

    const results = await Promise.all(promises);

    // 不同方法的请求不应该被去重
    expect(requestCount).toBe(2);
    expect(results[0]?.message).toBe('success');
    expect(results[1]?.message).toBe('created');
  });

  it('should allow requests with different params', async () => {
    requestCount = 0;
    const instance = hookFetch.create({
      baseURL: server.baseURL,
      plugins: [dedupePlugin({})],
    });

    // 发起并发的不同参数请求
    const promises = [
      instance.get<{ message: string; count: number }>('/api/data', {
        params: { page: 1 },
      }).json(),
      instance.get<{ message: string; count: number }>('/api/data', {
        params: { page: 2 },
      }).json(),
    ];

    const results = await Promise.all(promises);

    // 不同参数的请求不应该被去重
    expect(requestCount).toBe(2);
    expect(results[0]?.count).toBe(1);
    expect(results[1]?.count).toBe(2);
  });

  it('should allow requests with different body data', async () => {
    requestCount = 0;
    const instance = hookFetch.create({
      baseURL: server.baseURL,
      plugins: [dedupePlugin({})],
    });

    // 发起并发的不同 body 数据请求
    const promises = [
      instance.post<{ message: string; count: number }>('/api/create', {
        name: 'test1',
      }).json(),
      instance.post<{ message: string; count: number }>('/api/create', {
        name: 'test2',
      }).json(),
    ];

    const results = await Promise.all(promises);

    // 不同 body 的请求不应该被去重
    expect(requestCount).toBe(2);
    expect(results[0]?.count).toBe(1);
    expect(results[1]?.count).toBe(2);
  });

  it('should respect dedupeAble option when set to false', async () => {
    requestCount = 0;
    const instance = hookFetch.create({
      baseURL: server.baseURL,
      plugins: [dedupePlugin({})],
    });

    // 发起三个并发请求，但禁用去重
    const promises = [
      instance.get<{ message: string; count: number }>('/api/data', {}, {
        extra: { dedupeAble: false },
      }).json(),
      instance.get<{ message: string; count: number }>('/api/data', {}, {
        extra: { dedupeAble: false },
      }).json(),
      instance.get<{ message: string; count: number }>('/api/data', {}, {
        extra: { dedupeAble: false },
      }).json(),
    ];

    const results = await Promise.all(promises);

    // 禁用去重时，所有请求都应该发出
    expect(requestCount).toBe(3);
    expect(results[0]?.count).toBe(1);
    expect(results[1]?.count).toBe(2);
    expect(results[2]?.count).toBe(3);
  });

  it('should allow sequential identical requests', async () => {
    requestCount = 0;
    const instance = hookFetch.create({
      baseURL: server.baseURL,
      plugins: [dedupePlugin({})],
    });

    // 顺序发起相同的请求
    const result1 = await instance.get<{ message: string; count: number }>('/api/data').json();
    const result2 = await instance.get<{ message: string; count: number }>('/api/data').json();
    const result3 = await instance.get<{ message: string; count: number }>('/api/data').json();

    // 顺序请求不应该被去重（因为前一个已经完成）
    expect(requestCount).toBe(3);
    expect(result1.count).toBe(1);
    expect(result2.count).toBe(2);
    expect(result3.count).toBe(3);
  });

  it('should handle mixed concurrent and sequential requests', async () => {
    requestCount = 0;
    const instance = hookFetch.create({
      baseURL: server.baseURL,
      plugins: [dedupePlugin({})],
    });

    // 第一批并发请求
    await Promise.allSettled([
      instance.get<{ message: string; count: number }>('/api/slow').json(),
      instance.get<{ message: string; count: number }>('/api/slow').json(),
    ]);

    // 等待第一批完成后，再发起一个请求
    const result3 = await instance.get<{ message: string; count: number }>('/api/slow').json();

    // 第一批应该有去重，第三个请求应该成功
    expect(requestCount).toBeLessThanOrEqual(2);
    expect(result3?.count).toBeDefined();
  });
});
