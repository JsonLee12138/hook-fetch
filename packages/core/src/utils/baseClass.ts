import type { AnyObject } from 'typescript-api-pro';
import type { BaseRequestOptions, BodyType, FetchPluginContext, FetchResponseType, HookFetchPlugin, RequestConfig, StreamContext } from '../types';
import { omit } from 'radash';
import { StatusCode } from '../enum';
import { ResponseError } from '../errors';
import { getBody } from './body';
import { buildUrl, DEFAULT_QS_CONFIG } from './config';
import { isAsyncGenerator, isGenerator } from './others';
import { parsePlugins } from './plugin';

export function timeoutCallback(controller: AbortController) {
  controller.abort();
}

enum ResponseType {
  JSON = 'json',
  BLOB = 'blob',
  TEXT = 'text',
  ARRAY_BUFFER = 'arrayBuffer',
  FORM_DATA = 'formData',
  BYTES = 'bytes',
}

export class HookFetchRequest<T = unknown, E = unknown> implements PromiseLike<T> {
  #plugins: ReturnType<typeof parsePlugins>;
  #sourcePlugins: HookFetchPlugin[];
  #controller: AbortController;
  #config: RequestConfig<unknown, BodyType, E>;
  #promise: Promise<Response> | null = null;
  #isTimeout: boolean = false;
  #executor: Promise<any> | null = null;
  #finallyCallbacks: Set<(() => void) | null | undefined> = new Set();
  #responseType: FetchResponseType = 'json';
  #fullOptions: BaseRequestOptions<unknown, BodyType, E>;

  constructor(options: BaseRequestOptions<unknown, BodyType, E>) {
    this.#fullOptions = options;
    const { plugins = [], controller } = options;
    this.#controller = controller ?? new AbortController();
    this.#sourcePlugins = plugins;
    this.#plugins = parsePlugins(plugins);
    this.#config = this.#buildConfig(options);
    this.#promise = this.#init(options);
  }

