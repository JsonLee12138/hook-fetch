---
sidebar_position: 6
---

# Framework Integration

Hook-Fetch provides specialized integration support for mainstream frontend frameworks, allowing you to better use streaming data processing and request management features in React, Vue, and other frameworks.

## React Integration

### Installation and Import

```typescript
import { useHookFetch } from 'hook-fetch/react';
import hookFetch from 'hook-fetch';
```

### useHookFetch Hook

`useHookFetch` is a Hook designed specifically for React, providing state management, error handling, and lifecycle management.

```typescript
interface UseHookFetchOptions<Q> {
  request: Q;                    // Request function
  onError?: (error: Error) => void; // Error handling callback
}
```

### Basic Usage

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

### Streaming Chat Component

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

      // Add message to history when streaming is complete
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

## Vue Integration

### Installation and Import

```typescript
import { useHookFetch } from 'hook-fetch/vue';
import hookFetch from 'hook-fetch';
```

### useHookFetch Composable

`useHookFetch` is a composable function designed for Vue 3, providing reactive state management.

```typescript
interface UseHookFetchOptions<Q> {
  request: Q;                    // Request function
  onError?: (error: Error) => void; // Error handling callback
}
```

### Basic Usage

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

const { request, loading, cancel } = useHookFetch({
  request: (id: string) => api.get(`/users/${id}`),
  onError: (error) => console.error('Request failed:', error)
});

const loadUser = async () => {
  try {
    const data = await request('123').json();
    userData.value = data;
  } catch (error) {
    console.error('Failed to load user:', error);
  }
};
</script>
```

### Vue Streaming Chat Component

```vue
<template>
  <div class="chat-container">
    <div class="messages">
      <div v-for="(msg, index) in messages" :key="index" class="message">
        {{ msg }}
      </div>
      <div v-if="currentMessage" class="message streaming">
        AI: {{ currentMessage }}
        <span class="cursor">|</span>
      </div>
    </div>

    <div class="input-area">
      <input
        v-model="input"
        @keyup.enter="sendMessage"
        placeholder="Type your message..."
        :disabled="loading"
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

    // Add message to history when streaming is complete
    messages.value.push(`AI: ${currentMessage.value}`);
    currentMessage.value = '';
  } catch (error) {
    console.error('Streaming error:', error);
  }
};
</script>
```

## Best Practices

### 1. Error Handling

```typescript
// React
const { request, loading } = useHookFetch({
  request: (id: string) => api.get(`/users/${id}`),
  onError: (error) => {
    // Global error handling
    if (error.response?.status === 401) {
      // Handle unauthorized
      redirectToLogin();
    }
  }
});

// Vue
const { request, loading } = useHookFetch({
  request: (id: string) => api.get(`/users/${id}`),
  onError: (error) => {
    // Global error handling
    if (error.response?.status === 401) {
      // Handle unauthorized
      await router.push('/login');
    }
  }
});
```

### 2. Loading States

```typescript
// React
function DataComponent() {
  const { request, loading } = useHookFetch({
    request: () => api.get('/data')
  });

  return (
    <div>
      {loading && <div>Loading...</div>}
      {/* Component content */}
    </div>
  );
}

// Vue
<template>
  <div>
    <div v-if="loading">Loading...</div>
    <!-- Component content -->
  </div>
</template>

<script setup>
const { request, loading } = useHookFetch({
  request: () => api.get('/data')
});
</script>
```

### 3. Request Cancellation

```typescript
// React
useEffect(() => {
  return () => {
    // Cancel request when component unmounts
    cancel();
  };
}, [cancel]);

// Vue
onUnmounted(() => {
  // Cancel request when component unmounts
  cancel();
});
```

The framework integration makes it easy to use Hook-Fetch's powerful features in modern frontend applications while maintaining clean, reactive code patterns.
