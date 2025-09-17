import express from 'express';

export interface TestServer {
  baseURL: string;
  close: () => Promise<void> | any;
}

export function startTestSseServer(port: number, handlers: (_app: express.Application) => void): Promise<TestServer> {
  const app = express();
  handlers(app);

  return new Promise((resolve) => {
    const server = app.listen(port, () => {
      const baseURL = `http://127.0.0.1:${port}`;
      console.log('Server is running on port', port);
      resolve({
        baseURL,
        close: () => server.close(),
      });
    });
  });
}
