import type {
  BaseRequestOptions,
  BodyType,
  FetchResponseType,
  HookFetchPlugin,
  RequestConfig,
  StreamContext,
} from '../types';
import { ResponseError } from '../errors';
import { createReject, createResolve, isPipelineDecision, isReject, isResolve, type ResolveDecision } from './decision';
import { RequestExecutor } from './executor';
import { isAsyncGenerator, isGenerator } from './others';
import {
  runAfterResponse,
  runAfterStream,
  runBeforeRequest,
  runBeforeStream,
  runOnError,
  runOnFinally,
  runTransformChunk,
} from './pipeline';
import { PluginManager } from './plugin';
import { DEFAULT_QS_CONFIG } from './config';

export class HookFetchRequest<T = unknown, E = unknown> implements PromiseLike<T> {
  #plugins: PluginManager;
  #executor: RequestExecutor;
  #controller: AbortController;
  #config: RequestConfig;
  #timeout: number;
  #promise: Promise<Response>;
  #result: Promise<any> | null = null;
  #finallyCallbacks: Set<(() => void) | null | undefined> = new Set();

  constructor(options: BaseRequestOptions<unknown, BodyType, E>) {
    this.#plugins = new PluginManager((options.plugins ?? []) as HookFetchPlugin[]);
    this.#executor = new RequestExecutor();
    this.#controller = options.controller ?? new AbortController();
    this.#timeout = options.timeout ?? 0;
    this.#config = this.#createRequestConfig(options);
    this.#promise = this.#execute();
  }

  #createRequestConfig(options: BaseRequestOptions<unknown, BodyType, E>): RequestConfig {
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
      timeout,
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
      timeout,
    } as RequestConfig;
  }

  // ─── Request Execution ───

  async #execute(): Promise<Response> {
    const result = await runBeforeRequest(this.#plugins.beforeRequest, this.#config);

    if (isPipelineDecision(result)) {
      if (isReject(result)) throw result.error;
      const value = (result as ResolveDecision).value;
      return value instanceof Response ? value : new Response(JSON.stringify(value));
    }

    this.#config = result as RequestConfig;
    return this.#executor.execute({
      config: this.#config,
      signal: this.#controller.signal,
      timeout: this.#timeout,
    });
  }

  // ─── Response Consumption ───

  json() {
    return this.#consume('json', r => r.json()) as Promise<T>;
  }

  text() {
    return this.#consume('text', r => r.text()) as Promise<string>;
  }

  blob() {
    return this.#consume('blob', r => r.blob()) as Promise<Blob>;
  }

  arrayBuffer() {
    return this.#consume('arrayBuffer', r => r.arrayBuffer()) as Promise<ArrayBuffer>;
  }

  formData() {
    return this.#consume('formData', r => r.formData()) as Promise<FormData>;
  }

  bytes() {
    return this.#consume('bytes', r => r.bytes()) as Promise<Uint8Array<ArrayBufferLike>>;
  }

  #consume<R>(type: FetchResponseType, extract: (r: Response) => Promise<R>) {
    this.#result = this.#promise
      .then(async (response) => {
        const raw = await extract(response.clone());
        const ctx = await runAfterResponse(this.#plugins.afterResponse, {
          config: this.#config,
          response,
          responseType: type,
          result: raw,
          resolve: createResolve,
          reject: createReject,
        });
        if (isPipelineDecision(ctx)) {
          if (isReject(ctx)) throw ctx.error;
          return (ctx as ResolveDecision).value;
        }
        return ctx.result;
      })
      .catch((error) => this.#handleError(error))
      .finally(() => this.#runFinally());
    return this.#result;
  }

  // ─── Error Handling ───

  async #handleError(error: unknown) {
    const normalized = error instanceof ResponseError
      ? error
      : RequestExecutor.normalizeError(error, this.#config);
    const decision = await runOnError(this.#plugins.onError, normalized as ResponseError<E>, this.#config);

    if (!decision) throw normalized;
    if (isResolve(decision)) return decision.value;
    if (isReject(decision)) throw decision.error;
    throw normalized;
  }

  // ─── Stream ───

  async* stream<U = T>() {
    let response: Response;
    try {
      // Clone so that the original in #promise stays unconsumed for later #consume() calls
      response = (await this.#promise).clone();
    } catch (error) {
      const normalized = error instanceof ResponseError
        ? error
        : RequestExecutor.normalizeError(error, this.#config);
      const decision = await runOnError(this.#plugins.onError, normalized as ResponseError<E>, this.#config);
      if (decision && isResolve(decision)) return;
      if (decision && isReject(decision)) throw decision.error;
      throw normalized;
    }

    let body = response.body;
    if (!body) {
      throw new Error('Response body is null');
    }

    body = await runBeforeStream(this.#plugins.beforeStream, body, this.#config, response);

    const reader = body.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        let res: StreamContext = {
          source: value,
          result: value,
          error: null,
        };
        try {
          res = await runTransformChunk(this.#plugins.transformStreamChunk, res, this.#config);
          if (res.result && (isGenerator(res.result) || isAsyncGenerator(res.result))) {
            for await (const chunk of (res.result as AsyncGenerator<any, void, unknown>)) {
              yield {
                source: res.source,
                result: chunk,
                error: null,
              } as StreamContext<U>;
            }
          } else {
            yield res as StreamContext<U>;
          }
        } catch (transformError) {
          res.error = transformError;
          res.result = null;
          yield res as StreamContext<null>;
        }
      }
    } catch (error) {
      const normalized = error instanceof ResponseError
        ? error
        : RequestExecutor.normalizeError(error, this.#config);
      const decision = await runOnError(this.#plugins.onError, normalized as ResponseError<E>, this.#config);
      if (decision && isResolve(decision)) return;
      if (decision && isReject(decision)) throw decision.error;
      throw normalized;
    } finally {
      reader.releaseLock();
      await runAfterStream(this.#plugins.afterStream, this.#config);
      this.#runFinally();
    }
  }

  // ─── Control ───

  abort() {
    this.#promise?.catch(() => {});
    this.#controller.abort();
  }

  get response() {
    return this.#promise.then(r => r.clone());
  }

  // ─── PromiseLike ───

  get #getResult() {
    if (!this.#result) this.json();
    return this.#result!;
  }

  then<TResult1 = T, TResult2 = never>(
    onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return this.#getResult.then(onfulfilled, onrejected);
  }

  catch<TResult = never>(
    onrejected?: ((reason: unknown) => TResult | PromiseLike<TResult>) | null,
  ): Promise<T | TResult> {
    return this.#getResult.catch(onrejected);
  }

  finally(onfinally?: (() => void) | null): this {
    this.#finallyCallbacks.add(onfinally);
    return this;
  }

  // ─── Internal ───

  #runFinally() {
    for (const cb of this.#finallyCallbacks) {
      try { cb?.(); } catch {}
    }
    this.#finallyCallbacks.clear();
    runOnFinally(this.#plugins.onFinally, this.#config);
  }
}
