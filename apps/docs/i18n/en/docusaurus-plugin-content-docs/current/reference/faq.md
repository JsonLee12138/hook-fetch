---
sidebar_position: 1
---

# Frequently Asked Questions

This page answers common questions about Hook-Fetch usage, configuration, and troubleshooting.

## General Questions

### What is Hook-Fetch?

Hook-Fetch is a modern HTTP request library based on the native fetch API. It provides a clean syntax, rich features, and a powerful plugin system, with particular strength in streaming data processing and framework integration.

### How is Hook-Fetch different from Axios?

- **Lighter weight**: Based on native fetch API, smaller bundle size
- **Modern design**: Built for modern JavaScript/TypeScript projects
- **Streaming support**: Native support for SSE and streaming data
- **Plugin system**: Powerful and flexible plugin architecture
- **Framework integration**: Built-in React and Vue hooks

### Can I use Hook-Fetch with TypeScript?

Yes! Hook-Fetch is written in TypeScript and provides complete type definitions. You get full type safety and IntelliSense support.

```typescript
interface User {
  id: number;
  name: string;
  email: string;
}

const user = await api.get<User>('/users/1').json();
// user is fully typed as User
```

## Installation and Setup

### How do I install Hook-Fetch?

```bash
# npm
npm install hook-fetch

# yarn
yarn add hook-fetch

# pnpm
pnpm add hook-fetch
```

### Do I need any polyfills?

Hook-Fetch uses the native fetch API, which is supported in all modern browsers. For older browsers (IE11), you may need a fetch polyfill.

### Can I use Hook-Fetch in Node.js?

Yes, but you'll need to ensure fetch is available. In Node.js 18+, fetch is built-in. For older versions, you can use a polyfill like `node-fetch`.

## Basic Usage

### How do I make a simple GET request?

```typescript
import hookFetch from 'hook-fetch';

// Simple GET request
const response = await hookFetch('https://api.example.com/users').json();

// With parameters
const users = await hookFetch('https://api.example.com/users', {
  params: { page: 1, limit: 10 }
}).json();
```

### How do I create a configured instance?

```typescript
const api = hookFetch.create({
  baseURL: 'https://api.example.com',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your-token'
  },
  timeout: 5000
});

const users = await api.get('/users').json();
```

### How do I handle different response types?

```typescript
// JSON response
const jsonData = await request.json();

// Text response
const textData = await request.text();

// Blob response (for files)
const blobData = await request.blob();

// ArrayBuffer response
const arrayBufferData = await request.arrayBuffer();
```

## Error Handling

### How do I handle errors?

```typescript
try {
  const response = await api.get('/users/1').json();
} catch (error) {
  if (error.response) {
    // Server responded with error status
    console.log('Status:', error.response.status);
    console.log('Data:', error.response.data);
  } else if (error.request) {
    // Request was sent but no response received
    console.log('Network error');
  } else {
    // Other error
    console.log('Error:', error.message);
  }
}
```

### How do I set up global error handling?

```typescript
const errorHandlerPlugin = () => ({
  name: 'error-handler',
  async onError(error, config) {
    console.error(`API Error [${config.method}] ${config.url}:`, error);

    if (error.response?.status === 401) {
      // Handle unauthorized
      window.location.href = '/login';
    }

    return error;
  }
});

const api = hookFetch.create({
  plugins: [errorHandlerPlugin()]
});
```

## Streaming and SSE

### How do I handle Server-Sent Events (SSE)?

```typescript
import { sseTextDecoderPlugin } from 'hook-fetch/plugins/sse';

const api = hookFetch.create({
  plugins: [
    sseTextDecoderPlugin({
      json: true,
      prefix: 'data: ',
      doneSymbol: '[DONE]'
    })
  ]
});

for await (const chunk of api.get('/sse-endpoint').stream()) {
  console.log('SSE data:', chunk.result);
}
```

### How do I process streaming data?

```typescript
const request = hookFetch('https://api.example.com/stream');

for await (const chunk of request.stream()) {
  console.log('Received:', chunk.result);
  console.log('Raw bytes:', chunk.source);

  if (chunk.error) {
    console.error('Stream error:', chunk.error);
  }
}
```

### Can I cancel streaming requests?

```typescript
const request = api.get('/stream');

// Cancel after 30 seconds
setTimeout(() => {
  request.abort();
}, 30000);

try {
  for await (const chunk of request.stream()) {
    console.log(chunk.result);
  }
} catch (error) {
  if (error.name === 'AbortError') {
    console.log('Stream cancelled');
  }
}
```

## Plugin System

### How do I create a custom plugin?

```typescript
const myPlugin = () => ({
  name: 'my-plugin',
  priority: 1,
  async beforeRequest(config) {
    // Modify request before sending
    config.headers.set('X-Custom-Header', 'value');
    return config;
  },
  async afterResponse(context) {
    // Process response after receiving
    console.log('Response received:', context.response.status);
    return context;
  }
});

api.use(myPlugin());
```

### How do I register multiple plugins?

```typescript
const api = hookFetch.create({
  plugins: [
    authPlugin(),
    loggerPlugin(),
    retryPlugin({ maxRetries: 3 })
  ]
});

// Or register individually
api.use(cachePlugin());
api.use(metricsPlugin());
```

### What's the plugin execution order?

Plugins execute by priority (lower numbers = higher priority):

1. beforeRequest (by priority)
2. beforeStream (for streaming requests)
3. transformStreamChunk (for streaming requests)
4. afterResponse (by priority)
5. onError (if error occurs)
6. onFinally (always)

## Framework Integration

### How do I use Hook-Fetch with React?

