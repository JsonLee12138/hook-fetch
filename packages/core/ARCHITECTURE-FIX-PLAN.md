# hook-fetch Core 修改方案

> 对应审查文档: `ARCHITECTURE-REVIEW.md`
> 修改原则: 最小改动，不改变公共 API 语义，保持向后兼容

---

## P0: 立即修复

### FIX BUG-1 + BUG-2: 重写 `hookFetch.create`

**文件**: `src/base.ts:184-189`

**问题**: `bind(this)` 指向 undefined；`Object.assign` 无法复制 private fields。

**方案**: 不再尝试把 `HookFetch` 实例的属性复制到函数上，改为在 `request` 函数上直接挂载 bound 方法。

```typescript
hookFetch.create = <R extends AnyObject | null = null, K extends keyof R = never, E = AnyObject>(options: BaseOptions) => {
  const context = new HookFetch<R, K, E>(options);
  const instance = context.request.bind(context) as HookFetch<R, K, E>['request'] & HookFetch<R, K, E>;

  // 手动挂载 bound 方法，避免 Object.assign 无法复制 private fields
  instance.get = context.get.bind(context);
  instance.head = context.head.bind(context);
  instance.options = context.options.bind(context);
  instance.delete = context.delete.bind(context);
  instance.post = context.post.bind(context);
  instance.put = context.put.bind(context);
  instance.patch = context.patch.bind(context);
  instance.upload = context.upload.bind(context);
  instance.abortAll = context.abortAll.bind(context);
  instance.use = context.use.bind(context);

  return instance;
};
```

**说明**:
- `HookFetch` 构造函数中已经对所有方法做了 `this.xxx = this.xxx.bind(this)`，所以这里 `.bind(context)` 实际上是双重 bind，第二次 bind 不会改变已 bind 的 `this`，但为了代码意图清晰保留
- 也可以直接用 `instance.get = context.get` 因为构造函数已经 bind 过了，效果相同
- 不需要 `Object.assign` 和 `HookFetch.prototype`

**影响范围**: 仅 `hookFetch.create` 的返回值构造方式，公共 API 不变。

---

### FIX BUG-3: qsConfig 不再 mutate 全局配置

**文件**: `src/base.ts:67`

**当前**:
```typescript
qsConfig: Object.assign(this.#qsConfig, qsConfig),
```

**改为**:
```typescript
qsConfig: Object.assign({}, this.#qsConfig, qsConfig),
```

**改动**: 1 个字符（加 `{}, `）。

---

## P1: 重要修复

### FIX BUG-4: 修复 `body.ts` FormData 转换逻辑

**文件**: `src/utils/body.ts:28-36`

**当前**:
```typescript
if (!(body instanceof FormData) && typeof body === 'object') {
  const _data = body as AnyObject;
  Object.keys(_data).forEach((key) => {
    if (_data['prototype'].hasOwnProperty.call(key)) {
      formData.append(key, _data[key]);
    }
  });
  res = formData;
}
```

**改为**:
```typescript
if (!(body instanceof FormData) && typeof body === 'object') {
  const _data = body as AnyObject;
  Object.keys(_data).forEach((key) => {
    formData.append(key, _data[key]);
  });
  res = formData;
}
```

**说明**: `Object.keys` 已经只返回 own enumerable 属性，无需再做 `hasOwnProperty` 检查。直接删除错误的判断即可。

---

### FIX BUG-5: `mergeHeaders` 不 mutate 传入的 base headers

**文件**: `src/utils/config.ts:21-33`

**当前**:
```typescript
export function mergeHeaders(_baseHeaders: HeadersInit | Headers = {}, _newHeaders: HeadersInit | Headers = {}): Headers {
  const _result = _baseHeaders instanceof Headers ? _baseHeaders : new Headers(_baseHeaders);
  // ...
```

**改为**:
```typescript
export function mergeHeaders(_baseHeaders: HeadersInit | Headers = {}, _newHeaders: HeadersInit | Headers = {}): Headers {
  const _result = new Headers(_baseHeaders);
  // ...
```

**说明**: 始终创建新的 `Headers` 实例，无论传入的是否已经是 `Headers`。`new Headers(existingHeaders)` 会复制所有 header entries。改动 1 行。

---

### FIX DESIGN-2: `finally()` 返回 `this` 以支持链式调用

**文件**: `src/utils/baseClass.ts:648-651`

**当前**:
```typescript
finally(onfinally?: (() => void) | null | undefined) {
  this.#finallyCallbacks.add(onfinally);
}
```

**改为**:
```typescript
finally(onfinally?: (() => void) | null | undefined): this {
  this.#finallyCallbacks.add(onfinally);
  return this;
}
```

