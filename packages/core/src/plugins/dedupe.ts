import type { HookFetchPlugin } from '../types';
import { ResponseError } from '../errors';

export interface DedupePluginOptions {}

function getRequestKey(url: string, method: string, params: any, data: any) {
  return `${url}::${method}::${JSON.stringify(params)}::${JSON.stringify(data)}`;
}

const DEDUPE_ERROR_NAME = 'DedupeError';

export function isDedupeError(error: unknown): boolean {
  return error instanceof ResponseError && error.name === DEDUPE_ERROR_NAME;
}

export function dedupePlugin(_: DedupePluginOptions = {}): HookFetchPlugin<unknown, { dedupeAble: boolean }> {
  const cache = new Map<string, boolean>();

  return {
    name: 'dedupe',

    async beforeRequest({ config }) {
      if (config.extra?.dedupeAble ?? true) {
        const key = getRequestKey(config.url, config.method, config.params, config.data);
        const cached = cache.get(key);

        if (cached) {
          throw new ResponseError({
            message: 'Dedupe error',
            status: 400,
            statusText: 'Dedupe error',
            config,
            name: DEDUPE_ERROR_NAME,
          });
        }

        cache.set(key, true);
      }
      return config;
    },

    afterResponse(ctx) {
      const key = getRequestKey(ctx.config.url, ctx.config.method, (ctx.config as any).params, (ctx.config as any).data);
      cache.delete(key);
      return ctx;
    },

    onError({ config }) {
      if (config) {
        const key = getRequestKey(config.url, config.method, (config as any).params, (config as any).data);
        cache.delete(key);
      }
    },
  };
}
