import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    clearMocks: true,
    restoreMocks: true,
    setupFiles: ['./tests/setup.js'],
    projects: [
      { extends: true, test: { name: 'unit', include: ['tests/unit/**/*.test.js'] } },
      { extends: true, test: { name: 'integration', include: ['tests/{integration,contract}/**/*.test.js'], fileParallelism: false, maxWorkers: 1, testTimeout: 15000, hookTimeout: 15000 } },
    ],
  },
})
