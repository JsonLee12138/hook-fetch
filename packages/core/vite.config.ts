import { defineConfig, loadEnv } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig(({ mode }) => {
  loadEnv(mode, process.cwd());
  return {
    plugins: [dts({
      outDir: 'types',
      copyDtsFiles: false
    })],
    build: {
      lib: {
        entry: {
          index: './src/index.ts',
          'plugins/index': './src/plugins/index.ts',
          'plugins/sse': './src/plugins/sse.ts',
          'vue/index': './src/vue/index.ts',
          'react/index': './src/react/index.ts'
        },
        name: 'hook-fetch',
        fileName: (format, entryName) => {
          let fileType = 'js';
          switch (format) {
            case 'es':
              fileType = 'mjs';
              break;
            case 'cjs':
              fileType = 'cjs';
              break;
            case 'umd':
              fileType = 'js';
              break;
            default:
              break;
          }
          return `${format}/${entryName}.${fileType}`;
        },
        formats: ['es', 'cjs']
      },
      rollupOptions: {
        external: ['vue', 'vue/jsx-runtime', 'react']
      },
      minify: 'oxc',
      outDir: './dist',
      sourcemap: false,
      emptyOutDir: true,
    }
  }
})
