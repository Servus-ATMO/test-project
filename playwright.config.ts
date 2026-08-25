import { defineConfig, devices } from '@playwright/test'
import { loadEnvConfig } from '@next/env'

// Playwright laeuft als eigener Node-Prozess, nicht ueber die Next.js-CLI -
// .env.local wird also nicht automatisch geladen wie bei `next dev`/`build`.
// Gleicher Mechanismus wie Next.js selbst, damit Tests (z. B. das Anlegen
// von Testnutzern via Supabase Admin API) dieselben Werte sehen.
loadEnvConfig(process.cwd())

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  // Tests, die einen echten Supabase-Testnutzer anlegen (siehe PROJ-2-Suite),
  // vertragen keine gleichzeitigen Worker ueber Projekte hinweg - GoTrue
  // wirft dann "Database error creating new user" bei zeitgleichem
  // auth.admin.createUser(). Bei nur einer Spec-Datei ist das kein
  // spuerbarer Geschwindigkeitsverlust.
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'Mobile Safari', use: { ...devices['iPhone 13'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
})
