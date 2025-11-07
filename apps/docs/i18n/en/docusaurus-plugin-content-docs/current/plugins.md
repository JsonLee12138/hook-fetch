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
      json: true, // Auto-parse JSON
      prefix: 'data: ', // Remove prefix
      splitSeparator: '\n\n', // Event separator
      doneSymbol: '[DONE]' // End marker
    })
  ]
});

// Use SSE
for await (const chunk of api.get('/sse-endpoint').stream()) {
  console.log(chunk.result); // Auto-parsed data
}
```

### Request Deduplication Plugin (Not Recommended)

:::warning Official Not Recommended
While we provide a request deduplication plugin, **we do not officially recommend using it in production environments**. Deduplication logic adds system complexity and may lead to unexpected behavior. We recommend preventing duplicate requests at the application level through design, such as:

- Disable buttons to prevent repeated clicks
- Use debounce/throttle for user input handling
- Use request state management to avoid concurrent requests

Since many developers have this scenario requirement, we provide this plugin as a temporary solution, but please use it with caution.
:::

The request deduplication plugin prevents concurrent identical requests, allowing subsequent identical requests to execute only after the first request completes:

```typescript
import { dedupePlugin, isDedupeError } from 'hook-fetch/plugins/dedup';

const api = hookFetch.create({
  baseURL: 'https://api.example.com',
  plugins: [dedupePlugin({})]
});

// Make multiple concurrent identical requests
const promises = [
  api.get('/users/1').json(),
  api.get('/users/1').json(), // Will be deduplicated, throws DedupeError
  api.get('/users/1').json(), // Will be deduplicated, throws DedupeError
];

const results = await Promise.allSettled(promises);

// Check if it's a deduplication error
results.forEach((result, index) => {
  if (result.status === 'rejected' && isDedupeError(result.reason)) {
    console.log(`Request ${index + 1} was deduplicated`);
  }
  else if (result.status === 'fulfilled') {
    console.log(`Request ${index + 1} succeeded:`, result.value);
  }
});
```

**Plugin Configuration Options:**

```typescript
interface DedupePluginOptions {
  // No configuration options in current version
}
```

**Deduplication Rules:**

The deduplication plugin generates a unique identifier for requests based on the following parameter combination:

- URL
- HTTP method (GET, POST, etc.)
- URL parameters (params)
- Request body data (data)

When a request with the same identifier is in progress, subsequent requests will throw a `DedupeError`.

**Disable Deduplication for Specific Requests:**

You can disable deduplication for specific requests using the `extra.dedupeAble` option:

```typescript
// This request will not be deduplicated
const response = await api.get('/users/1', {}, {
  extra: { dedupeAble: false }
}).json();
```

**Deduplication Behavior:**

```typescript
const api = hookFetch.create({
  plugins: [dedupePlugin({})]
});

// ✅ Concurrent identical requests will be deduplicated
Promise.all([
  api.get('/users/1').json(), // Executes normally
  api.get('/users/1').json(), // Deduplicated, throws error
]);

// ✅ Sequential requests will not be deduplicated
await api.get('/users/1').json(); // First request
await api.get('/users/1').json(); // Second request, executes normally

// ✅ Requests with different parameters will not be deduplicated
Promise.all([
  api.get('/users/1', { params: { page: 1 } }).json(), // Executes normally
  api.get('/users/1', { params: { page: 2 } }).json(), // Executes normally
]);

// ✅ Requests with different HTTP methods will not be deduplicated
Promise.all([
  api.get('/users/1').json(), // Executes normally
  api.post('/users/1').json(), // Executes normally
]);
```

**Error Handling:**

```typescript
try {
  const response = await api.get('/users/1').json();
}
catch (error) {
  if (isDedupeError(error)) {
    // Handle deduplication error
    console.log('Duplicate request detected');
  }
  else {
    // Handle other errors
    console.error('Request failed:', error);
  }
}
```

## Custom Plugin Examples

### 1. Authentication Plugin

Automatically add authentication headers:

```typescript
function authPlugin(getToken: () => string) {
  return {
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
  };
}

