import type { ResponseError } from '../errors';
import type {
  AfterResponseCtx,
  AfterStreamHandler,
  BeforeRequestHandler,
  BeforeStreamHandler,
  AfterResponseHandler,
  OnErrorHandler,
  OnFinallyHandler,
  RequestConfig,
  StreamContext,
  TransformStreamChunkHandler,
} from '../types';
import { createReject, createResolve, isPipelineDecision, type PipelineDecision } from './decision';

export async function runBeforeRequest(
  handlers: BeforeRequestHandler[],
  config: RequestConfig,
): Promise<RequestConfig | PipelineDecision> {
  let current = config;
  for (const handler of handlers) {
    const result = await handler({
      config: current,
      resolve: createResolve,
      reject: createReject,
    });
    if (isPipelineDecision(result)) return result;
    current = result as RequestConfig;
  }
  return current;
}

export async function runAfterResponse<T, E>(
  handlers: AfterResponseHandler[],
  context: AfterResponseCtx<T, E>,
): Promise<AfterResponseCtx<T, E> | PipelineDecision> {
  let current: AfterResponseCtx<T, E> = context;
  for (const handler of handlers) {
    const result = await handler(current as any);
    if (isPipelineDecision(result)) return result;
    current = result as AfterResponseCtx<T, E>;
  }
  return current;
}

export async function runOnError<E>(
  handlers: OnErrorHandler[],
  error: ResponseError<E>,
  config: RequestConfig,
): Promise<PipelineDecision | null> {
  for (const handler of handlers) {
    try {
      const result = await handler({
        error,
        config,
        resolve: createResolve,
        reject: (err) => createReject(err ?? error),
      });
      if (isPipelineDecision(result)) return result;
    } catch {
      // Plugin threw — continue to next plugin
    }
  }
  return null;
}

export async function runOnFinally(
  handlers: OnFinallyHandler[],
  config: RequestConfig,
): Promise<void> {
  for (const handler of handlers) {
    try { await handler({ config }); } catch {}
  }
}

export async function runBeforeStream(
  handlers: BeforeStreamHandler[],
  body: ReadableStream,
  config: RequestConfig,
  response: Response,
): Promise<ReadableStream> {
  let current = body;
  for (const handler of handlers) {
    current = await handler({ body: current, config, response });
  }
  return current;
}

export async function runTransformChunk(
  handlers: TransformStreamChunkHandler[],
  chunk: StreamContext,
  config: RequestConfig,
): Promise<StreamContext> {
  let current = chunk;
  for (const handler of handlers) {
    current = await handler({ chunk: current, config });
  }
  return current;
}

export async function runAfterStream(
  handlers: AfterStreamHandler[],
  config: RequestConfig,
): Promise<void> {
  for (const handler of handlers) {
    try { await handler({ config }); } catch {}
  }
}
