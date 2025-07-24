---
sidebar_position: 6
---

# 框架集成

Hook-Fetch 为主流前端框架提供了专门的集成支持，让您能够更好地在 React、Vue 等框架中使用流式数据处理和请求管理功能。

## React 集成

### 安装和导入

```typescript
import { useHookFetch } from 'hook-fetch/react';
import hookFetch from 'hook-fetch';
```

### useHookFetch Hook

`useHookFetch` 是专为 React 设计的 Hook，提供了状态管理、错误处理和生命周期管理。

```typescript
interface UseHookFetchOptions<Q> {
  request: Q;                    // 请求函数
  onError?: (error: Error) => void; // 错误处理回调
}
```

### 基础用法

```typescript
import React from 'react';
import { useHookFetch } from 'hook-fetch/react';
import hookFetch from 'hook-fetch';

const api = hookFetch.create({
  baseURL: 'https://api.example.com'
});

function UserProfile({ userId }: { userId: string }) {
  const {
    request,
    loading,
    cancel,
    text,
    stream
  } = useHookFetch({
    request: (id: string) => api.get(`/users/${id}`),
    onError: (error) => console.error('Request failed:', error)
  });

  const [userData, setUserData] = React.useState(null);

  const loadUser = async () => {
    try {
      const data = await request(userId).json();
      setUserData(data);
    } catch (error) {
      console.error('Failed to load user:', error);
    }
  };

  return (
    <div>
      <button onClick={loadUser} disabled={loading}>
        {loading ? 'Loading...' : 'Load User'}
      </button>
      <button onClick={cancel}>Cancel</button>
      {userData && <div>{JSON.stringify(userData)}</div>}
    </div>
  );
}
```

### 流式聊天组件

```typescript
import React, { useState, useEffect } from 'react';
import { useHookFetch } from 'hook-fetch/react';
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

function StreamingChat() {
  const [messages, setMessages] = useState<string[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [input, setInput] = useState('');

  const { stream, loading, cancel } = useHookFetch({
    request: (message: string) => chatApi.post('/chat/completions', {
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: message }],
      stream: true
    }),
    onError: (error) => {
      console.error('Chat error:', error);
      setCurrentMessage('Error: Failed to get response');
    }
  });

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input;
    setInput('');
    setMessages(prev => [...prev, `User: ${userMessage}`]);
    setCurrentMessage('');

    try {
      for await (const chunk of stream(userMessage)) {
        const delta = chunk.result?.choices?.[0]?.delta?.content;
        if (delta) {
          setCurrentMessage(prev => prev + delta);
        }
      }

      // 流式完成后，将消息添加到历史
      setMessages(prev => [...prev, `AI: ${currentMessage}`]);
      setCurrentMessage('');
    } catch (error) {
      console.error('Streaming error:', error);
    }
  };

  return (
    <div className="chat-container">
      <div className="messages">
        {messages.map((msg, index) => (
          <div key={index} className="message">{msg}</div>
        ))}
        {currentMessage && (
          <div className="message streaming">
            AI: {currentMessage}
            <span className="cursor">|</span>
          </div>
        )}
      </div>

      <div className="input-area">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Type your message..."
          disabled={loading}
        />
        <button onClick={sendMessage} disabled={loading || !input.trim()}>
          {loading ? 'Sending...' : 'Send'}
        </button>
        {loading && <button onClick={cancel}>Cancel</button>}
      </div>
    </div>
  );
}
```

### 实时数据监控组件

```typescript
import React, { useState, useEffect } from 'react';
import { useHookFetch } from 'hook-fetch/react';
import { sseTextDecoderPlugin } from 'hook-fetch/plugins/sse';

const monitoringApi = hookFetch.create({
  baseURL: 'https://api.example.com',
  plugins: [
    sseTextDecoderPlugin({
      json: true,
      prefix: 'data: '
    })
  ]
});

function SystemMonitor() {
  const [metrics, setMetrics] = useState({
    cpu: 0,
    memory: 0,
    disk: 0
  });
  const [isMonitoring, setIsMonitoring] = useState(false);

  const { stream, loading, cancel } = useHookFetch({
    request: () => monitoringApi.get('/monitoring/metrics'),
    onError: (error) => {
      console.error('Monitoring error:', error);
      setIsMonitoring(false);
    }
  });

  const startMonitoring = async () => {
    setIsMonitoring(true);

    try {
      for await (const chunk of stream()) {
        const metric = chunk.result;

        setMetrics(prev => ({
          ...prev,
          [metric.type]: metric.value
        }));
      }
    } catch (error) {
      console.error('Stream error:', error);
    } finally {
      setIsMonitoring(false);
    }
  };

  const stopMonitoring = () => {
    cancel();
    setIsMonitoring(false);
  };

  return (
    <div className="monitor-dashboard">
      <div className="controls">
        <button
          onClick={isMonitoring ? stopMonitoring : startMonitoring}
          disabled={loading}
        >
          {isMonitoring ? 'Stop Monitoring' : 'Start Monitoring'}
        </button>
      </div>

      <div className="metrics">
        <div className="metric">
          <h3>CPU Usage</h3>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${metrics.cpu}%` }}
            />
          </div>
          <span>{metrics.cpu}%</span>
        </div>

        <div className="metric">
          <h3>Memory Usage</h3>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${metrics.memory}%` }}
            />
          </div>
          <span>{metrics.memory}%</span>
        </div>

        <div className="metric">
          <h3>Disk Usage</h3>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${metrics.disk}%` }}
            />
          </div>
          <span>{metrics.disk}%</span>
        </div>
      </div>
    </div>
  );
}
```

### 文件上传组件

```typescript
import React, { useState } from 'react';
import { useHookFetch } from 'hook-fetch/react';

function FileUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);

  const { request, loading, cancel } = useHookFetch({
    request: (file: File) => hookFetch('/api/upload', {
      method: 'POST',
      data: { file }
    }),
    onError: (error) => {
      console.error('Upload error:', error);
      setProgress(0);
    }
  });

  const uploadFile = async () => {
    if (!file) return;

    try {
      // 模拟进度更新
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 100);

      const result = await request(file).json();

      clearInterval(progressInterval);
      setProgress(100);

      console.log('Upload successful:', result);
    } catch (error) {
      console.error('Upload failed:', error);
      setProgress(0);
    }
  };

  return (
    <div className="upload-container">
      <input
        type="file"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
        disabled={loading}
      />

      <button
        onClick={uploadFile}
        disabled={!file || loading}
      >
        {loading ? 'Uploading...' : 'Upload'}
      </button>

      {loading && (
        <div>
          <button onClick={cancel}>Cancel</button>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span>{progress}%</span>
        </div>
      )}
    </div>
  );
}
```

## Vue 集成

### 安装和导入

```typescript
import { useHookFetch } from 'hook-fetch/vue';
import hookFetch from 'hook-fetch';
```

### useHookFetch 组合式函数

Vue 版本的 `useHookFetch` 提供了响应式的状态管理。

```typescript
interface UseHookFetchOptions<Q> {
  request: Q;                    // 请求函数
  onError?: (error: Error) => void; // 错误处理回调
}
```

### 基础用法

```vue
<template>
  <div>
    <button @click="loadUser" :disabled="loading">
      {{ loading ? 'Loading...' : 'Load User' }}
    </button>
    <button @click="cancel">Cancel</button>
    <div v-if="userData">{{ userData }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useHookFetch } from 'hook-fetch/vue';
import hookFetch from 'hook-fetch';

const api = hookFetch.create({
  baseURL: 'https://api.example.com'
});

const userData = ref(null);
const userId = ref('1');

const {
  request,
  loading,
  cancel
} = useHookFetch({
  request: (id: string) => api.get(`/users/${id}`),
  onError: (error) => console.error('Request failed:', error)
});

const loadUser = async () => {
  try {
    const data = await request(userId.value).json();
    userData.value = data;
  } catch (error) {
    console.error('Failed to load user:', error);
  }
};
</script>
```

### 流式聊天组件

```vue
<template>
  <div class="chat-container">
    <div class="messages">
      <div v-for="(message, index) in messages" :key="index" class="message">
        {{ message }}
      </div>
      <div v-if="currentMessage" class="message streaming">
        AI: {{ currentMessage }}
        <span class="cursor">|</span>
      </div>
    </div>

    <div class="input-area">
      <input
        v-model="input"
        @keypress.enter="sendMessage"
        :disabled="loading"
        placeholder="Type your message..."
      />
      <button @click="sendMessage" :disabled="loading || !input.trim()">
        {{ loading ? 'Sending...' : 'Send' }}
      </button>
      <button v-if="loading" @click="cancel">Cancel</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useHookFetch } from 'hook-fetch/vue';
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

const messages = ref<string[]>([]);
const currentMessage = ref('');
const input = ref('');

const { stream, loading, cancel } = useHookFetch({
  request: (message: string) => chatApi.post('/chat/completions', {
    model: 'gpt-3.5-turbo',
    messages: [{ role: 'user', content: message }],
    stream: true
  }),
  onError: (error) => {
    console.error('Chat error:', error);
    currentMessage.value = 'Error: Failed to get response';
  }
});