// Usage
const api = hookFetch.create({
  plugins: [authPlugin(() => localStorage.getItem('token') || '')]
});
```

### 2. Logger Plugin

Log requests and responses:

```typescript
function loggerPlugin() {
  return {
    name: 'logger',
    async beforeRequest(config) {
      console.log(`[${config.method}] ${config.url}`);
      return config;
    },
    async afterResponse(context, config) {
      console.log(`[${config.method}] ${config.url} - ${context.response.status}`);
      return context;
    },
    async onError(error) {
      console.error('Error:', error.message);
      return error;
    }
  };
}
```

### 3. Retry Plugin

Handle retry logic with manual retry() method:

```typescript
// Note: Retry should be implemented at application level using retry() method
function retryPlugin(maxRetries = 3, delay = 1000) {
  return {
    name: 'retry',
    async onError(error, config) {
      const retryCount = config.extra?.retryCount || 0;

      if (retryCount < maxRetries && error.response?.status >= 500) {
        console.log(`Retry request (${retryCount + 1}/${maxRetries})`);
        // Delay suggestion for manual retry
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      return error;
    }
  };
}

// Usage example:
// const req = api.get('/endpoint');
// try {
//   const data = await req.json();
// } catch (error) {
//   // Manual retry
//   const retryReq = req.retry();
//   const data = await retryReq.json();
// }
```

### 4. Cache Plugin

Cache request responses:

```typescript
// Memory cache plugin with configurable TTL
// Note: Cache plugin differs from deduplication plugin
// - Cache plugin: Stores response results to avoid repeated requests and improve performance
// - Deduplication plugin: Prevents concurrent identical requests without caching results
function cachePlugin(options = {}) {
  const defaultOptions = {
    ttl: 5 * 60 * 1000, // Default 5 minutes
  };
  const config = { ...defaultOptions, ...options };
  const cache = new Map();

  const getRequestKey = (url: string, method: string, params: any, data: any) => {
    return `${url}::${method}::${JSON.stringify(params)}::${JSON.stringify(data)}`;
  };

  return {
    name: 'cache',
    async beforeRequest(requestConfig) {
      const key = getRequestKey(
        requestConfig.url,
        requestConfig.method,
        requestConfig.params,
        requestConfig.data
      );
      const cached = cache.get(key);

      if (cached) {
        // Check if cache is expired
        if (cached.timestamp + config.ttl > Date.now()) {
          // Return cached data using resolve property
          return {
            ...requestConfig,
            resolve: () => new Response(JSON.stringify(cached.data), {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            })
          };
        }
        else {
          // Cache expired, delete it
          cache.delete(key);
        }
      }

      return requestConfig;
    },
    async afterResponse(context, requestConfig) {
      const key = getRequestKey(
        requestConfig.url,
        requestConfig.method,
        requestConfig.params,
        requestConfig.data
      );

      // Cache response data
      cache.set(key, {
        data: context.result,
        timestamp: Date.now()
      });

      return context;
    }
  };
}

// Usage example
const api = hookFetch.create({
  plugins: [cachePlugin({ ttl: 10 * 1000 })] // 10 seconds cache
});

await api.get('/users/1').json();
```

### 5. Response Transform Plugin

Transform response data format:

```typescript
function responseTransformPlugin() {
  return {
    name: 'response-transform',
    async afterResponse(context, config) {
      if (context.responseType === 'json' && context.result) {
      // Transform API response format
        if (context.result.code === 200) {
          context.result = context.result.data;
        }
        else {
          throw new Error(context.result.message);
        }
      }
      return context;
    }
  };
}
```

## Advanced Plugin Development

### Plugin with State

```typescript
function statisticsPlugin() {
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
}
```

### Async Plugin Operations

```typescript
function asyncPlugin() {
  return {
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
  };
}
```

## Plugin Best Practices

### 1. Error Handling

Always handle errors gracefully in plugins:

```typescript
function safePlugin() {
  return {
    name: 'safe-plugin',
    async beforeRequest(config) {
      try {
      // Plugin logic
        return config;
      }
      catch (error) {
        console.error('Plugin error:', error);
        return config; // Return original config on error
      }
    }
  };
}
```

### 2. Performance Considerations

Avoid blocking operations in plugins:

```typescript
function performantPlugin() {
  return {
    name: 'performant-plugin',
    async beforeRequest(config) {
    // Use non-blocking operations
      setImmediate(() => {
      // Background task
        updateMetrics(config);
      });
      return config;
    }
  };
}
```

### 3. Plugin Composition

Create reusable plugin factories:

```typescript
function createApiPlugin(options: ApiPluginOptions) {
  return {
    name: 'api-plugin',
    ...createAuthBehavior(options.auth),
    ...createRetryBehavior(options.retry),
    ...createCacheBehavior(options.cache)
  };
}
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
