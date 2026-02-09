import type { HookFetchPlugin, ResponseError } from '../src';
import type { TestServer } from './util';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import hookFetch from '../src';
import { startTestSseServer } from './util';

describe('test onError context in plugins', () => {
  let server: TestServer;
  let failureCount = 0;

  beforeAll(async () => {
    server = await startTestSseServer(9993, (app) => {
      app.get('/api/flaky', (_, res) => {
        failureCount++;
        if (failureCount < 3) {
          res.status(500);
          res.json({ error: 'Server error' });
        } else {
          res.status(200);
          res.json({ data: 'success', attempts: failureCount });
        }
      });

      app.get('/api/permanent-error', (_, res) => {
        res.status(400);
        res.json({ error: 'Bad request' });
      });
    });
  });

  afterAll(async () => {
    await server.close();
  });

  it('should provide context parameter in onError', async () => {
    function contextCheckPlugin(): HookFetchPlugin<any, any> {
      return {
        name: 'context-check',
        onError({ error, config, resolve, reject }) {
          expect(error).toBeDefined();
          expect(config).toBeDefined();
          expect(typeof resolve).toBe('function');
          expect(typeof reject).toBe('function');
          // Don't handle — let error propagate
        },
      };
    }

    const instance = hookFetch.create({
      baseURL: server.baseURL,
      plugins: [contextCheckPlugin()],
    });

    try {
      await instance.get('/api/permanent-error').json();
    } catch {
      // Expected to fail
    }
  });

  it('should allow plugin to resolve request early with resolve()', async () => {
    function resolveOnErrorPlugin(): HookFetchPlugin<any, any> {
      return {
        name: 'resolve-on-error',
        onError({ error, resolve }) {
          if (error.status === 400) {
            return resolve({
              data: 'fallback value',
              error: true,
            });
          }
          return;
        },
      };
    }

    const instance = hookFetch.create({
      baseURL: server.baseURL,
      plugins: [resolveOnErrorPlugin()],
    });

    const result = await instance.get('/api/permanent-error').json();
    expect(result['data']).toBe('fallback value');
    expect(result['error']).toBe(true);
  });

  it('should allow plugin to reject and let it propagate', async () => {
    function rejectPlugin(): HookFetchPlugin<any, any> {
      return {
        name: 'custom-reject',
        onError({ error, reject }) {
          return reject(error);
        },
      };
    }

    const instance = hookFetch.create({
      baseURL: server.baseURL,
      plugins: [rejectPlugin()],
    });

    try {
      await instance.get('/api/permanent-error').json();
      throw new Error('Expected error to be thrown');
    } catch (error) {
      expect((error as ResponseError).status).toBe(400);
    }
  });

  it('should be backward compatible with legacy plugins (no context usage)', async () => {
    function legacyPlugin(): HookFetchPlugin<any, any> {
      return {
        name: 'legacy',
        onError({ error, config }) {
          expect(error).toBeDefined();
          expect(config).toBeDefined();
          // Don't handle — let error propagate
        },
      };
    }

    const instance = hookFetch.create({
      baseURL: server.baseURL,
      plugins: [legacyPlugin()],
    });

    try {
      await instance.get('/api/permanent-error').json();
    } catch (error) {
      expect((error as ResponseError).status).toBe(400);
    }
  });
});