  // 初始化配置
  #buildConfig({ baseURL = '', method = 'GET', qsConfig = {}, withCredentials = false, headers = {}, ...rest }: BaseRequestOptions<unknown, BodyType, E>): RequestConfig<unknown, BodyType, E> {
    return {
      ...rest,
      baseURL,
      method,
      data: rest.data as BodyType,
      extra: rest.extra as E,
      withCredentials,
      headers,
      qsConfig: Object.assign(DEFAULT_QS_CONFIG, qsConfig),
    };
  }

  #init({ timeout }: BaseRequestOptions<unknown, BodyType, E>) {
    // eslint-disable-next-line no-async-promise-executor
    return new Promise<Response>(async (resolve, reject) => {
      let config = this.#config;
      const { beforeRequestPlugins } = this.#plugins;
      let err = null;
      for (const plugin of beforeRequestPlugins) {
        try {
          config = (await plugin(config)) as RequestConfig<unknown, BodyType, E>;
          if (config.resolve) {
            const res = config.resolve();
            if (res instanceof Response) {
              return resolve(res);
            }
            else {
              return resolve(new Response(res));
            }
          }
        }
        catch (error) {
          err = error;
          break;
        }
      }
      if (err) {
        this.#promise = null;
        return reject(err);
      }

      const _url_ = buildUrl(config.baseURL + config.url, config.params as AnyObject, config.qsConfig);

      const body = getBody(config.data ?? null, config.method, config.headers, config.qsConfig);

      const otherOptions = omit(config ?? {}, ['baseURL', 'data', 'extra', 'headers', 'method', 'params', 'url', 'withCredentials']);

      const options: RequestInit = {
        ...otherOptions,
        method: config.method,
        headers: config.headers as HeadersInit,
        signal: this.#controller.signal,
        credentials: config.withCredentials ? 'include' : 'omit',
        body,
      };
      const req = fetch(_url_, options);
      const promises: Array<Promise<Response | void>> = [req];
      let timeoutId: ReturnType<typeof setTimeout> | null = null;
      if (timeout) {
        const timeoutPromise = new Promise<void>((_) => {
          timeoutId = setTimeout(() => {
            this.#isTimeout = true;
            this.#controller?.abort();
          }, timeout);
        });
        promises.push(timeoutPromise);
      }

      try {
        const res = await Promise.race(promises);
        if (res) {
          if (res.ok) {
            resolve(res);
          }
          err = new ResponseError({
            message: 'Fail Request',
            status: res.status,
            statusText: res.statusText,
            config: this.#config,
            name: 'Fail Request',
            response: res,
          });
        }
        else {
          err = new ResponseError({
            message: 'NETWORK_ERROR',
            status: StatusCode.NETWORK_ERROR,
            statusText: 'Network Error',
            config: this.#config,
            name: 'Network Error',
          });
        }
      }
      catch (error) {
        err = error;
        this.#promise = null;
      }
      finally {
        if (err) {
          reject(err);
        }
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      }
    });
  }

  async #createNormalizeError(error: unknown): Promise<ResponseError> {
    if (error instanceof ResponseError)
      return error;
    let response: Response | undefined = void 0;
    if (!this.#promise) {
      response = void 0;
    }
    else {
      response = await this.#response as Response;
    }
    if (error instanceof TypeError) {
      if (error.name === 'AbortError') {
        if (this.#isTimeout) {
          return new ResponseError({
            message: 'Request timeout',
            status: StatusCode.TIME_OUT,
            statusText: 'Request timeout',
            config: this.#config,
            name: 'Request timeout',
            response: response as Response,
          });
        }
        else {
          return new ResponseError({
            message: 'Request aborted',
            status: StatusCode.ABORTED,
            statusText: 'Request aborted',
            config: this.#config,
            name: 'Request aborted',
            response: response as Response,
          });
        }
      }
      return new ResponseError({
        message: error.message,
        status: StatusCode.NETWORK_ERROR,
        statusText: 'Unknown Request Error',
        config: this.#config,
        name: error.name,
        response: response as Response,
      });
    }

    return new ResponseError({
      message: (error as Error)?.message ?? 'Unknown Request Error',
      status: StatusCode.UNKNOWN,
      statusText: 'Unknown Request Error',
      config: this.#config,
      name: 'Unknown Request Error',
      response: response as Response,
    });
  }

  async #normalizeError(error: unknown): Promise<ResponseError> {
    let err = await this.#createNormalizeError(error);
    for (const plugin of this.#plugins.errorPlugins) {
      err = await plugin(err, this.#config) as ResponseError<E>;
    }
    (err as any).__normalized = true;
    return err;
  }

  #execFinally() {
    for (const callback of this.#finallyCallbacks) {
      callback!();
    }
    this.#plugins.finallyPlugins.forEach((plugin) => {
      plugin({
        config: this.#config,
      });
    });

    this.#finallyCallbacks.clear();

    if (this.#plugins.finallyPlugins.length !== this.#sourcePlugins?.length) {
      this.#plugins = parsePlugins(this.#sourcePlugins);
    }
  }

  get #getExecutor() {
    if (this.#executor)
      return this.#executor;
    return this.#response;
  }

  async #resolve(v: T | Blob | string | ArrayBuffer | FormData | Uint8Array<ArrayBufferLike>) {
    const plugins = this.#plugins.afterResponsePlugins;
    let ctx: FetchPluginContext = {
      config: this.#config,
      response: await this.#response,
      responseType: this.#responseType,
      controller: this.#controller,
      result: v,
    };
    try {
      for (const plugin of plugins) {
        ctx = await plugin(ctx, this.#config);
      }
      return ctx.result as T;
    }
    catch (error) {
      return Promise.reject(error);
    }
  }

  then<TResult1 = T, TResult2 = never>(
    onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | null | undefined,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null | undefined,
  ): Promise<TResult1 | TResult2> {
    return this.#getExecutor.then(
      async v => onfulfilled?.call(this, await this.#resolve(v)),
      async e => onrejected?.call(this, await this.#normalizeError(e)),
    ) as Promise<TResult1 | TResult2>;
  }

  catch<TResult = never>(
    onrejected?: ((reason: unknown) => TResult | PromiseLike<TResult>) | null | undefined,
  ): Promise<T | TResult> {
    return this.#getExecutor.catch(onrejected);
  }

  finally(onfinally?: (() => void) | null | undefined) {
    // return this.#getExecutor.finally(onfinally);
    this.#finallyCallbacks.add(onfinally);
  }

  abort() {
    this.#controller.abort();
  }

  get #response() {
    if (!this.#promise) {
      return Promise.reject(new Error('Response is null'));
    }
    return this.#promise.then(r => r.clone()).catch(async (e) => {
      throw await this.#normalizeError(e);
    });
  }

  json() {
    return this.#then(ResponseType.JSON, this.#response?.then(r => r.json())) as Promise<T>;
  }

  blob() {
    return this.#then(ResponseType.BLOB, this.#response?.then(r => r.blob())) as Promise<Blob>;
  }

  text() {
    return this.#then(ResponseType.TEXT, this.#response?.then(r => r.text())) as Promise<string>;
  }

  arrayBuffer() {
    return this.#then(ResponseType.ARRAY_BUFFER, this.#response.then(r => r.arrayBuffer())) as Promise<ArrayBuffer>;
  }

  #then(type: ResponseType, promise: Promise<any>) {
    this.#executor = promise.then((r) => {
      this.#responseType = type;
      return this.#resolve(r);
    })
      .catch(async (e) => {
        this.#responseType = type;
        if ((e as any).__normalized) {
          throw e;
        }
        throw await this.#normalizeError(e);
      })
      .finally(this.#execFinally.bind(this));

    return this.#executor;
  }

  formData() {
    return this.#then(ResponseType.FORM_DATA, this.#response.then(r => r.formData())) as Promise<FormData>;
  }

  bytes() {
    return this.#then(ResponseType.BYTES, this.#response.then(r => r.bytes())) as Promise<Uint8Array<ArrayBufferLike>>;
  }

  /**
   * 因为是后注入, 因此beforeRequest不会执行, 在onFinally后会清理掉当前plugins, 印错只能作为临时插件使用
   * @param plugins - 注入的插件
   */
  __injectPlugins__(plugins: HookFetchPlugin<any, any, any, any>[]) {
    const newPlugins = [...this.#sourcePlugins, ...plugins];
    this.#plugins = parsePlugins(newPlugins);
  }

  async* stream<U = T>() {
    let body = (await this.#response)?.body;
    if (!body) {
      throw new Error('Response body is null');
    }
    for (const plugin of this.#plugins.beforeStreamPlugins) {
      body = await plugin(body, this.#config);
    }
    const reader = body!.getReader();
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
          error: null,
        };
        try {
          for (const plugin of this.#plugins.transformStreamChunkPlugins) {
            res = await plugin(res, this.#config);
          }
          if (res.result && (isGenerator(res.result) || isAsyncGenerator(res.result))) {
            for await (const chunk of (res.result as AsyncGenerator<any, void, unknown>
            )) {
              const resultItem = {
                source: res.source,
                result: chunk,
                error: null,
              };
              yield resultItem as StreamContext<U>;
            }
          }
          else {
            yield res as StreamContext<U>;
          }
        }
        catch (error) {
          res.error = error;
          res.result = null;
          yield res as StreamContext<null>;
        }
      }
    }
    catch (error) {
      throw await this.#normalizeError(error);
    }
    finally {
      reader.releaseLock();
      this.#execFinally();
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
