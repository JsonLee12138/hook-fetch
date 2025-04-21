/// <reference types="vitest" />
import { defineConfig } from 'vite';
// import dts from 'vite-plugin-dts';

export default defineConfig({
  // plugins: [dts({
  //   outDir: 'types',
  //   copyDtsFiles: false
  // })],
  build: {
    lib: {
      entry: {
        index: './src/index.ts',
        'plugins/index': './src/plugins/index.ts',
        'plugins/sse': './src/plugins/sse.ts',
      },
      name: 'hook-fetch',
      // 第二个参数是入口文件名
      fileName: (format, entryName) => {
        return `${format}/${entryName}.js`
      },
      formats: ['es', 'cjs']
    },
    minify: 'terser',
    outDir: './dist',
    sourcemap: true,
    emptyOutDir: true,
    rollupOptions: {
      external: ['ts-morph']
    }
  },
  test: {
    testTimeout: 20_000,
    // environment: 'happy-dom',
    // // 启用浏览器环境测试
    // browser: {
    //   enabled: true,
    //   provider: 'playwright',
    //   instances: [
    //     {
    //       browser: 'chromium'
    //     },
    //   ],
    // },
    // // 设置全局测试环境
    // globals: true,
  }
})
