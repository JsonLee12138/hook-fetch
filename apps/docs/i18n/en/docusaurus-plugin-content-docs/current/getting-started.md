---
sidebar_position: 2
---

# Getting Started

This guide will help you get started with Hook-Fetch quickly, learning basic usage and common scenarios.

## Installation

First, install Hook-Fetch:

```bash
# Using npm
npm install hook-fetch

# Using yarn
yarn add hook-fetch

# Using pnpm
pnpm add hook-fetch
```

## Basic Usage

### Making Simple Requests

```typescript
import hookFetch from 'hook-fetch';

// GET request
const response = await hookFetch('https://jsonplaceholder.typicode.com/posts/1').json();
console.log(response);

// POST request
const newPost = await hookFetch('https://jsonplaceholder.typicode.com/posts', {
  method: 'POST',
  data: {
    title: 'My New Post',
    body: 'This is the content of my post',
    userId: 1
  }
}).json();
```

### Creating an Instance

For better configuration management, it's recommended to create an instance:

```typescript
const api = hookFetch.create({
  baseURL: 'https://jsonplaceholder.typicode.com',
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 5000 // 5 seconds timeout
});

// Use the instance
const posts = await api.get('/posts').json();
const users = await api.get('/users').json();
```

## HTTP Methods

Hook-Fetch supports all standard HTTP methods:

### GET Requests

```typescript
// Without parameters
const posts = await api.get('/posts').json();

// With query parameters
const filteredPosts = await api.get('/posts', {
  userId: 1,
  _limit: 10
}).json();
```

### POST Requests

```typescript
const newPost = await api.post('/posts', {
  title: 'New Post',
  body: 'Post content',
  userId: 1
}).json();
```

### PUT Requests

```typescript
const updatedPost = await api.put('/posts/1', {
  id: 1,
  title: 'Updated Post',
  body: 'Updated content',
  userId: 1
}).json();
```

### PATCH Requests

```typescript
const patchedPost = await api.patch('/posts/1', {
  title: 'Patched Title'
}).json();
```

### DELETE Requests

```typescript
const result = await api.delete('/posts/1').json();
```

### HEAD and OPTIONS Requests

```typescript
// HEAD request - get only response headers
const headResponse = await api.head('/posts/1');
console.log(headResponse.headers);

// OPTIONS request - get allowed methods
const optionsResponse = await api.options('/posts');
```

## Response Handling

Hook-Fetch provides multiple response handling methods:

```typescript
const request = api.get('/posts/1');

// JSON parsing
const jsonData = await request.json();

// Text parsing
const textData = await request.text();

// Blob handling (for file downloads)
const blobData = await request.blob();

// ArrayBuffer handling
const arrayBufferData = await request.arrayBuffer();

// FormData handling
const formData = await request.formData();

// Byte data
const bytesData = await request.bytes();
```

## Error Handling

```typescript
try {
  const response = await api.get('/posts/999').json();
} catch (error) {
  if (error.response) {
    // Server responded with error status code
    console.log('Error status:', error.response.status);
    console.log('Error data:', error.response.data);
  } else if (error.request) {
    // Request was sent but no response received
    console.log('No response received');
  } else {
    // Other errors
    console.log('Error:', error.message);
  }
}
```

## Request Configuration

### Timeout Settings

```typescript
// Global timeout
const api = hookFetch.create({
  timeout: 5000 // 5 seconds
});

// Individual request timeout
const response = await api.get('/posts', {}, {
  timeout: 10000 // 10 seconds
}).json();
```

### Custom Headers

```typescript
// Global headers
const api = hookFetch.create({
  headers: {
    'Authorization': 'Bearer your-token',
    'Content-Type': 'application/json'
  }
});

// Individual request headers
const response = await api.get('/posts', {}, {
  headers: {
    'Custom-Header': 'custom-value'
  }
}).json();
```

## File Upload

```typescript
// Using the upload method
const fileInput = document.querySelector('input[type="file"]');
const file = fileInput.files[0];

const result = await api.upload('/upload', {
  file: file,
  description: 'My uploaded file'
}).json();
```

## Next Steps

- [API Reference](/docs/api-reference) - Complete API documentation
- [Plugin System](/docs/plugins) - Learn about plugins
- [Streaming](/docs/streaming) - Streaming data processing
- [Framework Integration](/docs/framework-integration) - React and Vue integration
