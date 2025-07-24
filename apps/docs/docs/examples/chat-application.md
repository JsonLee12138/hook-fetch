---
sidebar_position: 1
---

# 聊天应用示例

本示例展示如何使用 Hook-Fetch 构建一个完整的流式聊天应用，支持实时消息传输和 AI 对话。

## 完整示例

### 1. API 配置

```typescript
// src/api/chat.ts
import hookFetch from 'hook-fetch';
import { sseTextDecoderPlugin } from 'hook-fetch/plugins/sse';

export const chatApi = hookFetch.create({
  baseURL: 'https://api.openai.com/v1',
  headers: {
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

// 设置认证
export const setChatApiKey = (apiKey: string) => {
  chatApi.use({
    name: 'auth',
    priority: 1,
    async beforeRequest(config) {
      config.headers = new Headers(config.headers);
      config.headers.set('Authorization', `Bearer ${apiKey}`);
      return config;
    }
  });
};
```

### 2. 消息类型定义

```typescript
// src/types/chat.ts
export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  streaming?: boolean;
}

export interface ChatConfig {
  model: string;
  temperature: number;
  maxTokens: number;
  stream: boolean;
}

export interface ChatRequest {
  model: string;
  messages: Array<{
    role: string;
    content: string;
  }>;
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}
```

### 3. React 聊天组件

```typescript
// src/components/ChatApp.tsx
import React, { useState, useRef, useEffect } from 'react';
import { useHookFetch } from 'hook-fetch/react';
import { chatApi } from '../api/chat';
import { Message, ChatConfig } from '../types/chat';
import './ChatApp.css';

const DEFAULT_CONFIG: ChatConfig = {
  model: 'gpt-3.5-turbo',
  temperature: 0.7,
  maxTokens: 1000,
  stream: true
};

export function ChatApp() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [config, setConfig] = useState<ChatConfig>(DEFAULT_CONFIG);
  const [streamingMessage, setStreamingMessage] = useState<Message | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { stream, loading, cancel } = useHookFetch({
    request: (messages: Message[], config: ChatConfig) =>
      chatApi.post('/chat/completions', {
        model: config.model,
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        temperature: config.temperature,
        max_tokens: config.maxTokens,
        stream: config.stream
      }),
    onError: (error) => {
      console.error('Chat error:', error);
      setStreamingMessage(null);
      addMessage({
        id: Date.now().toString(),
        role: 'system',
        content: '抱歉，发生了错误。请稍后重试。',
        timestamp: Date.now()
      });
    }
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingMessage]);

  const addMessage = (message: Message) => {
    setMessages(prev => [...prev, message]);
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: Date.now()
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');

    // 创建流式消息
    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      streaming: true
    };
    setStreamingMessage(assistantMessage);

    try {
      for await (const chunk of stream(newMessages, config)) {
        const delta = chunk.result?.choices?.[0]?.delta?.content;
        if (delta) {
          setStreamingMessage(prev => prev ? {
            ...prev,
            content: prev.content + delta
          } : null);
        }
      }

      // 流式完成，添加到消息列表
      if (streamingMessage) {
        addMessage({
          ...streamingMessage,
          streaming: false
        });
      }
    } catch (error) {
      console.error('Streaming error:', error);
    } finally {
      setStreamingMessage(null);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
    setStreamingMessage(null);
  };

  return (
    <div className="chat-app">
      <div className="chat-header">
        <h1>AI 聊天助手</h1>
        <div className="chat-controls">
          <select
            value={config.model}
            onChange={(e) => setConfig(prev => ({ ...prev, model: e.target.value }))}
          >
            <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
            <option value="gpt-4">GPT-4</option>
          </select>
          <button onClick={clearChat} disabled={loading}>
            清空对话
          </button>
        </div>
      </div>

      <div className="chat-messages">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        {streamingMessage && (
          <MessageBubble message={streamingMessage} />
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="输入您的消息..."
          disabled={loading}
          rows={3}
        />
        <div className="input-actions">
          <button onClick={sendMessage} disabled={loading || !input.trim()}>
            {loading ? '发送中...' : '发送'}
          </button>
          {loading && (
            <button onClick={cancel} className="cancel-btn">
              取消
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// 消息气泡组件
function MessageBubble({ message }: { message: Message }) {
  return (
    <div className={`message ${message.role}`}>
      <div className="message-header">
        <span className="role">{getRoleLabel(message.role)}</span>
        <span className="timestamp">
          {new Date(message.timestamp).toLocaleTimeString()}
        </span>
      </div>
      <div className="message-content">
        {message.content}
        {message.streaming && <span className="cursor">|</span>}
      </div>
    </div>
  );
}

function getRoleLabel(role: string): string {
  switch (role) {
    case 'user': return '用户';
    case 'assistant': return 'AI';
    case 'system': return '系统';
    default: return role;
  }
}
```

