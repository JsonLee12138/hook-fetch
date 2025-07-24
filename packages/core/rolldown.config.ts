import { defineConfig } from 'rolldown';
import { dts } from 'rolldown-plugin-dts';

const entries = {
  index: './lib/index.ts'
}

export default defineConfig([
  // ESM build
  {
    input: entries,
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
    input: './lib/index.ts',
    output: {
      file: 'dist/umd/index.js',
      format: 'umd',
      name: 'Jsonlee',
      sourcemap: true,
      minify: true
    }
  }
]);
