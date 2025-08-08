---
id: changelog
title: Changelog
sidebar_position: 1
---

# Changelog

## Version History

### v2.1.0 💥
**Release Date**: 2025-08-08

#### 💔 Breaking Changes
- Generic signature change for `HookFetch` and `hookFetch.create` from
  `<R extends AnyObject = AnyObject, K extends keyof R = 'data', E = AnyObject>`
  to
  `<R extends AnyObject | null = null, K extends keyof R = never, E = AnyObject>`.

  - When `R = null` (default): `json<T>()` returns `T` directly, no wrapper mapping (closer to native fetch semantics).
  - When you need a wrapped response with key mapping: pass wrapper type and key explicitly, e.g., `hookFetch.create<ResponseVO, 'data'>(...)`. Then `json<User>()` returns `ResponseVO` where `data` is `User`.

#### 🔧 Migration Guide
- Old code:
  ```ts
  interface ResponseVO { code: number; message: string; data: never }
  const api = hookFetch.create<ResponseVO>({ baseURL: '...' });
  const res = await api.get<User>('/user').json();
  // res.data: User
  ```
  New code (explicit key):
  ```ts
  const api = hookFetch.create<ResponseVO, 'data'>({ baseURL: '...' });
  const res = await api.get<User>('/user').json();
  // res.data: User
  ```

- If you do not need wrapping (return `T` directly):
  ```ts
  const api = hookFetch.create(); // equivalent to <null, never>
  const user = await api.get<User>('/user').json(); // user: User
  ```

#### 🧰 Misc
- Docs updated (README and API Reference) clarifying `R | null` and `K` usage.

### v2.0.7 🛠️
**Release Date**: 2025-08-08

#### 🐛 Fixes
- Fix missing type inference for `json`, `text`, `blob`, `arrayBuffer`, `formData`, and `bytes` methods for better return type hints.

#### 🧱 Infra
- Adjust and fix release CI/CD configuration.

### v2.0.6
**Release Date**: 2025-08-07

#### 🔧 Changes
- Adjustments related to release flow and version stability.

### v2.0.3 🎉
**Release Date**: 2025-06-30

#### 💔 Breaking Changes
- **Removed Default JSON Parsing**: No longer automatically parses JSON responses, requires explicit `.json()` method call
- **More Explicit Response Handling**: Provides more explicit response data handling to avoid implicit behavior

#### 🔧 API Adjustments
- All request methods now require explicit response handling method calls (e.g., `.json()`, `.text()`, etc.)
- Improved API clarity and predictability

#### 📚 Documentation Updates
- Updated all example code to explicitly show `.json()` calls
- Improved documentation for response handling

### v1.0.x
**Release Date**: 2025-04

#### 🎯 Initial Release
- Modern HTTP request library based on native fetch API
- **Automatic JSON Parsing**: Default automatic JSON response parsing
- **Complete Plugin System**: Supports `beforeRequest`, `afterResponse`, `beforeStream`, `transformStreamChunk`, `onError`, `onFinally` lifecycle hooks
- **Vue Hooks Support**: Provides `useHookFetch` Vue Composition API
- **React Hooks Support**: Provides `useHookFetch` React Hook
- **Multiple Response Handling**: Supports `json()`, `text()`, `blob()`, `arrayBuffer()`, `formData()`, `bytes()` methods
- **Request Retry Mechanism**: Supports `.retry()` method to retry aborted requests
- **Streaming Data Processing**: Powerful streaming response handling capabilities
- **Request Interruption**: Supports `.abort()` method to interrupt requests
- **Plugin Priority**: Supports plugin priority settings
- **SSE Support**: Provides `sseTextDecoderPlugin` plugin
- **Complete TypeScript Support**: Provides comprehensive type definitions and generic support
- **Flexible Configuration**: Supports timeout, baseURL, headers, parameter serialization and other configuration options
- **VSCode IntelliSense**: Provides dedicated type declaration files

### Coming Soon
- More built-in plugins
- Richer plugin ecosystem
- More framework integration support
