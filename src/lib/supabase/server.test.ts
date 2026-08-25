import { describe, expect, it, vi } from 'vitest'

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    getAll: () => [],
    set: () => {},
  })),
}))

describe('createClient (server)', () => {
  it('creates a Supabase client when env vars are present', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_test')

    const { createClient } = await import('./server')
    const client = await createClient()

    expect(client).toBeTruthy()
    expect(typeof client.auth.getClaims).toBe('function')

    vi.unstubAllEnvs()
  })
})
