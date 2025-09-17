import type { ResponseError } from '../src/index';
import type { TestServer } from './util';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import hookFetch from '../src/index';
import { sseTextDecoderPlugin } from '../src/plugins/sse';
import { startTestSseServer } from './util';

describe('sSE server + hook-fetch integration', () => {
  let server: TestServer;

  beforeAll(async () => {
    server = await startTestSseServer(9999, (app) => {
      app.post('/sse', (_, res) => {
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': '*',
        });
        res.write(`data: ${JSON.stringify({ id: 1, text: 'hello 1' })}\n\n`);
        res.write(`data: ${JSON.stringify({ id: 2, text: 'hello 2' })}\n\n`);
        res.write(`data: [DONE]\n\n`);
        res.end();
      });
      app.post('/sse-error', (_, res) => {
        res.status(401);
        res.end();
      });
    });
  });

  afterAll(async () => {
    await server.close();
  });

  it('consumes SSE stream with sseTextDecoderPlugin (JSON parsing)', async () => {
    const request = hookFetch.create({
      baseURL: server.baseURL,
      headers: { 'Content-Type': 'application/json' },
    });

    // Decode to text, split by blank line, strip 'data:' prefix, parse JSON, stop on [DONE]
    request.use(
      sseTextDecoderPlugin({
        json: true,
        prefix: 'data:',
        doneSymbol: '[DONE]',
      }),
    );

    const req = request.post('/sse');
    const received: Array<{ id: number; text: string }> = [];

    for await (const chunk of req.stream<{ id: number; text: string }>()) {
      // When doneSymbol is encountered, plugin terminates the stream, so we only get JSON objects here
      received.push(chunk.result as { id: number; text: string });
    }

    expect(received.length).toBe(2);
    expect(received[0]).toEqual({ id: 1, text: 'hello 1' });
    expect(received[1]).toEqual({ id: 2, text: 'hello 2' });
  });
  it('consumes SSE stream with sseTextDecoderPlugin Error', async () => {
    const request = hookFetch.create({
      baseURL: server.baseURL,
      headers: { 'Content-Type': 'application/json' },
    });

    function authPlugin() {
      return {
        name: 'auth',
        priority: 1,
        async beforeRequest(config: any) {
          console.log('beforeRequest', config);
          // const token = sessionStorage.getItem('authToken');
          // if (token) {
          //   config.headers = new Headers(config.headers);
          //   config.headers.set('Authorization', `Bearer ${token}`);
          // }
          return config;
        },
        async onError(error: ResponseError) {
          console.log('onError', error.status);
          return error;
        },
      };
    }

    // Decode to text, split by blank line, strip 'data:' prefix, parse JSON, stop on [DONE]
    request.use(
      sseTextDecoderPlugin({
        json: true,
        prefix: 'data:',
        doneSymbol: '[DONE]',
      }),
    );
    request.use(authPlugin());

    // try {
    const req = request.post('/sse-error');
    const received: Array<{ id: number; text: string }> = [];

    try {
      for await (const chunk of req.stream<{ id: number; text: string }>()) {
        // When doneSymbol is encountered, plugin terminates the stream, so we only get JSON objects here
        received.push(chunk.result as { id: number; text: string });
      }
    }
    catch (error) {
      expect((error as ResponseError).status).toBe(401);
    }
  });
});
