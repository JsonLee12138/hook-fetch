import type { AnyObject } from 'typescript-api-pro';
import type {
  BaseRequestOptions,
  BodyType,
  FetchPluginContext,
  FetchResponseType,
  HookFetchPlugin,
  OnErrorContext,
  RejectHandlerDecision,
  RequestConfig,
  RequestRetryOptions,
  ResolveHandlerDecision,
  RetryHandlerDecision,
  RetryOverrideOptions,
  StreamContext,
} from '../types';
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
  RESPONSE = 'response',
}

const HOOK_FETCH_DECISION_KEY = '__hookFetchDecision__' as const;
const RETRY_DECISION_VALUE = 'retry';
const RESOLVE_DECISION_VALUE = 'resolve';
const REJECT_DECISION_VALUE = 'reject';
const DEFAULT_MAX_RETRY_ATTEMPTS = 3;

type PipelineDecision<T, E> =
  | { kind: 'retry'; options?: RequestRetryOptions<unknown, BodyType, E>; error: ResponseError<E> }
  | { kind: 'resolve'; value: T | PromiseLike<T> }
  | { kind: 'reject'; error: ResponseError<E> }
  | { kind: 'error'; error: ResponseError<E> };

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const isPlainObject = (value: unknown): value is AnyObject => Object.prototype.toString.call(value) === '[object Object]';


export class HookFetchRequest<T = unknown, E = unknown> implements PromiseLike<T> {
  #plugins: ReturnType<typeof parsePlugins>;
  #sourcePlugins: HookFetchPlugin[];
  #controller: AbortController;
  #attemptController: AbortController | null = null;
  #controllerAbortHandler: (() => void) | null = null;
  #config: RequestConfig<unknown, BodyType, E>;
  #promise: Promise<Response> | null = null;
  #isTimeout: boolean = false;
  #executor: Promise<any> | null = null;
  #finallyCallbacks: Set<(() => void) | null | undefined> = new Set();
  #responseType: FetchResponseType = 'json';
  #fullOptions: BaseRequestOptions<unknown, BodyType, E>;
  #attempt = 0;

