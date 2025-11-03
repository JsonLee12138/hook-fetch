import type { HookFetchPlugin } from '../types';
import type { HookFetchRequest } from '../utils';
import { ref } from 'vue';

interface UseHookFetchOptions<Q extends (...args: any[]) => any> {
  request: Q;
  onError?: (e: Error) => any;
}

/**
 * Hook fetch composable function | Hook fetch 组合式函数
 *
 * @template Q - Request function type | 请求函数类型
 * @param {object} options - Hook fetch options | Hook fetch 选项
 * @param {Q} options.request - Request function | 请求函数
 * @param {(e: Error) => any} [options.onError] - Error callback function | 错误回调函数
 * @returns {object} Hook fetch utilities object | Hook fetch 工具对象
 * @property {Function} request - Request function | 请求函数
 * @property {Function} stream - Get response as stream | 获取流响应
 * @property {Function} text - Get response as text | 获取文本响应
 * @property {Function} blob - Get response as blob | 获取二进制响应
 * @property {Function} arrayBufferData - Get response as array buffer | 获取二进制缓冲区响应
 * @property {Function} formDataResult - Get response as form data | 获取表单数据响应
 * @property {Function} bytesData - Get response as bytes | 获取字节数据响应
 * @property {Function} cancel - Cancel request | 取消请求
 * @property {import('vue').Ref<boolean>} loading - Loading state | 加载状态
 */
export function useHookFetch<Q extends (...args: any[]) => any>({
  request,
  onError,
}: UseHookFetchOptions<Q>) {
  let instance: HookFetchRequest<any, any> | null = null;
  const loading = ref(false);

  const vuePlugin: HookFetchPlugin = {
    name: '__vue-hook__',
    onFinally() {
      loading.value = false;
    },
  };

  const _request_ = (...args: any[]) => {
    if (instance) {
      return instance;
    }
    instance = request(...args);
    instance?.__injectPlugins__([vuePlugin]);
    return instance;
  };

  const setInstance = (...args: Parameters<Q>) => {
    instance = request(...args);
    instance?.__injectPlugins__([vuePlugin]);
    loading.value = true;
    instance?.catch((e) => {
      loading.value = false;
      if (e instanceof Error) {
        if (!e.message.includes('Unexpected token') && e.name !== 'AbortError') {
          onError?.(e);
        }
      }
    });
    // instance?.finally(() => {
    //   loading.value = false;
    // });
    return instance;
  };

  const text = (...args: Parameters<Q>) => {
    setInstance(...args);
    return instance!.text();
  };

  const stream = (...args: Parameters<Q>) => {
    setInstance(...args);
    return instance!.stream();
  };

  const blob = (...args: Parameters<Q>) => {
    setInstance(...args);
    return instance!.blob();
  };

  const arrayBufferData = (...args: Parameters<Q>) => {
    setInstance(...args);
    return instance!.arrayBuffer();
  };

  const formDataResult = (...args: Parameters<Q>) => {
    setInstance(...args);
    return instance!.formData();
  };

  const bytesData = (...args: Parameters<Q>) => {
    setInstance(...args);
    return instance!.bytes();
  };

  const cancel = () => {
    loading.value = false;
    if (instance) {
      try {
        instance?.abort();
      }
      catch (error) {
        console.error('cancel error', error);
      }
    }
  };

  return {
    request: _request_,
    stream,
    text,
    blob,
    arrayBufferData,
    formDataResult,
    bytesData,
    cancel,
    loading,
  };
}
