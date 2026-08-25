import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    // tests/ ist Playwright's E2E-Verzeichnis (eigener Runner, eigene test()-API)
    // - Vitest wuerde sonst .spec.ts-Dateien dort faelschlich mitzupicken versuchen.
    exclude: ['**/node_modules/**', 'tests/**'],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
})
