import type { HookFetchPlugin, ResponseError } from '../src';
import type { TestServer } from './util';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import hookFetch from '../src';
import { startTestSseServer } from './util';

describe('test hook-fetch', () => {
  let server: TestServer;

  beforeAll(async () => {
    server = await startTestSseServer(9995, (app) => {
      app.get('/api/test', (_, res) => {
        res.json({
          code: 401,
          message: 'test',
          msg: 'test',
        });
      });
      app.get('/api/unauthorized', (_, res) => {
        // res.json({
        //   code: 422,
        //   message: 'test',
        //   msg: 'test',
        // });
        res.status(422);
        res.send('Unauthorized');
        res.end();
      });
    });
  });

  afterAll(async () => {
    await server.close();
  });

  it('test error plugin', async () => {
    function errorHandlerPlugin(): HookFetchPlugin {
      return {
        name: 'error-handler',
        async onError(error) {
          expect(error.status).toBe(422);

          return error;
        },
      };
    }

    const request = hookFetch.create({
      baseURL: 'http://localhost:9995',
      plugins: [errorHandlerPlugin()],
    });

    try {
      await request.get('/api/unauthorized');
    }
    catch (error) {
      expect((error as ResponseError).status).toBe(422);
    }
  });
});
