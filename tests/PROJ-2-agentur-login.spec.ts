import { test, expect } from '@playwright/test'

// PROJ-2 Agentur-Login. Note: does NOT include a "successful login" test —
// that acceptance criterion currently FAILS in manual QA (BUG-1: correct
// credentials do not establish a session because the Server Action is
// invoked outside a React transition). See QA Test Results in
// features/PROJ-2-agentur-login.md. Re-add that test once BUG-1 is fixed.

test.describe('PROJ-2: Agentur-Login', () => {
  test('unauthenticated visit to a protected route redirects to /login with a redirect param', async ({
    page,
  }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL('/login?redirect=%2Fdashboard')
  })

  test('empty login form shows validation errors without navigating away', async ({ page }) => {
    await page.goto('/login')
    await page.click('button[type="submit"]')
    await expect(page.getByText('Ungültige E-Mail-Adresse')).toBeVisible()
    await expect(page.getByText('Passwort ist erforderlich')).toBeVisible()
    await expect(page).toHaveURL('/login')
  })

  test('wrong password and a nonexistent email show the identical generic error', async ({
    page,
  }) => {
    await page.goto('/login')
    await page.fill('input[name="email"]', 'qa-proj2-user@example.com')
    await page.fill('input[name="password"]', 'definitely-wrong')
    await page.click('button[type="submit"]')
    await expect(page.getByText('E-Mail oder Passwort falsch.')).toBeVisible()

    await page.goto('/login')
    await page.fill('input[name="email"]', 'nobody-such-account@example.com')
    await page.fill('input[name="password"]', 'whatever123')
    await page.click('button[type="submit"]')
    await expect(page.getByText('E-Mail oder Passwort falsch.')).toBeVisible()
  })

  test('forgot-password shows the same confirmation regardless of whether the account exists', async ({
    page,
  }) => {
    await page.goto('/passwort-vergessen')
    await page.fill('input[name="email"]', 'nobody-such-account@example.com')
    await page.click('button[type="submit"]')
    await expect(page.getByText('Falls ein Konto mit dieser E-Mail-Adresse existiert')).toBeVisible()
  })

  test('an invalid/expired confirmation link redirects to forgot-password with an error hint', async ({
    page,
  }) => {
    await page.goto('/auth/confirm?token_hash=bogus&type=recovery')
    await expect(page).toHaveURL('/passwort-vergessen?error=expired_link')
    await expect(page.getByText('Der Link ist abgelaufen oder wurde bereits verwendet.')).toBeVisible()
  })

  test('reset-password page is not directly accessible without an active recovery session', async ({
    page,
  }) => {
    await page.goto('/passwort-zuruecksetzen')
    await expect(page).toHaveURL('/passwort-vergessen?error=expired_link')
  })

  test('login form renders and is usable at mobile width (375px)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/login')
    const form = page.locator('form')
    await expect(form).toBeVisible()
    const box = await form.boundingBox()
    expect(box?.width).toBeGreaterThan(0)
    expect(box?.width).toBeLessThanOrEqual(375)
  })
})
