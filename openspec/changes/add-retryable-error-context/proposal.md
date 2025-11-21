# Change: Add retry-aware onError context

## Why
- Plugins currently cannot trigger retries because `onError` only receives a normalized `ResponseError` and must throw to exit.
- Some failure handling (e.g., 5xx backoff, network flake retry) is better implemented in plugins to keep the core lean, but there is no API surface.
- Retrying outside the request object duplicates logic and cannot coordinate with dedupe, timeout, or other plugins.

## What Changes
- Extend the error plugin contract with a retry context so `onError` can declare whether and how a request should be retried.
- Introduce a `RetryDecision` structure that supports delay/backoff and selective config overrides (headers, extra.retry, etc.).
- Track attempt counts in `HookFetchRequest`, honor retry decisions, and guard against infinite loops with a max-attempt policy.
- Define configuration sources: plugin factory defaults plus per-request overrides stored under `config.extra.retry`.
- Update docs/demos/tests so integrators understand how to opt in and how to customize retry behavior.

## Impact
- Affected specs: none (capability not yet specified)
- Affected code: `packages/core/src/types.ts`, `packages/core/src/utils.ts`, related test files, docs/demos/plugins.
