import type { HookFetchRequest as _HookFetchRequest_ } from './utils';
import hookFetch from './base';

export * from './base';
export * from './enum';
export * from './errors';
export * from './types';
export { createResolve, createReject, isPipelineDecision, isResolve, isReject, DECISION } from './utils/decision';
export type { PipelineDecision, ResolveDecision, RejectDecision } from './utils/decision';
export type HookFetchRequest<T = unknown, E = unknown> = _HookFetchRequest_<T, E>;
export default hookFetch;
