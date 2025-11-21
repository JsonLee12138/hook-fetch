import type { AnyObject } from 'typescript-api-pro';
import type { TestServer } from './util';
import { Buffer } from 'node:buffer';
import express from 'express';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import hookFetch from '../src/index';
import { startTestServer } from './util';

interface ParsedMultipart {
  fields: Record<string, string>;
  files: Record<string, string[]>;
}

function parseMultipartFormData(body: Buffer | ArrayBuffer | Uint8Array | undefined, contentType?: string): ParsedMultipart {
  const fields: Record<string, string> = {};
  const files: Record<string, string[]> = {};

  if (!body) {
    return { fields, files };
  }

  const boundaryMatch = contentType?.match(/boundary=(.+?)(?:;|$)/i);
  if (!boundaryMatch || !boundaryMatch[1]) {
    return { fields, files };
  }

  const boundary = boundaryMatch[1].replace(/^["']|["']$/g, '').trim();
  const buffer = Buffer.isBuffer(body) ? body : Buffer.from(body instanceof ArrayBuffer ? new Uint8Array(body) : body);
  const boundaryBuffer = Buffer.from(`--${boundary}`);

  // Find all boundary positions
  const positions: number[] = [];
  let pos = 0;

  while (pos < buffer.length) {
    const index = buffer.indexOf(boundaryBuffer, pos);
    if (index === -1)
      break;
    positions.push(index);
    pos = index + boundaryBuffer.length;
  }

  // Process each part between boundaries
  for (let i = 0; i < positions.length - 1; i++) {
    const startPos = positions[i];
    const endPos = positions[i + 1];
    if (startPos === void 0 || endPos === void 0)
      continue;

    const start = startPos + boundaryBuffer.length;
    const end = endPos;
    const partBuffer = buffer.subarray(start, end);

    // Skip if part is too small
    if (partBuffer.length < 4)
      continue;

    // Find the double CRLF (\r\n\r\n) that separates headers from body
    const separator = Buffer.from('\r\n\r\n');
    let separatorIndex = -1;

    for (let j = 0; j <= partBuffer.length - separator.length; j++) {
      if (partBuffer.subarray(j, j + separator.length).equals(separator)) {
        separatorIndex = j;
        break;
      }
    }

    if (separatorIndex === -1)
      continue;

    const headerBuffer = partBuffer.subarray(0, separatorIndex);
    const bodyBuffer = partBuffer.subarray(separatorIndex + separator.length);

    // Remove leading CRLF and trailing CRLF from body
    let bodyStart = 0;
    let bodyEnd = bodyBuffer.length;

    if (bodyBuffer.length >= 2 && bodyBuffer[0] === 0x0D && bodyBuffer[1] === 0x0A) {
      bodyStart = 2;
    }

    if (bodyEnd >= 2 && bodyBuffer[bodyEnd - 2] === 0x0D && bodyBuffer[bodyEnd - 1] === 0x0A) {
      bodyEnd -= 2;
    }

    const actualBody = bodyBuffer.subarray(bodyStart, bodyEnd);
    const headers = headerBuffer.toString('utf8');

    // Parse Content-Disposition header
    const dispositionMatch = headers.match(/Content-Disposition:\s*form-data;\s*name="([^"]+)"(?:;\s*filename="([^"]*)")?/i);
    if (!dispositionMatch || !dispositionMatch[1]) {
      continue;
    }

    const fieldName = dispositionMatch[1];
    const filename = dispositionMatch[2];

    if (filename) {
      if (!files[fieldName]) {
        files[fieldName] = [];
      }
      files[fieldName].push(filename);
    }
    else {
      fields[fieldName] = actualBody.toString('utf8');
    }
  }

  return { fields, files };
}

function buildUploadResponse(req: express.Request) {
  const { fields, files } = parseMultipartFormData(req.body as Buffer | undefined, req.headers['content-type']);
  const formattedFiles = Object.entries(files).reduce<Record<string, string>>((acc, [key, value]) => {
    acc[key] = value.join(', ');
    return acc;
  }, {});

  return {
    args: {},
    form: fields,
    files: formattedFiles,
  };
}

describe('file upload', () => {
  let server: TestServer;

  beforeAll(async () => {
    server = await startTestServer(10001, (app) => {
      const rawBodyParser = express.raw({ type: () => true, limit: '10mb' });

      app.post('/upload/single', rawBodyParser, (req, res) => {
        res.json(buildUploadResponse(req));
      });

      app.post('/upload/instance', rawBodyParser, (req, res) => {
        res.json(buildUploadResponse(req));
      });

      app.post('/upload/multiple', rawBodyParser, (req, res) => {
        res.json(buildUploadResponse(req));
      });

      app.post('/upload/custom-headers', rawBodyParser, (req, res) => {
        const response = buildUploadResponse(req);
        res.json({
          ...response,
          headers: {
            'X-Custom-Header': (req.headers['x-custom-header'] as string) ?? '',
            'Authorization': (req.headers.authorization as string) ?? '',
            'X-Upload-Source': (req.headers['x-upload-source'] as string) ?? '',
          },
        });
      });

      app.post('/upload/progress', rawBodyParser, (_req, res) => {
        res.setHeader('Content-Type', 'text/plain');
        const chunks = ['chunk-1', 'chunk-2', 'chunk-3', 'chunk-4'];
        let index = 0;

        const sendChunk = () => {
          if (index >= chunks.length) {
            res.end();
            return;
          }
          res.write(chunks[index]);
          index++;
          setTimeout(sendChunk, 5);
        };

        sendChunk();
      });
    });
  });

  afterAll(async () => {
    await server.close();
  });

  it('test file upload with FormData', async () => {
    const fileContent = 'Hello, this is a test file content!';
    const file = new File([fileContent], 'test.txt', { type: 'text/plain' });

    const formData = new FormData();
    formData.append('file', file);
    formData.append('description', 'Test file upload');
    formData.append('userId', '123');

    interface UploadVO {
      args: AnyObject;
      files: {
        file: string;
      };
      form: {
        description: string;
        userId: string;
      };
    }

    const res = await hookFetch.upload<UploadVO>(`${server.baseURL}/upload/single`, {
      file,
      description: 'Test file upload',
      userId: '123',
    }).json();

    expect(res.form).toBeDefined();
    expect(res.form.description).toBe('Test file upload');
    expect(res.form.userId).toBe('123');
    expect(res.files).toBeDefined();
    expect(res.files.file).toBeDefined();
  });

  it('test file upload with instance', async () => {
    interface BaseUploadVO {
      args: AnyObject;
      files: {
        file: string;
      };
      form: {
        metadata: string;
      };
    }
    const instance = hookFetch.create<BaseUploadVO, 'args'>({
      baseURL: server.baseURL,
      headers: {
        Accept: 'application/json',
      },
    });

    const fileContent = 'Test file content for instance upload';
    const file = new File([fileContent], 'instance-test.txt', { type: 'text/plain' });

    const formData = new FormData();
    formData.append('file', file);
    formData.append('metadata', JSON.stringify({
      uploadTime: new Date().toISOString(),
      version: '1.0.0',
    }));

    const res = await instance.post('/upload/instance', formData).json();

    expect(res.form).toBeDefined();
    expect(res.form.metadata).toBeDefined();
    expect(res.files).toBeDefined();
    expect(res.files.file).toBeDefined();
  });

  it('test multiple files upload', async () => {
    const file1 = new File(['File 1 content'], 'file1.txt', { type: 'text/plain' });
    const file2 = new File(['File 2 content'], 'file2.txt', { type: 'text/plain' });
    const imageContent = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    const file3 = new File([imageContent], 'test.png', { type: 'image/png' });

    const formData = new FormData();
    formData.append('files', file1);
    formData.append('files', file2);
    formData.append('image', file3);
    formData.append('title', 'Multiple files upload test');

    interface UploadVO {
      args: AnyObject;
      files: {
        files: string;
        image: string;
      };
      form: {
        title: string;
      };
    }

    const res = await hookFetch.upload<UploadVO>(`${server.baseURL}/upload/multiple`, formData).json();

    expect(res.form).toBeDefined();
    expect(res.form.title).toBe('Multiple files upload test');
    expect(res.files).toBeDefined();
    expect(res.files.files).toBeDefined();
    expect(res.files.image).toBeDefined();
  });

  it('test file upload with progress tracking', async () => {
    const fileContent = 'Large file content for progress testing '.repeat(1000);
    const file = new File([fileContent], 'large-file.txt', { type: 'text/plain' });

    const formData = new FormData();
    formData.append('file', file);
    formData.append('uploadType', 'progress-test');

    const req = hookFetch(`${server.baseURL}/upload/progress`, {
      method: 'POST',
      data: formData,
    });

    void req; // Keep reference for abort call below

    let chunkCount = 0;
    for await (const _ of req.stream<Uint8Array>()) {
      chunkCount++;
      if (chunkCount >= 5) {
        req.abort();
        break;
      }
    }
    expect(chunkCount).toBe(4);
  });

  it('test file upload with custom headers', async () => {
    const file = new File(['Custom headers test file'], 'custom-headers.txt', { type: 'text/plain' });

    const formData = new FormData();
    formData.append('file', file);
    formData.append('customField', 'customValue');

    interface UploadVO {
      args: AnyObject;
      files: {
        file: string;
      };
      form: {
        customField: string;
      };
      headers: Record<string, string>;
    }

    const res = await hookFetch<UploadVO>(`${server.baseURL}/upload/custom-headers`, {
      method: 'POST',
      data: formData,
      headers: {
        'X-Custom-Header': 'custom-value',
        'Authorization': 'Bearer test-token',
        'X-Upload-Source': 'test-suite',
      },
    }).json();

    expect(res.form).toBeDefined();
    expect(res.form.customField).toBe('customValue');
    expect(res.headers).toBeDefined();
    expect(res.headers['X-Custom-Header']).toBe('custom-value');
    expect(res.headers['Authorization']).toBe('Bearer test-token');
    expect(res.headers['X-Upload-Source']).toBe('test-suite');
  });
});
