import type { HookFetchRequest } from '../utils';
import { ref } from 'vue';

interface UseHookFetchOptions<Q extends (...args: any[]) => any> {
  request: Q;
  onError?: (e: Error) => any;
}

export function useHookFetch<Q extends (...args: any[]) => any>({
  request,
  onError,
}: UseHookFetchOptions<Q>) {
  let instance: HookFetchRequest<any, any> | null = null;
  const loading = ref(false);

  const _request_ = (...args: any[]) => {
    if (instance) {
      return instance;
    }
    instance = request(...args);
    instance?.finally(() => { loading.value = false; });
    return instance;
  };

  const setInstance = (...args: Parameters<Q>) => {
    instance = request(...args);
    loading.value = true;
    instance?.finally(() => { loading.value = false; });
    instance?.catch((e: unknown) => {
      loading.value = false;
      if (e instanceof Error) {
        if (!e.message.includes('Unexpected token') && e.name !== 'AbortError') {
          onError?.(e);
        }
      }
    });
    return instance;
  };

  const text = (...args: Parameters<Q>) => {
    setInstance(...args);
    return instance!.text();
  };

  const stream = <T = unknown>(...args: Parameters<Q>) => {
    setInstance(...args);
    return instance!.stream<T>();
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
