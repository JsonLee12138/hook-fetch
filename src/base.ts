import type { AnyObject, Generic } from "typescript-api-pro";
import { type BaseOptions, type BaseRequestOptions, type DeleteOptions, type GetOptions, type HeadOptions, type HookFetchPlugin, type OptionsOptions, type PatchOptions, type PostOptions, type PutOptions, type RequestOptions, type RequestWithBodyOptions, type RequestWithParamsOptions } from "./types";
import { HookFetchRequest, mergeHeaders } from "./utils";

const _request_ = <R, P, D, E>(options: BaseRequestOptions<P, D>): HookFetchRequest<R, E> => {
  return new HookFetchRequest<R, E>(options);
}

class Base<R extends AnyObject = AnyObject, E = AnyObject, K extends keyof R = string> {
  #timeout: number;
  #baseURL: string;
  #commonHeaders: HeadersInit;
  #queue: Array<AbortController> = [];
  #plugins: Array<HookFetchPlugin> = [];
  #withCredentials: boolean;

  constructor({ timeout = 0, baseURL = '', headers = {}, plugins = [], withCredentials = false }: BaseOptions) {
    this.#timeout = timeout;
    this.#baseURL = baseURL;
    this.#commonHeaders = headers;
    this.#plugins = plugins;
    this.#withCredentials = withCredentials;
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

  // eslint-disable-next-line no-explicit-any
  use(plugin: HookFetchPlugin<any, any, any, any>) {
    this.#plugins.push(plugin);
    return this;
  }

  request<T = AnyObject, P = AnyObject, D = AnyObject>(url: string, { timeout, headers, method = 'GET', params = {} as P, data, qsArrayFormat, withCredentials, extra }: RequestOptions<P, D, E> = {}) {
    const controller = new AbortController();
    this.#queue.push(controller);
    const req = _request_<Generic<R, K, T>, P, D, E>({
      url,
      baseURL: this.#baseURL,
      timeout: timeout ?? this.#timeout,
      plugins: this.#plugins,
      headers: mergeHeaders(this.#commonHeaders, headers),
      controller,
      method,
      params,
      data,
      qsArrayFormat,
      withCredentials: withCredentials ?? this.#withCredentials,
      extra: extra as AnyObject
    })
    req.lazyFinally(() => {
      this.#queue = this.#queue.filter(item => item !== controller);
    })
    return req;
  }

  #requestWithParams<T = AnyObject, P = AnyObject>(url: string, params: P = {} as P, options: RequestWithParamsOptions<P, E> = {}) {
    return this.request<T, P, never>(url, { ...options, params })
  }

  #requestWithBody<T = AnyObject, D = AnyObject, P = AnyObject>(url: string, data: D = {} as D, options: RequestWithBodyOptions<D, P, E> = {}) {
    return this.request<T, P, D>(url, { ...options, data })
  }

  get<T = AnyObject, P = AnyObject>(url: string, params: P = {} as P, options?: GetOptions<P, E>) {
    return this.#requestWithParams<T, P>(url, params, { ...options, method: 'GET' })
  }

  head<T = AnyObject, P = AnyObject>(url: string, params: P = {} as P, options?: HeadOptions<P, E>) {
    return this.#requestWithParams<T, P>(url, params, { ...options, method: 'HEAD' })
  }

  options<T = AnyObject, P = AnyObject>(url: string, params: P = {} as P, options?: OptionsOptions<P, E>) {
    return this.#requestWithParams<T, P>(url, params, { ...options, method: 'OPTIONS' })
  }

  delete<T = AnyObject, P = AnyObject>(url: string, options?: DeleteOptions<P, E>) {
    return this.request<T, P, never>(url, { ...options, method: 'DELETE' })
  }

  post<T = AnyObject, D = AnyObject, P = AnyObject>(url: string, data?: D, options?: PostOptions<D, P, E>) {
    return this.#requestWithBody<T, D, P>(url, data, { ...options, method: 'POST' })
  }

  put<T = AnyObject, D = AnyObject, P = AnyObject>(url: string, data?: D, options?: PutOptions<D, P, E>) {
    return this.#requestWithBody<T, D, P>(url, data, { ...options, method: 'PUT' })
  }