const sendMessage = async () => {
  if (!input.value.trim() || loading.value) return;

  const userMessage = input.value;
  input.value = '';
  messages.value.push(`User: ${userMessage}`);
  currentMessage.value = '';

  try {
    for await (const chunk of stream(userMessage)) {
      const delta = chunk.result?.choices?.[0]?.delta?.content;
      if (delta) {
        currentMessage.value += delta;
      }
    }

    messages.value.push(`AI: ${currentMessage.value}`);
    currentMessage.value = '';
  } catch (error) {
    console.error('Streaming error:', error);
  }
};
</script>
```

### 实时数据监控组件

```vue
<template>
  <div class="monitor-dashboard">
    <div class="controls">
      <button @click="toggleMonitoring" :disabled="loading">
        {{ isMonitoring ? 'Stop Monitoring' : 'Start Monitoring' }}
      </button>
    </div>

    <div class="metrics">
      <div class="metric">
        <h3>CPU Usage</h3>
        <div class="progress-bar">
          <div
            class="progress-fill"
            :style="{ width: `${metrics.cpu}%` }"
          />
        </div>
        <span>{{ metrics.cpu }}%</span>
      </div>

      <div class="metric">
        <h3>Memory Usage</h3>
        <div class="progress-bar">
          <div
            class="progress-fill"
            :style="{ width: `${metrics.memory}%` }"
          />
        </div>
        <span>{{ metrics.memory }}%</span>
      </div>

      <div class="metric">
        <h3>Disk Usage</h3>
        <div class="progress-bar">
          <div
            class="progress-fill"
            :style="{ width: `${metrics.disk}%` }"
          />
        </div>
        <span>{{ metrics.disk }}%</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { useHookFetch } from 'hook-fetch/vue';
import { sseTextDecoderPlugin } from 'hook-fetch/plugins/sse';

const monitoringApi = hookFetch.create({
  baseURL: 'https://api.example.com',
  plugins: [
    sseTextDecoderPlugin({
      json: true,
      prefix: 'data: '
    })
  ]
});

const metrics = reactive({
  cpu: 0,
  memory: 0,
  disk: 0
});

const isMonitoring = ref(false);

const { stream, loading, cancel } = useHookFetch({
  request: () => monitoringApi.get('/monitoring/metrics'),
  onError: (error) => {
    console.error('Monitoring error:', error);
    isMonitoring.value = false;
  }
});

const startMonitoring = async () => {
  isMonitoring.value = true;

  try {
    for await (const chunk of stream()) {
      const metric = chunk.result;
      metrics[metric.type] = metric.value;
    }
  } catch (error) {
    console.error('Stream error:', error);
  } finally {
    isMonitoring.value = false;
  }
};

const stopMonitoring = () => {
  cancel();
  isMonitoring.value = false;
};

const toggleMonitoring = () => {
  if (isMonitoring.value) {
    stopMonitoring();
  } else {
    startMonitoring();
  }
};
</script>
```

## 通用集成模式

### 自定义 Hook 封装

```typescript
// React 版本
import { useHookFetch } from 'hook-fetch/react';

export function useApi() {
  const api = hookFetch.create({
    baseURL: process.env.REACT_APP_API_URL,
    headers: {
      'Content-Type': 'application/json'
    }
  });

  const { request, loading, cancel } = useHookFetch({
    request: api.request,
    onError: (error) => {
      // 全局错误处理
      console.error('API Error:', error);
    }
  });

  return {
    get: (url: string, params?: any) => request(url, { method: 'GET', params }),
    post: (url: string, data?: any) => request(url, { method: 'POST', data }),
    put: (url: string, data?: any) => request(url, { method: 'PUT', data }),
    delete: (url: string) => request(url, { method: 'DELETE' }),
    loading,
    cancel
  };
}
```

### 状态管理集成

```typescript
// 与 Redux 集成
import { useDispatch } from 'react-redux';
import { useHookFetch } from 'hook-fetch/react';

export function useApiWithRedux() {
  const dispatch = useDispatch();

  const { request, loading } = useHookFetch({
    request: api.request,
    onError: (error) => {
      dispatch({ type: 'API_ERROR', payload: error.message });
    }
  });

  const fetchUser = async (id: string) => {
    dispatch({ type: 'FETCH_USER_START' });
    try {
      const user = await request(`/users/${id}`).json();
      dispatch({ type: 'FETCH_USER_SUCCESS', payload: user });
    } catch (error) {
      dispatch({ type: 'FETCH_USER_ERROR', payload: error.message });
    }
  };

  return { fetchUser, loading };
}
```

### 错误边界集成

```typescript
// React 错误边界
import React from 'react';

class ApiErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('API Error Boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-fallback">
          <h2>Something went wrong with the API request.</h2>
          <details>
            {this.state.error && this.state.error.toString()}
          </details>
        </div>
      );
    }

    return this.props.children;
  }
}
```

通过这些框架集成，Hook-Fetch 可以无缝地融入您的现有项目，提供强大的流式数据处理能力和优雅的状态管理。
