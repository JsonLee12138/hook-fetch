---
id: changelog
title: Changelog
sidebar_position: 1
---

# Changelog

## Version History

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
