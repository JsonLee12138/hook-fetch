---
sidebar_position: 5
---

# 流式处理

Hook-Fetch 提供了强大的流式数据处理能力，特别适合处理 Server-Sent Events (SSE)、实时数据流和大文件传输等场景。

## 基础流式处理

### 使用 stream() 方法

```typescript
import hookFetch from 'hook-fetch';

const request = hookFetch('https://api.example.com/stream');

for await (const chunk of request.stream()) {
  console.log('Received chunk:', chunk.result);
  console.log('Raw bytes:', chunk.source);
  console.log('Error:', chunk.error);
}
```

### StreamContext 结构

每个流式数据块都包含以下信息：

```typescript
interface StreamContext<T = unknown> {
  result: T;                  // 处理后的数据
  source: Uint8Array;         // 原始字节数据
  error: unknown | null;      // 错误信息（如果有）
}
```

## Server-Sent Events (SSE)

### 基础 SSE 处理

```typescript
// 简单的 SSE 处理
const sseRequest = hookFetch('https://api.example.com/sse');

for await (const chunk of sseRequest.stream()) {
  const text = new TextDecoder().decode(chunk.source);
  console.log('SSE data:', text);
}
```

### 使用 SSE 插件

Hook-Fetch 提供了专门的 SSE 插件来简化处理：

```typescript
import { sseTextDecoderPlugin } from 'hook-fetch/plugins/sse';

const api = hookFetch.create({
  plugins: [
    sseTextDecoderPlugin({
      json: true,                 // 自动解析 JSON
      prefix: 'data: ',          // 移除 "data: " 前缀
      splitSeparator: '\n\n',    // 事件分隔符
      lineSeparator: '\n',       // 行分隔符
      trim: true,                // 去除首尾空白
      doneSymbol: '[DONE]'       // 结束标记
    })
  ]
});

// 使用配置好的 SSE 请求
for await (const chunk of api.get('/sse-endpoint').stream()) {
  console.log('Parsed SSE data:', chunk.result);
}
```

### SSE 插件配置选项

```typescript
interface SSETextDecoderPluginOptions {
  splitSeparator: string;      // 事件分隔符，默认 '\n\n'
  lineSeparator?: string;      // 行分隔符，可选
  trim: boolean;               // 是否去除空白，默认 true
  json: boolean;               // 是否解析 JSON，默认 false
  prefix: string;              // 要移除的前缀，默认 ''
  doneSymbol?: string;         // 结束标记，可选
}
```

## 实时聊天示例

### ChatGPT 风格的流式聊天

```typescript
import { sseTextDecoderPlugin } from 'hook-fetch/plugins/sse';

const chatApi = hookFetch.create({
  baseURL: 'https://api.openai.com/v1',
  headers: {
    'Authorization': 'Bearer your-api-key',
    'Content-Type': 'application/json'
  },
  plugins: [
    sseTextDecoderPlugin({
      json: true,
      prefix: 'data: ',
      doneSymbol: '[DONE]'
    })
  ]
});

async function streamChat(message: string) {
  const request = chatApi.post('/chat/completions', {
    model: 'gpt-3.5-turbo',
    messages: [{ role: 'user', content: message }],
    stream: true
  });

  let fullResponse = '';

  for await (const chunk of request.stream()) {
    const delta = chunk.result?.choices?.[0]?.delta?.content;
    if (delta) {
      fullResponse += delta;
      console.log('Streaming:', delta);
      // 更新 UI 显示
      updateChatUI(fullResponse);
    }
  }

  return fullResponse;
}
```

### 自定义聊天流处理

```typescript
const customChatPlugin = () => ({
  name: 'custom-chat',
  async transformStreamChunk(chunk, config) {
    if (!chunk.error && chunk.result) {
      try {
        const data = JSON.parse(chunk.result);
        // 提取聊天内容
        const content = data.choices?.[0]?.delta?.content || '';
        chunk.result = { content, timestamp: Date.now() };
      } catch (error) {
        chunk.error = error;
      }
    }
    return chunk;
  }
});

const api = hookFetch.create({
  plugins: [
    sseTextDecoderPlugin({ json: true, prefix: 'data: ' }),
    customChatPlugin()
  ]
});
```

## 大文件下载与进度跟踪

### 带进度的文件下载

```typescript
async function downloadWithProgress(url: string, filename: string) {
  const request = hookFetch(url);
  const response = await request;

  if (!response.ok) {
    throw new Error(`Download failed: ${response.status}`);
  }

  const contentLength = response.headers.get('content-length');
  const total = contentLength ? parseInt(contentLength, 10) : 0;
  let loaded = 0;

  const chunks: Uint8Array[] = [];

  for await (const chunk of request.stream()) {
    if (chunk.error) {
      throw chunk.error;
    }

    chunks.push(chunk.source);
    loaded += chunk.source.length;

    // 更新进度
    const progress = total > 0 ? (loaded / total) * 100 : 0;
    console.log(`Download progress: ${progress.toFixed(2)}%`);
    updateProgressBar(progress);
  }

  // 合并所有块
  const blob = new Blob(chunks);

  // 创建下载链接
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
```

### 流式上传

```typescript
async function uploadWithProgress(file: File, url: string) {
  const chunkSize = 1024 * 1024; // 1MB chunks
  const totalChunks = Math.ceil(file.size / chunkSize);

  for (let i = 0; i < totalChunks; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, file.size);
    const chunk = file.slice(start, end);

    const formData = new FormData();
    formData.append('chunk', chunk);
    formData.append('chunkIndex', i.toString());
    formData.append('totalChunks', totalChunks.toString());
    formData.append('filename', file.name);

    await hookFetch(url, {
      method: 'POST',
      data: formData
    }).json();

    const progress = ((i + 1) / totalChunks) * 100;
    console.log(`Upload progress: ${progress.toFixed(2)}%`);
  }
}
```

