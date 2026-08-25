import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

// PROJ-2 Agentur-Login. A dedicated test user is created via the Supabase
// Admin API (service role) in beforeAll and removed in afterAll - this
// avoids hand-crafting auth.users rows via SQL, which skips columns GoTrue
// expects to be '' rather than NULL and produces misleading 500s (see QA
// Test Results in features/PROJ-2-agentur-login.md for how that bit us once).
const TEST_EMAIL = `e2e-proj2-${Date.now()}@example.com`
const TEST_PASSWORD = 'TestPasswort123!'

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const secretKey = process.env.SUPABASE_SECRET_KEY
  if (!url || !secretKey) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY missing - required to seed the e2e test user.'
    )
  }
  return createClient(url, secretKey, { auth: { autoRefreshToken: false, persistSession: false } })
}

let testUserId: string | undefined

test.beforeAll(async () => {
  const supabase = adminClient()
  const { data, error } = await supabase.auth.admin.createUser({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    email_confirm: true,
  })
  if (error) throw error
  testUserId = data.user.id
})

test.afterAll(async () => {
  if (!testUserId) return
  const supabase = adminClient()
  await supabase.auth.admin.deleteUser(testUserId)
})

test.describe('PROJ-2: Agentur-Login', () => {
  // Serial statt parallel: alle Tests teilen sich denselben, in beforeAll
  // angelegten Supabase-Testnutzer. Parallele Worker riefen sonst gleichzeitig
  // beforeAll bzw. signInWithPassword fuer denselben Account auf und liefen
  // sich gegenseitig in Supabase Auths Rate-Limiting/DB-Verbindungslimits.
  test.describe.configure({ mode: 'serial' })

  test('robots.txt and sitemap.xml bypass the login gate (crawler/browser files)', async ({
    request,
  }) => {
    // Regression: der Proxy-Matcher schloss zunaechst nur favicon.ico aus,
    // robots.txt wurde faelschlich zu /login umgeleitet (Lighthouse-SEO-Check
    // nach dem PROJ-2-Deploy hat das aufgedeckt).
    const robots = await request.get('/robots.txt', { maxRedirects: 0 })
    expect([200, 404]).toContain(robots.status())

    const sitemap = await request.get('/sitemap.xml', { maxRedirects: 0 })
    expect([200, 404]).toContain(sitemap.status())
  })

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
    // networkidle statt des Playwright-Defaults 'load': fill() wartet nur auf
    // Sichtbarkeit/Aktivierbarkeit des Elements, nicht auf abgeschlossene
    // React-Hydration - ohne diese Wartezeit hat WebKit reproduzierbar das
    // gerade getippte E-Mail-Feld beim Hydrieren wieder geleert.
    await page.goto('/login', { waitUntil: 'networkidle' })
    await page.fill('input[name="email"]', TEST_EMAIL)
    await page.fill('input[name="password"]', 'definitely-wrong')
    await page.click('button[type="submit"]')
    await expect(page.getByText('E-Mail oder Passwort falsch.')).toBeVisible()

    await page.goto('/login', { waitUntil: 'networkidle' })
    await page.fill('input[name="email"]', 'nobody-such-account@example.com')
    await page.fill('input[name="password"]', 'whatever123')
    await page.click('button[type="submit"]')
    await expect(page.getByText('E-Mail oder Passwort falsch.')).toBeVisible()
  })

  test('correct credentials log the user in, preserve the redirect target, and show their email', async ({
    page,
  }) => {
    await page.goto('/login?redirect=%2Fdashboard', { waitUntil: 'networkidle' })
    await page.fill('input[name="email"]', TEST_EMAIL)
    await page.fill('input[name="password"]', TEST_PASSWORD)
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL('/dashboard')
    await expect(page.locator('header')).toContainText(TEST_EMAIL)
  })

  test('a malicious absolute redirect param is ignored even on a real successful login', async ({
    page,
  }) => {
    await page.goto('/login?redirect=https%3A%2F%2Fevil.example.com', { waitUntil: 'networkidle' })
    await page.fill('input[name="email"]', TEST_EMAIL)
    await page.fill('input[name="password"]', TEST_PASSWORD)
    await page.click('button[type="submit"]')
    await expect(page).not.toHaveURL(/evil\.example\.com/)
    await expect(page.url()).toContain('localhost')
  })

  test('already-logged-in user visiting /login is bounced away, and logout ends the session', async ({
    page,
  }) => {
    await page.goto('/login', { waitUntil: 'networkidle' })
    await page.fill('input[name="email"]', TEST_EMAIL)
    await page.fill('input[name="password"]', TEST_PASSWORD)
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL('/dashboard')

    await page.goto('/login')
    await expect(page).not.toHaveURL('/login')

    await page.goto('/dashboard')
    await page.click('button:has-text("Logout")')
    await expect(page).toHaveURL('/login')

    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login\?redirect=/)
  })

  test('forgot-password shows the same confirmation regardless of whether the account exists', async ({
    page,
  }) => {
    await page.goto('/passwort-vergessen', { waitUntil: 'networkidle' })
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

  test('full password-reset flow: real recovery link sets a new password that then works', async ({
    page,
    baseURL,
  }) => {
    // Eigener, isolierter Testnutzer (nicht TEST_EMAIL) - dieser Test aendert
    // das Passwort und darf die anderen, seriell laufenden Tests nicht stoeren.
    // Ohne Custom-SMTP nutzt Supabase den Standard-Reset-Link (liefert die
    // Session als URL-Fragment) - genau das Szenario, das ResetPasswordGate
    // abdeckt (siehe src/components/auth/reset-password-gate.tsx).
    const email = `e2e-proj2-reset-${Date.now()}@example.com`
    const oldPassword = 'OldPasswort123!'
    const newPassword = 'NewPasswort456!'
    const supabase = adminClient()

    const { data: userData, error: createError } = await supabase.auth.admin.createUser({
      email,
      password: oldPassword,
      email_confirm: true,
    })
    expect(createError).toBeNull()

    try {
      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: 'recovery',
        email,
        options: { redirectTo: `${baseURL}/passwort-zuruecksetzen` },
      })
      expect(linkError).toBeNull()

      // Simuliert den Klick auf den Link aus der E-Mail.
      await page.goto(linkData!.properties.action_link, { waitUntil: 'networkidle' })
      await expect(page).toHaveURL(/\/passwort-zuruecksetzen/)

      await page.fill('input[name="password"]', newPassword)
      await page.fill('input[name="passwordConfirm"]', newPassword)
      await page.click('button[type="submit"]')
      await expect(page).toHaveURL('/login?reset=success')

      // Neues Passwort funktioniert...
      await page.fill('input[name="email"]', email)
      await page.fill('input[name="password"]', newPassword)
      await page.click('button[type="submit"]')
      await expect(page).toHaveURL('/dashboard')

      await page.click('button:has-text("Logout")')
      await expect(page).toHaveURL('/login')

      // ...das alte nicht mehr.
      await page.fill('input[name="email"]', email)
      await page.fill('input[name="password"]', oldPassword)
      await page.click('button[type="submit"]')
      await expect(page.getByText('E-Mail oder Passwort falsch.')).toBeVisible()
    } finally {
      await supabase.auth.admin.deleteUser(userData!.user.id)
    }
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