  patch<T = AnyObject, D = AnyObject, P = AnyObject>(url: string, data?: D, options?: PatchOptions<D, P, E>) {
    return this.#requestWithBody<T, D, P>(url, data, { ...options, method: 'PATCH' })
  }

  abortAll() {
    this.#queue.forEach(controller => controller.abort());
    this.#queue = [];
  }
}

const useRequest = <R = AnyObject, P = AnyObject, D = AnyObject, E = AnyObject>(url: string, options: RequestOptions<P, D, E> = {}) => _request_<R, P, D, E>({
  url,
  baseURL: '',
  ...options
} as BaseRequestOptions<P, D>)

const requestWithParams = <R = AnyObject, P = AnyObject, E = AnyObject>(url: string, params: P, options: RequestWithParamsOptions<P, E> = {}) => {
  return useRequest<R, P, never, E>(url, { ...options, params });
}

const requestWithBody = <R = AnyObject, D = AnyObject, P = AnyObject, E = AnyObject>(url: string, data: D = null as D, options: RequestWithBodyOptions<D, P, E> = {}) => {
  return useRequest<R, P, D, E>(url, { ...options, data });
}

export const request = useRequest;

export const get = <R = AnyObject, P = AnyObject, E = AnyObject>(url: string, params: P = {} as P, options?: GetOptions<P, E>) => {
  return requestWithParams<R, P, E>(url, params, { ...options, method: 'GET' })
}

export const head = <R = AnyObject, P = AnyObject, E = AnyObject>(url: string, params: P = {} as P, options?: HeadOptions<P, E>) => {
  return requestWithParams<R, P, E>(url, params, { ...options, method: 'HEAD' })
}

export const options = <R = AnyObject, P = AnyObject, E = AnyObject>(url: string, params: P = {} as P, options?: OptionsOptions<P, E>) => {
  return requestWithParams<R, P, E>(url, params, { ...options, method: 'OPTIONS' })
}

export const del = <R = AnyObject, P = AnyObject, E = AnyObject>(url: string, options?: DeleteOptions<P, E>) => {
  return useRequest<R, P, never, E>(url, { ...options, method: 'DELETE' })
}

export const post = <R = AnyObject, D = AnyObject, P = AnyObject, E = AnyObject>(url: string, data?: D, options?: PostOptions<D, P, E>) => {
  return requestWithBody<R, D, P, E>(url, data, { ...options, method: 'POST' })
}

export const put = <R = AnyObject, D = AnyObject, P = AnyObject, E = AnyObject>(url: string, data?: D, options?: PutOptions<D, P, E>) => {
  return requestWithBody<R, D, P, E>(url, data, { ...options, method: 'PUT' })
}

export const patch = <R = AnyObject, D = AnyObject, P = AnyObject, E = AnyObject>(url: string, data?: D, options?: PatchOptions<D, P, E>) => {
  return requestWithBody<R, D, P, E>(url, data, { ...options, method: 'PATCH' })
}

type ExportDefault = typeof useRequest & {
  create: <R extends AnyObject = AnyObject, E = AnyObject, K extends keyof R = string>(options: BaseOptions) => (Base<R, E, K>['request'] & Base<R, E, K>);
  get: typeof get;
  head: typeof head;
  options: typeof options;
  delete: typeof del;
  post: typeof post;
  put: typeof put;
  patch: typeof patch;
}

const hookFetch = useRequest as ExportDefault;

hookFetch.create = <R extends AnyObject = AnyObject, E = AnyObject, K extends keyof R = string>(options: BaseOptions) => {
  const context = new Base<R, E, K>(options);
  const instance = context.request.bind(this);
  Object.assign(instance, Base.prototype, context);
  return instance as (typeof context.request & Base<R, E, K>);
};

hookFetch.get = get;
hookFetch.head = head;
hookFetch.options = options;
hookFetch.delete = del;
hookFetch.post = post;
hookFetch.put = put;
hookFetch.patch = patch;

export default hookFetch;
