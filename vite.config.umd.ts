import { defineConfig } from 'vite';

export default defineConfig({
    build: {
      lib: {
        entry: './src/umd.ts',
        name: 'hook-fetch',
        fileName: (format) => {
          return `${format}/index.js`
        },
        formats: ['umd']
      },
      minify: 'oxc',
      outDir: './dist',
      sourcemap: false,
      emptyOutDir: false
    }
  })
