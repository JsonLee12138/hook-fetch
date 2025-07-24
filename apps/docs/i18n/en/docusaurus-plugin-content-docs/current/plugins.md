---
sidebar_position: 4
---

# Plugin System

Hook-Fetch's plugin system is one of its most powerful features, allowing you to inject custom logic into the request lifecycle for highly customizable functionality.

## Plugin Overview

A plugin is an object containing hook functions that execute at different stages of the request lifecycle. Plugins can:

- Modify request configuration
- Process response data
- Transform streaming data
- Handle errors
- Perform cleanup operations

## Plugin Structure

```typescript
interface HookFetchPlugin<T = unknown, E = unknown, P = unknown, D = unknown> {
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

## Plugin Lifecycle

Plugins execute in the following order:

1. **beforeRequest** - Before request is sent
2. **beforeStream** - Before stream processing (stream requests only)
3. **transformStreamChunk** - Transform stream chunks (stream requests only)
4. **afterResponse** - After response is received
5. **onError** - Error handling
6. **onFinally** - Final cleanup

## Using Plugins

### Registering Plugins

```typescript
// Register during instance creation
const api = hookFetch.create({
  baseURL: 'https://api.example.com',
  plugins: [myPlugin(), anotherPlugin()]
});

// Or use the use method
api.use(myPlugin());
```

### Plugin Priority

Plugins execute by priority, with lower numbers having higher priority:

```typescript
const highPriorityPlugin = {
  name: 'high-priority',
  priority: 1,
  beforeRequest(config) {
    // Executes first
    return config;
  }
};

const lowPriorityPlugin = {
  name: 'low-priority',
  priority: 10,
  beforeRequest(config) {
    // Executes later
    return config;
  }
};
```

## Built-in Plugins

### SSE Text Decoder Plugin

Hook-Fetch provides a built-in SSE (Server-Sent Events) text decoder plugin:

```typescript
import { sseTextDecoderPlugin } from 'hook-fetch/plugins/sse';

const api = hookFetch.create({
  plugins: [
    sseTextDecoderPlugin({
      json: true,                 // Auto-parse JSON
      prefix: 'data: ',          // Remove prefix
      splitSeparator: '\n\n',    // Event separator
      doneSymbol: '[DONE]'       // End marker
    })
  ]
});

// Use SSE
for await (const chunk of api.get('/sse-endpoint').stream()) {
  console.log(chunk.result); // Auto-parsed data
}
```

## Custom Plugin Examples

### 1. Authentication Plugin

Automatically add authentication headers:

```typescript
const authPlugin = (getToken: () => string) => ({
  name: 'auth',
  priority: 1,
  async beforeRequest(config) {
    const token = getToken();
    if (token) {
      config.headers = new Headers(config.headers);
      config.headers.set('Authorization', `Bearer ${token}`);
    }
    return config;
  }
});

