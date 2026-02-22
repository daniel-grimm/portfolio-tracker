import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: [
        'server/src/services/calculations.ts',
        'server/src/services/projections.ts',
        'server/src/lib/formatting.ts',
        'server/src/services/**/*.ts',
        'server/src/routes/**/*.ts',
      ],
      thresholds: {
        lines: 80,
      },
    },
  },
  resolve: {
    alias: {
      shared: path.resolve(__dirname, './shared'),
    },
  },
})
