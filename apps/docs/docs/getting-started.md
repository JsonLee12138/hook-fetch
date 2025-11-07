---
sidebar_position: 2
---

# 快速开始

本指南将帮助您快速上手 Hook-Fetch，学习基本的使用方法和常见场景。

## 安装

首先，安装 Hook-Fetch：

```bash
# 使用 npm
npm install hook-fetch

# 使用 yarn
yarn add hook-fetch

# 使用 pnpm
pnpm add hook-fetch
```

## 基础使用

### 发起简单请求

```typescript
import hookFetch from 'hook-fetch';

// GET 请求
const response = await hookFetch('https://jsonplaceholder.typicode.com/posts/1').json();
console.log(response);

// POST 请求
const newPost = await hookFetch('https://jsonplaceholder.typicode.com/posts', {
  method: 'POST',
  data: {
    title: 'My New Post',
    body: 'This is the content of my post',
    userId: 1
  }
}).json();
```

### 创建实例

为了更好地管理配置，推荐创建一个实例：

```typescript
const api = hookFetch.create({
  baseURL: 'https://jsonplaceholder.typicode.com',
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 5000 // 5秒超时
});

// 使用实例
const posts = await api.get('/posts').json();
const users = await api.get('/users').json();
```

## HTTP 方法

Hook-Fetch 支持所有标准的 HTTP 方法：

### GET 请求

```typescript
// 无参数
const posts = await api.get('/posts').json();

// 带查询参数
const filteredPosts = await api.get('/posts', {
  userId: 1,
  _limit: 10
}).json();
```

### POST 请求

```typescript
const newPost = await api.post('/posts', {
  title: 'New Post',
  body: 'Post content',
  userId: 1
}).json();
```

### PUT 请求

```typescript
const updatedPost = await api.put('/posts/1', {
  id: 1,
  title: 'Updated Post',
  body: 'Updated content',
  userId: 1
}).json();
```

### PATCH 请求

```typescript
const patchedPost = await api.patch('/posts/1', {
  title: 'Patched Title'
}).json();
```

### DELETE 请求

```typescript
const result = await api.delete('/posts/1').json();
```

### HEAD 和 OPTIONS 请求

```typescript
// HEAD 请求 - 只获取响应头
const headResponse = await api.head('/posts/1');
console.log(headResponse.headers);

// OPTIONS 请求 - 获取允许的方法
const optionsResponse = await api.options('/posts');
```

## 响应处理

Hook-Fetch 提供多种响应处理方式：

```typescript
const request = api.get('/posts/1');

// JSON 解析
const jsonData = await request.json();

// 文本解析
const textData = await request.text();

// Blob 处理（适用于文件下载）
const blobData = await request.blob();

// ArrayBuffer 处理
const arrayBufferData = await request.arrayBuffer();

// FormData 处理
const formData = await request.formData();

// 字节数据
const bytesData = await request.bytes();
```

## 错误处理

```typescript
try {
  const response = await api.get('/posts/999').json();
}
catch (error) {
  if (error.response) {
    // 服务器响应了错误状态码
    console.log('Error status:', error.response.status);
    console.log('Error data:', error.response.data);
  }
  else if (error.request) {
    // 请求已发送但没有收到响应
    console.log('No response received');
  }
  else {
    // 其他错误
    console.log('Error:', error.message);
  }
}
```

## 请求配置

### 超时设置

```typescript
// 全局超时
const api = hookFetch.create({
  timeout: 5000 // 5秒
});

// 单个请求超时
const response = await api.get('/posts', {}, {
  timeout: 10000 // 10秒，第三个参数是 options
}).json();
```

### 自定义请求头

```typescript
// 全局请求头
const api = hookFetch.create({
  headers: {
    'Authorization': 'Bearer your-token',
    'Content-Type': 'application/json'
  }
});

// 单个请求的自定义请求头
const response = await api.get('/posts', {}, {
  headers: {
    'X-Custom-Header': 'custom-value'
  }
}).json();
```

### 凭证设置

```typescript
// 发送 cookies
const api = hookFetch.create({
  withCredentials: true
});
```

## 请求中断

```typescript
const request = api.get('/long-running-request');

// 3秒后中断请求
setTimeout(() => {
  request.abort();
}, 3000);

try {
  const response = await request.json();
}
catch (error) {
  if (error.name === 'AbortError') {
    console.log('Request was aborted');
  }
}
```

## 请求重试

```typescript
const request = api.get('/unstable-endpoint');

// 如果请求失败，可以重试
try {
  const response = await request.json();
}
catch (error) {
  // 重试请求
  const retryRequest = request.retry();
  const response = await retryRequest.json();
}
```

## 文件上传

```typescript
// 使用 FormData
const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('name', 'My File');

const response = await api.post('/upload', formData).json();

// 或者使用 upload 方法
const uploadResponse = await api.upload('/upload', {
  file: fileInput.files[0],
  name: 'My File'
}).json();
```

## 下载文件

```typescript
// 下载文件
const response = await api.get('/download/file.pdf');
const blob = await response.blob();

// 创建下载链接
const url = window.URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'file.pdf';
a.click();
window.URL.revokeObjectURL(url);
```

## 下一步

- [API 参考](/docs/api-reference) - 详细的 API 文档
- [插件系统](/docs/plugins) - 学习如何使用和开发插件
- [流式处理](/docs/streaming) - 处理 SSE 和流式数据
- [框架集成](/docs/framework-integration) - React 和 Vue 的集成