**说明**: 返回 `this` 而非 Promise，因为 `HookFetchRequest` 本身是 `PromiseLike`，返回 `this` 即可被 `await` 且支持链式调用 `.finally().then()`。这与 `PromiseLike` 协议兼容——用户 `await req.finally(fn)` 会触发 `.then()`，最终拿到请求结果。

---

### FIX TODO-1 + TODO-2: 完善 Plugin 管理系统

**文件**: `src/utils/plugin.ts`

**方案**: 用完善后的 `HookFetchPluginManager` 替换当前的 `parsePlugins` 函数。

```typescript
export class HookFetchPluginManager {
  readonly beforeRequestPlugins: Array<NonNullable<HookFetchPlugin['beforeRequest']>> = [];
  readonly afterResponsePlugins: Array<NonNullable<HookFetchPlugin['afterResponse']>> = [];
  readonly errorPlugins: Array<NonNullable<HookFetchPlugin['onError']>> = [];
  readonly finallyPlugins: Array<NonNullable<HookFetchPlugin['onFinally']>> = [];
  readonly beforeStreamPlugins: Array<NonNullable<HookFetchPlugin['beforeStream']>> = [];
  readonly transformStreamChunkPlugins: Array<NonNullable<HookFetchPlugin['transformStreamChunk']>> = [];

  #pluginCount: number;

  constructor(plugins: HookFetchPlugin[]) {
    const resolved = this.#resolve(plugins);
    this.#pluginCount = resolved.length;
    this.#classify(resolved);
  }

  /** 原始插件数量（去重排序后） */
  get pluginCount() {
    return this.#pluginCount;
  }

  /** 去重（同名保留最后一个）+ 按 priority 升序排列 */
  #resolve(plugins: HookFetchPlugin[]): HookFetchPlugin[] {
    const map = new Map<string, HookFetchPlugin>();
    for (const plugin of plugins) {
      map.set(plugin.name, plugin);
    }
    return Array.from(map.values()).sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));
  }

  /** 将插件按 hook 类型分类 */
  #classify(plugins: HookFetchPlugin[]) {
    for (const plugin of plugins) {
      if (plugin.beforeRequest) this.beforeRequestPlugins.push(plugin.beforeRequest);
      if (plugin.afterResponse) this.afterResponsePlugins.push(plugin.afterResponse);
      if (plugin.onError) this.errorPlugins.push(plugin.onError);
      if (plugin.onFinally) this.finallyPlugins.push(plugin.onFinally);
      if (plugin.beforeStream) this.beforeStreamPlugins.push(plugin.beforeStream);
      if (plugin.transformStreamChunk) this.transformStreamChunkPlugins.push(plugin.transformStreamChunk);
    }
  }
}
```

**baseClass.ts 配套改动**:
- `#plugins` 类型从 `ReturnType<typeof parsePlugins>` 改为 `HookFetchPluginManager`
- 构造函数中 `parsePlugins(pluginList)` 改为 `new HookFetchPluginManager(pluginList)`
- 属性名保持不变（`beforeRequestPlugins` 等），其他代码无需改动

**删除**:
- `parsePlugins` 函数
- `HookFetchPluginHandlers` 类（未完成，功能已被 `HookFetchPluginManager` 覆盖）
- `upperBound` 函数（未使用）
- `chain` import（不再需要）

---

## P2: 优化

### FIX DESIGN-1: 消除 async Promise executor

**文件**: `src/utils/baseClass.ts:142-242`

**方案**: 将 `#init` 改为纯 async 方法，构造函数中直接赋值。

```typescript
async #init(options: BaseRequestOptions<unknown, BodyType, E>): Promise<Response> {
  const { timeout } = options;
  this.#isTimeout = false;
  let config = this.#createRequestConfig(options);

  // beforeRequest plugins
  for (const plugin of this.#plugins.beforeRequestPlugins) {
    config = await plugin(config) as RequestConfig<unknown, BodyType, E>;
    if (config.resolve) {
      const res = config.resolve();
      return res instanceof Response ? res : new Response(res);
    }
  }

  this.#config = config;

  const requestUrl = buildUrl(config.baseURL + config.url, config.params as AnyObject, config.qsConfig);
  const body = getBody(config.data ?? null, config.method, config.headers, config.qsConfig);
  const otherOptions = omit(config ?? {}, ['baseURL', 'data', 'extra', 'headers', 'method', 'params', 'url', 'withCredentials']);
  const attemptSignal = this.#prepareAttemptSignal();
  const requestInit: RequestInit = {
    ...otherOptions,
    method: config.method,
    headers: config.headers as HeadersInit,
    signal: attemptSignal,
    credentials: config.withCredentials ? 'include' : 'omit',
    body,
  };

  // timeout 处理
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  if (timeout) {
    timeoutId = setTimeout(() => {
      this.#isTimeout = true;
      this.#attemptController?.abort();
    }, timeout);
  }

  try {
    const res = await fetch(requestUrl, requestInit);
    if (res.ok) return res;

    throw new ResponseError({
      message: 'Fail Request',
      status: res.status,
      statusText: res.statusText,
      config: this.#config,
      name: 'Fail Request',
      response: res,
    });
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
    this.#cleanupAttemptController();
  }
}
```

