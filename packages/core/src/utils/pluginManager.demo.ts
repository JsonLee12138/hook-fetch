import type { HookFetchPlugin } from '../types';

// 描述每个生命周期阶段要执行的处理函数列表
interface PluginStageHandlers {
  beforeRequest: Array<NonNullable<HookFetchPlugin['beforeRequest']>>;
  afterResponse: Array<NonNullable<HookFetchPlugin['afterResponse']>>;
  onError: Array<NonNullable<HookFetchPlugin['onError']>>;
  onFinally: Array<NonNullable<HookFetchPlugin['onFinally']>>;
  beforeStream: Array<NonNullable<HookFetchPlugin['beforeStream']>>;
  transformStreamChunk: Array<NonNullable<HookFetchPlugin['transformStreamChunk']>>;
}

// 初始化所有阶段为空数组，便于后续逐个推入 handler
function createEmptyStageHandlers(): PluginStageHandlers {
  return {
    beforeRequest: [],
    afterResponse: [],
    onError: [],
    onFinally: [],
    beforeStream: [],
    transformStreamChunk: [],
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

// 根据当前插件顺序构建阶段处理器，用于 snapshot 直接复用
function buildStageHandlers(entries: HookFetchPlugin[]): PluginStageHandlers {
  const stages = createEmptyStageHandlers();
  for (const plugin of entries) {
    if (plugin.beforeRequest) {
      stages.beforeRequest.push(plugin.beforeRequest);
    }
    if (plugin.afterResponse) {
      stages.afterResponse.push(plugin.afterResponse);
    }
    if (plugin.onError) {
      stages.onError.push(plugin.onError);
    }
    if (plugin.onFinally) {
      stages.onFinally.push(plugin.onFinally);
    }
    if (plugin.beforeStream) {
      stages.beforeStream.push(plugin.beforeStream);
    }
    if (plugin.transformStreamChunk) {
      stages.transformStreamChunk.push(plugin.transformStreamChunk);
    }
  }
  return stages;
}

export class PluginPipelineSnapshot {
  #plugins: HookFetchPlugin[];
  #handlers: PluginStageHandlers;

  constructor(entries: HookFetchPlugin[]) {
    this.#plugins = entries;
    this.#handlers = buildStageHandlers(entries);
  }

  /**
   * 插件的优先级顺序
   */
  get plugins() {
    return [...this.#plugins];
  }

  /**
   * 不同生命周期阶段的处理函数数组
   */
  get stages() {
    return this.#handlers;
  }
}

export class HookFetchPluginManager {
  #entries: HookFetchPlugin[] = [];
  #nameIndex: Record<string, number> = Object.create(null);

  constructor(plugins: HookFetchPlugin[] = []) {
    this.addMany(plugins);
  }

  static #fromEntries(entries: HookFetchPlugin[]) {
    const manager = new HookFetchPluginManager();
    manager.#entries = [...entries];
    manager.#rebuildNameIndex();
    return manager;
  }

  #rebuildNameIndex() {
    this.#nameIndex = Object.create(null);
    for (let i = 0; i < this.#entries.length; i += 1) {
      this.#nameIndex[this.#entries[i]?.name ?? ''] = i;
    }
  }

  #updateNameIndex(from: number) {
    for (let i = from; i < this.#entries.length; i += 1) {
      this.#nameIndex[this.#entries[i]?.name ?? ''] = i;
    }
  }

  add(plugin: HookFetchPlugin) {
    this.#insert(plugin);
    return this;
  }

  addMany(plugins: HookFetchPlugin[]) {
    for (const plugin of plugins) {
      this.add(plugin);
    }
    return this;
  }

  remove(name: string) {
    const index = this.#nameIndex[name];
    if (typeof index !== 'number') {
      return false;
    }
    this.#entries.splice(index, 1);
    delete this.#nameIndex[name];
    this.#updateNameIndex(index);
    return true;
  }

  reset(plugins: HookFetchPlugin[]) {
    this.#entries = [];
    this.#nameIndex = Object.create(null);
    this.addMany(plugins);
  }

  injectTemporary(plugins: HookFetchPlugin[]) {
    const cloned = HookFetchPluginManager.#fromEntries(this.#entries);
    cloned.addMany(plugins);
    return cloned.createSnapshot();
  }

  createSnapshot() {
    return new PluginPipelineSnapshot([...this.#entries]);
  }

  #insert(plugin: HookFetchPlugin) {
    const priority = plugin.priority ?? 0;
    const existingIndex = this.#nameIndex[plugin.name];
    let reindexStart = 0;

    if (typeof existingIndex === 'number') {
      this.#entries.splice(existingIndex, 1);
      delete this.#nameIndex[plugin.name];
      reindexStart = existingIndex;
    }
    const insertIndex = upperBound(this.#entries, priority);
    this.#entries.splice(insertIndex, 0, plugin);
    this.#updateNameIndex(Math.min(reindexStart, insertIndex));
  }
}

/**
 * 演示如何使用 HookFetchPluginManager 进行增删、排序以及临时注入。
 */
export function pluginManagerDemo() {
  const loggerPlugin: HookFetchPlugin = {
    name: 'logger',
    priority: 5,
    beforeRequest(config) {
      console.log('[logger] before request:', config.url);
      return config;
    },
    onFinally({ config }) {
      console.log('[logger] finally:', config.url);
    },
  };

  const metricsPlugin: HookFetchPlugin = {
    name: 'metrics',
    priority: 10,
    afterResponse(context) {
      console.log('[metrics] status:', context.response.status);
      return context;
    },
  };

  const retryPlugin: HookFetchPlugin = {
    name: 'retry',
    priority: 8,
    onError(error) {
      console.log('[retry] captured error:', error.message);
      return error;
    },
  };

  const manager = new HookFetchPluginManager([loggerPlugin, metricsPlugin]);
  manager.add(retryPlugin);

  const baseSnapshot = manager.createSnapshot();

  const temporaryPlugin: HookFetchPlugin = {
    name: 'temp-cache',
    priority: 9,
    afterResponse(context) {
      console.log('[temp-cache] cache response');
      return context;
    },
  };

  const injectedSnapshot = manager.injectTemporary([temporaryPlugin]);

  manager.remove('retry');
  const afterRemovalSnapshot = manager.createSnapshot();

  return {
    baseOrder: baseSnapshot.plugins.map(plugin => plugin.name),
    injectedOrder: injectedSnapshot.plugins.map(plugin => plugin.name),
    afterRemovalOrder: afterRemovalSnapshot.plugins.map(plugin => plugin.name),
    baseStages: baseSnapshot.stages,
  };
}
