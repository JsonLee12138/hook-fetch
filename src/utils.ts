import type QueryString from "qs";
import qs from "qs";
import { omit } from "radash";
import type { AnyObject } from "typescript-api-pro";
import { ContentType, StatusCode } from "./enum";
import type { ResponseErrorOptions } from "./error";
import { HookFetchPlugin, type BaseRequestOptions, type FetchPluginContext, type FetchResponseType, type RequestConfig, type RequestMethod, type RequestMethodWithBody, type RequestMethodWithParams, type StreamContext } from "./types";

export const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const timeoutCallback = (controller: AbortController) => {
  controller.abort();
}

enum ResponseType {
  JSON = 'json',
  BLOB = 'blob',
  TEXT = 'text',
  ARRAY_BUFFER = 'arrayBuffer',
  FORM_DATA = 'formData',
  BYTES = 'bytes'
}

export class ResponseError<E = unknown> extends Error {
  #message: string;
  #name: string;
  #status?: number;
  #statusText?: string;
  #response?: Response;
  #config?: RequestConfig<unknown, unknown, E>;

  constructor({ message, status, statusText, response, config, name }: ResponseErrorOptions<E>) {
    super(message);
    this.#message = message;
    this.#status = status;
    this.#statusText = statusText;
    this.#response = response;
    this.#config = config;
    this.#name = name ?? message;
  }

  get message() {
    return this.#message;
  }
  get status() {
    return this.#status;
  }
  get statusText() {
    return this.#statusText;
  }
  get response() {
    return this.#response;
  }
  get config() {
    return this.#config;
  }
  get name() {
    return this.#name;
  }
}

const parsePlugins = (plugins: HookFetchPlugin[]) => {
  const pluginsMap = new Map<string, HookFetchPlugin>();
  plugins.forEach(plugin => {
    pluginsMap.set(plugin.name, plugin);
  })
  const pluginsArr = Array.from(pluginsMap.values()).sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));

  const beforeRequestPlugins: Array<Exclude<HookFetchPlugin['beforeRequest'], undefined>> = [];
  const afterResponsePlugins: Array<Exclude<HookFetchPlugin['afterResponse'], undefined>> = [];
  const errorPlugins: Array<Exclude<HookFetchPlugin['onError'], undefined>> = [];
  const finallyPlugins: Array<Exclude<HookFetchPlugin['onFinally'], undefined>> = [];
  const transformStreamChunkPlugins: Array<Exclude<HookFetchPlugin['transformStreamChunk'], undefined>> = [];
  const beforeStreamPlugins: Array<Exclude<HookFetchPlugin['beforeStream'], undefined>> = [];
  pluginsArr.forEach(plugin => {
    if (plugin.beforeRequest) {
      beforeRequestPlugins.push(plugin.beforeRequest);
    }
    if (plugin.afterResponse) {
      afterResponsePlugins.push(plugin.afterResponse);
    }
    if (plugin.onError) {
      errorPlugins.push(plugin.onError);
    }
    if (plugin.onFinally) {
      finallyPlugins.push(plugin.onFinally);
    }
    if (plugin.transformStreamChunk) {
      transformStreamChunkPlugins.push(plugin.transformStreamChunk);
    }
    if (plugin.beforeStream) {
      beforeStreamPlugins.push(plugin.beforeStream);
    }
  })
  return {
    beforeRequestPlugins,
    afterResponsePlugins,
    errorPlugins,
    finallyPlugins,
    beforeStreamPlugins,
    transformStreamChunkPlugins
  }
}

export const buildUrl = (url: string, params?: AnyObject, qsArrayFormat: QueryString.IStringifyOptions['arrayFormat'] = "repeat"): string => {
  if (params) {
    const paramsStr = qs.stringify(params, { arrayFormat: qsArrayFormat });
    if (paramsStr) {
      url = url.includes('?') ? `${url}&${paramsStr}` : `${url}?${paramsStr}`;
    }
  }
  return url;
}

