import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom', // React + Testing Library 用
    globals: true, // describe / it などをグローバルで使える
    setupFiles: './vitest.setup.ts',
  },
})