  constructor(options: BaseRequestOptions<unknown, BodyType, E>) {
    const pluginList = options.plugins ?? [];
    this.#sourcePlugins = pluginList;
    this.#plugins = parsePlugins(pluginList);
    this.#controller = options.controller ?? new AbortController();
    this.#fullOptions = {
      ...options,
      controller: this.#controller,
      plugins: pluginList,
    } as BaseRequestOptions<unknown, BodyType, E>;
    this.#config = this.#createRequestConfig(this.#fullOptions);
    this.#promise = this.#init(this.#fullOptions);
  }

  #createRequestConfig(options: BaseRequestOptions<unknown, BodyType, E>) {
    const {
      url,
      baseURL = '',
      params,
      data,
      qsConfig = {},
      withCredentials = false,
      extra,
      method = 'GET',
      headers = {},
      controller: _controller,
      plugins: _plugins,
      timeout: _timeout,
      ...rest
    } = options;
    return {
      ...rest,
      url,
      baseURL,
      params,
      data: data as BodyType,
      withCredentials,
      extra: (extra ?? {}) as E,
      method,
      headers,
      qsConfig: Object.assign({}, DEFAULT_QS_CONFIG, qsConfig),
    } as RequestConfig<unknown, BodyType, E>;
  }

  #prepareAttemptSignal() {
    if (this.#controllerAbortHandler && this.#controller?.signal) {
      this.#controller.signal.removeEventListener('abort', this.#controllerAbortHandler);
      this.#controllerAbortHandler = null;
    }
    this.#attemptController = new AbortController();
    const attemptController = this.#attemptController;
    if (this.#controller.signal.aborted) {
      attemptController.abort();
      return attemptController.signal;
    }
    const handler = () => {
      attemptController.abort();
    };
    this.#controllerAbortHandler = handler;
    this.#controller.signal.addEventListener('abort', handler);
    return attemptController.signal;
  }

  #cleanupAttemptController() {
    if (this.#controllerAbortHandler) {
      this.#controller.signal.removeEventListener('abort', this.#controllerAbortHandler);
      this.#controllerAbortHandler = null;
    }
    this.#attemptController = null;
  }

  #init(options: BaseRequestOptions<unknown, BodyType, E>) {
    const { timeout } = options;
    // eslint-disable-next-line no-async-promise-executor
    return new Promise<Response>(async (resolve, reject) => {
      this.#isTimeout = false;
      let config = this.#createRequestConfig(options);
      let err: unknown = null;
      const { beforeRequestPlugins } = this.#plugins;
      for (const plugin of beforeRequestPlugins) {
        try {
          config = (await plugin(config)) as RequestConfig<unknown, BodyType, E>;
          if (config.resolve) {
            const res = config.resolve();
            if (res instanceof Response) {
              resolve(res);
            }
            else {
              resolve(new Response(res));
            }
            return;
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

      this.#config = config;

      const requestUrl = buildUrl(config.baseURL + config.url, config.params as AnyObject, config.qsConfig);
      const body = getBody(config.data ?? null, config.method, config.headers, config.qsConfig);
      const otherOptions = omit(config ?? {}, ['baseURL', 'data', 'extra', 'headers', 'method', 'params', 'url', 'withCredentials']);
      const attemptSignal = this.#prepareAttemptSignal();
      const requestInit: RequestInit = {
        ...otherOptions,
        method: config.method,
        headers: config.headers as HeadersInit,
        signal: attemptSignal,
        credentials: config.withCredentials ? 'include' : 'omit',
        body,
      };

      const req = fetch(requestUrl, requestInit);
      const promises: Array<Promise<Response | void>> = [req];
      let timeoutId: ReturnType<typeof setTimeout> | null = null;
      if (timeout) {
        const timeoutPromise = new Promise<void>((_) => {
          timeoutId = setTimeout(() => {
            this.#isTimeout = true;
            this.#attemptController?.abort();
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
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        this.#cleanupAttemptController();
        if (err) {
          reject(err);
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

  async #runErrorPipeline(error: ResponseError<E>): Promise<PipelineDecision<T, E>> {
    let currentError = error;
    for (const plugin of this.#plugins.errorPlugins) {
      const context = this.#createOnErrorContext(currentError);
      let result: unknown;
      try {
        result = await plugin(currentError, this.#config, context as OnErrorContext<T, E, unknown, BodyType>);
      }
      catch (pluginError) {
        currentError = await this.#createNormalizeError(pluginError);
        continue;
      }
      const decision = await this.#interpretOnErrorResult(result, currentError);
      if (!decision)
        continue;
      if (decision.kind === 'retry' || decision.kind === 'resolve' || decision.kind === 'reject')
        return decision;
      currentError = decision.error;
    }
    return { kind: 'error', error: currentError };
  }

  #createOnErrorContext(error: ResponseError<E>): OnErrorContext<T, E, unknown, BodyType> {
    const retryExtra = this.#getRetryExtra();
    const maxAttempts = this.#resolveMaxAttempts(retryExtra);
    return {
      attempt: this.#attempt,
      maxAttempts,
      retry: (options?: RequestRetryOptions<unknown, BodyType, E>) => {
        const merged = (this.#mergeRetryOptions(retryExtra, options) ?? {}) as RequestRetryOptions<unknown, BodyType, E>;
        if (merged.maxAttempts === undefined)
          merged.maxAttempts = maxAttempts;
        return {
          __hookFetchDecision__: RETRY_DECISION_VALUE,
          options: merged,
        } as RetryHandlerDecision<unknown, BodyType, E>;
      },
      resolve: (value: T | PromiseLike<T>) => ({
        __hookFetchDecision__: RESOLVE_DECISION_VALUE,
        value,
      }),
      reject: (customError?: Error | ResponseError<E>) => ({
        __hookFetchDecision__: REJECT_DECISION_VALUE,
        error: customError ?? error,
      }),
    };
  }

  async #interpretOnErrorResult(result: unknown, fallbackError: ResponseError<E>): Promise<PipelineDecision<T, E> | undefined> {
    if (result === undefined)
      return undefined;
    if (this.#isDecision(result, RETRY_DECISION_VALUE)) {
      const retryDecision = result as RetryHandlerDecision<unknown, BodyType, E>;
      return { kind: 'retry', options: retryDecision.options, error: fallbackError };
    }
    if (this.#isDecision(result, RESOLVE_DECISION_VALUE)) {
      const resolveDecision = result as ResolveHandlerDecision<T>;
      return { kind: 'resolve', value: resolveDecision.value };
    }
    if (this.#isDecision(result, REJECT_DECISION_VALUE)) {
      const rejectDecision = result as RejectHandlerDecision<E>;
      const rejection = await this.#coerceResponseError(rejectDecision.error ?? fallbackError);
      return { kind: 'reject', error: rejection };
    }
    if (result instanceof ResponseError) {
      return { kind: 'error', error: result };
    }
    if (result instanceof Error) {
      const normalized = await this.#createNormalizeError(result);
      return { kind: 'error', error: normalized };
    }
    return { kind: 'resolve', value: result as T };
  }

  #isDecision(value: unknown, type: string) {
    return Boolean(value && typeof value === 'object' && (value as AnyObject)[HOOK_FETCH_DECISION_KEY] === type);
  }

  async #handleError<TResult>(
    error: unknown,
    type: ResponseType,
    executor: () => Promise<TResult>,
    resolver: (value: TResult) => Promise<any> | any,
  ): Promise<any> {
    const normalizedError = await this.#createNormalizeError(error);
    const decision = await this.#runErrorPipeline(normalizedError);
    if (decision.kind === 'resolve')
      return decision.value;
    if (decision.kind === 'reject') {
      (decision.error as any).__normalized = true;
      throw decision.error;
    }
    if (decision.kind === 'retry')
      return this.#processRetryDecision(decision, type, executor, resolver);
    const finalError = decision.error;
    (finalError as any).__normalized = true;
    throw finalError;
  }

  async #processRetryDecision<TResult>(
    decision: { options?: RequestRetryOptions<unknown, BodyType, E>; error: ResponseError<E> },
    type: ResponseType,
    executor: () => Promise<TResult>,
    resolver: (value: TResult) => Promise<any> | any,
  ) {
    const options = this.#finalizeRetryOptions(decision.options);
    if (!options.enabled) {
      const disabledError = decision.error;
      (disabledError as any).__normalized = true;
      throw disabledError;
    }
    if (this.#attempt >= options.maxAttempts) {
      const limitError = this.#createRetryLimitError(decision.error);
      (limitError as any).__normalized = true;
      throw limitError;
    }
    if (this.#controller.signal.aborted) {
      const abortedError = decision.error;
      (abortedError as any).__normalized = true;
      throw abortedError;
    }
    const delay = await this.#resolveDelayValue(options.delay, decision.error);
    if (delay > 0) {
      await wait(delay);
    }
    this.#attempt += 1;
    this.#restartRequest(options.overrides);
    return this.#runWith(type, executor, resolver);
  }

  #finalizeRetryOptions(options?: RequestRetryOptions<unknown, BodyType, E>) {
    const normalized = options ?? {};
    const enabled = normalized.enabled ?? true;
    const maxAttempts = Math.max(0, normalized.maxAttempts ?? DEFAULT_MAX_RETRY_ATTEMPTS);
    return {
      enabled,
      maxAttempts,
      delay: normalized.delay,
      overrides: normalized.overrides,
    } as RequestRetryOptions<unknown, BodyType, E> & { maxAttempts: number };
  }

  async #resolveDelayValue(delay: RequestRetryOptions<unknown, BodyType, E>['delay'], error: ResponseError<E>) {
    if (!delay)
      return 0;
    if (typeof delay === 'function') {
      const value = await delay({
        attempt: this.#attempt,
        error,
        config: this.#config,
      });
      return typeof value === 'number' && value > 0 ? value : 0;
    }
    return delay > 0 ? delay : 0;
  }

  #restartRequest(overrides?: RetryOverrideOptions<unknown, BodyType, E>) {
    this.#fullOptions = this.#mergeFullOptions(overrides);
    this.#promise = this.#init(this.#fullOptions);
  }

  #mergeFullOptions(overrides?: RetryOverrideOptions<unknown, BodyType, E>) {
    if (!overrides)
      return this.#fullOptions;
    const base = this.#fullOptions;
    const {
      headers: overrideHeaders,
      extra: overrideExtra,
      qsConfig: overrideQsConfig,
      controller: _controller,
      plugins: _plugins,
      ...restOverrides
    } = overrides as AnyObject;
    const headers = overrideHeaders !== undefined ? this.#mergeHeaders(base.headers, overrideHeaders as HeadersInit) : base.headers;
    const extra = overrideExtra !== undefined ? this.#mergeRecord(base.extra, overrideExtra) : base.extra;
    const qsConfig = overrideQsConfig !== undefined ? this.#mergeRecord(base.qsConfig, overrideQsConfig) : base.qsConfig;
    return {
      ...base,
      ...restOverrides,
      headers,
      extra,
      qsConfig,
      controller: this.#controller,
      plugins: this.#sourcePlugins,
    } as BaseRequestOptions<unknown, BodyType, E>;
  }

  #mergeRetryOptions(
    base?: RequestRetryOptions<unknown, BodyType, E>,
    override?: RequestRetryOptions<unknown, BodyType, E>,
  ): RequestRetryOptions<unknown, BodyType, E> | undefined {
    if (!base)
      return override;
    if (!override)
      return base;
    return {
      ...base,
      ...override,
      enabled: override.enabled ?? base.enabled,
      maxAttempts: override.maxAttempts ?? base.maxAttempts,
      delay: override.delay ?? base.delay,
      overrides: this.#mergeRetryOverrideOptions(base.overrides, override.overrides),
    };
  }

  #mergeRetryOverrideOptions(
    base?: RetryOverrideOptions<unknown, BodyType, E>,
    override?: RetryOverrideOptions<unknown, BodyType, E>,
  ): RetryOverrideOptions<unknown, BodyType, E> | undefined {
    if (!base)
      return override;
    if (!override)
      return base;
    const {
      headers: baseHeaders,
      extra: baseExtra,
      qsConfig: baseQsConfig,
      ...restBase
    } = base as AnyObject;
    const {
      headers: overrideHeaders,
      extra: overrideExtra,
      qsConfig: overrideQsConfig,
      ...restOverride
    } = override as AnyObject;
    return {
      ...restBase,
      ...restOverride,
      headers: this.#mergeHeaders(baseHeaders as HeadersInit, overrideHeaders as HeadersInit),
      extra: this.#mergeRecord(baseExtra, overrideExtra),
      qsConfig: this.#mergeRecord(baseQsConfig, overrideQsConfig),
    } as RetryOverrideOptions<unknown, BodyType, E>;
  }

  #mergeHeaders(base?: HeadersInit, override?: HeadersInit) {
    if (override === undefined)
      return base;
    if (isPlainObject(base) && isPlainObject(override)) {
      return { ...base as AnyObject, ...override as AnyObject };
    }
    return override;
  }

  #mergeRecord(base: unknown, override: unknown) {
    if (override === undefined) {
      return base;
    }
    if (isPlainObject(base) || isPlainObject(override)) {
      return {
        ...(isPlainObject(base) ? base as AnyObject : {}),
        ...(isPlainObject(override) ? override as AnyObject : {}),
      };
    }
    return override;
  }

  #getRetryExtra(): RequestRetryOptions<unknown, BodyType, E> | undefined {
    const extra = this.#config?.extra as AnyObject | undefined;
    const retry = extra?.retry;
    if (retry && typeof retry === 'object')
      return retry as RequestRetryOptions<unknown, BodyType, E>;
    return undefined;
  }

  #resolveMaxAttempts(retry?: RequestRetryOptions<unknown, BodyType, E>) {
    if (retry?.enabled === false)
      return 0;
    const value = retry?.maxAttempts;
    if (typeof value === 'number' && value >= 0)
      return value;
    return DEFAULT_MAX_RETRY_ATTEMPTS;
  }

  async #coerceResponseError(err: Error | ResponseError<E>) {
    if (err instanceof ResponseError)
      return err;
    return this.#createNormalizeError(err);
  }

  #createRetryLimitError(error: ResponseError<E>) {
    return new ResponseError({
      message: 'Retry attempts exceeded',
      status: error.status ?? StatusCode.UNKNOWN,
      statusText: error.statusText ?? 'Retry attempts exceeded',
      config: error.config,
      name: 'RetryLimitExceeded',
      response: error.response,
    });
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
    this.#attempt = 0;
  }

  get #getExecutor() {
    if (!this.#executor) {
      this.json();
    }
    return this.#executor as Promise<T>;
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
      value => (onfulfilled ? onfulfilled.call(this, value) : (value as unknown as TResult1)),
      reason => (onrejected ? onrejected.call(this, reason) : Promise.reject(reason)),
    ) as Promise<TResult1 | TResult2>;
  }

  catch<TResult = never>(
    onrejected?: ((reason: unknown) => TResult | PromiseLike<TResult>) | null | undefined,
  ): Promise<T | TResult> {
    return this.#getExecutor.catch(reason => (onrejected ? onrejected.call(this, reason) : Promise.reject(reason)));
  }

  finally(onfinally?: (() => void) | null | undefined) {
    // return this.#getExecutor.finally(onfinally);
    this.#finallyCallbacks.add(onfinally);
  }

  abort() {
    this.#controller.abort();
    this.#attemptController?.abort();
  }

  get #response() {
    if (!this.#promise) {
      return Promise.reject(new Error('Response is null'));
    }
    return this.#promise.then(r => r.clone());
  }

  json() {
    return this.#then(ResponseType.JSON, () => this.#response.then(r => r.json())) as Promise<T>;
  }

  blob() {
    return this.#then(ResponseType.BLOB, () => this.#response.then(r => r.blob())) as Promise<Blob>;
  }

  text() {
    return this.#then(ResponseType.TEXT, () => this.#response.then(r => r.text())) as Promise<string>;
  }

  arrayBuffer() {
    return this.#then(ResponseType.ARRAY_BUFFER, () => this.#response.then(r => r.arrayBuffer())) as Promise<ArrayBuffer>;
  }

  #runWith<TResult>(
    type: ResponseType,
    executor: () => Promise<TResult>,
    resolver: (value: TResult) => Promise<any> | any,
  ) {
    const run = () => executor()
      .then(async (value) => {
        this.#responseType = type;
        return resolver(value);
      })
      .catch(async (error) => {
        this.#responseType = type;
        if ((error as any).__normalized)
          throw error;
        return this.#handleError(error, type, executor, resolver);
      });
    return run();
  }

  #then(type: ResponseType, executor: () => Promise<any>) {
    const execution = this.#runWith(type, executor, value => this.#resolve(value));
    this.#executor = execution.finally(this.#execFinally.bind(this));
    return this.#executor;
  }

  formData() {
    return this.#then(ResponseType.FORM_DATA, () => this.#response.then(r => r.formData())) as Promise<FormData>;
  }

  bytes() {
    return this.#then(ResponseType.BYTES, () => this.#response.then(r => r.bytes())) as Promise<Uint8Array<ArrayBufferLike>>;
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
      const normalizedError = await this.#createNormalizeError(error);
      const decision = await this.#runErrorPipeline(normalizedError);
      if (decision.kind === 'resolve')
        return;
      throw decision.error;
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
    return this.#runWith(ResponseType.RESPONSE, () => this.#response, value => value);
  }
}
