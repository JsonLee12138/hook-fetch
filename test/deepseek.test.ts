import { describe, test } from 'vitest';
import hookFetch from '../src/index';
import { sseTextDecoderPlugin } from '../src/plugins/sse';

describe('test hook-fetch deepseek', () => {

  const request = hookFetch.create({
    baseURL: 'https://api.deepseek.com',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${process.env.VITE_DEEPSEEK_KEY}`
    },
  })
  console.log(`Bearer ${process.env.VITE_DEEPSEEK_KEY}`)

  request.use(sseTextDecoderPlugin({
    json: true,
    prefix: 'data:',
  }));

  test('test instance sse plugin', async () => {

    let data = {
      "messages": [
        {
          "content": "You are a helpful assistant",
          "role": "system"
        },
        {
          "content": "Hi",
          "role": "user"
        }
      ],
      "model": "deepseek-chat",
      "frequency_penalty": 0,
      "max_tokens": 2048,
      "presence_penalty": 0,
      "response_format": {
        "type": "text"
      },
      "stop": null,
      "stream": true,
      "stream_options": null,
      "temperature": 1,
      "top_p": 1,
      "tools": null,
      "tool_choice": "none",
      "logprobs": false,
      "top_logprobs": null
    };


    const req = request.post('/chat/completions', data);

    for await (const chunk of req.stream<string>()) {
      // expect(typeof chunk.result).toBe('string');
      console.log(chunk.result);
    }
  })
})
