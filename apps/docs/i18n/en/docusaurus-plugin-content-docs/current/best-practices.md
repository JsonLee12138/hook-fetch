---
sidebar_position: 7
---

# Best Practices

This guide covers recommended practices and patterns for using Hook-Fetch effectively in your projects.

## Project Structure

### Organizing API Calls

```typescript
// api/client.ts
import hookFetch from 'hook-fetch';
import { authPlugin } from './plugins/auth';
import { loggerPlugin } from './plugins/logger';
import { retryPlugin } from './plugins/retry';

export const apiClient = hookFetch.create({
  baseURL: process.env.REACT_APP_API_URL || 'https://api.example.com',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  plugins: [
    authPlugin(),
    loggerPlugin(),
    retryPlugin({ maxRetries: 3 })
  ]
});

// api/users.ts
import { apiClient } from './client';

export interface User {
  id: string;
  name: string;
  email: string;
}

export const userApi = {
  getUser: (id: string) => apiClient.get<User>(`/users/${id}`),
  createUser: (data: Omit<User, 'id'>) => apiClient.post<User>('/users', data),
  updateUser: (id: string, data: Partial<User>) => apiClient.put<User>(`/users/${id}`, data),
  deleteUser: (id: string) => apiClient.delete(`/users/${id}`)
};
```

### Service Layer Pattern

```typescript
// services/UserService.ts
import { userApi } from '../api/users';

export class UserService {
  static async getUser(id: string): Promise<User> {
    try {
      const response = await userApi.getUser(id).json();
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch user: ${error.message}`);
    }
  }

  static async createUser(userData: Omit<User, 'id'>): Promise<User> {
    try {
      const response = await userApi.createUser(userData).json();
      return response.data;
    } catch (error) {
      throw new Error(`Failed to create user: ${error.message}`);
    }
  }
}
```

## Error Handling

### Global Error Handling

```typescript
// plugins/errorHandler.ts
import { HookFetchPlugin } from 'hook-fetch';

export const errorHandlerPlugin = (): HookFetchPlugin => ({
  name: 'error-handler',
  priority: 1,
  async onError(error, config) {
    // Log error
    console.error(`API Error [${config.method}] ${config.url}:`, error);

    // Handle specific error types
    if (error.response?.status === 401) {
      // Handle unauthorized
      window.location.href = '/login';
      return;
    }

    if (error.response?.status === 403) {
      // Handle forbidden
      throw new Error('Access denied');
    }

    if (error.response?.status >= 500) {
      // Handle server errors
      throw new Error('Server error occurred');
    }

    // Re-throw for other errors
    throw error;
  }
});
```

### Typed Error Handling

```typescript
// types/errors.ts
export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

export class ApiException extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiException';
  }
}

// plugins/typedErrorHandler.ts
export const typedErrorHandlerPlugin = (): HookFetchPlugin => ({
  name: 'typed-error-handler',
  async onError(error, config) {
    if (error.response) {
      const errorData = await error.response.json();
      throw new ApiException(
        errorData.code || 'UNKNOWN_ERROR',
        errorData.message || 'An error occurred',
        errorData.details
      );
    }
    throw error;
  }
});
```

## Performance Optimization

### Request Deduplication

```typescript
// utils/requestDeduplication.ts
const pendingRequests = new Map<string, Promise<any>>();

export const deduplicationPlugin = (): HookFetchPlugin => ({
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
});
```

### Caching Strategy

```typescript
// plugins/cache.ts
interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
}

export const cachePlugin = (defaultTtl = 5 * 60 * 1000): HookFetchPlugin => {
  const cache = new Map<string, CacheEntry>();

  return {
    name: 'cache',
    async beforeRequest(config) {
      if (config.method === 'GET') {
        const key = `${config.url}?${JSON.stringify(config.params)}`;
        const cached = cache.get(key);

        if (cached && Date.now() - cached.timestamp < cached.ttl) {
          return Promise.resolve(cached.data);
        }
      }
      return config;
    },
    async afterResponse(context, config) {
      if (config.method === 'GET') {
        const key = `${config.url}?${JSON.stringify(config.params)}`;
        const ttl = config.extra?.cacheTtl || defaultTtl;

        cache.set(key, {
          data: context.result,
          timestamp: Date.now(),
          ttl
        });
      }
      return context;
    }
  };
};
```

## Security

### Authentication

```typescript
// plugins/auth.ts
export const authPlugin = (): HookFetchPlugin => ({
  name: 'auth',
  priority: 1,
  async beforeRequest(config) {
    const token = localStorage.getItem('accessToken');

    if (token) {
      config.headers = new Headers(config.headers);
      config.headers.set('Authorization', `Bearer ${token}`);
    }

    return config;
  },
  async onError(error, config) {
    if (error.response?.status === 401) {
      // Token expired, try to refresh
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const response = await fetch('/auth/refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken })
          });

          if (response.ok) {
            const { accessToken } = await response.json();
            localStorage.setItem('accessToken', accessToken);

            // Retry original request
            config.headers.set('Authorization', `Bearer ${accessToken}`);
            return hookFetch(config.url, config);
          }
        }
      } catch (refreshError) {
        // Refresh failed, redirect to login
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
      }
    }
    return error;
  }
});
```

### Request Signing

```typescript
// plugins/requestSigning.ts
import { createHmac } from 'crypto';

