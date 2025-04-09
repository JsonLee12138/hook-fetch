import { default as QueryString } from 'qs';
import { AnyObject } from 'typescript-api-pro';
import { HookFetchPlugin, BaseRequestOptions, OnFinallyHandler, RequestConfig, RequestMethod, ResponseErrorOptions, StreamContext } from './types';
export declare const delay: (ms: number) => Promise<unknown>;
export declare const timeoutCallback: (controller: AbortController) => void;
export declare class ResponseError<E = unknown> extends Error {
    #private;
    constructor({ message, status, statusText, response, config, name }: ResponseErrorOptions<E>);
    get message(): string;
    get status(): number | undefined;
    get statusText(): string | undefined;
    get response(): Response | undefined;
    get config(): RequestConfig<unknown, unknown, E> | undefined;
    get name(): string;
}
export declare const parsePlugins: (plugins: HookFetchPlugin[]) => {
    beforeRequestPlugins: ((config: RequestConfig<unknown, unknown, unknown>) => Promise<RequestConfig<unknown, unknown, unknown>>)[];
    afterResponsePlugins: ((context: import('./types').FetchPluginContext<unknown, unknown, unknown, unknown>) => Promise<import('./types').FetchPluginContext<any>>)[];
    errorPlugins: ((error: Error) => Promise<void | Error | ResponseError<unknown>>)[];
    finallyPlugins: OnFinallyHandler<unknown, unknown, unknown>[];
    transformStreamChunkPlugins: ((chunk: StreamContext<any>) => Promise<StreamContext>)[];
};
export declare const buildUrl: (url: string, params?: AnyObject, qsArrayFormat?: QueryString.IStringifyOptions["arrayFormat"]) => string;
export declare const mergeHeaders: (_baseHeaders?: HeadersInit | Headers, _newHeaders?: HeadersInit | Headers) => Headers;
export declare const getBody: (body: AnyObject, method: RequestMethod, headers?: HeadersInit, qsArrayFormat?: QueryString.IStringifyOptions["arrayFormat"]) => BodyInit | null;
export declare class HookFetch<T, E> implements PromiseLike<T> {
    #private;
    constructor(options: BaseRequestOptions<unknown, unknown, E>);
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | null | undefined, onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null | undefined): PromiseLike<TResult1 | TResult2>;
    catch<TResult = never>(onrejected?: ((reason: unknown) => TResult | PromiseLike<TResult>) | null | undefined): Promise<T | TResult>;
    finally(onfinally?: (() => void) | null | undefined): Promise<T>;
    abort(): void;
    blob(): Promise<Blob>;
    text(): Promise<string>;
    arrayBuffer(): Promise<ArrayBuffer>;
    formData(): Promise<FormData>;
    bytes(): Promise<Uint8Array<ArrayBufferLike>>;
    stream<T>(): AsyncGenerator<StreamContext<T> | StreamContext<null>, void, unknown>;
}
