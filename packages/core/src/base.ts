import type QueryString from 'qs';
import type { AnyObject, Generic } from 'typescript-api-pro';
import type { BaseOptions, BaseRequestOptions, BodyType, DeleteOptions, GetOptions, HeadOptions, HookFetchPlugin, OptionsOptions, PatchOptions, PostOptions, PutOptions, RequestOptions, RequestWithBodyOptions, RequestWithParamsOptions } from './types';
import { body2FormData, HookFetchRequest, mergeHeaders } from './utils';

function _request_<R, P, D extends BodyType, E>(options: BaseRequestOptions<P, D, E>): HookFetchRequest<R, E> {
  return new HookFetchRequest<R, E>(options);
}

type GenericWithNull<T, R extends AnyObject | null, K extends keyof R> = R extends null ? T : Generic<Exclude<R, null>, K, T>;

class HookFetch<R extends AnyObject | null = null, K extends keyof R = never, E = AnyObject> {
  #timeout: number;
  #baseURL: string;
  #commonHeaders: HeadersInit;
  #queue: Array<AbortController> = [];
  #plugins: Array<HookFetchPlugin<any, any, any, any>> = [];
  #withCredentials: boolean;
  #qsConfig: QueryString.IStringifyOptions;

  constructor({ timeout = 0, baseURL = '', headers = {}, plugins = [], withCredentials = false, qsConfig = {} }: BaseOptions) {
    this.#timeout = timeout;
    this.#baseURL = baseURL;
    this.#commonHeaders = headers;
    this.#plugins = plugins;
    this.#withCredentials = withCredentials;
    this.#qsConfig = qsConfig;
    this.request = this.request.bind(this);
    this.get = this.get.bind(this);
    this.head = this.head.bind(this);
    this.options = this.options.bind(this);
    this.delete = this.delete.bind(this);
    this.post = this.post.bind(this);
    this.put = this.put.bind(this);
    this.patch = this.patch.bind(this);
    this.abortAll = this.abortAll.bind(this);
    this.use = this.use.bind(this);
  }

  use(plugin: HookFetchPlugin<any, any, any, any>) {
    this.#plugins.push(plugin);
    return this;
  }