export const requestSigningPlugin = (secretKey: string): HookFetchPlugin => ({
  name: 'request-signing',
  async beforeRequest(config) {
    const timestamp = Date.now().toString();
    const method = config.method.toUpperCase();
    const url = config.url;
    const body = config.data ? JSON.stringify(config.data) : '';

    const stringToSign = `${method}\n${url}\n${timestamp}\n${body}`;
    const signature = createHmac('sha256', secretKey)
      .update(stringToSign)
      .digest('hex');

    config.headers = new Headers(config.headers);
    config.headers.set('X-Timestamp', timestamp);
    config.headers.set('X-Signature', signature);

    return config;
  }
});
```

## Testing

### Mocking Requests

```typescript
// __tests__/mocks/api.ts
import { jest } from '@jest/globals';

export const mockApiClient = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  use: jest.fn()
};

// __tests__/UserService.test.ts
import { UserService } from '../services/UserService';
import { mockApiClient } from './mocks/api';

jest.mock('../api/client', () => ({
  apiClient: mockApiClient
}));

describe('UserService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should fetch user successfully', async () => {
    const mockUser = { id: '1', name: 'John', email: 'john@example.com' };
    mockApiClient.get.mockReturnValue({
      json: jest.fn().mockResolvedValue({ data: mockUser })
    });

    const result = await UserService.getUser('1');

    expect(mockApiClient.get).toHaveBeenCalledWith('/users/1');
    expect(result).toEqual(mockUser);
  });

  test('should handle error when fetching user fails', async () => {
    mockApiClient.get.mockReturnValue({
      json: jest.fn().mockRejectedValue(new Error('Network error'))
    });

    await expect(UserService.getUser('1')).rejects.toThrow('Failed to fetch user');
  });
});
```

### Integration Testing

```typescript
// __tests__/integration/api.test.ts
import { apiClient } from '../api/client';
import { setupServer } from 'msw/node';
import { rest } from 'msw';

const server = setupServer(
  rest.get('/users/:id', (req, res, ctx) => {
    return res(
      ctx.json({
        data: { id: req.params.id, name: 'John', email: 'john@example.com' }
      })
    );
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('API Integration', () => {
  test('should make real HTTP request', async () => {
    const response = await apiClient.get('/users/1').json();

    expect(response.data).toEqual({
      id: '1',
      name: 'John',
      email: 'john@example.com'
    });
  });
});
```

## TypeScript Best Practices

### Type-Safe API Definitions

```typescript
// types/api.ts
export interface ApiResponse<T> {
  data: T;
  message: string;
  success: boolean;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

// api/typed-client.ts
class TypedApiClient {
  private client = hookFetch.create({
    baseURL: process.env.API_URL
  });

  async get<T>(url: string, params?: Record<string, any>): Promise<ApiResponse<T>> {
    const response = await this.client.get(url, params).json();
    return response as ApiResponse<T>;
  }

  async post<T, D = any>(url: string, data?: D): Promise<ApiResponse<T>> {
    const response = await this.client.post(url, data).json();
    return response as ApiResponse<T>;
  }

  async getPaginated<T>(
    url: string,
    params?: Record<string, any>
  ): Promise<PaginatedResponse<T>> {
    const response = await this.client.get(url, params).json();
    return response as PaginatedResponse<T>;
  }
}

export const typedApiClient = new TypedApiClient();
```

### Generic Request Functions

```typescript
// utils/requests.ts
export async function fetchWithRetry<T>(
  requestFn: () => Promise<T>,
  maxRetries = 3,
  delay = 1000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await requestFn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
    }
  }
  throw new Error('Max retries exceeded');
}

// Usage
const user = await fetchWithRetry(
  () => apiClient.get<User>('/users/1').json(),
  3,
  1000
);
```

## Environment Configuration

### Environment-Specific Settings

```typescript
// config/api.ts
interface ApiConfig {
  baseURL: string;
  timeout: number;
  retryAttempts: number;
  enableLogging: boolean;
}

const configs: Record<string, ApiConfig> = {
  development: {
    baseURL: 'http://localhost:3000/api',
    timeout: 30000,
    retryAttempts: 3,
    enableLogging: true
  },
  production: {
    baseURL: 'https://api.example.com',
    timeout: 10000,
    retryAttempts: 1,
    enableLogging: false
  }
};

export const apiConfig = configs[process.env.NODE_ENV] || configs.development;

// client.ts
import { apiConfig } from './config/api';

export const apiClient = hookFetch.create({
  baseURL: apiConfig.baseURL,
  timeout: apiConfig.timeout,
  plugins: [
    ...(apiConfig.enableLogging ? [loggerPlugin()] : []),
    retryPlugin({ maxRetries: apiConfig.retryAttempts })
  ]
});
```

These best practices will help you build robust, maintainable, and performant applications with Hook-Fetch.
