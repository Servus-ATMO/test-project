import { describe, expect, it } from 'vitest'
import { isRedirectError } from './is-redirect-error'

describe('isRedirectError', () => {
  it('recognizes a Next.js redirect error by its digest', () => {
    expect(isRedirectError({ digest: 'NEXT_REDIRECT;replace;/dashboard;307;' })).toBe(true)
  })

  it('rejects a regular Error without a digest', () => {
    expect(isRedirectError(new Error('boom'))).toBe(false)
  })

  it('rejects a digest that only resembles the redirect code', () => {
    expect(isRedirectError({ digest: 'SOMETHING_ELSE' })).toBe(false)
  })

  it('rejects non-object values', () => {
    expect(isRedirectError(null)).toBe(false)
    expect(isRedirectError(undefined)).toBe(false)
    expect(isRedirectError('NEXT_REDIRECT')).toBe(false)
  })
})
