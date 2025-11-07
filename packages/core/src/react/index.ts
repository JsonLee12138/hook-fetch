import type { HookFetchPlugin } from '../types';
import type { HookFetchRequest } from '../utils';
import { useRef, useState } from 'react';

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
 * @property {Function<T>} stream - Get response as stream | 获取流响应
 * @property {Function} text - Get response as text | 获取文本响应
 * @property {Function} blob - Get response as blob | 获取二进制响应
 * @property {Function} arrayBufferData - Get response as array buffer | 获取二进制缓冲区响应
 * @property {Function} formDataResult - Get response as form data | 获取表单数据响应
 * @property {Function} bytesData - Get response as bytes | 获取字节数据响应
 * @property {Function} cancel - Cancel request | 取消请求
 * @property {boolean} loading - Loading state | 加载状态
 * @property {Function} setLoading - Set loading state | 修改加载状态
 */
export function useHookFetch<Q extends (...args: any[]) => any>({
  request,
  onError,
}: UseHookFetchOptions<Q>) {
  const instance = useRef<HookFetchRequest<any, any> | null>(null);
  const [loading, setLoading] = useState(false);

  const reactPlugin: HookFetchPlugin = {
    name: '__react-hook__',
    onFinally() {
      setLoading(false);
    },
  };

  const _request_ = (...args: any[]) => {
    if (instance.current) {
      return instance.current;
    }
    instance.current = request(...args);
    if (!instance.current || !('__injectPlugins__' in instance.current)) {
      throw new Error('Instance is not a HookFetchRequest');
    }
    instance.current?.__injectPlugins__([reactPlugin]);
    return instance;
  };

  const setInstance = (...args: Parameters<Q>) => {
    instance.current = request(...args);
    if (!instance.current || !('__injectPlugins__' in instance.current)) {
      throw new Error('Instance is not a HookFetchRequest');
    }
    instance.current?.__injectPlugins__([reactPlugin]);
    setLoading(true);
    instance.current?.catch((e) => {
      if (e instanceof Error) {
        if (!e.message.includes('Unexpected token') && e.name !== 'AbortError') {
          onError?.(e);
        }
      }
      setLoading(false);
    });
    return instance;
  };

  const text = (...args: Parameters<Q>) => {
    setInstance(...args);
    return instance.current!.text();
  };

  const stream = <T = unknown>(...args: Parameters<Q>) => {
    setInstance(...args);
    return instance.current!.stream<T>();
  };

  const blob = (...args: Parameters<Q>) => {
    setInstance(...args);
    return instance.current!.blob();
  };

  const arrayBufferData = (...args: Parameters<Q>) => {
    setInstance(...args);
    return instance.current!.arrayBuffer();
  };

  const formDataResult = (...args: Parameters<Q>) => {
    setInstance(...args);
    return instance.current!.formData();
  };

  const bytesData = (...args: Parameters<Q>) => {
    setInstance(...args);
    return instance.current!.bytes();
  };

  const cancel = () => {
    setLoading(false);
    if (instance) {
      try {
        instance.current?.abort();
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
    setLoading,
  };
}
