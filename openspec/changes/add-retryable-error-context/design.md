## 背景
当前只有 `HookFetchRequest.retry()` 能手动重新发起请求，插件的 `onError` 只能返回/抛出 `ResponseError`，无法在生命周期内部触发重试，更无法把“最终一次重试的结果”直接返回给调用方。我们希望把重试策略（按状态码、指数退避、新 token 刷新等）沉淀到插件体系中，而不是强迫业务端在 request 外部复制整套逻辑。

## 目标与非目标
- 目标：
  - 在 `onError` 中提供可选的第三个参数 `context`，包含当前重试次数、最大次数以及 `retry`/`resolve`/`reject` 等 helper，使插件可以决定后续流程。
  - 允许插件直接返回一个新的 `Promise`/`HookFetchRequest`，让核心自动接管，保证调用方最终拿到的是“重试后的结果”。
  - 支持两层配置来源：插件工厂的默认 retry 选项与请求级别的 `config.extra.retry` 覆盖；未显式启用重试的请求保持原有行为。
  - 保持向后兼容；旧插件（只接受前两个参数）无需改动即可继续运行。
- 非目标：
  - 不调整插件整体的执行顺序或优先级策略。
  - 不提供全局性的 retry 策略配置入口；重试逻辑仍由插件负责。
  - 不在本次变更中加入额外的统计/观测能力（后续可通过新插件完成）。

## 设计决策
- **OnErrorContext 结构**：`context` 提供 `{ attempt, maxAttempts, retry(max, overrides), resolve(value), reject(err) }`。`attempt` 表示当前失败次数（首个失败为 0），`maxAttempts` 由 `config.extra.retry?.maxAttempts` 或插件默认配置得出。`retry` 会构造一个新的请求 promise（内部可复用 `HookFetchRequest.retry()` 并应用 overrides），`resolve`/`reject` 让插件能在 onError 生命周期里直接控制最终结果。
- **返回值判定**：核心在执行 `onError` 后按以下优先级处理返回值：
  1. 若返回 `Promise` 或 `HookFetchRequest`，直接把当前执行链的 `executor` 替换为该 promise，并等待其 resolve/reject；
  2. 若返回 `context.retry(...)` 的结构体，则按照 helper 产生的 promise 处理；
  3. 若返回 `ResponseError` 或 `void`，按旧逻辑继续抛错。
  这样可以保证“插件请求重试 → 调用方最终拿到重试后的结果”。
- **配置叠加**：插件工厂参数（如 `{ enabled, maxAttempts, retryableStatus, delayStrategy }`）作为默认策略；每个请求可在 `extra.retry` 中覆盖（例如关闭重试、调整最大次数、补充 headers）。`context.retry` 会把 overrides 与默认配置合并后再创建新的 `HookFetchRequest`。
- **内部调度**：`HookFetchRequest` 引入 `#attempt` 与 `#maxAttempts`，每次失败后都会先调用插件；如果插件返回了 promise，核心立即切换到该 promise 并保持同一套 finally/abort/timeout 管控。`onFinally` 仅在最终 settle 时执行一次，避免多次清理；若插件不断返回 `context.retry`，核心会根据 `maxAttempts` 防止无限循环，并在超限时抛出清晰的 `ResponseError`。
- **兼容策略**：TS 类型把 `OnErrorHandler` 扩展为 `(error, config, context?: OnErrorContext)`，老代码可不关心第三个参数。运行时也会为未使用新 API 的插件提供空的 `context`，避免破坏旧行为。

## 风险与权衡
- 插件创建的 promise 必须遵守 Hook Fetch 的生命周期，否则可能导致 finally/abort 无法正常触发；我们将 `context.retry` 默认指向内部实现，鼓励插件优先使用 helper。
- 若插件返回的 promise 永远不 settle，会让调用方请求挂起；通过在文档中强调“重试逻辑必须显式 resolve/reject”并建议设置合理的最大次数来规避。
- 自动重试与 dedupe、限流等插件交织时需要协调（例如 dedupe 需要把 `attempt` 纳入 key）；文档中会给出互操作建议。

## 未决问题
- 是否需要在 `context` 中加入更多运行信息（如最近一次响应、累计耗时）以便复杂策略使用？
- 是否提供内置的 delay/backoff 工具函数，降低插件实现成本？
