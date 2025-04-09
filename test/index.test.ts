import { describe, expect, test } from 'vitest';
import hookFetch from '../src/index';
import type { HookFetchPlugin } from '../src/types';

describe('test hook-fetch', () => {
  test('test normal request', async () => {
    const res = await hookFetch('https://jsonplaceholder.typicode.com/todos/1');
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
    const instance = hookFetch.create({
      baseURL: 'https://jsonplaceholder.typicode.com',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    interface TodoDTO {
      userId: number;
      id: number;
      title: string;
      completed: boolean;
    }

    const res = await instance.get<TodoDTO>('/todos/1');

    console.log(res);

    const result = { userId: 1, id: 1, title: 'delectus aut autem', completed: false };
    expect(res).toEqual(result);
  })

  test('test instance sse plugin', async () => {
    const instance = hookFetch.create({
      baseURL: 'https://sse.dev',
      headers: {
        'Content-Type': 'application/json',
      },
    })

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
    const instance = hookFetch.create({
      baseURL: 'https://jsonplaceholder.typicode.com',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    interface TodoDTO {
      userId: number;
      id: number;
      title: string;
      completed: boolean;
    }

    const requestPlugin = (): HookFetchPlugin<TodoDTO> => {
      return {
        name: 'request',
        async afterResponse(response) {
          if (response.result?.completed) {
            return response;
          } else {
            // throw new Error('not completed')
            return Promise.reject(new Error('not completed'))
          }
        },
        onError(error) {
          console.log(error, '>>>')
          throw new Error('customError', error)
        }
      }
    }

    instance.use(requestPlugin());

    try {
      const res = await instance.get<TodoDTO>('/todos/1');
      console.log(res)
    } catch (error) {
      console.log(error)
      expect(error).toEqual(new Error('not completed'))
    }
  })
})
