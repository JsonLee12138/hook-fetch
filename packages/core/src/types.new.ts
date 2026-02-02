import type QueryString from 'qs';
import type { AnyObject } from 'typescript-api-pro';
import type { ResponseError } from './errors';

export type FetchResponseType = 'json' | 'text' | 'blob' | 'arrayBuffer' | 'formData' | 'bytes' | 'response';

export type RequestMethodWithParams = 'GET' | 'HEAD';

export type RequestMethodWithBody = 'PUT' | 'PATCH' | 'POST' | 'DELETE' | 'OPTIONS';

export type RequestMethod = RequestMethodWithParams | RequestMethodWithBody;

export type BodyType = AnyObject | string | FormData | URLSearchParams | Blob | ArrayBuffer | ArrayBufferView | ReadableStream | null;

export interface RequestConfig<P, D extends BodyType = BodyType, E = AnyObject> extends Omit<RequestInit, 'body' | 'signal' | 'credentials' | 'method'> {
  url: string;
  baseURL: string;
  params?: P;
  data?: D;
  withCredentials?: boolean;
  extra?: E;
  method: RequestMethod;
  resolve?: (() => any) | null;
  // qsArrayFormat?: QueryString.IStringifyOptions['arrayFormat'];
  qsConfig?: QueryString.IStringifyOptions;
}

// 下方 request 的 option
export type BaseRequestOptions<P = AnyObject, D extends BodyType = BodyType, E = AnyObject> = Partial<{
  plugins: Array<HookFetchPlugin>;
  timeout: number;
  params: P;
  data: D;
  controller: AbortController;
  extra: E;
  // qsArrayFormat: QueryString.IStringifyOptions['arrayFormat'];
  qsConfig?: QueryString.IStringifyOptions;
  withCredentials: boolean;
  method: RequestMethod;
}> & Omit<RequestInit, 'body' | 'method'> & {
  url: string;
  baseURL: string;
};

// 插件模式
export interface FetchPluginContext<T = unknown, E = unknown, P = unknown, D extends BodyType = BodyType> {
  config: RequestConfig<P, D, E>;
  response: Response;
  responseType: FetchResponseType;
  result?: T;
  controller: AbortController;
}

export interface StreamContext<T = unknown> {
  result: T;
  source: Uint8Array<ArrayBufferLike>;
  error: unknown | null;
}

export type RetryDelayHandler<E = unknown, P = unknown, D extends BodyType = BodyType> = (params: {
  attempt: number;
  error: ResponseError<E>;
  config: RequestConfig<P, D, E>;
}) => number | void | Promise<number | void>;

export type RetryOverrideOptions<P = AnyObject, D extends BodyType = BodyType, E = AnyObject> = Partial<Omit<BaseRequestOptions<P, D, E>, 'controller' | 'plugins'>>;

export interface RequestRetryOptions<P = AnyObject, D extends BodyType = BodyType, E = AnyObject> {
  enabled?: boolean;
  maxAttempts?: number;
  delay?: number | RetryDelayHandler<E, P, D>;
  overrides?: RetryOverrideOptions<P, D, E>;
}

export interface RetryHandlerDecision<P = AnyObject, D extends BodyType = BodyType, E = AnyObject> {
  __hookFetchDecision__: 'retry';
  options?: RequestRetryOptions<P, D, E>;
}

export interface ResolveHandlerDecision<T = unknown> {
  __hookFetchDecision__: 'resolve';
  value: T | PromiseLike<T>;
}

export interface RejectHandlerDecision<E = unknown> {
  __hookFetchDecision__: 'reject';
  error?: Error | ResponseError<E>;
}

export interface OnErrorContext<T = unknown, E = unknown, P = unknown, D extends BodyType = BodyType> {
  attempt: number;
  maxAttempts: number;
  retry: (options?: RequestRetryOptions<P, D, E>) => RetryHandlerDecision<P, D, E>;
  resolve: (value: T | PromiseLike<T>) => ResolveHandlerDecision<T>;
  reject: (error?: Error | ResponseError<E>) => RejectHandlerDecision<E>;
}

export type OnErrorHandlerResult<T = unknown, E = unknown, P = unknown, D extends BodyType = BodyType> =
  | void
  | T
  | PromiseLike<T>
  | ResponseError<E>
  | Error
  | RetryHandlerDecision<P, D, E>
  | ResolveHandlerDecision<T>
  | RejectHandlerDecision<E>
  | PromiseLike<void | T | ResponseError<E> | Error | RetryHandlerDecision<P, D, E> | ResolveHandlerDecision<T> | RejectHandlerDecision<E>>;

export type BeforeRequestHandler<E = unknown, P = unknown, D extends BodyType = BodyType> = (config: RequestConfig<P, D, E>) => RequestConfig<P, D, E> | PromiseLike<RequestConfig<P, D, E>>;

