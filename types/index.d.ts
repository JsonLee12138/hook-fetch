import { AnyObject } from 'typescript-api-pro';
import { BaseOptions, HookFetchPlugin, RequestUseOptions } from './types';
import { HookFetch } from './utils';
declare class Base {
    #private;
    constructor({ timeout, baseURL, headers, plugins, withCredentials }: BaseOptions);
    use(plugin: HookFetchPlugin<any, any, any, any>): this;
    request<R = AnyObject, P = AnyObject, D = AnyObject, E = AnyObject>(url: string, { timeout, headers, method, params, data, qsArrayFormat, withCredentials, extra }?: RequestUseOptions<P, D, E>): HookFetch<R, E>;
    get<R = AnyObject, P = AnyObject, E = AnyObject>(url: string, params?: P, options?: Omit<RequestUseOptions<P, never, E>, 'params'>): HookFetch<R, E>;
    head<R = AnyObject, P = AnyObject, E = AnyObject>(url: string, params?: P, options?: Omit<RequestUseOptions<P, never, E>, 'params'>): HookFetch<R, E>;
    options<R = AnyObject, P = AnyObject, E = AnyObject>(url: string, params?: P, options?: Omit<RequestUseOptions<P, never, E>, 'params'>): HookFetch<R, E>;
    delete<R = AnyObject, P = AnyObject, E = AnyObject>(url: string, options?: RequestUseOptions<P, never, E>): HookFetch<R, E>;
    post<R = AnyObject, D = AnyObject, P = AnyObject, E = AnyObject>(url: string, data?: D, options?: Omit<RequestUseOptions<P, D, E>, 'data'>): HookFetch<R, E>;
    put<R = AnyObject, D = AnyObject, P = AnyObject, E = AnyObject>(url: string, data?: D, options?: Omit<RequestUseOptions<P, D, E>, 'data'>): HookFetch<R, E>;
    patch<R = AnyObject, D = AnyObject, P = AnyObject, E = AnyObject>(url: string, data?: D, options?: Omit<RequestUseOptions<P, D, E>, 'data'>): HookFetch<R, E>;
    abortAll(): void;
}
declare const useRequest: <R = AnyObject, P = AnyObject, D = AnyObject, E = AnyObject>(url: string, options?: RequestUseOptions<P, D, E>) => HookFetch<R, E>;
type ExportDefault = typeof useRequest & {
    create: (options: BaseOptions) => Base;
};
declare const _default: ExportDefault;
export default _default;
