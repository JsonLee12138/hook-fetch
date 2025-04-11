import { describe, expect, test } from 'vitest';
import hookFetch from '../src/index';
import type { HookFetchPlugin } from '../src/types';

describe('test hook-fetch', () => {
  interface TodoDTO {
    userId: number;
    id: number;
    title: string;
    completed: boolean;
  }

  test('test normal request', async () => {
    const res = await hookFetch('https://jsonplaceholder.typicode.com/todos/1');
    const result = { userId: 1, id: 1, title: 'delectus aut autem', completed: false };
    expect(res).toEqual(result);
  });

  test('test normal request retry', async () => {
    const req = hookFetch('https://jsonplaceholder.typicode.com/todos/1')
    req.abort()
    const newReq = req.retry();
    const res = await newReq;
    const result = { userId: 1, id: 1, title: 'delectus aut autem', completed: false };
    expect(res).toEqual(result);
  });

  test('test sse', async () => {
    const req = hookFetch('https://sse.dev/test');
    let i = 0;
    for await (const chunk of req.stream<AllowSharedBufferSource>()) {
      const decoder = new TextDecoder('utf-8');
      const msg = decoder.decode(chunk.result as AllowSharedBufferSource, { stream: true });
      console.log(msg)
      expect(typeof msg).toBe('string');
      i++;
      if (i >= 3) {
        req.abort();
        break;
      };
    }
  })

  test('test blob', async () => {
    const req = hookFetch('https://picsum.photos/200/300');
    const contentLength = (await req.response).headers.get('content-length');
    console.log(contentLength, 'size');

    for await (const chunk of req.stream<AllowSharedBufferSource>()) {
      console.log(chunk.source.length, 'stream')
    };

    const blob = await req.blob();
    console.log(blob);
    expect(blob instanceof Blob).toBe(true);
  })

  test('test text', async () => {
    const req = hookFetch('https://blog.chiyu.site');
    const text = await req.text();
    console.log(text);
    expect(typeof text).toBe('string');
  })

  test('test create', async () => {
    const instance = hookFetch.create({
      baseURL: 'https://jsonplaceholder.typicode.com',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    console.log(instance);
    expect(!!instance.request).toBe(true);
  })

  test('test instance get', async () => {
    const instance = hookFetch.create<TodoDTO>({
      baseURL: 'https://jsonplaceholder.typicode.com',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const res = await instance.get('/todos/1');

    console.log(res);

    const result = { userId: 1, id: 1, title: 'delectus aut autem', completed: false };
    expect(res).toEqual(result);
  })

  test('test instance default request', async () => {


    const instance = hookFetch.create<TodoDTO>({
      baseURL: 'https://jsonplaceholder.typicode.com',
      headers: {
        'Content-Type': 'application/json',
      },
    })


    console.log(instance)

    const res = await instance('/todos/1');

    console.log(res);

    const result = { userId: 1, id: 1, title: 'delectus aut autem', completed: false };
    expect(res).toEqual(result);
  })

  test('test instance get retry', async () => {
    const instance = hookFetch.create<TodoDTO>({
      baseURL: 'https://jsonplaceholder.typicode.com',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const req = instance.get('/todos/1');

    req.abort();

    const newReq = req.retry();

    const res = await newReq;
    console.log(res);

    const result = { userId: 1, id: 1, title: 'delectus aut autem', completed: false };

    expect(res).toEqual(result);
  })

  test('test instance get text', async () => {
    const instance = hookFetch.create({
      baseURL: 'https://blog.chiyu.site',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    try {
      const res = await instance.get('/posts').text();

      console.log(res);

      expect(typeof res).toEqual('string');
    } finally {
      console.log('ok')
    }
  })

  test('test instance sse plugin', async () => {
    const instance = hookFetch.create({
      baseURL: 'https://sse.dev',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    // 目前自带一下插件, 可在 hook-fetch/plugins 中引入, 名为 `sseTextDecoderPlugin`
    const ssePlugin = (): HookFetchPlugin => {
      const decoder = new TextDecoder('utf-8');
      return {
        name: 'sse',
        async transformStreamChunk(chunk) {
          if (!chunk.error) {
            chunk.result = decoder.decode(chunk.result as AllowSharedBufferSource, { stream: true });
          }
          return chunk;
        }
      }
    }

    instance.use(ssePlugin());

    const req = instance.get('/test');

    let i = 0;
    for await (const chunk of req.stream<string>()) {
      console.log(chunk.result);
      expect(typeof chunk.result).toBe('string');
      i++;
      if (i >= 3) {
        req.abort();
        break;
      };
    }
  })

  test('test instance request plugin', async () => {
    const instance = hookFetch.create<TodoDTO>({
      baseURL: 'https://jsonplaceholder.typicode.com',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const requestPlugin = (): HookFetchPlugin<TodoDTO> => {
      return {
        name: 'request',
        async afterResponse(response) {
          if (response.result?.completed) {
            return response;
          } else {
            throw new Error('not completed')
          }
        },
        async onError(error) {
          return new Error('customError', error)
        }
      }
    }

    instance.use(requestPlugin());

    try {
      await instance.get('/todos/1');
    } catch (error) {
      expect(error).toEqual(new Error('customError'))
    }
  })
})
