import { describe, expect, test } from 'vitest';
import hookFetch from '../src/index';
import type { HookFetchPlugin } from '../src/types';
import type { Generic } from 'typescript-api-pro';

describe('test hook-fetch', () => {
  interface TodoDTO {
    userId: number;
    id: number;
    title: string;
    completed: boolean;
  }

  test('test normal request', async () => {
    const res = await hookFetch('https://jsonplaceholder.typicode.com/todos/1').json();
    const result = { userId: 1, id: 1, title: 'delectus aut autem', completed: false };
    expect(res).toEqual(result);
  });

  test('test normal request retry', async () => {
    const req = hookFetch('https://jsonplaceholder.typicode.com/todos/1');
    req.abort()
    const newReq = req.retry().json();
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

    const res = await instance.get('/todos/1').json();

    console.log(res);

    const result = { userId: 1, id: 1, title: 'delectus aut autem', completed: false };
    expect(res).toEqual(result);
  })

  test('test instance default request', async () => {
    interface BaseDTO {
      code: number;
      data: null;
      msg: string;
    }

    const body: Generic<BaseDTO, 'data', TodoDTO> = {
      code: 1,
      data: {
        id: 1,
        userId: 1,
        title: 'delectus aut autem',
        completed: false,
      },
      msg: 'ok'
    }

    const instance = hookFetch.create<BaseDTO, 'data'>({
      baseURL: 'https://jsonplaceholder.typicode.com',
      headers: {
        'Content-Type': 'application/json',
      },
    })


    // console.log(instance)
    const res = await instance.post<TodoDTO>('/posts', body).json();

    console.log(res);

    const result = {
      code: 1,
      data: { id: 1, userId: 1, title: 'delectus aut autem', completed: false },
      msg: 'ok',
      id: 101
    };
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

    const newReq = req.retry().json();

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
          console.log(response, 'response');
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
      await instance.get('/todos/1').json();
    } catch (error) {
      console.log(error);
      expect(error).toEqual(new Error('customError'))
    }
  })

  test('test file upload with FormData', async () => {
    // 创建一个测试用的文件
    const fileContent = 'Hello, this is a test file content!';
    const file = new File([fileContent], 'test.txt', { type: 'text/plain' });

    // 创建 FormData 对象
    const formData = new FormData();
    formData.append('file', file);
    formData.append('description', 'Test file upload');
    formData.append('userId', '123');

    // 使用支持文件上传的测试服务
    const res = await hookFetch.upload('https://httpbin.org/post', {
      file,
      description: 'Test file upload',
      userId: '123'
    }).json();

    console.log('File upload response:', res);

    // 验证响应包含我们上传的数据
    expect(res.form).toBeDefined();
    expect(res.form.description).toBe('Test file upload');
    expect(res.form.userId).toBe('123');
    expect(res.files).toBeDefined();
    expect(res.files.file).toBeDefined();
  });

  // TODO: 后面的没用测试过
  test('test file upload with instance', async () => {
    const instance = hookFetch.create({
      baseURL: 'https://httpbin.org',
      headers: {
        'Accept': 'application/json',
      },
    });

    // 创建测试文件
    const fileContent = 'Test file content for instance upload';
    const file = new File([fileContent], 'instance-test.txt', { type: 'text/plain' });

    const formData = new FormData();
    formData.append('file', file);
    formData.append('metadata', JSON.stringify({
      uploadTime: new Date().toISOString(),
      version: '1.0.0'
    }));

    const res = await instance.post('/post', formData).json();

    console.log('Instance file upload response:', res);

    expect(res.form).toBeDefined();
    expect(res.form.metadata).toBeDefined();
    expect(res.files).toBeDefined();
    expect(res.files.file).toBeDefined();
  });

  test('test multiple files upload', async () => {
    // 创建多个测试文件
    const file1 = new File(['File 1 content'], 'file1.txt', { type: 'text/plain' });
    const file2 = new File(['File 2 content'], 'file2.txt', { type: 'text/plain' });
    const imageContent = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]); // PNG header
    const file3 = new File([imageContent], 'test.png', { type: 'image/png' });

    const formData = new FormData();
    formData.append('files', file1);
    formData.append('files', file2);
    formData.append('image', file3);
    formData.append('title', 'Multiple files upload test');

    const res = await hookFetch('https://httpbin.org/post', {
      method: 'POST',
      data: formData
    }).json();

    console.log('Multiple files upload response:', res);

    expect(res.form).toBeDefined();
    expect(res.form.title).toBe('Multiple files upload test');
    expect(res.files).toBeDefined();
    expect(res.files.files).toBeDefined();
    expect(res.files.image).toBeDefined();
  });

  test('test file upload with progress tracking', async () => {
    const fileContent = 'Large file content for progress testing '.repeat(1000); // 创建较大的文件
    const file = new File([fileContent], 'large-file.txt', { type: 'text/plain' });

    const formData = new FormData();
    formData.append('file', file);
    formData.append('uploadType', 'progress-test');

    const req = hookFetch('https://httpbin.org/post', {
      method: 'POST',
      data: formData
    });

    // 监听上传进度（通过流式处理）
    let chunkCount = 0;
    for await (const chunk of req.stream<AllowSharedBufferSource>()) {
      chunkCount++;
      console.log(`Upload chunk ${chunkCount}, size: ${chunk.source.length} bytes`);

      // 限制处理的块数量，避免测试时间过长
      if (chunkCount >= 5) {
        req.abort();
        break;
      }
    }

    // 由于我们中断了流，这里会抛出错误，这是预期的
    try {
      await req;
    } catch (error) {
      console.log('Upload was aborted as expected:', error);
      expect(error).toBeDefined();
    }
  });

  test('test file upload with custom headers', async () => {
    const file = new File(['Custom headers test file'], 'custom-headers.txt', { type: 'text/plain' });

    const formData = new FormData();
    formData.append('file', file);
    formData.append('customField', 'customValue');

    const res = await hookFetch('https://httpbin.org/post', {
      method: 'POST',
      data: formData,
      headers: {
        'X-Custom-Header': 'custom-value',
        'Authorization': 'Bearer test-token',
        'X-Upload-Source': 'test-suite'
      }
    }).json();

    console.log('Custom headers upload response:', res);

    expect(res.form).toBeDefined();
    expect(res.form.customField).toBe('customValue');
    expect(res.headers).toBeDefined();
    expect(res.headers['X-Custom-Header']).toBe('custom-value');
    expect(res.headers['Authorization']).toBe('Bearer test-token');
    expect(res.headers['X-Upload-Source']).toBe('test-suite');
  });

  test('test error', async () => {
    const instance = hookFetch.create({
      baseURL: 'http://localhost:3000',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    const requestPlugin = (): HookFetchPlugin<any> => {
      return {
        name: 'error',
        async onError(error) {
          return error
        }
      }
    }
    instance.use(requestPlugin());
    try {
      await instance.get('/test');
    } catch (error) {
      expect(error.status).toEqual(401)
    }
  })
})
