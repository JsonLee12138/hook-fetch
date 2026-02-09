import type { HookFetchPlugin } from '../types';
import type { ResponseError } from '../errors';
import type { AnyObject } from 'typescript-api-pro';
import { request } from '../base';

export interface RetryPluginOptions<E = AnyObject> {
  /** HTTP status codes to retry on (default: [408, 429, 500, 502, 503, 504]) */
  retryableStatuses?: number[];
  /** Maximum number of retry attempts (default: 3) */
  maxAttempts?: number;
  /** Initial delay in milliseconds (default: 1000) */
  initialDelay?: number;
  /** Maximum delay in milliseconds (default: 30000) */
  maxDelay?: number;
  /** Backoff strategy: 'linear', 'exponential', or custom function (default: 'exponential') */
  backoffStrategy?: 'linear' | 'exponential' | ((attempt: number, initialDelay: number) => number);
  /** Add random jitter to delay (0-1, default: 0.1) */
  jitter?: number;
  /** Custom function to determine if request should be retried */
  shouldRetry?: (error: ResponseError<E>) => boolean;
}

export function retryPlugin<E = AnyObject>(
  options: RetryPluginOptions<E> = {},
): HookFetchPlugin<any, E> {
  const {
    retryableStatuses = [408, 429, 500, 502, 503, 504],
    maxAttempts = 3,
    initialDelay = 1000,
    maxDelay = 30000,
    backoffStrategy = 'exponential',
    jitter = 0.1,
    shouldRetry,
  } = options;

  const calculateDelay = (attempt: number): number => {
    let delayMs: number;

    if (typeof backoffStrategy === 'function') {
      delayMs = backoffStrategy(attempt, initialDelay);
    } else if (backoffStrategy === 'exponential') {
      delayMs = initialDelay * Math.pow(2, attempt);
    } else {
      delayMs = initialDelay * (attempt + 1);
    }

    delayMs = Math.min(delayMs, maxDelay);

    if (jitter > 0) {
      delayMs += delayMs * jitter * Math.random();
    }

    return delayMs;
  };

  return {
    name: 'hook-fetch-retry',
    priority: 100,

    async onError({ error, config, resolve }) {
      const attempt = ((config.extra as AnyObject)?.['__retryAttempt'] as number ?? 0) + 1;
      if (attempt > maxAttempts) return;

      const willRetry = shouldRetry
        ? shouldRetry(error as ResponseError<E>)
        : error.status !== undefined && retryableStatuses.includes(error.status);

      if (!willRetry) return;

      const ms = calculateDelay(attempt - 1);
      if (ms > 0) await new Promise(r => setTimeout(r, ms));

      const retryResult = await request(config.url, {
        ...config,
        extra: { ...(config.extra as AnyObject), __retryAttempt: attempt },
      });

      return resolve(retryResult);
    },
  };
}
