## 1. Implementation
- [ ] 1.1 Update `HookFetchPlugin`/`OnErrorHandler` types to surface `RetryDecision` + `OnErrorContext` helpers.
- [ ] 1.2 Enhance `HookFetchRequest` to track attempts, execute retry decisions (delay + overrides), and expose max-attempt guard rails.
- [ ] 1.3 Wire per-request overrides from `config.extra.retry` and plugin default options into the retry evaluator.
- [ ] 1.4 Ensure dedupe/timeout/finally flows stay consistent when retries occur (cache clearing, abort handling, plugin rehydration).

## 2. Testing
- [ ] 2.1 Add unit tests for retry decision paths (success, failure after limit, config overrides, delay behavior mocked).
- [ ] 2.2 Add regression tests proving legacy plugins (no retry) still work untouched.

## 3. Documentation
- [ ] 3.1 Document the new `onError` context + `extra.retry` contract (README/demo + TS doc comments).
- [ ] 3.2 Provide an example plugin/dedicated demo showing status-based retry with custom backoff.
