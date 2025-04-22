import type QueryString from 'qs';
import type { AnyObject } from 'typescript-api-pro';
import type { ResponseError } from './utils';

export type FetchResponseType = 'json' | 'text' | 'blob' | 'arrayBuffer' | 'formData' | 'bytes';

export type RequestMethodWithParams = 'GET' | 'DELETE' | 'OPTIONS' | 'HEAD';

export type RequestMethodWithBody = 'PUT' | 'PATCH' | 'POST';

export type RequestMethod = RequestMethodWithParams | RequestMethodWithBody;

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

// 插件模式
export interface FetchPluginContext<T = unknown, E = unknown, P = unknown, D = unknown> {
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

type BeforeRequestHandler<E = unknown, P = unknown, D = unknown> = (config: RequestConfig<E, P, D>) => Promise<RequestConfig<E, P, D>>;

type AfterResponseHandler<T = unknown> = (context: FetchPluginContext<T>) => Promise<FetchPluginContext<any>>;

type TransformStreamChunkHandler = (chunk: StreamContext<any>) => Promise<StreamContext>;

export type OnFinallyHandler<E = unknown, P = unknown, D = unknown> = (res: Pick<FetchPluginContext<unknown, E, P, D>, 'config' | 'response'>) => Promise<void>;

export type HookFetchPlugin<T = unknown, E = unknown, P = unknown, D = unknown> = {
  /** 插件名称 */
  name: string;
  /** 优先级 */
  priority?: number;
  beforeRequest?: BeforeRequestHandler<E, P, D>;
  afterResponse?: AfterResponseHandler<T>;
  transformStreamChunk?: TransformStreamChunkHandler;
  onError?: (error: Error) => Promise<Error | void | ResponseError<E>>;
  onFinally?: OnFinallyHandler<E, P, D>;
}

// 核心内容
export interface OptionProps {
  baseURL: string;
  timeout: number;
  headers: HeadersInit;
  plugins: Array<HookFetchPlugin>;
  withCredentials: boolean;
}

export type BaseOptions = Partial<OptionProps>;

export type RequestUseOptions<P, D, E> = Omit<BaseRequestOptions<P, D, E>, 'url' | 'plugins' | 'baseURL' | 'controller'>;
