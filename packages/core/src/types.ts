import type QueryString from 'qs';
import type { AnyObject } from 'typescript-api-pro';
import type { ResponseError } from './errors';
import type { PipelineDecision, RejectDecision, ResolveDecision } from './utils/decision';

export type FetchResponseType = 'json' | 'text' | 'blob' | 'arrayBuffer' | 'formData' | 'bytes' | 'response';

export type RequestMethodWithParams = 'GET' | 'HEAD';

export type RequestMethodWithBody = 'PUT' | 'PATCH' | 'POST' | 'DELETE' | 'OPTIONS';

export type RequestMethod = RequestMethodWithParams | RequestMethodWithBody;

export type BodyType = AnyObject | string | FormData | URLSearchParams | Blob | ArrayBuffer | ArrayBufferView | ReadableStream | null;

export interface RequestConfig<P = unknown, D extends BodyType = BodyType, E = AnyObject> extends Omit<RequestInit, 'body' | 'signal' | 'credentials' | 'method'> {
  url: string;
  baseURL: string;
  params?: P;
  data?: D;
  withCredentials?: boolean;
  extra?: E;
  method: RequestMethod;
  qsConfig?: QueryString.IStringifyOptions;
  timeout?: number;
}

export type BaseRequestOptions<P = AnyObject, D extends BodyType = BodyType, E = AnyObject> = Partial<{
  plugins: Array<HookFetchPlugin>;
  timeout: number;
  params: P;
  data: D;
  controller: AbortController;
  extra: E;
  qsConfig?: QueryString.IStringifyOptions;
  withCredentials: boolean;
  method: RequestMethod;
}> & Omit<RequestInit, 'body' | 'method'> & {
  url: string;
  baseURL: string;
};

// ─── Context Types ───

export interface BaseCtx<E = unknown> {
  config: RequestConfig<unknown, BodyType, E>;
}

export interface DecisionCtx<E = unknown> extends BaseCtx<E> {
  resolve: <T>(value: T) => ResolveDecision<T>;
  reject: (error: Error | ResponseError) => RejectDecision;
}

export interface BeforeRequestCtx<E = unknown> extends DecisionCtx<E> {}

export interface AfterResponseCtx<T = unknown, E = unknown> extends DecisionCtx<E> {
  response: Response;
  responseType: FetchResponseType;
  result: T;
}

export interface OnErrorCtx<E = unknown> extends DecisionCtx<E> {
  error: ResponseError<E>;
}

export interface OnFinallyCtx<E = unknown> extends BaseCtx<E> {}

export interface BeforeStreamCtx<E = unknown> extends BaseCtx<E> {
  body: ReadableStream;
  response: Response;
}

export interface TransformChunkCtx<E = unknown> extends BaseCtx<E> {
  chunk: StreamContext;
}

export interface AfterStreamCtx<E = unknown> extends BaseCtx<E> {}

// ─── Stream Context ───

export interface StreamContext<T = unknown> {
  result: T;
  source: Uint8Array<ArrayBufferLike>;
  error: unknown | null;
}

// ─── Handler Types ───

export type BeforeRequestHandler<E = unknown> =
  (ctx: BeforeRequestCtx<E>) => RequestConfig | PipelineDecision | Promise<RequestConfig | PipelineDecision>;

export type AfterResponseHandler<T = unknown, E = unknown> =
  (ctx: AfterResponseCtx<T, E>) => AfterResponseCtx<T, E> | PipelineDecision | Promise<AfterResponseCtx<T, E> | PipelineDecision>;

export type OnErrorHandler<E = unknown> =
  (ctx: OnErrorCtx<E>) => PipelineDecision | void | Promise<PipelineDecision | void>;

export type OnFinallyHandler<E = unknown> =
  (ctx: OnFinallyCtx<E>) => void | Promise<void>;

export type BeforeStreamHandler<E = unknown> =
  (ctx: BeforeStreamCtx<E>) => ReadableStream | Promise<ReadableStream>;

export type TransformStreamChunkHandler<E = unknown> =
  (ctx: TransformChunkCtx<E>) => StreamContext | Promise<StreamContext>;

export type AfterStreamHandler<E = unknown> =
  (ctx: AfterStreamCtx<E>) => void | Promise<void>;

// ─── Plugin Interface ───

export interface HookFetchPlugin<T = unknown, E = unknown> {
  name: string;
  priority?: number;
  beforeRequest?: BeforeRequestHandler<E>;
  afterResponse?: AfterResponseHandler<T, E>;
  onError?: OnErrorHandler<E>;
  onFinally?: OnFinallyHandler<E>;
  beforeStream?: BeforeStreamHandler<E>;
  transformStreamChunk?: TransformStreamChunkHandler<E>;
  afterStream?: AfterStreamHandler<E>;
}

// ─── Options Types ───

export interface OptionProps {
  baseURL: string;
  timeout: number;
  headers: HeadersInit;
  plugins: Array<HookFetchPlugin<any, any>>;
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

export type OptionsOptions<P = AnyObject, D extends BodyType = BodyType, E = AnyObject> = RequestUseOptions<P, D, E>;

export type DeleteOptions<P = AnyObject, D extends BodyType = BodyType, E = AnyObject> = RequestUseOptions<P, D, E>;
