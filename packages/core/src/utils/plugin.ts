import type { HookFetchPlugin } from '../types';

export function parsePlugins(plugins: HookFetchPlugin[]) {
  const pluginsMap = new Map<string, HookFetchPlugin>();
  plugins.forEach((plugin) => {
    pluginsMap.set(plugin.name, plugin);
  });
  const pluginsArr = Array.from(pluginsMap.values()).sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));

  const beforeRequestPlugins: Array<Exclude<HookFetchPlugin['beforeRequest'], undefined>> = [];
  const afterResponsePlugins: Array<Exclude<HookFetchPlugin['afterResponse'], undefined>> = [];
  const errorPlugins: Array<Exclude<HookFetchPlugin['onError'], undefined>> = [];
  const finallyPlugins: Array<Exclude<HookFetchPlugin['onFinally'], undefined>> = [];
  const transformStreamChunkPlugins: Array<Exclude<HookFetchPlugin['transformStreamChunk'], undefined>> = [];
  const beforeStreamPlugins: Array<Exclude<HookFetchPlugin['beforeStream'], undefined>> = [];
  pluginsArr.forEach((plugin) => {
    if (plugin.beforeRequest) {
      beforeRequestPlugins.push(plugin.beforeRequest);
    }
    if (plugin.afterResponse) {
      afterResponsePlugins.push(plugin.afterResponse);
    }
    if (plugin.onError) {
      errorPlugins.push(plugin.onError);
    }
    if (plugin.onFinally) {
      finallyPlugins.push(plugin.onFinally);
    }
    if (plugin.transformStreamChunk) {
      transformStreamChunkPlugins.push(plugin.transformStreamChunk);
    }
    if (plugin.beforeStream) {
      beforeStreamPlugins.push(plugin.beforeStream);
    }
  });
  return {
    beforeRequestPlugins,
    afterResponsePlugins,
    errorPlugins,
    finallyPlugins,
    beforeStreamPlugins,
    transformStreamChunkPlugins,
  };
}
