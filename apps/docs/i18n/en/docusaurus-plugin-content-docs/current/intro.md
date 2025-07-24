---
sidebar_position: 1
---

# Hook-Fetch 🚀

Welcome to Hook-Fetch! A modern HTTP request library based on the native fetch API, providing clean syntax, rich features, and a powerful plugin system.

## Features

- 🚀 **Modern Design** - Based on native fetch API, supports Promise and async/await
- 🔌 **Plugin System** - Powerful plugin architecture with custom extensions
- 🌊 **Streaming Support** - Perfect support for SSE (Server-Sent Events) and streaming data
- 🎯 **TypeScript Support** - Complete type definitions and type inference
- 🔄 **Request Retry** - Built-in request retry mechanism
- 🛡️ **Error Handling** - Comprehensive error handling and exception catching
- 🎨 **Framework Integration** - React and Vue Hook support
- 📦 **Lightweight** - Small size with no extra dependencies
- 🔧 **Highly Configurable** - Flexible configuration options for various needs

## Quick Start

### Installation

```bash
# Using npm
npm install hook-fetch

# Using yarn
yarn add hook-fetch

# Using pnpm
pnpm add hook-fetch
```

### Basic Usage

```typescript
import hookFetch from 'hook-fetch';

// GET request
const response = await hookFetch('https://api.example.com/users').json();
console.log(response);

// POST request
const newUser = await hookFetch('https://api.example.com/users', {
  method: 'POST',
  data: { name: 'John', email: 'john@example.com' }
}).json();
```

### Create Instance

```typescript
// Create a configured instance
const api = hookFetch.create({
  baseURL: 'https://api.example.com',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your-token'
  },
  timeout: 5000
});

// Use the instance
const users = await api.get('/users').json();
```

## Why Choose Hook-Fetch?

### Advantages over other libraries

- **vs Axios**: More lightweight, based on modern fetch API, better TypeScript support
- **vs Native fetch**: Cleaner API, built-in error handling and retry mechanism
- **vs Other fetch libraries**: Unique plugin system and streaming support

### Use Cases

- Modern web application development
- Scenarios requiring streaming data processing
- Projects sensitive to bundle size
- Highly customizable request processing needs
- Data fetching in React/Vue projects

## Next Steps

- [Getting Started](/docs/getting-started) - Learn basic usage
- [API Reference](/docs/api-reference) - View complete API documentation
- [Plugin System](/docs/plugins) - Learn how to use and develop plugins
- [Framework Integration](/docs/framework-integration) - React and Vue integration guide
- [Best Practices](/docs/best-practices) - Recommended usage patterns and techniques

## Community and Support

- [GitHub Repository](https://github.com/JsonLee12138/hook-fetch)
- [Issue Tracker](https://github.com/JsonLee12138/hook-fetch/issues)
- [Contributing Guide](https://github.com/JsonLee12138/hook-fetch/blob/main/CONTRIBUTING.md)

Let's start exploring the powerful features of Hook-Fetch!
