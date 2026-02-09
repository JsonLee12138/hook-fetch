import type { HookFetchRequest } from '../utils';
import { useRef, useState } from 'react';

interface UseHookFetchOptions<Q extends (...args: any[]) => any> {
  request: Q;
  onError?: (e: Error) => any;
}

export function useHookFetch<Q extends (...args: any[]) => any>({
  request,
  onError,
}: UseHookFetchOptions<Q>) {
  const instance = useRef<HookFetchRequest<any, any> | null>(null);
  const [loading, setLoading] = useState(false);

  const _request_ = (...args: any[]) => {
    if (instance.current) {
      return instance.current;
    }
    instance.current = request(...args);
    instance.current?.finally(() => setLoading(false));
    return instance;
  };

  const setInstance = (...args: Parameters<Q>) => {
    instance.current = request(...args);
    setLoading(true);
    instance.current?.finally(() => setLoading(false));
    instance.current?.catch((e: unknown) => {
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
