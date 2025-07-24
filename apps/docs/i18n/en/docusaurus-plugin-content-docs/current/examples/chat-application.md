---
sidebar_position: 1
---

# Chat Application Example

This example demonstrates how to build a real-time streaming chat application using Hook-Fetch's SSE capabilities.

## Overview

We'll build a chat application that:
- Sends messages to an AI service (like OpenAI)
- Receives streaming responses in real-time
- Displays messages with typing indicators
- Handles errors gracefully
- Works in both React and Vue

## React Implementation

### Basic Setup

```typescript
// hooks/useChat.ts
import { useState, useCallback } from 'react';
import { useHookFetch } from 'hook-fetch/react';
import { sseTextDecoderPlugin } from 'hook-fetch/plugins/sse';
import hookFetch from 'hook-fetch';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const chatApi = hookFetch.create({
  baseURL: 'https://api.openai.com/v1',
  headers: {
    'Authorization': `Bearer ${process.env.REACT_APP_OPENAI_API_KEY}`,
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

export const useChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const { stream, loading, cancel } = useHookFetch({
    request: (message: string) => chatApi.post('/chat/completions', {
      model: 'gpt-3.5-turbo',
      messages: [
        ...messages.map(msg => ({ role: msg.role, content: msg.content })),
        { role: 'user', content: message }
      ],
      stream: true,
      max_tokens: 1000
    }),
    onError: (error) => {
      console.error('Chat error:', error);
      setIsTyping(false);
    }
  });

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || loading) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setCurrentMessage('');
    setIsTyping(true);

    try {
      let assistantContent = '';

      for await (const chunk of stream(content)) {
        const delta = chunk.result?.choices?.[0]?.delta?.content;
        if (delta) {
          assistantContent += delta;
          setCurrentMessage(assistantContent);
        }
      }

      // Add complete assistant message
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: assistantContent,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
      setCurrentMessage('');
    } catch (error) {
      console.error('Streaming error:', error);
    } finally {
      setIsTyping(false);
    }
  }, [messages, loading, stream]);

  return {
    messages,
    currentMessage,
    isTyping,
    loading,
    sendMessage,
    cancel
  };
};
```

### Chat Component

```tsx
// components/ChatApp.tsx
import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '../hooks/useChat';
import './ChatApp.css';

const ChatApp: React.FC = () => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { messages, currentMessage, isTyping, loading, sendMessage, cancel } = useChat();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, currentMessage]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      sendMessage(input);
      setInput('');
    }
  };

  return (
    <div className="chat-app">
      <div className="chat-header">
        <h1>AI Chat Assistant</h1>
        {loading && (
          <button onClick={cancel} className="cancel-btn">
            Cancel
          </button>
        )}
      </div>

      <div className="chat-messages">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`message ${message.role === 'user' ? 'user' : 'assistant'}`}
          >
            <div className="message-content">
              <div className="message-text">{message.content}</div>
              <div className="message-time">
                {message.timestamp.toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}

        {(isTyping || currentMessage) && (
          <div className="message assistant">
            <div className="message-content">
              <div className="message-text">
                {currentMessage}
                {isTyping && <span className="typing-cursor">|</span>}
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="chat-input">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
          disabled={loading}
          className="input-field"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="send-btn"
        >
          {loading ? 'Sending...' : 'Send'}
        </button>
      </form>
    </div>
  );
};

export default ChatApp;
```

### Styles

```css
/* components/ChatApp.css */
.chat-app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  max-width: 800px;
  margin: 0 auto;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background-color: #f5f5f5;
  border-bottom: 1px solid #e0e0e0;
}

.chat-header h1 {
  margin: 0;
  font-size: 1.5rem;
  color: #333;
}

.cancel-btn {
  padding: 0.5rem 1rem;
  background-color: #ff4444;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  background-color: #fafafa;
}

.message {
  margin-bottom: 1rem;
  display: flex;
}

.message.user {
  justify-content: flex-end;
}

.message.assistant {
  justify-content: flex-start;
}

.message-content {
  max-width: 70%;
  padding: 0.75rem 1rem;
  border-radius: 18px;
  position: relative;
}

.message.user .message-content {
  background-color: #007bff;
  color: white;
}

.message.assistant .message-content {
  background-color: white;
  border: 1px solid #e0e0e0;
  color: #333;
}

.message-text {
  line-height: 1.4;
  word-wrap: break-word;
}

.message-time {
  font-size: 0.75rem;
  opacity: 0.7;
  margin-top: 0.25rem;
}

.typing-cursor {
  animation: blink 1s infinite;
  font-weight: bold;
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

.chat-input {
  display: flex;
  padding: 1rem;
  background-color: white;
  border-top: 1px solid #e0e0e0;
}

.input-field {
  flex: 1;
  padding: 0.75rem;
  border: 1px solid #ccc;
  border-radius: 20px;
  margin-right: 0.5rem;
  outline: none;
}

.input-field:focus {
  border-color: #007bff;
}

.send-btn {
  padding: 0.75rem 1.5rem;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 20px;
  cursor: pointer;
  font-weight: bold;
}

.send-btn:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.send-btn:hover:not(:disabled) {
  background-color: #0056b3;
}
```

