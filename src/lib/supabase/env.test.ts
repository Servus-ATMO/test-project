import { describe, expect, it, vi } from 'vitest'
import { getSupabaseEnv } from './env'

describe('getSupabaseEnv', () => {
  it('returns url and publishableKey when both are set', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_test')

    expect(getSupabaseEnv()).toEqual({
      url: 'https://example.supabase.co',
      publishableKey: 'sb_publishable_test',
    })

    vi.unstubAllEnvs()
  })

  it('throws a clear error when NEXT_PUBLIC_SUPABASE_URL is missing', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_test')

    expect(() => getSupabaseEnv()).toThrow(/NEXT_PUBLIC_SUPABASE_URL/)

    vi.unstubAllEnvs()
  })

  it('throws a clear error when NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is missing', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', '')

    expect(() => getSupabaseEnv()).toThrow(/NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/)

    vi.unstubAllEnvs()
  })
})