## 实时数据监控

### 服务器状态监控

```typescript
const monitoringApi = hookFetch.create({
  plugins: [
    sseTextDecoderPlugin({
      json: true,
      prefix: 'data: '
    })
  ]
});

async function monitorServerStatus() {
  const request = monitoringApi.get('/api/monitoring/status');

  for await (const chunk of request.stream()) {
    const status = chunk.result;

    if (status.type === 'cpu') {
      updateCPUChart(status.value);
    } else if (status.type === 'memory') {
      updateMemoryChart(status.value);
    } else if (status.type === 'disk') {
      updateDiskChart(status.value);
    }

    // 检查告警
    if (status.alert) {
      showAlert(status.message);
    }
  }
}
```

### 日志流处理

```typescript
const logStreamPlugin = () => ({
  name: 'log-stream',
  async transformStreamChunk(chunk, config) {
    if (!chunk.error && typeof chunk.result === 'string') {
      try {
        // 解析日志行
        const logEntry = JSON.parse(chunk.result);

        // 添加客户端时间戳
        logEntry.clientTimestamp = Date.now();

        // 格式化日志级别
        logEntry.level = logEntry.level?.toUpperCase();

        chunk.result = logEntry;
      } catch (error) {
        // 如果不是 JSON，保持原样
        chunk.result = {
          message: chunk.result,
          level: 'INFO',
          timestamp: Date.now()
        };
      }
    }
    return chunk;
  }
});

const logApi = hookFetch.create({
  plugins: [
    sseTextDecoderPlugin({ prefix: 'data: ' }),
    logStreamPlugin()
  ]
});

async function streamLogs() {
  for await (const chunk of logApi.get('/api/logs/stream').stream()) {
    const log = chunk.result;

    // 根据日志级别显示不同颜色
    const color = {
      'ERROR': 'red',
      'WARN': 'orange',
      'INFO': 'blue',
      'DEBUG': 'gray'
    }[log.level] || 'black';

    console.log(`%c[${log.level}] ${log.message}`, `color: ${color}`);

    // 添加到日志显示区域
    addLogToUI(log);
  }
}
```

## 错误处理与重连

### 自动重连机制

```typescript
const reconnectingStreamPlugin = (maxRetries = 3, delay = 1000) => ({
  name: 'reconnecting-stream',
  async onError(error, config) {
    const retryCount = config.extra?.retryCount || 0;

    if (retryCount < maxRetries) {
      console.log(`Stream connection failed, retrying... (${retryCount + 1}/${maxRetries})`);

      // 延迟重连
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, retryCount)));

      // 更新重试计数
      config.extra = { ...config.extra, retryCount: retryCount + 1 };

      // 重新创建流
      return hookFetch(config.url, config);
    }

    console.error('Stream connection failed after maximum retries');
    return error;
  }
});
```

### 流式错误处理

```typescript
async function robustStreamProcessing() {
  const api = hookFetch.create({
    plugins: [
      sseTextDecoderPlugin({ json: true }),
      reconnectingStreamPlugin(5, 1000)
    ]
  });

  try {
    for await (const chunk of api.get('/api/stream').stream()) {
      if (chunk.error) {
        console.error('Chunk error:', chunk.error);
        continue; // 跳过错误的块
      }

      try {
        await processChunk(chunk.result);
      } catch (processingError) {
        console.error('Processing error:', processingError);
        // 继续处理下一个块
      }
    }
  } catch (streamError) {
    console.error('Stream error:', streamError);
    // 可以在这里实现重连逻辑
  }
}
```

## 流式数据缓存

### 流式缓存插件

```typescript
const streamCachePlugin = (maxSize = 1000) => {
  const cache = new Map();

  return {
    name: 'stream-cache',
    async transformStreamChunk(chunk, config) {
      if (!chunk.error && chunk.result) {
        // 缓存数据块
        const key = `${config.url}_${Date.now()}`;
        cache.set(key, chunk.result);

        // 限制缓存大小
        if (cache.size > maxSize) {
          const firstKey = cache.keys().next().value;
          cache.delete(firstKey);
        }

        // 添加缓存信息
        chunk.result = {
          ...chunk.result,
          cached: true,
          cacheKey: key
        };
      }
      return chunk;
    }
  };
};
```

## 性能优化

### 流式数据压缩

```typescript
const compressionPlugin = () => ({
  name: 'compression',
  async beforeRequest(config) {
    config.headers = new Headers(config.headers);
    config.headers.set('Accept-Encoding', 'gzip, deflate, br');
    return config;
  },
  async beforeStream(body, config) {
    // 如果响应被压缩，自动解压
    const contentEncoding = config.headers?.get?.('content-encoding');
    if (contentEncoding === 'gzip') {
      return body.pipeThrough(new DecompressionStream('gzip'));
    }
    return body;
  }
});
```

### 流式数据批处理

```typescript
const batchProcessingPlugin = (batchSize = 10) => {
  let batch: any[] = [];

  return {
    name: 'batch-processing',
    async transformStreamChunk(chunk, config) {
      if (!chunk.error) {
        batch.push(chunk.result);

        if (batch.length >= batchSize) {
          // 批量处理
          const processedBatch = await processBatch(batch);
          batch = [];

          chunk.result = processedBatch;
        } else {
          // 暂不输出，等待批次完成
          chunk.result = null;
        }
      }
      return chunk;
    }
  };
};
```

流式处理是 Hook-Fetch 的核心特性之一，通过灵活的插件系统和强大的流式 API，您可以轻松处理各种实时数据场景。