### 4. 样式文件

```css
/* src/components/ChatApp.css */
.chat-app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  max-width: 800px;
  margin: 0 auto;
  border: 1px solid #e1e5e9;
  border-radius: 8px;
  overflow: hidden;
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: #f8f9fa;
  border-bottom: 1px solid #e1e5e9;
}

.chat-header h1 {
  margin: 0;
  font-size: 1.25rem;
  color: #2c3e50;
}

.chat-controls {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.chat-controls select {
  padding: 0.25rem 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.chat-controls button {
  padding: 0.25rem 0.75rem;
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.chat-controls button:hover {
  background: #c82333;
}

.chat-controls button:disabled {
  background: #6c757d;
  cursor: not-allowed;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  background: #ffffff;
}

.message {
  margin-bottom: 1rem;
  max-width: 70%;
}

.message.user {
  margin-left: auto;
}

.message.assistant {
  margin-right: auto;
}

.message.system {
  margin: 0 auto;
  max-width: 90%;
  text-align: center;
}

.message-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.25rem;
  font-size: 0.75rem;
  color: #6c757d;
}

.role {
  font-weight: 600;
}

.message-content {
  padding: 0.75rem 1rem;
  border-radius: 1rem;
  word-wrap: break-word;
  white-space: pre-wrap;
}

.message.user .message-content {
  background: #007bff;
  color: white;
  border-bottom-right-radius: 0.25rem;
}

.message.assistant .message-content {
  background: #f8f9fa;
  color: #2c3e50;
  border: 1px solid #e1e5e9;
  border-bottom-left-radius: 0.25rem;
}

.message.system .message-content {
  background: #fff3cd;
  color: #856404;
  border: 1px solid #ffeaa7;
  border-radius: 0.5rem;
}

.cursor {
  animation: blink 1s infinite;
  font-weight: bold;
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

.chat-input {
  padding: 1rem;
  background: #f8f9fa;
  border-top: 1px solid #e1e5e9;
}

.chat-input textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 0.5rem;
  resize: vertical;
  font-family: inherit;
  font-size: 0.875rem;
}

.chat-input textarea:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

.input-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.input-actions button {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 0.25rem;
  cursor: pointer;
  font-weight: 500;
}

.input-actions button:first-child {
  background: #007bff;
  color: white;
}

.input-actions button:first-child:hover {
  background: #0056b3;
}

.input-actions button:first-child:disabled {
  background: #6c757d;
  cursor: not-allowed;
}

.cancel-btn {
  background: #6c757d;
  color: white;
}

.cancel-btn:hover {
  background: #5a6268;
}
```

### 5. Vue 版本

