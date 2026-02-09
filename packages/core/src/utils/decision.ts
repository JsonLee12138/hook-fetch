import type { ResponseError } from '../errors';

export const DECISION = Symbol.for('hookfetch.decision');

export interface ResolveDecision<T = unknown> {
  [DECISION]: 'resolve';
  value: T;
}

export interface RejectDecision<E = unknown> {
  [DECISION]: 'reject';
  error: Error | ResponseError<E>;
}

export type PipelineDecision<T = unknown, E = unknown> =
  | ResolveDecision<T>
  | RejectDecision<E>;

export const createResolve = <T>(value: T): ResolveDecision<T> => ({ [DECISION]: 'resolve', value });
export const createReject = (error: Error | ResponseError): RejectDecision => ({ [DECISION]: 'reject', error });

export function isPipelineDecision(v: unknown): v is PipelineDecision {
  return v != null && typeof v === 'object' && DECISION in (v as object);
}

export function isResolve<T>(v: PipelineDecision<T>): v is ResolveDecision<T> {
  return v[DECISION] === 'resolve';
}

export function isReject<E>(v: PipelineDecision<unknown, E>): v is RejectDecision<E> {
  return v[DECISION] === 'reject';
}
