import express from 'express';

export interface TestServer {
  baseURL: string;
  close: () => Promise<void> | any;
}

export function startTestServer(port: number, handlers: (_app: express.Application) => void): Promise<TestServer> {
  return startTestSseServer(port, handlers);
}

export function startTestSseServer(port: number, handlers: (_app: express.Application) => void): Promise<TestServer> {
  const app = express();
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');

    // 处理 OPTIONS 预检请求
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }

    next();
  });
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
