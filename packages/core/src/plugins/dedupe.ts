import type { HookFetchPlugin } from '../types';
import { ResponseError } from '../error';

/**
 * 去重插件配置选项
 * Deduplication plugin configuration options
 */
export interface DedupePluginOptions {}

/**
 * 生成请求的唯一标识
 * Generate unique identifier for the request
 *
 * @param url - 请求 URL / Request URL
 * @param method - HTTP 方法 / HTTP method
 * @param params - URL 参数 / URL parameters
 * @param data - 请求体数据 / Request body data
 * @returns 请求唯一标识 / Unique request identifier
 */
function getRequestKey(url: string, method: string, params: any, data: any) {
  return `${url}::${method}::${JSON.stringify(params)}::${JSON.stringify(data)}`;
}

/**
 * 去重错误名称
 * Deduplication error name
 */
const DEDUPE_ERROR_NAME = 'DedupeError';

/**
 * 检查错误是否为去重错误
 * Check if the error is a deduplication error
 *
 * @param error - 错误对象 / Error object
 * @returns 是否为去重错误 / Whether it's a deduplication error
 */
export function isDedupeError(error: unknown): boolean {
  return error instanceof ResponseError && error.name === DEDUPE_ERROR_NAME;
}

/**
 * 请求去重插件
 * Request deduplication plugin
 *
 * ⚠️ 警告 / Warning:
 * 官方不推荐在生产环境中使用此插件。去重逻辑会增加系统复杂度，可能导致意外的行为。
 * This plugin is NOT officially recommended for production use. Deduplication logic adds
 * system complexity and may lead to unexpected behavior.
 *
 * 建议在应用层面通过设计来避免重复请求:
 * We recommend preventing duplicate requests at the application level through design:
 * - 禁用按钮防止重复点击 / Disable buttons to prevent repeated clicks
 * - 使用防抖/节流处理用户输入 / Use debounce/throttle for user input handling
 * - 使用请求状态管理避免并发请求 / Use request state management to avoid concurrent requests
 *
 * @param _ - 插件配置选项 / Plugin configuration options
 * @returns 插件对象 / Plugin object
 *
 * @example
 * ```typescript
 * import { dedupePlugin, isDedupeError } from 'hook-fetch/plugins/dedup';
 *
 * const api = hookFetch.create({
 *   plugins: [dedupePlugin({})]
 * });
 *
 * // 并发相同请求会被去重 / Concurrent identical requests will be deduplicated
 * const promises = [
 *   api.get('/users/1').json(),
 *   api.get('/users/1').json(), // 会被去重 / Will be deduplicated
 * ];
 *
 * const results = await Promise.allSettled(promises);
 * results.forEach((result) => {
 *   if (result.status === 'rejected' && isDedupeError(result.reason)) {
 *     console.log('请求被去重 / Request was deduplicated');
 *   }
 * });
 * ```
 */
export function dedupePlugin(_: DedupePluginOptions = {}): HookFetchPlugin<unknown, { dedupeAble: boolean }> {
  // 缓存正在进行的请求
  // Cache for ongoing requests
  const cache = new Map<string, boolean>();

  return {
    name: 'dedupe',

    /**
     * 请求发送前检查是否为重复请求
     * Check for duplicate requests before sending
     */
    async beforeRequest(config) {
      // 默认启用去重，除非显式设置 dedupeAble 为 false
      // Deduplication is enabled by default unless explicitly set to false
      if (config.extra?.dedupeAble ?? true) {
        const key = getRequestKey(config.url, config.method, config.params, config.data);
        const cached = cache.get(key);

        if (cached) {
          // 检测到重复请求，抛出去重错误
          // Duplicate request detected, throw deduplication error
          throw new ResponseError({
            message: 'Dedupe error',
            status: 400,
            statusText: 'Dedupe error',
            config,
            name: DEDUPE_ERROR_NAME,
          });
        }

        // 将当前请求标记添加到缓存中
        // Mark current request in cache
        cache.set(key, true);
      }
      return config;
    },

    /**
     * 请求成功后清除缓存
     * Clear cache after successful response
     */
    afterResponse: (context) => {
      const key = getRequestKey(context.config.url, context.config.method, context.config.params, context.config.data);
      if (cache.has(key)) {
        cache.delete(key);
      }
      return context;
    },

    /**
     * 请求失败时也要清除缓存，否则会导致后续相同请求无法执行
     * Clear cache on error, otherwise subsequent identical requests won't be able to execute
     */
    onError: (context) => {
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