export const mergeHeaders = (_baseHeaders: HeadersInit | Headers = {}, _newHeaders: HeadersInit | Headers = {}): Headers => {
  const _result = _baseHeaders instanceof Headers ? _baseHeaders : new Headers(_baseHeaders);
  const combineHeaders = (_headers: HeadersInit | Headers) => {
    if (!(_headers instanceof Headers)) {
      _headers = new Headers(_headers);
    }
    _headers.forEach((value, key) => {
      _result.set(key, value);
    });
  }
  combineHeaders(_newHeaders);
  return _result;
}

const withBodyArr: RequestMethodWithBody[] = ['PATCH', 'POST', 'PUT'];
const withoutBodyArr: RequestMethodWithParams[] = ['GET', 'HEAD', 'OPTIONS', 'DELETE'];

export const getBody = (body: AnyObject, method: RequestMethod, headers?: HeadersInit, qsArrayFormat: QueryString.IStringifyOptions['arrayFormat'] = 'repeat'): BodyInit | null => {
  if (!body) return null;
  if (body instanceof FormData) return body;
  let res: BodyInit | null = null;
  if (withBodyArr.includes(method.toUpperCase() as RequestMethodWithBody)) {
    const _headers_: Headers = new Headers(headers || {});
    const _contentType = _headers_.get('Content-Type') || ContentType.JSON;
    if (_contentType.includes(ContentType.JSON)) {
      res = JSON.stringify(body);
    } else if (_contentType.includes(ContentType.FORM_URLENCODED)) {
      res = qs.stringify(body, { arrayFormat: qsArrayFormat, });
    } else if (_contentType.includes(ContentType.FORM_DATA)) {
      const formData = new FormData();
      if (!(body instanceof FormData) && typeof body === 'object') {
        const _data = body as AnyObject;
        Object.keys(_data).forEach((key) => {
          if (_data.prototype.hasOwnProperty.call(key)) {
            formData.append(key, _data[key]);
          }
        });
        res = formData;
      }
    }
  }
  if (withoutBodyArr.includes(method.toUpperCase() as RequestMethodWithParams)) {
    res = null;
  }
  return res;
}


export class HookFetchRequest<T, E> implements PromiseLike<T> {
  #plugins: ReturnType<typeof parsePlugins>;
  #controller: AbortController;
  #config: RequestConfig<unknown, unknown, E>;
  #promise: Promise<Response>;
  #isTimeout: boolean = false;
  // eslint-disable-next-line no-explicit-any
  #executor: Promise<any> | null = null;
  #finallyCallbacks: Array<(() => void) | null | undefined> = [];
  #responseType: FetchResponseType = 'json';
  #fullOptions: BaseRequestOptions<unknown, unknown, E>;

