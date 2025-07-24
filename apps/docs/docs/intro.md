---
sidebar_position: 1
---

# Hook-Fetch 🚀

欢迎使用 Hook-Fetch！这是一个基于原生 fetch API 的现代化 HTTP 请求库，提供了简洁的语法、丰富的功能和强大的插件系统。

## 特性

- 🚀 **现代化设计** - 基于原生 fetch API，支持 Promise 和 async/await
- 🔌 **插件系统** - 强大的插件架构，支持自定义扩展
- 🌊 **流式处理** - 完美支持 SSE (Server-Sent Events) 和流式数据
- 🎯 **TypeScript 支持** - 完整的类型定义和类型推断
- 🔄 **请求重试** - 内置请求重试机制
- 🛡️ **错误处理** - 完善的错误处理和异常捕获
- 🎨 **框架集成** - 提供 React 和 Vue 的 Hook 支持
- 📦 **轻量级** - 小巧的体积，无额外依赖
- 🔧 **高度可配置** - 灵活的配置选项，满足各种需求

## 快速开始

### 安装

```bash
# 使用 npm
npm install hook-fetch

# 使用 yarn
yarn add hook-fetch

# 使用 pnpm
pnpm add hook-fetch
```

### 基础使用

```typescript
import hookFetch from 'hook-fetch';

// 发起 GET 请求
const response = await hookFetch('https://api.example.com/users').json();
console.log(response);

// 发起 POST 请求
const newUser = await hookFetch('https://api.example.com/users', {
  method: 'POST',
  data: { name: 'John', email: 'john@example.com' }
}).json();
```

### 创建实例

```typescript
// 创建配置好的实例
const api = hookFetch.create({
  baseURL: 'https://api.example.com',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your-token'
  },
  timeout: 5000
});

// 使用实例
const users = await api.get('/users').json();
```

## 为什么选择 Hook-Fetch？

### 相比其他库的优势

- **相比 Axios**: 更轻量，基于现代 fetch API，更好的 TypeScript 支持
- **相比原生 fetch**: 更简洁的 API，内置错误处理和重试机制
- **相比其他 fetch 库**: 独特的插件系统和流式处理支持

### 适用场景

- 现代 Web 应用开发
- 需要处理流式数据的场景
- 对包体积敏感的项目
- 需要高度定制化的请求处理
- React/Vue 项目中的数据获取

## 下一步

- [快速开始](/docs/getting-started) - 学习基本用法
- [API 参考](/docs/api-reference) - 查看完整的 API 文档
- [插件系统](/docs/plugins) - 了解如何使用和开发插件
- [框架集成](/docs/framework-integration) - React 和 Vue 的集成指南
- [最佳实践](/docs/best-practices) - 推荐的使用模式和技巧

## 社区和支持

- [GitHub 仓库](https://github.com/JsonLee12138/hook-fetch)
- [问题反馈](https://github.com/JsonLee12138/hook-fetch/issues)
- [贡献指南](https://github.com/JsonLee12138/hook-fetch/blob/main/CONTRIBUTING.md)

让我们开始探索 Hook-Fetch 的强大功能吧！
