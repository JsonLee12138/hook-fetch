/// <reference types="vitest" />
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [dts({
    outDir: 'types',
    copyDtsFiles: false
  })],
  build: {
    lib: {
      entry: './src/index.ts',
      name: 'auto-import',
      // 第二个参数是入口文件名
      fileName: (format, _) => {
        return `${format}/index.js`
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
    testTimeout: 20_000
  }
})
