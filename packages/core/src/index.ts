import type { HookFetchRequest as _HookFetchRequest_ } from './utils';
import hookFetch from './base';

export * from './base';
export * from './enum';
export * from './error';
export * from './types';
export type HookFetchRequest<T = unknown, E = unknown> = _HookFetchRequest_<T, E>;
export default hookFetch;
