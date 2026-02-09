import type { AnyObject } from 'typescript-api-pro';
import type { RequestConfig } from '../types';
import { omit } from 'radash';
import { StatusCode } from '../enum';
import { ResponseError } from '../errors';
import { getBody } from './body';
import { buildUrl, DEFAULT_QS_CONFIG } from './config';

export interface ExecuteOptions {
  config: RequestConfig;
  signal: AbortSignal;
  timeout?: number;
}

export class RequestExecutor {
  static normalizeError(error: unknown, config: RequestConfig): ResponseError {
    if (error instanceof ResponseError) return error;

    if (error instanceof TypeError) {
      if (error.name === 'AbortError') {
        return new ResponseError({
          message: 'Request aborted',
          status: StatusCode.ABORTED,
          statusText: 'Request aborted',
          config,
          name: 'Request aborted',
        });
      }
      return new ResponseError({
        message: error.message,
        status: StatusCode.NETWORK_ERROR,
        statusText: 'Network Error',
        config,
        name: error.name,
      });
    }

    return new ResponseError({
      message: (error as Error)?.message ?? 'Unknown Request Error',
      status: StatusCode.UNKNOWN,
      statusText: 'Unknown Request Error',
      config,
      name: 'Unknown Request Error',
    });
  }

  async execute({ config, signal, timeout }: ExecuteOptions): Promise<Response> {
    const requestUrl = buildUrl(
      config.baseURL + config.url,
      config.params as AnyObject,
      config.qsConfig ?? DEFAULT_QS_CONFIG,
    );
    const body = getBody(config.data ?? null, config.method, config.headers, config.qsConfig);
    const otherOptions = omit(config ?? {}, ['baseURL', 'data', 'extra', 'headers', 'method', 'params', 'url', 'withCredentials', 'qsConfig', 'timeout']);

    // Create a per-attempt controller that forwards parent signal
    const attemptController = new AbortController();
    let isTimeout = false;

    if (signal.aborted) {
      attemptController.abort();
    } else {
      signal.addEventListener('abort', () => attemptController.abort(), { once: true });
    }

    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    if (timeout && timeout > 0) {
      timeoutId = setTimeout(() => {
        isTimeout = true;
        attemptController.abort();
      }, timeout);
    }

    try {
      const response = await fetch(requestUrl, {
        ...otherOptions,
        method: config.method,
        headers: config.headers as HeadersInit,
        signal: attemptController.signal,
        credentials: config.withCredentials ? 'include' : 'omit',
        body,
      });

      if (!response.ok) {
        throw new ResponseError({
          message: 'Fail Request',
          status: response.status,
          statusText: response.statusText,
          config,
          name: 'Fail Request',
          response,
        });
      }

      return response;
    } catch (error) {
      if (error instanceof ResponseError) throw error;

      if (isTimeout) {
        throw new ResponseError({
          message: 'Request timeout',
          status: StatusCode.TIME_OUT,
          statusText: 'Request timeout',
          config,
          name: 'Request timeout',
        });
      }

      throw RequestExecutor.normalizeError(error, config);
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }
}
