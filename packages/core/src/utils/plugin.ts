import type { HookFetchPlugin } from '../types';
import { chain } from 'radash';

class HookFetchPluginHandlers {
  beforeRequest: Array<NonNullable<HookFetchPlugin['beforeRequest']>> = [];
  afterResponse: Array<NonNullable<HookFetchPlugin['afterResponse']>> = [];
  onError: Array<NonNullable<HookFetchPlugin['onError']>> = [];
  onFinally: Array<NonNullable<HookFetchPlugin['onFinally']>> = [];
  beforeStream: Array<NonNullable<HookFetchPlugin['beforeStream']>> = [];
  transformStreamChunk: Array<NonNullable<HookFetchPlugin['transformStreamChunk']>> = [];
  constructor(plugins: HookFetchPlugin[]) {
    plugins.forEach((plugin) => {
      if (plugin.beforeRequest) {
        this.beforeRequest.push(plugin.beforeRequest);
      }
      if (plugin.afterResponse) {
        this.afterResponse.push(plugin.afterResponse);
      }
    });
  }
}

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

// 利用二分查找找到插件插入位置，保持按 priority 递增
function upperBound(entries: HookFetchPlugin[], priority: number) {
  let low = 0;
  let high = entries.length;
  while (low < high) {
    const mid = (low + high) >>> 1;
    const nextPriority = entries[mid]?.priority ?? 0;
    if (nextPriority <= priority) {
      low = mid + 1;
    }
    else {
      high = mid;
    }
  }
  return low;
}

class HookFetchPluginManager {
  constructor(plugins: Array<HookFetchPlugin>) {
    const plugs = chain(this.#dedupePlugins, this.#sortPlugins)(plugins);
  }

  #dedupePlugins(plugins: Array<HookFetchPlugin>): Array<HookFetchPlugin> {
    const res: Array<HookFetchPlugin> = [];
    for (const plugin of plugins) {
      if (res.some(p => p.name === plugin.name)) {
        continue;
      }
      res.push(plugin);
    }
    return res;
  }

  #sortPlugins(plugins: Array<HookFetchPlugin>): Array<HookFetchPlugin> {
    return plugins.sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));
  }
}
