import { describe, expect, it } from 'vitest'
import { forgotPasswordSchema, loginSchema, resetPasswordSchema } from './auth'

describe('loginSchema', () => {
  it('accepts a valid email and non-empty password', () => {
    expect(loginSchema.safeParse({ email: 'a@b.com', password: 'x' }).success).toBe(true)
  })

  it('rejects an invalid email', () => {
    expect(loginSchema.safeParse({ email: 'not-an-email', password: 'x' }).success).toBe(false)
  })

  it('rejects an empty password', () => {
    expect(loginSchema.safeParse({ email: 'a@b.com', password: '' }).success).toBe(false)
  })
})

describe('forgotPasswordSchema', () => {
  it('rejects an invalid email', () => {
    expect(forgotPasswordSchema.safeParse({ email: 'nope' }).success).toBe(false)
  })
})

describe('resetPasswordSchema', () => {
  it('rejects a password shorter than 8 characters', () => {
    const result = resetPasswordSchema.safeParse({ password: 'short', passwordConfirm: 'short' })
    expect(result.success).toBe(false)
  })

  it('rejects mismatched password/confirmation', () => {
    const result = resetPasswordSchema.safeParse({
      password: 'longenough1',
      passwordConfirm: 'different1',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(['passwordConfirm'])
    }
  })

  it('accepts matching passwords of sufficient length', () => {
    const result = resetPasswordSchema.safeParse({
      password: 'longenough1',
      passwordConfirm: 'longenough1',
    })
    expect(result.success).toBe(true)
  })
})
