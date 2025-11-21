import type { TestServer } from './util';
import express from 'express';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import hookFetch from '../src';
import { startTestSseServer } from './util';

describe('text/plain request body', () => {
  let server: TestServer;

  interface TextPlainResponse {
    body: string;
    headers: string;
  }
  beforeAll(async () => {
    server = await startTestSseServer(9996, (app) => {
      app.use(express.text({ type: '*/*' }));
      app.post('/text', (req, res) => {
        const resBody: TextPlainResponse = {
          body: req.body,
          headers: req.headers['content-type'] as string,
        };
        res.json(resBody);
      });
    });
  });

  afterAll(async () => {
    await server.close();
  });

  it('should send raw string when content-type is text/plain', async () => {
    const payload = 'plain text payload';
    const res = await hookFetch.post<TextPlainResponse>(`${server.baseURL}/text`, payload, {
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
    }).json();

    expect(res.body).toBe(payload);
    expect(res.headers).toContain('text/plain');
  });
});
