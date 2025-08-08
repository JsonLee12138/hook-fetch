---
sidebar_position: 3
---

# API Reference

This document provides a complete API reference for Hook-Fetch, including all methods, configuration options, and type definitions.

## Main Exports

```typescript
import hookFetch, {
  get, post, put, patch, del, head, options, upload, request
} from 'hook-fetch';
```

## Default Export

### `hookFetch(url, options?)`

The main request function.

**Parameters:**
- `url` (string): The request URL
- `options` (RequestOptions, optional): Request configuration

**Returns:** `HookFetchRequest<T>` - Request object

**Example:**
```typescript
const response = await hookFetch('https://api.example.com/users').json();
```

### `hookFetch.create<R extends AnyObject | null = null, K extends keyof R = never, E = AnyObject>(options)`

Creates a configured Hook-Fetch instance.

**Parameters:**
- `options` (BaseOptions): Instance configuration

**Returns:** `HookFetch` - Instance object with generics `<R, K, E>`

**Example:**
```typescript
// 1) No wrapper (default <null, never>)
const api = hookFetch.create({
  baseURL: 'https://api.example.com',
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// json<User>() returns User directly
const user = await api.get<User>('/users/1').json();

// 2) Wrapped response with mapped key
interface ResponseVO { code: number; message: string; data: never }
const wrapped = hookFetch.create<ResponseVO, 'data'>({ baseURL: 'https://api.example.com' });
const res = await wrapped.get<User>('/users/1').json();
// res.data is User
```

## Convenience Methods

### `get(url, params?, options?)`

Makes a GET request.

**Parameters:**
- `url` (string): Request URL
- `params` (object, optional): Query parameters
- `options` (GetOptions, optional): Request configuration

**Example:**
```typescript
const users = await get('/users', { page: 1, limit: 10 }).json();
```

### `post(url, data?, options?)`

Makes a POST request.

**Parameters:**
- `url` (string): Request URL
- `data` (any, optional): Request body data
- `options` (PostOptions, optional): Request configuration

**Example:**
```typescript
const newUser = await post('/users', { name: 'John', email: 'john@example.com' }).json();
```

### `put(url, data?, options?)`

Makes a PUT request.

### `patch(url, data?, options?)`

Makes a PATCH request.

### `del(url, options?)`

Makes a DELETE request.

### `head(url, params?, options?)`

Makes a HEAD request.

### `options(url, params?, options?)`

Makes an OPTIONS request.

### `upload(url, data?, options?)`

Makes a file upload request.

**Example:**
```typescript
const result = await upload('/upload', {
  file: fileInput.files[0],
  name: 'My File'
}).json();
```

## HookFetch Instance Methods

### `use(plugin)`

Registers a plugin.

**Parameters:**
- `plugin` (HookFetchPlugin): Plugin object

**Returns:** `this` - The instance itself (supports method chaining)

**Example:**
```typescript
api.use(myPlugin());
```

### `abortAll()`

Aborts all ongoing requests.

## HookFetchRequest Methods

### Response Methods

- `json()` - Parse response as JSON
- `text()` - Parse response as text
- `blob()` - Parse response as Blob
- `arrayBuffer()` - Parse response as ArrayBuffer
- `formData()` - Parse response as FormData
- `bytes()` - Parse response as bytes

### Stream Methods

- `stream()` - Get response as stream

### Control Methods

- `abort()` - Abort the request
- `retry()` - Retry the request

## Configuration Options

### BaseOptions

```typescript
interface BaseOptions {
  /** Base URL for requests */
  baseURL?: string;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Default headers */
  headers?: HeadersInit;
  /** List of plugins */
  plugins?: HookFetchPlugin[];
  /** Include credentials */
  withCredentials?: boolean;
}
```

### RequestOptions

```typescript
interface RequestOptions<P, D, E> {
  /** HTTP method */
  method?: RequestMethod;
  /** Query parameters */
  params?: P;
  /** Request body data */
  data?: D;
  /** Request headers */
  headers?: HeadersInit;
  /** Request timeout */
  timeout?: number;
  /** Extra data for plugins */
  extra?: E;
  /** Include credentials */
  withCredentials?: boolean;
  /** Array format in query string */
  qsArrayFormat?: 'indices' | 'brackets' | 'repeat' | 'comma';
}
```

## Plugin System

### HookFetchPlugin Interface

```typescript
interface HookFetchPlugin<T, E, P, D> {
  /** Plugin name (required) */
  name: string;
  /** Priority (optional, default 0) */
  priority?: number;
  /** Hook before request is sent */
  beforeRequest?: BeforeRequestHandler<E, P, D>;
  /** Hook after response is received */
  afterResponse?: AfterResponseHandler<T, E, P, D>;
  /** Hook before stream processing */
  beforeStream?: BeforeStreamHandler<E, P, D>;
  /** Hook for transforming stream chunks */
  transformStreamChunk?: TransformStreamChunkHandler<E, P, D>;
  /** Hook for error handling */
  onError?: OnErrorHandler<E, P, D>;
  /** Hook when request is finalized */
  onFinally?: OnFinallyHandler<E, P, D>;
}
```

### Plugin Lifecycle

1. **beforeRequest** - Before request is sent
2. **beforeStream** - Before stream processing (stream requests only)
3. **transformStreamChunk** - Transform stream chunks (stream requests only)
4. **afterResponse** - After response is received
5. **onError** - Error handling
6. **onFinally** - Final cleanup

## TypeScript Support

Hook-Fetch provides complete TypeScript support with generic types:

```typescript
interface User {
  id: number;
  name: string;
  email: string;
}

// Type-safe request
const user = await api.get<User>('/users/1').json();
console.log(user.name); // TypeScript provides full type hints
```

## Error Handling

### ResponseError

```typescript
interface ResponseError<E = any> extends Error {
  /** The response object */
  response?: Response;
  /** The request object */
  request?: Request;
  /** The request configuration */
  config?: RequestConfig<any, any, E>;
  /** HTTP status code */
  status?: number;
  /** HTTP status text */
  statusText?: string;
}
```

## Examples

### Basic Usage

```typescript
// Simple GET request
const data = await hookFetch('https://api.example.com/data').json();

// POST with data
const result = await hookFetch('https://api.example.com/users', {
  method: 'POST',
  data: { name: 'John', email: 'john@example.com' }
}).json();
```

### Instance Usage

```typescript
const api = hookFetch.create({
  baseURL: 'https://api.example.com',
  headers: { 'Authorization': 'Bearer token' }
});

const users = await api.get('/users').json();
const newUser = await api.post('/users', userData).json();
```

### Plugin Usage

```typescript
const loggerPlugin = {
  name: 'logger',
  beforeRequest: (config) => {
    console.log(`Making request to: ${config.url}`);
    return config;
  }
};

api.use(loggerPlugin);
```

### Streaming Usage

```typescript
for await (const chunk of api.get('/stream').stream()) {
  console.log('Received:', chunk.result);
}
```

This covers the main API surface of Hook-Fetch. For more detailed examples and advanced usage, see the other documentation sections.
