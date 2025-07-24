---
sidebar_position: 5
---

# Streaming

Hook-Fetch provides powerful streaming data processing capabilities, particularly suitable for handling Server-Sent Events (SSE), real-time data streams, and large file transfers.

## Basic Streaming

### Using the stream() Method

```typescript
import hookFetch from 'hook-fetch';

const request = hookFetch('https://api.example.com/stream');

for await (const chunk of request.stream()) {
  console.log('Received chunk:', chunk.result);
  console.log('Raw bytes:', chunk.source);
  console.log('Error:', chunk.error);
}
```

### StreamContext Structure

Each streaming data chunk contains the following information:

```typescript
interface StreamContext<T = unknown> {
  result: T;                  // Processed data
  source: Uint8Array;         // Raw byte data
  error: unknown | null;      // Error information (if any)
}
```

## Server-Sent Events (SSE)

### Basic SSE Processing

```typescript
// Simple SSE processing
const sseRequest = hookFetch('https://api.example.com/sse');

for await (const chunk of sseRequest.stream()) {
  const text = new TextDecoder().decode(chunk.source);
  console.log('SSE data:', text);
}
```

### Using SSE Plugin

Hook-Fetch provides a dedicated SSE plugin to simplify processing:

```typescript
import { sseTextDecoderPlugin } from 'hook-fetch/plugins/sse';

const api = hookFetch.create({
  plugins: [
    sseTextDecoderPlugin({
      json: true,                 // Auto-parse JSON
      prefix: 'data: ',          // Remove "data: " prefix
      splitSeparator: '\n\n',    // Event separator
      lineSeparator: '\n',       // Line separator
      trim: true,                // Trim whitespace
      doneSymbol: '[DONE]'       // End marker
    })
  ]
});

// Use configured SSE request
for await (const chunk of api.get('/sse-endpoint').stream()) {
  console.log('Parsed SSE data:', chunk.result);
}
```

## Real-time Chat Example

### ChatGPT-style Streaming Chat

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
      // Update UI display
      updateChatUI(fullResponse);
    }
  }

  return fullResponse;
}
```

## Large File Download with Progress

### Download with Progress Tracking

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

    // Update progress
    const progress = total > 0 ? (loaded / total) * 100 : 0;
    console.log(`Download progress: ${progress.toFixed(2)}%`);
    updateProgressBar(progress);
  }

  // Merge all chunks
  const blob = new Blob(chunks);

  // Create download link
  const downloadUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = filename;
  a.click();

  // Cleanup
  URL.revokeObjectURL(downloadUrl);
}
```

## Advanced Streaming Patterns

### Custom Stream Processing

```typescript
const customStreamPlugin = () => ({
  name: 'custom-stream',
  async transformStreamChunk(chunk, config) {
    if (!chunk.error && chunk.result) {
      // Custom processing logic
      const processedData = processChunk(chunk.result);
      chunk.result = processedData;
    }
    return chunk;
  }
});

const api = hookFetch.create({
  plugins: [customStreamPlugin()]
});
```

### Stream Error Handling

```typescript
async function robustStreaming(url: string) {
  const request = hookFetch(url);

  try {
    for await (const chunk of request.stream()) {
      if (chunk.error) {
        console.error('Stream error:', chunk.error);
        // Handle stream-specific errors
        continue;
      }

      // Process successful chunk
      processChunk(chunk.result);
    }
  } catch (error) {
    console.error('Streaming failed:', error);
    // Handle overall streaming failure
  }
}
```

## Best Practices

### 1. Memory Management

```typescript
// Use generators for large streams
async function* processLargeStream(url: string) {
  const request = hookFetch(url);

  for await (const chunk of request.stream()) {
    if (!chunk.error) {
      yield processChunk(chunk.result);
    }
  }
}

// Use the generator
for await (const processedChunk of processLargeStream('/large-stream')) {
  console.log(processedChunk);
}
```

### 2. Stream Cancellation

```typescript
const controller = new AbortController();

const request = hookFetch('/stream', {
  signal: controller.signal
});

// Cancel after 30 seconds
setTimeout(() => {
  controller.abort();
}, 30000);

try {
  for await (const chunk of request.stream()) {
    console.log(chunk.result);
  }
} catch (error) {
  if (error.name === 'AbortError') {
    console.log('Stream cancelled');
  }
}
```

### 3. Backpressure Handling

```typescript
async function handleBackpressure(url: string) {
  const request = hookFetch(url);
  const buffer: any[] = [];
  const maxBufferSize = 100;

  for await (const chunk of request.stream()) {
    if (!chunk.error) {
      buffer.push(chunk.result);

      // Process buffer when it's full
      if (buffer.length >= maxBufferSize) {
        await processBatch(buffer.splice(0, maxBufferSize));
      }
    }
  }

  // Process remaining items
  if (buffer.length > 0) {
    await processBatch(buffer);
  }
}
```

Streaming is one of Hook-Fetch's most powerful features, enabling real-time data processing and efficient handling of large datasets. The plugin system makes it easy to customize streaming behavior for specific use cases.