  constructor(options: BaseRequestOptions<unknown, unknown, E>) {
    this.#fullOptions = options;
    const { plugins = [], controller, url, baseURL = '', params, data, qsArrayFormat = 'repeat', withCredentials, extra, method = 'GET', headers } = options;
    this.#controller = controller ?? new AbortController();
    this.#plugins = parsePlugins(plugins);
    this.#config = {
      url,
      baseURL,
      params,
      data,
      withCredentials,
      extra,
      method,
      headers,
      qsArrayFormat
    }
    this.#promise = this.#init(options);
  }

  #init({ timeout }: BaseRequestOptions<unknown, unknown, E>) {
    // eslint-disable-next-line no-async-promise-executor
    return new Promise<Response>(async (resolve, reject) => {
      let config = this.#config;
      const { beforeRequestPlugins } = this.#plugins;
      for (const plugin of beforeRequestPlugins) {
        config = (await plugin(config)) as RequestConfig<unknown, unknown, E>;
      }

      const _url_ = buildUrl(config.baseURL + config.url, config.params as AnyObject, config.qsArrayFormat);

      const body = getBody(config.data as AnyObject, config.method, config.headers, config.qsArrayFormat);

      const otherOptions = omit(config ?? {}, ['baseURL', 'data', 'extra', 'headers', 'method', 'params', 'url', 'withCredentials']);

      const options: RequestInit = {
        ...otherOptions,
        method: config.method,
        headers: config.headers,
        signal: this.#controller.signal,
        credentials: config.withCredentials ? 'include' : 'omit',
        body
      };

      const req = fetch(_url_, options);
      let promises: Array<Promise<Response | void>> = [req];
      let timeoutId: ReturnType<typeof setTimeout> | null = null;
      if (timeout) {
        const timeoutPromise = new Promise<void>((_) => {
          timeoutId = setTimeout(() => {
            this.#isTimeout = true;
            this.#controller?.abort();
          }, timeout)
        })
        promises.push(timeoutPromise)
      }

      let err: Error | null = null;
      try {
        const res = await Promise.race(promises);
        if (res) {
          if (res.ok) {
            resolve(res)
          }
          err = new ResponseError({
            message: 'Fail Request',
            status: res.status,
            statusText: res.statusText,
            config: this.#config,
            name: 'Fail Request'
          })
        }else{
          err = new ResponseError({
            message: 'NETWORK_ERROR',
            status: StatusCode.NETWORK_ERROR,
            statusText: 'Network Error',
            config: this.#config,
            name: 'Network Error'
          })
        }
      } catch (error) {
        err = error as Error;
      } finally {
        if(err){
          reject(await this.#normalizeError(err))
        }
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      }
    })
  }

  async #createNormalizeError(error: unknown): Promise<ResponseError> {
    if (error instanceof ResponseError) return error;

    if (error instanceof TypeError) {
      if (error.name === 'AbortError') {
        if (this.#isTimeout) {
          return new ResponseError({
            message: 'Request timeout',
            status: StatusCode.TIME_OUT,
            statusText: 'Request timeout',
            config: this.#config,
            name: 'Request timeout',
            response: await this.#response
          })
        } else {
          return new ResponseError({
            message: 'Request aborted',
            status: StatusCode.ABORTED,
            statusText: 'Request aborted',
            config: this.#config,
            name: 'Request aborted',
            response: await this.#response
          })
        }
      }
      return new ResponseError({
        message: error.message,
        status: StatusCode.NETWORK_ERROR,
        statusText: "Unknown Request Error",
        config: this.#config,
        name: error.name,
        response: await this.#response
      });
    }

    return new ResponseError({
      message: (error as Error)?.message ?? "Unknown Request Error",
      status: StatusCode.UNKNOWN,
      statusText: "Unknown Request Error",
      config: this.#config,
      name: 'Unknown Request Error',
      response: await this.#response
    })
  }

  async #normalizeError(error: unknown): Promise<ResponseError> {
    let err = await this.#createNormalizeError(error);
    for (const plugin of this.#plugins.errorPlugins) {
      err = await plugin(err, this.#config) as ResponseError<E>;
    }
    return err
  }

  json() {
    return this.#then(ResponseType.JSON, this.#response.then(r => r.json()));
  }

  lazyFinally(onfinally?: (() => void) | null | undefined): Promise<T> | null {
    if (!this.#executor) {
      if (onfinally) {
        this.#finallyCallbacks.push(onfinally)
      }
      return null
    };
    return this.#executor.finally(() => {
      for (const callback of this.#finallyCallbacks) {
        callback!();
      }
      this.#finallyCallbacks = [];
    });
  }

  get #getExecutor() {
    if (this.#executor) return this.#executor;
    return this.#response
  }

  async #resolve(v: T | Blob | string | ArrayBuffer | FormData | Uint8Array<ArrayBufferLike>) {
    const plugins = this.#plugins.afterResponsePlugins;
    let ctx: FetchPluginContext = {
      config: this.#config,
      response: await this.#response.then(r => r.clone()),
      responseType: this.#responseType,
      controller: this.#controller,
      result: v
    };
    for (const plugin of plugins) {
      ctx = await plugin(ctx, this.#config)
    }
    return ctx.result as T;
  }


  then<TResult1 = T, TResult2 = never>(
    onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | null | undefined,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null | undefined
  ): Promise<TResult1 | TResult2> {
    return this.#getExecutor.then(
      async (v) => onfulfilled?.call(this, await this.#resolve(v)),
      async (e) => onrejected?.call(this, await this.#normalizeError(e))
    ) as Promise<TResult1 | TResult2>
  }

  catch<TResult = never>(
    onrejected?: ((reason: unknown) => TResult | PromiseLike<TResult>) | null | undefined
  ): Promise<T | TResult> {
    return this.#getExecutor.catch(onrejected)
  }

  finally(onfinally?: (() => void) | null | undefined): Promise<T> {
    return this.#getExecutor.finally(onfinally);
  }

  abort() {
    this.#controller.abort();
  }

  get #response() {
    return this.#promise.then(r => r.clone());
  }

  blob() {
    return this.#then(ResponseType.BLOB, this.#response.then(r => r.blob()));
  }

  text() {
    return this.#then(ResponseType.TEXT, this.#response.then(r => r.text()));
  }

  arrayBuffer() {
    return this.#then(ResponseType.ARRAY_BUFFER, this.#response.then(r => r.arrayBuffer()));
  }

  #then(type: ResponseType, promise: Promise<any>) {
    this.#executor = promise.then(r => {
      this.#responseType = type;
      return this.#resolve(r);
    }).catch(e => {
      this.#responseType = type;
      return this.#normalizeError(e);
    });

    this.#executor.finally(this.lazyFinally.bind(this));
    return this.#executor;
  }

  formData() {
    return this.#then(ResponseType.FORM_DATA, this.#response.then(r => r.formData()));
  }

  bytes() {
    return this.#then(ResponseType.BYTES, this.#response.then(r => r.bytes()));
  }

  async *stream<T>() {
    let body = (await this.#response)?.body;
    if (!body) {
      throw new Error('Response body is null');
    }
    for (const plugin of this.#plugins.beforeStreamPlugins) {
      body = await plugin(body, this.#config);
    }
    const reader = body.getReader();
    if (!reader) {
      throw new Error('Response body reader is null');
    }
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        let res: StreamContext = {
          source: value,
          result: value,
          error: null
        };
        try {
          for (const plugin of this.#plugins.transformStreamChunkPlugins) {
            res = await plugin(res, this.#config);
          }
          if (res.result && (isGenerator(res.result) || isAsyncGenerator(res.result))) {
            for await (const chunk of (res.result as AsyncGenerator<any, void, unknown>
            )) {
              let resultItem = {
                source: res.source,
                result: chunk,
                error: null
              }
              yield resultItem as StreamContext<T>;
            }
          } else {
            yield res as StreamContext<T>;
          }
        } catch (error) {
          res.error = error;
          res.result = null;
          yield res as StreamContext<null>;
        }
      }
    } catch (error) {
      return this.#normalizeError(error);
    } finally {
      reader.releaseLock();
    }
  }

  retry() {
    const { controller: _, ...options } = this.#fullOptions;
    return new HookFetchRequest(options);
  }

  get response() {
    return this.#response;
  }
}

export const isGenerator = (v: any) => {
  return v[Symbol.toStringTag] === 'Generator' && typeof v.next === 'function' && typeof v.return === 'function' && typeof v.throw === 'function' && typeof v[Symbol.iterator] === 'function';
}

export const isAsyncGenerator = (v: any) => {
  return v[Symbol.toStringTag] === 'AsyncGenerator' && typeof v.next === 'function' && typeof v.return === 'function' && typeof v.throw === 'function' && typeof v[Symbol.asyncIterator] === 'function';
}