**说明**:
- 不再使用 `new Promise(async executor)`，直接返回 async 函数的 Promise
- timeout 不再创建永远不 settle 的 Promise，改为纯 `setTimeout` + abort（同时解决 DESIGN-3）
- 构造函数中 `this.#promise = this.#init(...)` 仍然成立，因为 async 函数返回 Promise
- 错误处理简化：非 ok 的 response 直接 throw，fetch 本身的异常自然向上抛

---

### FIX DESIGN-4: 缓存 response clone

**文件**: `src/utils/baseClass.ts`

**方案**: 添加 `#cachedResponse` 字段，`#response` getter 中缓存 clone 结果。

```typescript
#cachedResponse: Promise<Response> | null = null;

get #response() {
  if (!this.#promise) {
    return Promise.reject(new Error('Response is null'));
  }
  if (!this.#cachedResponse) {
    this.#cachedResponse = this.#promise.then(r => r.clone());
  }
  return this.#cachedResponse;
}
```

**配套改动**: 在 `#restartRequest` 中清除缓存 `this.#cachedResponse = null`。

---

### FIX DESIGN-5: 用 dirty flag 替换错误的长度比较

**文件**: `src/utils/baseClass.ts`

**方案**: 添加 `#pluginsDirty` 标记。

```typescript
#pluginsDirty = false;

// __injectPlugins__ 中设置 dirty
__injectPlugins__(plugins: HookFetchPlugin<any, any, any, any>[]) {
  const newPlugins = [...this.#sourcePlugins, ...plugins];
  this.#plugins = new HookFetchPluginManager(newPlugins);
  this.#pluginsDirty = true;
}

// #execFinally 中根据 dirty flag 决定是否重置
#execFinally() {
  for (const callback of this.#finallyCallbacks) {
    callback?.();  // 同时修复 DESIGN-6
  }
  this.#plugins.finallyPlugins.forEach((plugin) => {
    plugin({ config: this.#config });
  });
  this.#finallyCallbacks.clear();

  if (this.#pluginsDirty) {
    this.#plugins = new HookFetchPluginManager(this.#sourcePlugins);
    this.#pluginsDirty = false;
  }
  this.#attempt = 0;
}
```

---

## P3: 防御性改进

### FIX DESIGN-8: `isGenerator`/`isAsyncGenerator` 加空值保护

**文件**: `src/utils/others.ts`

```typescript
export function isGenerator(v: any) {
  return v != null && v[Symbol.toStringTag] === 'Generator'
    && typeof v.next === 'function'
    && typeof v.return === 'function'
    && typeof v.throw === 'function'
    && typeof v[Symbol.iterator] === 'function';
}

export function isAsyncGenerator(v: any) {
  return v != null && v[Symbol.toStringTag] === 'AsyncGenerator'
    && typeof v.next === 'function'
    && typeof v.return === 'function'
    && typeof v.throw === 'function'
    && typeof v[Symbol.asyncIterator] === 'function';
}
```

---

### FIX QUALITY-1: `dedupe.ts` 修正 `onError` 参数命名

**文件**: `src/plugins/dedupe.ts:135`

```typescript
onError: (error) => {
  if (error.config) {
    const key = getRequestKey(error.config.url, error.config.method, error.config.params, error.config.data);
    if (cache.has(key)) {
      cache.delete(key);
    }
  }
  return error;
},
```

---

## 改动汇总

| 文件 | 改动类型 | 涉及问题 |
|------|----------|----------|
| `src/base.ts` | 重写 `hookFetch.create`，修复 qsConfig | BUG-1, BUG-2, BUG-3 |
| `src/utils/baseClass.ts` | 重构 `#init`，缓存 response，dirty flag，finally 返回 this | DESIGN-1, DESIGN-2, DESIGN-3, DESIGN-4, DESIGN-5, DESIGN-6 |
| `src/utils/plugin.ts` | 完善 `HookFetchPluginManager`，删除废弃代码 | TODO-1, TODO-2 |
| `src/utils/body.ts` | 删除错误的 hasOwnProperty 检查 | BUG-4 |
| `src/utils/config.ts` | mergeHeaders 不 mutate base | BUG-5 |
| `src/utils/others.ts` | 空值保护 | DESIGN-8 |
| `src/plugins/dedupe.ts` | 参数命名 | QUALITY-1 |

**预计总改动量**: ~120 行修改，~50 行删除。