  request<T = AnyObject, P = AnyObject, D extends BodyType = BodyType>(url: string, { timeout, headers, method = 'GET', params = {} as P, data = {} as D, qsConfig = {}, withCredentials, extra = {} as E, plugins = [] }: RequestOptions<P, D, E> = {}) {
    const controller = new AbortController();
    this.#queue.push(controller);
    // eslint-disable-next-line ts/no-this-alias
    const ctx = this;
    const wrapperPlugin: HookFetchPlugin = {
      name: 'hook-fetch-inner-wrapper',
      priority: Number.MAX_SAFE_INTEGER,
      onFinally() {
        ctx.#queue = ctx.#queue.filter(item => item !== controller);
      },
    };
    const req = _request_<GenericWithNull<T, R, K>, P, D, E>({
      url,
      baseURL: this.#baseURL,
      timeout: timeout ?? this.#timeout,
      plugins: [...this.#plugins, ...plugins, wrapperPlugin],
      headers: mergeHeaders(this.#commonHeaders, headers),
      controller,
      method,
      params,
      data,
      qsConfig: Object.assign(this.#qsConfig, qsConfig),
      withCredentials: withCredentials ?? this.#withCredentials,
      extra,
    });
    return req;
  }

  #requestWithParams<T = AnyObject, P = AnyObject>(url: string, params: P = {} as P, options: RequestWithParamsOptions<P, E> = {}) {
    return this.request<T, P, never>(url, { ...options, params });
  }

  #requestWithBody<T = AnyObject, D extends BodyType = BodyType, P = AnyObject>(url: string, data: D = {} as D, options: RequestWithBodyOptions<D, P, E> = {}) {
    return this.request<T, P, D>(url, { ...options, data });
  }

  get<T = AnyObject, P = AnyObject>(url: string, params: P = {} as P, options?: GetOptions<P, E>) {
    return this.#requestWithParams<T, P>(url, params, { ...options, method: 'GET' });
  }

  head<T = AnyObject, P = AnyObject>(url: string, params: P = {} as P, options?: HeadOptions<P, E>) {
    return this.#requestWithParams<T, P>(url, params, { ...options, method: 'HEAD' });
  }

  options<T = AnyObject, P = AnyObject, D extends BodyType = BodyType>(url: string, params: P = {} as P, options?: OptionsOptions<P, D, E>) {
    return this.request<T, P, D>(url, { ...options, method: 'OPTIONS', params });
  }

  delete<T = AnyObject, D extends BodyType = BodyType, P = AnyObject>(url: string, options?: DeleteOptions<P, D, E>) {
    return this.request<T, P, D>(url, { ...options, method: 'DELETE' });
  }

  post<T = AnyObject, D extends BodyType = BodyType, P = AnyObject>(url: string, data?: D, options?: PostOptions<D, P, E>) {
    return this.#requestWithBody<T, D, P>(url, data, { ...options, method: 'POST' });
  }

  upload<T = AnyObject, D extends AnyObject | FormData = AnyObject, P = AnyObject>(url: string, data?: D, options?: PostOptions<D, P, E>) {
    return this.#requestWithBody<T, FormData, P>(url, body2FormData(data ?? {}), { ...options, method: 'POST' });
  }

  put<T = AnyObject, D extends BodyType = BodyType, P = AnyObject>(url: string, data?: D, options?: PutOptions<D, P, E>) {
    return this.#requestWithBody<T, D, P>(url, data, { ...options, method: 'PUT' });
  }

  patch<T = AnyObject, D extends BodyType = BodyType, P = AnyObject>(url: string, data?: D, options?: PatchOptions<D, P, E>) {
    return this.#requestWithBody<T, D, P>(url, data, { ...options, method: 'PATCH' });
  }

  abortAll() {
    this.#queue.forEach(controller => controller.abort());
    this.#queue = [];
  }
}

function useRequest<R = AnyObject, P = AnyObject, D extends BodyType = BodyType, E = AnyObject>(url: string, options: RequestOptions<P, D, E> = {}) {
  return _request_<R, P, D, E>({
    url,
    baseURL: '',
    ...options,
  } as BaseRequestOptions<P, D>);
}

function requestWithParams<R = AnyObject, P = AnyObject, E = AnyObject>(url: string, params: P, options: RequestWithParamsOptions<P, E> = {}) {
  return useRequest<R, P, never, E>(url, { ...options, params });
}

function requestWithBody<R = AnyObject, D extends BodyType = BodyType, P = AnyObject, E = AnyObject>(url: string, data: D = null as D, options: RequestWithBodyOptions<D, P, E> = {}) {
  return useRequest<R, P, D, E>(url, { ...options, data });
}

export const request = useRequest;

export function get<R = AnyObject, P = AnyObject, E = AnyObject>(url: string, params: P = {} as P, options?: GetOptions<P, E>) {
  return requestWithParams<R, P, E>(url, params, { ...options, method: 'GET' });
}

export function head<R = AnyObject, P = AnyObject, E = AnyObject>(url: string, params: P = {} as P, options?: HeadOptions<P, E>) {
  return requestWithParams<R, P, E>(url, params, { ...options, method: 'HEAD' });
}

export function options<R = AnyObject, P = AnyObject, D extends BodyType = BodyType, E = AnyObject>(url: string, params: P = {} as P, options?: OptionsOptions<P, D, E>) {
  return useRequest<R, P, D, E>(url, { ...options, params, method: 'OPTIONS' });
}

export function del<R = AnyObject, D extends BodyType = BodyType, P = AnyObject, E = AnyObject>(url: string, options?: DeleteOptions<P, D, E>) {
  return useRequest<R, P, D, E>(url, { ...options, method: 'DELETE' });
}

export function post<R = AnyObject, D extends BodyType = BodyType, P = AnyObject, E = AnyObject>(url: string, data?: D, options?: PostOptions<D, P, E>) {
  return requestWithBody<R, D, P, E>(url, data, { ...options, method: 'POST' });
}

export function upload<R = AnyObject, D extends AnyObject | FormData = AnyObject, P = AnyObject, E = AnyObject>(url: string, data?: D, options?: PostOptions<D, P, E>) {
  return requestWithBody<R, FormData, P, E>(url, body2FormData(data ?? {}), { ...options, method: 'POST' });
}

export function put<R = AnyObject, D extends BodyType = BodyType, P = AnyObject, E = AnyObject>(url: string, data?: D, options?: PutOptions<D, P, E>) {
  return requestWithBody<R, D, P, E>(url, data, { ...options, method: 'PUT' });
}

export function patch<R = AnyObject, D extends BodyType = BodyType, P = AnyObject, E = AnyObject>(url: string, data?: D, options?: PatchOptions<D, P, E>) {
  return requestWithBody<R, D, P, E>(url, data, { ...options, method: 'PATCH' });
}

type ExportDefault = typeof useRequest & {
  create: <R extends AnyObject | null = null, K extends keyof R = never, E = AnyObject>(options: BaseOptions) => (HookFetch<R, K, E>['request'] & HookFetch<R, K, E>);
  get: typeof get;
  head: typeof head;
  options: typeof options;
  delete: typeof del;
  post: typeof post;
  put: typeof put;
  patch: typeof patch;
  upload: typeof upload;
};

const hookFetch = useRequest as ExportDefault;

hookFetch.create = <R extends AnyObject | null = null, K extends keyof R = never, E = AnyObject>(options: BaseOptions) => {
  const context = new HookFetch<R, K, E>(options);
  const instance = context.request.bind(this);
  Object.assign(instance, HookFetch.prototype, context);
  return instance as (typeof context.request & HookFetch<R, K, E>);
};

hookFetch.get = get;
hookFetch.head = head;
hookFetch.options = options;
hookFetch.delete = del;
hookFetch.post = post;
hookFetch.put = put;
hookFetch.patch = patch;
hookFetch.upload = upload;

export default hookFetch;