export type AfterResponseHandler<T = unknown, E = unknown, P = unknown, D extends BodyType = BodyType> = (context: FetchPluginContext<T>, config: RequestConfig<P, D, E>) => FetchPluginContext<T> | PromiseLike<FetchPluginContext<T>>;

export type BeforeStreamHandler<E = unknown, P = unknown, D extends BodyType = BodyType> = (body: ReadableStream<any>, config: RequestConfig<P, D, E>) => ReadableStream<any> | PromiseLike<ReadableStream<any>>;

export type TransformStreamChunkHandler<E = unknown, P = unknown, D extends BodyType = BodyType> = (chunk: StreamContext<any>, config: RequestConfig<P, D, E>) => StreamContext | PromiseLike<StreamContext>;

export type OnFinallyHandler<E = unknown, P = unknown, D extends BodyType = BodyType> = (res: Pick<FetchPluginContext<unknown, E, P, D>, 'config'>) => void | PromiseLike<void>;

export type OnErrorHandler<T = unknown, E = unknown, P = unknown, D extends BodyType = BodyType> = (error: ResponseError<E>, config: RequestConfig<P, D, E>, context?: OnErrorContext<T, E, P, D>) => OnErrorHandlerResult<T, E, P, D>;
// interface HookFetchErrorContext<E = unknown, P = unknown, D extends BodyType = BodyType> {
//   error: ResponseError;
//   resolve: (config: RequestConfig<P, D, E>) => PromiseLike<void>;
//   reject: ()
// }

export interface HookFetchPlugin<T = unknown, E = unknown, P = unknown, D extends BodyType = BodyType> {
  /** 插件名称 */
  name: string;
  /** 优先级 */
  priority?: number;
  beforeRequest?: BeforeRequestHandler<E, P, D>;
  afterResponse?: AfterResponseHandler<T, E, P, D>;
  beforeStream?: BeforeStreamHandler<E, P, D>;
  transformStreamChunk?: TransformStreamChunkHandler<E, P, D>;
  onError?: OnErrorHandler<T, E, P, D>;
  onFinally?: OnFinallyHandler<E, P, D>;
}

// 核心内容
export interface OptionProps {
  baseURL: string;
  timeout: number;
  headers: HeadersInit;
  plugins: Array<HookFetchPlugin<any, any, any, any>>;
  withCredentials: boolean;
  extra: AnyObject;
  qsConfig: QueryString.IStringifyOptions;
}

export type BaseOptions = Partial<OptionProps>;

export type RequestOptions<P = AnyObject, D extends BodyType = BodyType, E = AnyObject> = Omit<BaseRequestOptions<P, D, E>, 'url' | 'baseURL' | 'controller'>;

/**
 * 已废除, 请改用 RequestOptions
 *
 * Deprecated, please use RequestOptions instead
 */
export type RequestUseOptions<P = AnyObject, D extends BodyType = BodyType, E = AnyObject> = RequestOptions<P, D, E>;

export type RequestWithBodyOptions<D extends BodyType = BodyType, P = AnyObject, E = AnyObject> = Omit<RequestOptions<P, D, E>, 'data'>;

export type RequestWithParamsOptions<P = AnyObject, E = AnyObject> = Omit<RequestOptions<P, null, E>, 'params' | 'data'>;

export type RequestWithBodyFnOptions<D extends BodyType = BodyType, P = AnyObject, E = AnyObject> = Omit<RequestOptions<P, D, E>, 'data' | 'method'>;

export type RequestWithParamsFnOptions<P = AnyObject, E = AnyObject> = Omit<RequestOptions<P, null, E>, 'params' | 'data' | 'method'>;

export type PostOptions<D extends BodyType = BodyType, P = AnyObject, E = AnyObject> = RequestWithBodyFnOptions<D, P, E>;

export type PutOptions<D extends BodyType = BodyType, P = AnyObject, E = AnyObject> = RequestWithBodyFnOptions<D, P, E>;

export type PatchOptions<D extends BodyType = BodyType, P = AnyObject, E = AnyObject> = RequestWithBodyFnOptions<D, P, E>;

export type GetOptions<P = AnyObject, E = AnyObject> = RequestWithParamsFnOptions<P, E>;

export type HeadOptions<P = AnyObject, E = AnyObject> = RequestWithParamsFnOptions<P, E>;

/**
 * OPTIONS 方法请求的可选参数类型
 *
 * OPTIONS method request optional parameter types
 */
export type OptionsOptions<P = AnyObject, D extends BodyType = BodyType, E = AnyObject> = RequestUseOptions<P, D, E>;

export type DeleteOptions<P = AnyObject, D extends BodyType = BodyType, E = AnyObject> = RequestUseOptions<P, D, E>;