```vue
<!-- src/components/ChatApp.vue -->
<template>
  <div class="chat-app">
    <div class="chat-header">
      <h1>AI 聊天助手</h1>
      <div class="chat-controls">
        <select v-model="config.model">
          <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
          <option value="gpt-4">GPT-4</option>
        </select>
        <button @click="clearChat" :disabled="loading">
          清空对话
        </button>
      </div>
    </div>

    <div class="chat-messages" ref="messagesContainer">
      <MessageBubble
        v-for="message in messages"
        :key="message.id"
        :message="message"
      />
      <MessageBubble
        v-if="streamingMessage"
        :message="streamingMessage"
      />
    </div>

    <div class="chat-input">
      <textarea
        v-model="input"
        @keypress="handleKeyPress"
        placeholder="输入您的消息..."
        :disabled="loading"
        rows="3"
      />
      <div class="input-actions">
        <button @click="sendMessage" :disabled="loading || !input.trim()">
          {{ loading ? '发送中...' : '发送' }}
        </button>
        <button v-if="loading" @click="cancel" class="cancel-btn">
          取消
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, nextTick, watch } from 'vue';
import { useHookFetch } from 'hook-fetch/vue';
import { chatApi } from '../api/chat';
import type { Message, ChatConfig } from '../types/chat';

const messages = ref<Message[]>([]);
const input = ref('');
const streamingMessage = ref<Message | null>(null);
const messagesContainer = ref<HTMLElement>();

const config = reactive<ChatConfig>({
  model: 'gpt-3.5-turbo',
  temperature: 0.7,
  maxTokens: 1000,
  stream: true
});

const { stream, loading, cancel } = useHookFetch({
  request: (messages: Message[], config: ChatConfig) =>
    chatApi.post('/chat/completions', {
      model: config.model,
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      temperature: config.temperature,
      max_tokens: config.maxTokens,
      stream: config.stream
    }),
  onError: (error) => {
    console.error('Chat error:', error);
    streamingMessage.value = null;
    addMessage({
      id: Date.now().toString(),
      role: 'system',
      content: '抱歉，发生了错误。请稍后重试。',
      timestamp: Date.now()
    });
  }
});

const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
    }
  });
};

watch([messages, streamingMessage], scrollToBottom, { deep: true });

const addMessage = (message: Message) => {
  messages.value.push(message);
};

const sendMessage = async () => {
  if (!input.value.trim() || loading.value) return;

  const userMessage: Message = {
    id: Date.now().toString(),
    role: 'user',
    content: input.value.trim(),
    timestamp: Date.now()
  };

  const newMessages = [...messages.value, userMessage];
  messages.value = newMessages;
  input.value = '';

  const assistantMessage: Message = {
    id: (Date.now() + 1).toString(),
    role: 'assistant',
    content: '',
    timestamp: Date.now(),
    streaming: true
  };
  streamingMessage.value = assistantMessage;

  try {
    for await (const chunk of stream(newMessages, config)) {
      const delta = chunk.result?.choices?.[0]?.delta?.content;
      if (delta && streamingMessage.value) {
        streamingMessage.value.content += delta;
      }
    }

    if (streamingMessage.value) {
      addMessage({
        ...streamingMessage.value,
        streaming: false
      });
    }
  } catch (error) {
    console.error('Streaming error:', error);
  } finally {
    streamingMessage.value = null;
  }
};

const handleKeyPress = (e: KeyboardEvent) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
};

const clearChat = () => {
  messages.value = [];
  streamingMessage.value = null;
};
</script>
```

### 6. 高级功能

#### 消息持久化

```typescript
// src/hooks/useChatPersistence.ts
import { useEffect } from 'react';
import { Message } from '../types/chat';

export function useChatPersistence(
  messages: Message[],
  setMessages: (messages: Message[]) => void
) {
  const STORAGE_KEY = 'chat-messages';

  // 加载消息
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsedMessages = JSON.parse(saved);
        setMessages(parsedMessages);
      } catch (error) {
        console.error('Failed to load messages:', error);
      }
    }
  }, [setMessages]);

  // 保存消息
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    }
  }, [messages]);

  const clearStorage = () => {
    localStorage.removeItem(STORAGE_KEY);
  };

  return { clearStorage };
}
```

#### 消息搜索

```typescript
// src/hooks/useMessageSearch.ts
import { useMemo, useState } from 'react';
import { Message } from '../types/chat';

export function useMessageSearch(messages: Message[]) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredMessages = useMemo(() => {
    if (!searchQuery.trim()) return messages;

    return messages.filter(message =>
      message.content.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [messages, searchQuery]);

  return {
    searchQuery,
    setSearchQuery,
    filteredMessages
  };
}
```

这个完整的聊天应用示例展示了 Hook-Fetch 在处理流式数据方面的强大能力，包括实时消息传输、错误处理、状态管理等关键功能。
