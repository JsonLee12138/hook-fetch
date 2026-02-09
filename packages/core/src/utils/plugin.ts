import type {
  AfterResponseHandler,
  AfterStreamHandler,
  BeforeRequestHandler,
  BeforeStreamHandler,
  HookFetchPlugin,
  OnErrorHandler,
  OnFinallyHandler,
  TransformStreamChunkHandler,
} from '../types';

export class PluginManager {
  readonly beforeRequest: BeforeRequestHandler[] = [];
  readonly afterResponse: AfterResponseHandler[] = [];
  readonly onError: OnErrorHandler[] = [];
  readonly onFinally: OnFinallyHandler[] = [];
  readonly beforeStream: BeforeStreamHandler[] = [];
  readonly transformStreamChunk: TransformStreamChunkHandler[] = [];
  readonly afterStream: AfterStreamHandler[] = [];

  constructor(plugins: HookFetchPlugin[]) {
    // Dedupe: same name keeps last
    const map = new Map<string, HookFetchPlugin>();
    for (const plugin of plugins) {
      map.set(plugin.name, plugin);
    }
    // Sort by priority ascending
    const sorted = Array.from(map.values()).sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));

    for (const p of sorted) {
      if (p.beforeRequest) this.beforeRequest.push(p.beforeRequest);
      if (p.afterResponse) this.afterResponse.push(p.afterResponse);
      if (p.onError) this.onError.push(p.onError);
      if (p.onFinally) this.onFinally.push(p.onFinally);
      if (p.beforeStream) this.beforeStream.push(p.beforeStream);
      if (p.transformStreamChunk) this.transformStreamChunk.push(p.transformStreamChunk);
      if (p.afterStream) this.afterStream.push(p.afterStream);
    }
  }
}
