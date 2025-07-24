import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    testTimeout: 20_000,
    environment: 'node',
    globals: true,
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        '__test__/',
        'dist/',
        'types/',
        '*.config.*'
      ]
    },
  }
})