// Usage
const api = hookFetch.create({
  plugins: [authPlugin(() => localStorage.getItem('token') || '')]
});
```

### 2. Logger Plugin

Log requests and responses:

```typescript
const loggerPlugin = () => ({
  name: 'logger',
  async beforeRequest(config) {
    console.log(`[${config.method}] ${config.url}`);
    return config;
  },
  async afterResponse(context, config) {
    console.log(`[${config.method}] ${config.url} - ${context.response.status}`);
    return context;
  },
  async onError(error, config) {
    console.error(`[${config.method}] ${config.url} - Error:`, error.message);
    return error;
  }
});
```

### 3. Retry Plugin

Automatically retry failed requests:

```typescript
const retryPlugin = (maxRetries = 3, delay = 1000) => ({
  name: 'retry',
  async onError(error, config) {
    const retryCount = config.extra?.retryCount || 0;

    if (retryCount < maxRetries && error.response?.status >= 500) {
      // Delay before retry
      await new Promise(resolve => setTimeout(resolve, delay));

      // Increment retry count
      config.extra = { ...config.extra, retryCount: retryCount + 1 };

      // Make new request
      const newRequest = hookFetch(config.url, config);
      return newRequest;
    }

    return error;
  }
});
```

### 4. Cache Plugin

Cache GET request responses:

```typescript
const cachePlugin = (ttl = 5 * 60 * 1000) => {
  const cache = new Map();

  return {
    name: 'cache',
    async beforeRequest(config) {
      if (config.method === 'GET') {
        const key = `${config.url}?${new URLSearchParams(config.params).toString()}`;
        const cached = cache.get(key);

        if (cached && Date.now() - cached.timestamp < ttl) {
          // Return cached response
          return Promise.resolve(cached.response);
        }
      }
      return config;
    },
    async afterResponse(context, config) {
      if (config.method === 'GET') {
        const key = `${config.url}?${new URLSearchParams(config.params).toString()}`;
        cache.set(key, {
          response: context.result,
          timestamp: Date.now()
        });
      }
      return context;
    }
  };
};
```

### 5. Response Transform Plugin

Transform response data format:

```typescript
const responseTransformPlugin = () => ({
  name: 'response-transform',
  async afterResponse(context, config) {
    if (context.responseType === 'json' && context.result) {
      // Transform API response format
      if (context.result.code === 200) {
        context.result = context.result.data;
      } else {
        throw new Error(context.result.message);
      }
    }
    return context;
  }
});
```

## Advanced Plugin Development

### Plugin with State

```typescript
const statisticsPlugin = () => {
  let requestCount = 0;
  let errorCount = 0;

  return {
    name: 'statistics',
    async beforeRequest(config) {
      requestCount++;
      console.log(`Total requests: ${requestCount}`);
      return config;
    },
    async onError(error, config) {
      errorCount++;
      console.log(`Total errors: ${errorCount}`);
      return error;
    },
    getStats() {
      return { requestCount, errorCount };
    }
  };
};
```

### Async Plugin Operations

```typescript
const asyncPlugin = () => ({
  name: 'async-plugin',
  async beforeRequest(config) {
    // Async operation
    const signature = await generateSignature(config);
    config.headers = new Headers(config.headers);
    config.headers.set('X-Signature', signature);
    return config;
  },
  async afterResponse(context, config) {
    // Async response processing
    await logToAnalytics(config.url, context.response.status);
    return context;
  }
});
```

## Plugin Best Practices

### 1. Error Handling

Always handle errors gracefully in plugins:

```typescript
const safePlugin = () => ({
  name: 'safe-plugin',
  async beforeRequest(config) {
    try {
      // Plugin logic
      return config;
    } catch (error) {
      console.error('Plugin error:', error);
      return config; // Return original config on error
    }
  }
});
```

### 2. Performance Considerations

Avoid blocking operations in plugins:

```typescript
const performantPlugin = () => ({
  name: 'performant-plugin',
  async beforeRequest(config) {
    // Use non-blocking operations
    setImmediate(() => {
      // Background task
      updateMetrics(config);
    });
    return config;
  }
});
```

### 3. Plugin Composition

Create reusable plugin factories:

```typescript
const createApiPlugin = (options: ApiPluginOptions) => ({
  name: 'api-plugin',
  ...createAuthBehavior(options.auth),
  ...createRetryBehavior(options.retry),
  ...createCacheBehavior(options.cache)
});
```

## Hook Functions Reference

- `beforeRequest`: Modify request configuration before sending
- `afterResponse`: Process response data after receiving
- `beforeStream`: Initialize or transform stream before processing
- `transformStreamChunk`: Process streaming data chunks
- `onError`: Handle request errors
- `onFinally`: Cleanup operations after request completion

All lifecycle hooks support both synchronous and asynchronous operations. Each hook function receives the current configuration object for context-aware processing.

This plugin system provides powerful extensibility for Hook-Fetch, allowing you to customize request behavior for any use case.
