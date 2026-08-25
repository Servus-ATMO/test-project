import { describe, expect, it } from 'vitest'
import { getSafeRedirectPath } from './redirect'

describe('getSafeRedirectPath', () => {
  it('returns the path unchanged when it is a safe relative path', () => {
    expect(getSafeRedirectPath('/dashboard')).toBe('/dashboard')
    expect(getSafeRedirectPath('/some/nested/path?x=1')).toBe('/some/nested/path?x=1')
  })

  it('falls back to the default when no path is given', () => {
    expect(getSafeRedirectPath(null)).toBe('/dashboard')
    expect(getSafeRedirectPath(undefined)).toBe('/dashboard')
    expect(getSafeRedirectPath('')).toBe('/dashboard')
  })

  it('honors a custom fallback', () => {
    expect(getSafeRedirectPath(null, '/custom')).toBe('/custom')
  })

  it('rejects absolute URLs to other domains (open redirect)', () => {
    expect(getSafeRedirectPath('https://evil.example.com')).toBe('/dashboard')
    expect(getSafeRedirectPath('http://evil.example.com/phish')).toBe('/dashboard')
  })

  it('rejects protocol-relative URLs (open redirect)', () => {
    expect(getSafeRedirectPath('//evil.example.com')).toBe('/dashboard')
  })

  it('rejects paths that do not start with a slash', () => {
    expect(getSafeRedirectPath('evil.example.com')).toBe('/dashboard')
    expect(getSafeRedirectPath('javascript:alert(1)')).toBe('/dashboard')
  })
})