```typescript
import { useHookFetch } from 'hook-fetch/react';

function UserComponent() {
  const { request, loading, cancel } = useHookFetch({
    request: (id: string) => api.get(`/users/${id}`),
    onError: (error) => console.error('Request failed:', error)
  });

  const [userData, setUserData] = useState(null);

  const loadUser = async () => {
    const data = await request('123').json();
    setUserData(data);
  };

  return (
    <div>
      <button onClick={loadUser} disabled={loading}>
        {loading ? 'Loading...' : 'Load User'}
      </button>
      {userData && <div>{JSON.stringify(userData)}</div>}
    </div>
  );
}
```

### How do I use Hook-Fetch with Vue?

```vue
<template>
  <div>
    <button @click="loadUser" :disabled="loading">
      {{ loading ? 'Loading...' : 'Load User' }}
    </button>
    <div v-if="userData">{{ userData }}</div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useHookFetch } from 'hook-fetch/vue';

const userData = ref(null);

const { request, loading } = useHookFetch({
  request: (id) => api.get(`/users/${id}`),
  onError: (error) => console.error('Request failed:', error)
});

const loadUser = async () => {
  const data = await request('123').json();
  userData.value = data;
};
</script>
```

## Performance and Optimization

### How do I implement request caching?

```typescript
const cachePlugin = (ttl = 5 * 60 * 1000) => {
  const cache = new Map();

  return {
    name: 'cache',
    async beforeRequest(config) {
      if (config.method === 'GET') {
        const key = `${config.url}?${JSON.stringify(config.params)}`;
        const cached = cache.get(key);

        if (cached && Date.now() - cached.timestamp < ttl) {
          return Promise.resolve(cached.data);
        }
      }
      return config;
    },
    async afterResponse(context, config) {
      if (config.method === 'GET') {
        const key = `${config.url}?${JSON.stringify(config.params)}`;
        cache.set(key, {
          data: context.result,
          timestamp: Date.now()
        });
      }
      return context;
    }
  };
};
```

### How do I implement request deduplication?

```typescript
const deduplicationPlugin = () => {
  const pendingRequests = new Map();

  return {
    name: 'deduplication',
    async beforeRequest(config) {
      if (config.method === 'GET') {
        const key = `${config.url}?${JSON.stringify(config.params)}`;

        if (pendingRequests.has(key)) {
          return pendingRequests.get(key);
        }

        const requestPromise = fetch(config.url, config);
        pendingRequests.set(key, requestPromise);

        requestPromise.finally(() => {
          pendingRequests.delete(key);
        });

        return requestPromise;
      }
      return config;
    }
  };
};
```

### How do I optimize for large files?

```typescript
// For downloads with progress tracking
async function downloadWithProgress(url, filename) {
  const request = hookFetch(url);
  const response = await request;

  const total = parseInt(response.headers.get('content-length') || '0');
  let loaded = 0;

  const chunks = [];

  for await (const chunk of request.stream()) {
    chunks.push(chunk.source);
    loaded += chunk.source.length;

    const progress = (loaded / total) * 100;
    updateProgressBar(progress);
  }

  const blob = new Blob(chunks);
  // Handle blob...
}
```

## Debugging and Testing

### How do I debug requests?

```typescript
const debugPlugin = () => ({
  name: 'debug',
  async beforeRequest(config) {
    console.log('🚀 Request:', config.method, config.url, config);
    return config;
  },
  async afterResponse(context, config) {
    console.log('✅ Response:', config.method, config.url, context.response.status);
    return context;
  },
  async onError(error, config) {
    console.error('❌ Error:', config.method, config.url, error);
    return error;
  }
});
```

### How do I mock requests for testing?

```typescript
// Using Jest
const mockApi = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn()
};

jest.mock('hook-fetch', () => ({
  create: () => mockApi
}));

// In tests
test('should fetch user', async () => {
  mockApi.get.mockReturnValue({
    json: jest.fn().mockResolvedValue({ id: 1, name: 'John' })
  });

  const result = await UserService.getUser('1');
  expect(result.name).toBe('John');
});
```

### How do I test streaming functionality?

```typescript
// Mock streaming response
const mockStream = async function* () {
  yield { result: 'chunk1', source: new Uint8Array(), error: null };
  yield { result: 'chunk2', source: new Uint8Array(), error: null };
};

mockApi.get.mockReturnValue({
  stream: jest.fn().mockReturnValue(mockStream())
});
```

## Common Issues

### Why am I getting CORS errors?

CORS errors occur when making requests from a browser to a different domain. This is a browser security feature, not a Hook-Fetch limitation. Solutions:

1. Configure your server to allow CORS
2. Use a proxy during development
3. Make requests from the same origin

### Why are my requests not being sent?

Common causes:
1. Network connectivity issues
2. Incorrect URL or base URL
3. Request is being blocked by ad blockers
4. Server is not responding

### How do I handle timeout errors?

```typescript
const api = hookFetch.create({
  timeout: 10000 // 10 seconds
});

// Or per request
try {
  const response = await api.get('/slow-endpoint', {}, {
    timeout: 30000 // 30 seconds
  }).json();
} catch (error) {
  if (error.name === 'TimeoutError') {
    console.log('Request timed out');
  }
}
```

### Why is my plugin not working?

Common issues:
1. Plugin not registered: Make sure to call `api.use(plugin())`
2. Wrong hook name: Check the plugin interface
3. Plugin priority: Lower numbers have higher priority
4. Async/await: Make sure to handle promises correctly

If you have other questions not covered here, please check our [GitHub Issues](https://github.com/JsonLee12138/hook-fetch/issues) or create a new issue.
