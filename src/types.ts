import type QueryString from 'qs';
import type { AnyObject } from 'typescript-api-pro';
import type { ResponseWithSourceClass } from './utils';

// 插件部分
export interface RequestConfig<P, D, E = AnyObject> extends Omit<RequestInit, 'body' | 'signal' | 'credentials' | 'method'> {
  url: string;
  baseURL: string;
  params?: P;
  data?: D;
  withCredentials?: boolean;
  extra?: E;
  method: RequestMethod;
  qsArrayFormat?: QueryString.IStringifyOptions['arrayFormat'];
}

export interface FetchPluginContext<T = unknown, E = unknown, P = unknown, D = unknown> {
  config: RequestConfig<P, D, E>;
  response: Response;
  result?: T;
  controller: AbortController;
}

export interface StreamContext<T = unknown> {
  result: T;
  source: Uint8Array<ArrayBufferLike>;
  error: unknown | null;
}

type BeforeRequestHandler<E = unknown, P = unknown, D = unknown> = (config: RequestConfig<E, P, D>) => Promise<RequestConfig<E, P, D>>;

// eslint-disable-next-line no-explicit-any
type AfterResponseHandler<T = unknown> = (context: FetchPluginContext<T>) => Promise<FetchPluginContext<any>>;

type TransformStreamChunkHandler = (chunk: StreamContext) => Promise<StreamContext>;

export type HookFetchPlugin<T = unknown, E = unknown, P = unknown, D = unknown> = {
  /** 插件名称 */
  name: string;
  /** 优先级 */
  priority?: number;
  beforeRequest?: BeforeRequestHandler<E, P, D>;
  afterResponse?: AfterResponseHandler<T>;
  transformStreamChunk?: TransformStreamChunkHandler;
  onError?: (error: Error) => void;
  onFinally?: (res: Pick<FetchPluginContext, 'config' | 'response'>) => void;
}

export interface OptionProps {
  baseURL: string;
  timeout: number;
  headers: HeadersInit;
  plugins: Array<HookFetchPlugin>;
  withCredentials: boolean;
}

export type BaseOptions = Partial<OptionProps>;

// 下方 request 的 option
export type BaseRequestOptions<P, D, E = AnyObject> = Partial<{
  plugins: Array<HookFetchPlugin>;
  timeout: number;
  params: P;
  data: D;
  controller: AbortController;
  extra: E;
  qsArrayFormat: QueryString.IStringifyOptions['arrayFormat'];
  withCredentials: boolean;
  method: RequestMethod;
}> & Omit<RequestInit, 'body' | 'method'> & {
  url: string;
  baseURL: string;
};

export type ResponseWithSource<T, E = AnyObject> = Promise<T> & Omit<ResponseWithSourceClass<E>, 'json'>;

export type ResponseWithSourceClassOptions<E> = {
  response: Response;
  controller: AbortController;
  plugins: Array<HookFetchPlugin>;
  config: RequestConfig<unknown, unknown, E>;
}

export type RequestMethodWithParams = 'GET' | 'DELETE' | 'OPTIONS' | 'HEAD';

export type RequestMethodWithBody = 'PUT' | 'PATCH' | 'POST';

export type RequestMethod = RequestMethodWithParams | RequestMethodWithBody;

export enum Method {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
  PATCH = 'PATCH',
  HEAD = 'HEAD',
  OPTIONS = 'OPTIONS',
}

export enum ContentType {
  JSON = 'application/json',
  FORM_URLENCODED = 'application/x-www-form-urlencoded',
  FORM_DATA = 'multipart/form-data',
  TEXT = 'text/plain',
  HTML = 'text/html',
  XML = 'text/xml',
  CSV = 'text/csv',
  STREAM = 'application/octet-stream',
}

export enum StatusCode {
  TIME_OUT = 408,
  ABORTED = 499,
  NETWORK_ERROR = 599,
  BODY_NULL = 502,
  UNKNOWN = 500
}

export type RequestUseOptions<P, D, E> = Omit<BaseRequestOptions<P, D, E>, 'url' | 'plugins' | 'baseURL' | 'controller'>