## Vue Implementation

### Composable

```typescript
// composables/useChat.ts
import { ref, computed } from 'vue';
import { useHookFetch } from 'hook-fetch/vue';
import { sseTextDecoderPlugin } from 'hook-fetch/plugins/sse';
import hookFetch from 'hook-fetch';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const chatApi = hookFetch.create({
  baseURL: 'https://api.openai.com/v1',
  headers: {
    'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`,
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

export const useChat = () => {
  const messages = ref<Message[]>([]);
  const currentMessage = ref('');
  const isTyping = ref(false);

  const { stream, loading, cancel } = useHookFetch({
    request: (message: string) => chatApi.post('/chat/completions', {
      model: 'gpt-3.5-turbo',
      messages: [
        ...messages.value.map(msg => ({ role: msg.role, content: msg.content })),
        { role: 'user', content: message }
      ],
      stream: true,
      max_tokens: 1000
    }),
    onError: (error) => {
      console.error('Chat error:', error);
      isTyping.value = false;
    }
  });

  const sendMessage = async (content: string) => {
    if (!content.trim() || loading.value) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date()
    };

    messages.value.push(userMessage);
    currentMessage.value = '';
    isTyping.value = true;

    try {
      let assistantContent = '';

      for await (const chunk of stream(content)) {
        const delta = chunk.result?.choices?.[0]?.delta?.content;
        if (delta) {
          assistantContent += delta;
          currentMessage.value = assistantContent;
        }
      }

      // Add complete assistant message
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: assistantContent,
        timestamp: new Date()
      };

      messages.value.push(assistantMessage);
      currentMessage.value = '';
    } catch (error) {
      console.error('Streaming error:', error);
    } finally {
      isTyping.value = false;
    }
  };

  return {
    messages: computed(() => messages.value),
    currentMessage: computed(() => currentMessage.value),
    isTyping: computed(() => isTyping.value),
    loading,
    sendMessage,
    cancel
  };
};
```

### Vue Component

```vue
<!-- components/ChatApp.vue -->
<template>
  <div class="chat-app">
    <div class="chat-header">
      <h1>AI Chat Assistant</h1>
      <button v-if="loading" @click="cancel" class="cancel-btn">
        Cancel
      </button>
    </div>

    <div ref="messagesContainer" class="chat-messages">
      <div
        v-for="message in messages"
        :key="message.id"
        :class="['message', message.role]"
      >
        <div class="message-content">
          <div class="message-text">{{ message.content }}</div>
          <div class="message-time">
            {{ message.timestamp.toLocaleTimeString() }}
          </div>
        </div>
      </div>

      <div v-if="isTyping || currentMessage" class="message assistant">
        <div class="message-content">
          <div class="message-text">
            {{ currentMessage }}
            <span v-if="isTyping" class="typing-cursor">|</span>
          </div>
        </div>
      </div>
    </div>

    <form @submit.prevent="handleSubmit" class="chat-input">
      <input
        v-model="input"
        type="text"
        placeholder="Type your message..."
        :disabled="loading"
        class="input-field"
      />
      <button
        type="submit"
        :disabled="loading || !input.trim()"
        class="send-btn"
      >
        {{ loading ? 'Sending...' : 'Send' }}
      </button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, watch } from 'vue';
import { useChat } from '../composables/useChat';

const input = ref('');
const messagesContainer = ref<HTMLElement>();

const { messages, currentMessage, isTyping, loading, sendMessage, cancel } = useChat();

const scrollToBottom = async () => {
  await nextTick();
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
  }
};

watch([messages, currentMessage], scrollToBottom);

const handleSubmit = () => {
  if (input.value.trim()) {
    sendMessage(input.value);
    input.value = '';
  }
};
</script>

<style scoped>
/* Same CSS as React version */
</style>
```

## Advanced Features

### Message Persistence

```typescript
// utils/messageStorage.ts
export const saveMessages = (messages: Message[]) => {
  localStorage.setItem('chat-messages', JSON.stringify(messages));
};

export const loadMessages = (): Message[] => {
  const stored = localStorage.getItem('chat-messages');
  if (stored) {
    return JSON.parse(stored).map((msg: any) => ({
      ...msg,
      timestamp: new Date(msg.timestamp)
    }));
  }
  return [];
};

export const clearMessages = () => {
  localStorage.removeItem('chat-messages');
};
```

### Custom Plugins

```typescript
// plugins/chatLogger.ts
export const chatLoggerPlugin = () => ({
  name: 'chat-logger',
  async beforeRequest(config) {
    console.log('Sending chat request:', config.data);
    return config;
  },
  async transformStreamChunk(chunk, config) {
    if (chunk.result?.choices?.[0]?.delta?.content) {
      console.log('Received chunk:', chunk.result.choices[0].delta.content);
    }
    return chunk;
  }
});
```

### Error Recovery

```typescript
// utils/errorRecovery.ts
export const retryWithBackoff = async (
  fn: () => Promise<any>,
  maxRetries = 3,
  baseDelay = 1000
) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;

      const delay = baseDelay * Math.pow(2, i);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};
```

This chat application example demonstrates the power of Hook-Fetch's streaming capabilities for building real-time, interactive applications.
