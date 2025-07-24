import type { HookFetchRequest } from "../utils";
import { useRef, useState } from 'react';

interface UseHookFetchOptions<Q extends (...args: any[]) => any> {
  request: Q;
  onError?: (e: Error)=> any;
}

/**
 * Hook fetch composable function | Hook fetch 组合式函数
 * @param options - Hook fetch options | Hook fetch 选项
 * @param options.request - Request function | 请求函数
 * @param options.onError - Error callback function | 错误回调函数
 * @returns {Function} request - Request function | 请求函数
 * @returns {Function} cancel - Cancel request | 取消请求
 * @returns {boolean} loading - Loading state | 加载状态
 * @returns {Function} setLoading - Set Loading State | 修改加载状态
 * @returns {Function} text - Get response as text | 获取文本响应
 * @returns {Function} stream - Get response as stream | 获取流响应 | 获取流响应
 * @returns {Function} blob - Get response as blob | 获取二进制响应
 * @returns {Function} arrayBuffer - Get response as array buffer | 获取二进制缓冲区响应
 * @returns {Function} formDataResult - Get response as form data | 获取表单数据响应
 * @returns {Function} bytesData - Get response as bytes | 获取字节数据响应
 */
export const useHookFetch = <Q extends (...args: any[]) => any>({
  request,
  onError
}: UseHookFetchOptions<Q>) => {
  const instance = useRef<HookFetchRequest<any, any> | null>(null);
  const [loading, setLoading] = useState(false);

  const _request_ = (...args: any[]) => {
    instance.current = request(...args);
    return instance;
  }

  const setInstance = (...args: Parameters<Q>) => {
    instance.current = request(...args);
    setLoading(true);
    instance.current?.catch((e) => {
      if (e instanceof Error) {
        if (!e.message.includes('Unexpected token') && e.name !== 'AbortError') {
          onError?.(e);
        }
      }
    })
    instance.current?.finally(() => {
      setLoading(false);
    });
    return instance;
  }

  const text = (...args: Parameters<Q>) => {
    setInstance(...args);
    return instance.current!.text();
  }

  const stream = (...args: Parameters<Q>) => {
    setInstance(...args);
    return instance.current!.stream();
  }

  const blob = (...args: Parameters<Q>) => {
    setInstance(...args);
    return instance.current!.blob();
  }

  const arrayBufferData = (...args: Parameters<Q>) => {
    setInstance(...args);
    return instance.current!.arrayBuffer();
  }

  const formDataResult = (...args: Parameters<Q>) => {
    setInstance(...args);
    return instance.current!.formData();
  }

  const bytesData = (...args: Parameters<Q>) => {
    setInstance(...args);
    return instance.current!.bytes();
  }

  const cancel = () => {
    setLoading(false);
    if (instance) {
      try {
        instance.current?.abort();
      } catch (error) {
        console.error('cancel error', error);
      }
    }
  }

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
    setLoading
  }
};
