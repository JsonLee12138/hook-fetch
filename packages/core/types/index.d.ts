import { AfterResponseHandler, BaseOptions, BaseRequestOptions, BeforeRequestHandler, BeforeStreamHandler, BodyType, DeleteOptions, FetchPluginContext, FetchResponseType, GetOptions, HeadOptions, HookFetchPlugin, OnErrorHandler, OnFinallyHandler, OptionProps, OptionsOptions, PatchOptions, PostOptions, PutOptions, RequestConfig, RequestMethod, RequestMethodWithBody, RequestMethodWithParams, RequestOptions, RequestUseOptions, RequestWithBodyFnOptions, RequestWithBodyOptions, RequestWithParamsFnOptions, RequestWithParamsOptions, ResponseError, ResponseErrorOptions, StreamContext, TransformStreamChunkHandler } from "./types-B095tvsj.js";
import { HookFetchRequest } from "./baseClass-CE8V_atm.js";
import { AnyObject, Generic } from "typescript-api-pro";

//#region src/base.d.ts
type GenericWithNull<T, R extends AnyObject | null, K extends keyof R> = R extends null ? T : Generic<Exclude<R, null>, K, T>;
declare class HookFetch<R extends AnyObject | null = null, K extends keyof R = never, E = AnyObject> {
  #private;
  constructor({
    timeout,
    baseURL,
    headers,
    plugins,
    withCredentials,
    qsConfig
  }: BaseOptions);
  use(plugin: HookFetchPlugin<any, any, any, any>): this;
  request<T = AnyObject, P = AnyObject, D extends BodyType = BodyType>(url: string, {
    timeout,
    headers,
    method,
    params,
    data,
    qsConfig,
    withCredentials,
    extra,
    plugins
  }?: RequestOptions<P, D, E>): HookFetchRequest<GenericWithNull<T, R, K>, E>;
  get<T = AnyObject, P = AnyObject>(url: string, params?: P, options?: GetOptions<P, E>): HookFetchRequest<GenericWithNull<T, R, K>, E>;
  head<T = AnyObject, P = AnyObject>(url: string, params?: P, options?: HeadOptions<P, E>): HookFetchRequest<GenericWithNull<T, R, K>, E>;
  options<T = AnyObject, P = AnyObject, D extends BodyType = BodyType>(url: string, params?: P, options?: OptionsOptions<P, D, E>): HookFetchRequest<GenericWithNull<T, R, K>, E>;
  delete<T = AnyObject, D extends BodyType = BodyType, P = AnyObject>(url: string, options?: DeleteOptions<P, D, E>): HookFetchRequest<GenericWithNull<T, R, K>, E>;
  post<T = AnyObject, D extends BodyType = BodyType, P = AnyObject>(url: string, data?: D, options?: PostOptions<D, P, E>): HookFetchRequest<GenericWithNull<T, R, K>, E>;
  upload<T = AnyObject, D extends AnyObject | FormData = AnyObject, P = AnyObject>(url: string, data?: D, options?: PostOptions<D, P, E>): HookFetchRequest<GenericWithNull<T, R, K>, E>;
  put<T = AnyObject, D extends BodyType = BodyType, P = AnyObject>(url: string, data?: D, options?: PutOptions<D, P, E>): HookFetchRequest<GenericWithNull<T, R, K>, E>;
  patch<T = AnyObject, D extends BodyType = BodyType, P = AnyObject>(url: string, data?: D, options?: PatchOptions<D, P, E>): HookFetchRequest<GenericWithNull<T, R, K>, E>;
  abortAll(): void;
}
declare function useRequest<R = AnyObject, P = AnyObject, D extends BodyType = BodyType, E = AnyObject>(url: string, options?: RequestOptions<P, D, E>): HookFetchRequest<R, E>;
declare const request: typeof useRequest;
declare function get<R = AnyObject, P = AnyObject, E = AnyObject>(url: string, params?: P, options?: GetOptions<P, E>): HookFetchRequest<R, E>;
declare function head<R = AnyObject, P = AnyObject, E = AnyObject>(url: string, params?: P, options?: HeadOptions<P, E>): HookFetchRequest<R, E>;
declare function options<R = AnyObject, P = AnyObject, D extends BodyType = BodyType, E = AnyObject>(url: string, params?: P, options?: OptionsOptions<P, D, E>): HookFetchRequest<R, E>;
declare function del<R = AnyObject, D extends BodyType = BodyType, P = AnyObject, E = AnyObject>(url: string, options?: DeleteOptions<P, D, E>): HookFetchRequest<R, E>;
declare function post<R = AnyObject, D extends BodyType = BodyType, P = AnyObject, E = AnyObject>(url: string, data?: D, options?: PostOptions<D, P, E>): HookFetchRequest<R, E>;
declare function upload<R = AnyObject, D extends AnyObject | FormData = AnyObject, P = AnyObject, E = AnyObject>(url: string, data?: D, options?: PostOptions<D, P, E>): HookFetchRequest<R, E>;
declare function put<R = AnyObject, D extends BodyType = BodyType, P = AnyObject, E = AnyObject>(url: string, data?: D, options?: PutOptions<D, P, E>): HookFetchRequest<R, E>;
declare function patch<R = AnyObject, D extends BodyType = BodyType, P = AnyObject, E = AnyObject>(url: string, data?: D, options?: PatchOptions<D, P, E>): HookFetchRequest<R, E>;
type ExportDefault = typeof useRequest & {
  create: <R extends AnyObject | null = null, K extends keyof R = never, E = AnyObject>(options: BaseOptions) => (HookFetch<R, K, E>['request'] & HookFetch<R, K, E>);
  get: typeof get;
  head: typeof head;
  options: typeof options;
  delete: typeof del;
  post: typeof post;
  put: typeof put;
  patch: typeof patch;
  upload: typeof upload;
};
declare const hookFetch: ExportDefault;
//#endregion
//#region src/enum.d.ts
declare enum ContentType {
  JSON = "application/json",
  FORM_URLENCODED = "application/x-www-form-urlencoded",
  FORM_DATA = "multipart/form-data",
  TEXT = "text/plain",
  HTML = "text/html",
  XML = "text/xml",
  CSV = "text/csv",
  STREAM = "application/octet-stream",
}
declare enum StatusCode {
  TIME_OUT = 408,
  ABORTED = 499,
  NETWORK_ERROR = 599,
  BODY_NULL = 502,
  UNKNOWN = 601,
}
declare enum Method {
  GET = "GET",
  POST = "POST",
  PUT = "PUT",
  DELETE = "DELETE",
  PATCH = "PATCH",
  HEAD = "HEAD",
  OPTIONS = "OPTIONS",
}
//#endregion
//#region src/index.d.ts
type HookFetchRequest$1<T = unknown, E = unknown> = HookFetchRequest<T, E>;
//#endregion
export { AfterResponseHandler, BaseOptions, BaseRequestOptions, BeforeRequestHandler, BeforeStreamHandler, BodyType, ContentType, DeleteOptions, FetchPluginContext, FetchResponseType, GetOptions, HeadOptions, HookFetchPlugin, HookFetchRequest$1 as HookFetchRequest, Method, OnErrorHandler, OnFinallyHandler, OptionProps, OptionsOptions, PatchOptions, PostOptions, PutOptions, RequestConfig, RequestMethod, RequestMethodWithBody, RequestMethodWithParams, RequestOptions, RequestUseOptions, RequestWithBodyFnOptions, RequestWithBodyOptions, RequestWithParamsFnOptions, RequestWithParamsOptions, ResponseError, ResponseErrorOptions, StatusCode, StreamContext, TransformStreamChunkHandler, hookFetch as default, del, get, head, options, patch, post, put, request, upload };