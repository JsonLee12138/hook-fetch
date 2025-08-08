# Hook-Fetch 🚀

**[中文文档](https://github.com/JsonLee12138/hook-fetch/blob/main/README.md)**

## Introduction

Hook-Fetch is a powerful request library based on the native fetch API, offering a simpler syntax, richer features, and a more flexible plugin system. It supports request retries, streaming data processing, request cancellation, and more. With its Promise-based chaining style, API requests become simpler and more controllable.

## Installation

```bash
# Using npm
npm install hook-fetch

# Using yarn
yarn add hook-fetch

# Using pnpm
pnpm add hook-fetch
```

## Basic Usage

### Making a Simple Request

```typescript
import hookFetch from 'hook-fetch';

// Make a GET request
const response = await hookFetch('https://example.com/api/data').json();
console.log(response); // Call json() method to parse response data as JSON

// Using other HTTP methods
const postResponse = await hookFetch('https://example.com/api/data', {
  method: 'POST',
  data: { name: 'hook-fetch' }
}).json();
```

### Creating an Instance

```typescript
// Create an instance with a base URL
const api = hookFetch.create({
  baseURL: 'https://example.com',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 5000, // Timeout in milliseconds
});

// Use the instance to make requests
const userData = await api.get('/users/1').json();
```

### HTTP Request Methods

```typescript
// GET request
const data = await api.get('/users', { page: 1, limit: 10 }).json();

// POST request
const newUser = await api.post('/users', { name: 'John', age: 30 }).json();

// PUT request
const updatedUser = await api.put('/users/1', { name: 'John Doe' }).json();

// PATCH request
const patchedUser = await api.patch('/users/1', { age: 31 }).json();

// DELETE request
const deleted = await api.delete('/users/1').json();

// HEAD request
const headers = await api.head('/users/1');

// OPTIONS request
const options = await api.options('/users');
```

## Advanced Features

### Response Handling

Hook-Fetch supports various response data handling methods:

```typescript
const req = hookFetch('https://example.com/api/data');

// JSON parsing
const jsonData = await req.json();

// Text parsing
const textData = await req.text();

// Blob handling
const blobData = await req.blob();

// ArrayBuffer handling
const arrayBufferData = await req.arrayBuffer();

// FormData handling
const formDataResult = await req.formData();

// Byte stream handling
const bytesData = await req.bytes();
```

### Cancelling Requests

```typescript
const req = api.get('/long-running-process');

// Cancel the request later
setTimeout(() => {
  req.abort();
}, 1000);
```

### Request Retry

```typescript
// Make a request
const req = api.get('/users/1');

// Cancel the request
req.abort();

// Retry the request
const newReq = req.retry();
const result = await newReq.json();
```

### Streaming Data Processing

```typescript
const req = hookFetch('https://sse.dev/test');

// Process streaming data
for await (const chunk of req.stream()) {
  console.log(chunk.result);
}
```

### Plugin System

Hook-Fetch offers a robust plugin system allowing intervention at various stages of the request lifecycle:

```typescript
// Custom plugin example: SSE text decoding plugin
// This is just an example. It's recommended to use the provided `sseTextDecoderPlugin` which has more comprehensive handling
const ssePlugin = () => {
  const decoder = new TextDecoder('utf-8');
  return {
    name: 'sse',
    async transformStreamChunk(chunk, config) {
      if (!chunk.error) {
        chunk.result = decoder.decode(chunk.result, { stream: true });
      }
      return chunk;
    }
  }
};

// Register the plugin
api.use(ssePlugin());

// Use the request with the plugin
const req = api.get('/sse-endpoint');
for await (const chunk of req.stream<string>()) {
  console.log(chunk.result); // Processed into text by the plugin
}
```

#### Plugin Lifecycle Examples

```typescript
// Complete plugin example showing the usage of each lifecycle hook
const examplePlugin = () => {
  return {
    name: 'example',
    priority: 1, // Priority, lower numbers have higher priority

    // Pre-request processing
    async beforeRequest(config) {
      // Can modify request configuration
      config.headers = new Headers(config.headers);
      config.headers.set('authorization', `Bearer ${tokenValue}`);
      return config;
    },

    // Post-response processing
    async afterResponse(context) {
      // Can process response data. context.result is the result after being processed by methods like json()
      if (context.responseType === 'json') {
        // For example, determine if the request is truly successful based on the backend's business code
        if(context.result.code === 200){
          // Business success, return context directly
          return context
        }else{
          // Business failure, actively throw a ResponseError, which will be caught in the onError hook
          throw new ResponseError({
            message: context.result.message, // Use the error message from the backend
            status: context.result.code,     // Use the business code as the status
            response: context.response,      // Original Response object
            config: context.config,
            name: 'BusinessError'            // Custom error name
          });
        }
      }
      return context;
    },

    // Stream initialization processing, for advanced usage refer to sseTextDecoderPlugin (https://github.com/JsonLee12138/hook-fetch/blob/main/src/plugins/sse.ts)
    async beforeStream(body, config) {
      // Can transform or wrap the stream
      return body;
    },

    // Stream chunk processing, supports returning iterators and async iterators which will be automatically processed into multiple messages
    async transformStreamChunk(chunk, config) {
      // Can process each data chunk
      if (!chunk.error) {
        chunk.result = `Processed: ${chunk.result}`;
      }
      return chunk;
    },

    // Error handling
    async onError(error) {
      // The error object could be a network error or a ResponseError thrown from afterResponse
      // You can handle errors uniformly here, e.g., reporting, logging, or transforming the error info
      if (error.name === 'BusinessError') {
        // Handle custom business errors
        console.error(`Business Error: ${error.message}`);
      } else if (error.status === 401) {
        // Handle unauthorized error
        console.error('Login has expired, please log in again');
        // window.location.href = '/login';
      }
      // Re-throw the processed (or original) error so it can be caught by the final catch block
      return error;
    },

    // Request completion processing
    async onFinally(context, config) {
      // Clean up resources or log
      console.log(`Request to ${config.url} completed`);
    }
  };
};
```

All lifecycle hooks support both synchronous and asynchronous operations. They can return either a Promise or a direct value. Each hook function receives the current configuration object (config), which can be used to make decisions and handle different request scenarios.

## Generic Support

Hook-Fetch provides comprehensive TypeScript support, allowing you to define explicit types for requests and responses:

```typescript
interface BaseResponseVO {
  code: number;
  data: never;
  message: string;
}

const request = hookFetch.create<BaseResponseVO, 'data'>({
  baseURL: 'https://example.com',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 5000,
});

// Define response data type
interface User {
  id: number;
  name: string;
  email: string;
}

// Use the type in a request
const res = await request.get<User>('/users/1').json();
console.log(res.data); // TypeScript provides complete type hints
```

## Complete API

### Request Configuration Options

```typescript
interface RequestOptions {
  // Base URL for requests
  baseURL: string;

  // Request timeout (milliseconds)
  timeout: number;

  // Request headers
  headers: HeadersInit;

  // List of plugins
  plugins: Array<HookFetchPlugin>;

  // Whether to include credentials (cookies, etc.)
  withCredentials: boolean;

  // URL parameters
  params: any;

  // Request body data
  data: any;

  // Controller (for cancelling requests)
  controller: AbortController;

  // Extra data (can be passed to plugins)
  extra: any;

  // Array parameter serialization format
  qsArrayFormat: 'indices' | 'brackets' | 'repeat' | 'comma';

  // Request method
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
}
```

### Plugin Type

```typescript
interface HookFetchPlugin<T = unknown, E = unknown, P = unknown, D = unknown> {
  // Plugin name
  name: string;

  // Priority (lower numbers have higher priority)
  priority?: number;

  // Pre-request processing
  beforeRequest?: (config: RequestConfig<P, D, E>) => Promise<RequestConfig<P, D, E>> | RequestConfig<P, D, E>;

  // Post-response processing
  afterResponse?: (context: FetchPluginContext<T, E, P, D>, config: RequestConfig<P, D, E>) => Promise<FetchPluginContext<T, E, P, D>> | FetchPluginContext<T, E, P, D>;

  // Stream initialization processing
  beforeStream?: (body: ReadableStream<any>, config: RequestConfig<P, D, E>) => Promise<ReadableStream<any>> | ReadableStream<any>;

  // Stream data chunk transformation
  transformStreamChunk?: (chunk: StreamContext<any>, config: RequestConfig<P, D, E>) => Promise<StreamContext> | StreamContext;

  // Error handling
  onError?: (error: Error, config: RequestConfig<P, D, E>) => Promise<Error | void | ResponseError<E>> | Error | void | ResponseError<E>;

  // Request completion processing
  onFinally?: (context: FetchPluginContext<T, E, P, D>, config: RequestConfig<P, D, E>) => Promise<void> | void;
}
```





## Vue Hooks

Hook-Fetch provides Vue Composition API support, making it easier to use in Vue components:

```typescript
import { useHookFetch } from 'hook-fetch/vue';
import hookFetch from 'hook-fetch';

// Create request instance
const api = hookFetch.create({
  baseURL: 'https://api.example.com'
});

// Use in component
const YourComponent = defineComponent({
  setup() {
    // Use useHookFetch
    const { request, loading, cancel, text, stream, blob, arrayBufferData, formDataResult, bytesData } = useHookFetch({
      request: api.get,
      onError: (error) => {
        console.error('Request error:', error);
      }
    });

    // Make request
    const fetchData = async () => {
      const response = await request('/users').json();
      console.log(response);
    };

    // Get text response
    const fetchText = async () => {
      const text = await text('/text');
      console.log(text);
    };

    // Handle streaming response
    const handleStream = async () => {
      for await (const chunk of stream('/stream')) {
        console.log(chunk);
      }
    };

    // Cancel request
    const handleCancel = () => {
      cancel();
    };

    return {
      loading,
      fetchData,
      fetchText,
      handleStream,
      handleCancel
    };
  }
});
```

## React Hooks

Hook-Fetch also provides React Hooks support, making it convenient to use in React components:

```typescript
import { useHookFetch } from 'hook-fetch/react';
import hookFetch from 'hook-fetch';

// Create request instance
const api = hookFetch.create({
  baseURL: 'https://api.example.com'
});

// Use in component
const YourComponent = () => {
  // Use useHookFetch
  const { request, loading, setLoading, cancel, text, stream, blob, arrayBufferData, formDataResult, bytesData } = useHookFetch({
    request: api.get,
    onError: (error) => {
      console.error('Request error:', error);
    }
  });

  // Make request
  const fetchData = async () => {
    const response = await request('/users').json();
    console.log(response);
  };

  // Get text response
  const fetchText = async () => {
    const text = await text('/text');
    console.log(text);
  };

  // Handle streaming response
  const handleStream = async () => {
    for await (const chunk of stream('/stream')) {
      console.log(chunk);
    }
  };

  // Cancel request
  const handleCancel = () => {
    cancel();
  };

  return (
    <div>
      <div>Loading status: {loading ? 'Loading' : 'Completed'}</div>
      <button onClick={fetchData}>Fetch Data</button>
      <button onClick={fetchText}>Fetch Text</button>
      <button onClick={handleStream}>Handle Stream</button>
      <button onClick={handleCancel}>Cancel Request</button>
    </div>
  );
};
```

### vscode hint plugin reference path
```typescript
// Create a file hook-fetch.d.ts in src with the following content
/// <reference types="hook-fetch/plugins" />
/// <reference types="hook-fetch/react" />
/// <reference types="hook-fetch/vue" />
```

## Notes

1. Hook-Fetch requires explicitly calling the `.json()` method to parse JSON responses.
2. All request methods return Promise objects.
3. You can retry aborted requests using the `.retry()` method.
4. Plugins execute in order of priority.

## Upcoming Features
- `umd` support
- More plugin support

## 📝 Contribution Guide
Feel free to submit `issues` or `pull requests` to help improve `Hook-Fetch`.

## 📄 License

MIT

## Contact US

- [Discord](https://discord.gg/666U6JTCQY)
