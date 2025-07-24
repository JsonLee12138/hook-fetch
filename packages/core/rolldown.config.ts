import { defineConfig } from 'rolldown';
import { dts } from 'rolldown-plugin-dts';

const entries = {
  index: './src/index.ts',
  'plugins/index': './src/plugins/index.ts',
  'plugins/sse': './src/plugins/sse.ts',
  'vue/index': './src/vue/index.ts',
  'react/index': './src/react/index.ts'
}

export default defineConfig([
  // ESM build
  {
    input: entries,
    external: ['vue', 'react'],
    output: {
      dir: 'dist/es',
      format: 'esm',
      entryFileNames: '[name].mjs',
      chunkFileNames: '[name].mjs',
      sourcemap: true,
      minify: true
    }
  },
  // CJS build
  {
    input: entries,
    external: ['vue', 'react'],
    output: {
      dir: 'dist/cjs',
      format: 'cjs',
      entryFileNames: '[name].cjs',
      chunkFileNames: '[name].cjs',
      sourcemap: true,
      minify: true
    }
  },
  // Types generation
  {
    input: entries,
    external: ['vue', 'react'],
    output: {
      dir: 'types',
      format: 'esm'
    },
    plugins: [
      dts({
        emitDtsOnly: true
      })
    ]
  },
  // UMD build
  {
    input: './src/umd.ts',
    output: {
      file: 'dist/umd/index.js',
      format: 'umd',
      name: 'HookFetch',
      sourcemap: true,
      minify: true,
      globals: {
        'vue': 'Vue',
        'react': 'React'
      }
    },
    external: ['vue', 'react']
  }
]);
