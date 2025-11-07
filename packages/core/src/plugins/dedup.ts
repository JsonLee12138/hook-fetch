import type { HookFetchPlugin } from '../types';
import { ResponseError } from '../error';

export interface DedupePluginOptions {}

function getRequestKey(url: string, method: string, params: any, data: any) {
  return `${url}::${method}::${JSON.stringify(params)}::${JSON.stringify(data)}`;
}

const DEDUPE_ERROR_NAME = 'DedupeError';

export function isDedupeError(error: unknown): boolean {
  return error instanceof ResponseError && error.name === DEDUPE_ERROR_NAME;
}

export function dedupePlugin(_: DedupePluginOptions): HookFetchPlugin<unknown, { dedupeAble: boolean }> {
  const cache = new Map();
  return {
    name: 'dedupe',
    async beforeRequest(config) {
      // 修复：条件应该是 dedupeAble 为 true 时执行去重（默认为 true）
      if (config.extra?.dedupeAble ?? true) {
        const key = getRequestKey(config.url, config.method, config.params, config.data);
        const cached = cache.get(key);
        if (cached) {
          // 检测到重复请求，抛出错误
          // throw new Error('Dedupe error');
          throw new ResponseError({
            message: 'Dedupe error',
            status: 400,
            statusText: 'Dedupe error',
            config,
            name: DEDUPE_ERROR_NAME,
          });
        }
        // 修复：将当前请求标记添加到缓存中
        cache.set(key, true);
      }
      return config;
    },
    afterResponse: (context) => {
      const key = getRequestKey(context.config.url, context.config.method, context.config.params, context.config.data);
      if (cache.has(key)) {
        cache.delete(key);
      }
      return context;
    },
    onError: (context) => {
      // 修复：请求出错时也要清除缓存，否则会导致后续相同请求无法执行
      if (context.config) {
        const key = getRequestKey(context.config.url, context.config.method, context.config.params, context.config.data);
        if (cache.has(key)) {
          cache.delete(key);
        }
      }
      return context;
    },
  };
}
