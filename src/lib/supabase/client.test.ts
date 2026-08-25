import { describe, expect, it, vi } from 'vitest'
import { createClient } from './client'

describe('createClient (browser)', () => {
  it('creates a Supabase client when env vars are present', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_test')

    const client = createClient()

    expect(client).toBeTruthy()
    expect(typeof client.auth.getSession).toBe('function')

    vi.unstubAllEnvs()
  })
})
