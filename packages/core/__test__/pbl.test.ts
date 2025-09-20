import type { HookFetchPlugin, ResponseError } from '../src/index';
import { describe, expect, it } from 'vitest';
import hookFetch from '../src/index';

describe('test error', () => {
  const jwtPlugin: HookFetchPlugin = {
    name: 'jwt-plugin',
    beforeRequest: (context) => {
      console.log(context, 'context::beforeRequest');
      return context;
    },
    afterResponse: (context) => {
      console.log(context, 'context::afterResponse');
      return context;
    },
    onError: (error) => {
      console.log(error, 'error::onError');
      return error;
    },
    onFinally: (context) => {
      console.log(context, 'context::onFinally');
    },
  };

  const request = hookFetch.create({
    baseURL: 'http://localhost:3000/api',
  });
  request.use(jwtPlugin);

  it('test error', async () => {
    try {
      const res = await request.get('/test').json();
      console.log(res, 'res::test error');
    }
    catch (error) {
      expect((error as ResponseError).name).toBe('Fail Request');
    }
  });
});
