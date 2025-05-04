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
const response = await hookFetch('https://example.com/api/data');
console.log(response); // Response data is automatically parsed as JSON

// Using other HTTP methods
const postResponse = await hookFetch('https://example.com/api/data', {
  method: 'POST',
  data: { name: 'hook-fetch' }
});
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
const userData = await api.get('/users/1');
```

### HTTP Request Methods

```typescript
// GET request
const data = await api.get('/users', { page: 1, limit: 10 });

// POST request
const newUser = await api.post('/users', { name: 'John', age: 30 });

// PUT request
const updatedUser = await api.put('/users/1', { name: 'John Doe' });

// PATCH request
const patchedUser = await api.patch('/users/1', { age: 31 });

// DELETE request
const deleted = await api.delete('/users/1');

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

// JSON parsing (default)
const jsonData = await req;

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
const result = await newReq;
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
// This is just an example. You can use the provided plugin `sseTextDecoderPlugin`
const ssePlugin = () => {
  const decoder = new TextDecoder('utf-8');
  return {
    name: 'sse',
    async transformStreamChunk(chunk) {
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

Plugin hooks:
- `beforeRequest`: Handle configuration before sending the request
- `afterResponse`: Process data after receiving the response
- `transformStreamChunk`: Handle streaming data chunks
- `onError`: Handle request errors
- `onFinally`: Callback after request completion

## Generic Support

Hook-Fetch provides comprehensive TypeScript support, allowing you to define explicit types for requests and responses:

```typescript
interface BaseResponseVO {
  code: number;
  data: never;
  message: string;
}

const request = hookFetch.create<BaseResponseVO>({
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
const res = await request.get<User>('/users/1');
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
  beforeRequest?: (config: RequestConfig) => Promise<RequestConfig>;

  // Post-response processing
  afterResponse?: (context: FetchPluginContext) => Promise<FetchPluginContext>;

  // Stream data chunk transformation
  transformStreamChunk?: (chunk: StreamContext) => Promise<StreamContext>;

  // Error handling
  onError?: (error: Error) => Promise<Error | void | ResponseError>;

  // Request completion processing
  onFinally?: (context: FetchPluginContext) => Promise<void>;
}
```

### vscode hint plugin reference path
```typescript
// Create a file hook-fetch.d.ts in src with the following content
/// <reference types="hook-fetch/plugins" />
```

## Notes

1. Hook-Fetch automatically parses JSON responses by default.
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

- [Discord](https://discord.gg/Ah55KD5d)
