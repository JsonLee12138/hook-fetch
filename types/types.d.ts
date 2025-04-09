import { default as QueryString } from 'qs';
import { AnyObject } from 'typescript-api-pro';
import { ResponseError } from './utils';
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
};
export interface OptionProps {
    baseURL: string;
    timeout: number;
    headers: HeadersInit;
    plugins: Array<HookFetchPlugin>;
    withCredentials: boolean;
}
export type BaseOptions = Partial<OptionProps>;
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
export type RequestMethodWithParams = 'GET' | 'DELETE' | 'OPTIONS' | 'HEAD';
export type RequestMethodWithBody = 'PUT' | 'PATCH' | 'POST';
export type RequestMethod = RequestMethodWithParams | RequestMethodWithBody;
export declare enum Method {
    GET = "GET",
    POST = "POST",
    PUT = "PUT",
    DELETE = "DELETE",
    PATCH = "PATCH",
    HEAD = "HEAD",
    OPTIONS = "OPTIONS"
}
export declare enum ContentType {
    JSON = "application/json",
    FORM_URLENCODED = "application/x-www-form-urlencoded",
    FORM_DATA = "multipart/form-data",
    TEXT = "text/plain",
    HTML = "text/html",
    XML = "text/xml",
    CSV = "text/csv",
    STREAM = "application/octet-stream"
}
export declare enum StatusCode {
    TIME_OUT = 408,
    ABORTED = 499,
    NETWORK_ERROR = 599,
    BODY_NULL = 502,
    UNKNOWN = 601
}
export type RequestUseOptions<P, D, E> = Omit<BaseRequestOptions<P, D, E>, 'url' | 'plugins' | 'baseURL' | 'controller'>;
export interface ResponseErrorOptions<E = unknown> {
    name?: string;
    message: string;
    status?: number;
    statusText?: string;
    response?: Response;
    config?: RequestConfig<unknown, unknown, E>;
}
export {};
