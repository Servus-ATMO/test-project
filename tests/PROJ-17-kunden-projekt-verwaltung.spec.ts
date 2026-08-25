import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

// PROJ-17 Kunden-/Projekt-Verwaltung. Ein Testnutzer wird ueber die Supabase
// Admin API angelegt (siehe PROJ-2-Suite fuer die Begruendung), Test-Clients
// per "QA17-"-Namenspraefix isoliert und in afterAll wieder entfernt.
const EMAIL = `qa-proj17-${Date.now()}@example.com`
const PASSWORD = 'QaPasswort123!'

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const secretKey = process.env.SUPABASE_SECRET_KEY
  if (!url || !secretKey) throw new Error('Supabase env vars missing')
  return createClient(url, secretKey, { auth: { autoRefreshToken: false, persistSession: false } })
}

function anonClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (!url || !anonKey) throw new Error('Supabase env vars missing')
  return createClient(url, anonKey)
}

let userId: string | undefined

test.beforeAll(async () => {
  const supabase = adminClient()
  const { data, error } = await supabase.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
  })
  if (error) throw error
  userId = data.user.id
})

test.afterAll(async () => {
  const supabase = adminClient()
  const { data: testClients } = await supabase
    .from('clients')
    .select('id')
    .ilike('company_name', 'QA17-%')
  const ids = (testClients ?? []).map((c) => c.id)
  if (ids.length > 0) {
    await supabase.from('projects').delete().in('client_id', ids)
    await supabase.from('clients').delete().in('id', ids)
  }
  if (userId) await supabase.auth.admin.deleteUser(userId)
})

test('unauthenticated access to /kunden and /kunden/[id] redirects to /login', async ({
  page,
}) => {
  await page.goto('/kunden')
  await expect(page).toHaveURL(/\/login\?redirect=/)

  await page.goto('/kunden/00000000-0000-0000-0000-000000000000')
  await expect(page).toHaveURL(/\/login\?redirect=/)
})

test('anon Supabase key cannot read or write clients/projects directly (no GRANT for anon)', async () => {
  // Kein GRANT fuer anon (siehe Migration) -> Postgres verweigert schon auf
  // Privilege-Ebene (42501 "permission denied"), RLS kommt gar nicht erst
  // zum Zug. Staerker als ein RLS-gefiltertes leeres Ergebnis.
  const supabase = anonClient()
  const { error: readError } = await supabase.from('clients').select('*')
  expect(readError?.code).toBe('42501')

  const { error: writeError } = await supabase
    .from('clients')
    .insert({ company_name: 'RLS-Bypass-Versuch', contact_email: 'x@example.com' })
  expect(writeError?.code).toBe('42501')
})

test('an authenticated user cannot delete a client/project directly unless it is archived (RLS, regression for BUG-1)', async () => {
  // BUG-1 aus der zweiten /qa-Runde: "erst archivieren, dann loeschen" war
  // anfangs nur in der Server Action durchgesetzt, nicht in der RLS-Policy -
  // per direktem Supabase-Aufruf (mit einer normalen Nutzer-Session, unter
  // Umgehung der Server Action) umgehbar. Migration "enforce_archived_before_delete"
  // hat die DELETE-Policies entsprechend verschaerft.
  const admin = adminClient()
  const { data: client, error: insertError } = await admin
    .from('clients')
    .insert({ company_name: 'QA17-RLS-Delete-Regression', contact_email: 'rls-delete@example.com' })
    .select('id')
    .single()
  if (insertError || !client) throw insertError

  const asUser = anonClient()
  const { error: signInError } = await asUser.auth.signInWithPassword({
    email: EMAIL,
    password: PASSWORD,
  })
  if (signInError) throw signInError

  // Noch aktiv -> RLS liefert 0 betroffene Zeilen statt eines Fehlers, die
  // Zeile bleibt bestehen.
  const { count: activeDeleteCount } = await asUser
    .from('clients')
    .delete({ count: 'exact' })
    .eq('id', client.id)
  expect(activeDeleteCount).toBe(0)

  const { data: stillActive } = await admin
    .from('clients')
    .select('id')
    .eq('id', client.id)
    .maybeSingle()
  expect(stillActive).not.toBeNull()

  // Archiviert -> derselbe Aufruf darf jetzt durchgehen.
  await admin.from('clients').update({ status: 'archived' }).eq('id', client.id)
  const { count: archivedDeleteCount } = await asUser
    .from('clients')
    .delete({ count: 'exact' })
    .eq('id', client.id)
  expect(archivedDeleteCount).toBe(1)
})

test('PROJ-17 full flow: CRUD, duplicate warning, delete-guard, archive, dashboard, search, XSS, mobile', async ({
  page,
}) => {
  const consoleErrors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text())
  })

  await page.goto('/login', { waitUntil: 'networkidle' })
  await page.fill('input[name="email"]', EMAIL)
  await page.fill('input[name="password"]', PASSWORD)
  await page.click('button[type="submit"]')
  await expect(page).toHaveURL('/dashboard')

  // AC9 (Leerzustand bei 0 Kunden) wird hier bewusst nicht erneut geprueft:
  // die Umgebung ist Shared Visibility ueber alle Nutzer und enthaelt
  // inzwischen dauerhaft echte Kunden - ein "0 Kunden gesamt"-Zustand ist
  // hier nicht mehr zuverlaessig herstellbar. AC9 wurde bei der urspruenglichen
  // /qa-Runde gegen eine leere Datenbank bereits verifiziert (siehe QA Test
  // Results in der Spec). Die Such-Leerzustand-Variante ("Keine Kunden
  // gefunden") bleibt unten Teil dieses Tests, die ist umgebungsunabhaengig.
  await page.goto('/kunden', { waitUntil: 'networkidle' })

  // --- AC3: Validierung ---
  await page.click('text=Neuer Kunde')
  await page.click('button:has-text("Kunde anlegen")')
  await expect(page.getByText('Firmenname ist erforderlich')).toBeVisible()
  await expect(page.getByText('Ungültige E-Mail-Adresse')).toBeVisible()

  // --- AC1 + XSS-Sicherheit ---
  await page.fill('input[name="companyName"]', 'QA17-<img src=x onerror=alert(1)> GmbH')
  await page.fill('input[name="contactEmail"]', 'qa17-xss@example.com')
  await page.click('button:has-text("Kunde anlegen")')
  await expect(page).toHaveURL(/\/kunden\/[^/]+\/[^/]+/)
  await expect(page.locator('img[src="x"]')).toHaveCount(0)
  await expect(page.getByText('QA17-<img src=x onerror=alert(1)> GmbH').first()).toBeVisible()

  // --- AC10: Suche ---
  await page.goto('/kunden', { waitUntil: 'networkidle' })
  await page.fill('input[placeholder="Kunden suchen…"]', 'nonexistent-xyz')
  await expect(page.getByText('Keine Kunden gefunden')).toBeVisible()
  await page.fill('input[placeholder="Kunden suchen…"]', 'QA17')
  await expect(page.getByText('QA17-<img src=x onerror=alert(1)> GmbH', { exact: false })).toBeVisible()
  await page.fill('input[placeholder="Kunden suchen…"]', '')

  // --- AC2: Duplikat-Warnung ---
  await page.click('text=Neuer Kunde')
  await page.fill('input[name="companyName"]', 'QA17-Zweitfirma')
  await page.fill('input[name="contactEmail"]', 'QA17-XSS@EXAMPLE.COM') // andere Schreibweise
  await page.click('button:has-text("Kunde anlegen")')
  await expect(page.getByText('Ein Kunde mit dieser E-Mail existiert bereits')).toBeVisible()
  await page.click('button:has-text("Trotzdem anlegen")')
  await expect(page).toHaveURL(/\/kunden\/[^/]+\/[^/]+/)

  // --- AC4: Projektanzahl in /kunden aktualisiert sich nach Anlegen ohne Reload
  // (Next.js Router Cache invalidiert dynamische Routen bei Navigation, geprueft) ---
  await page.goto('/kunden', { waitUntil: 'networkidle' })
  const zweitfirmaRow = page.locator('tr', { hasText: 'QA17-Zweitfirma' })
  await expect(zweitfirmaRow.locator('td').nth(2)).toHaveText('1')

  await zweitfirmaRow.click()
  await page.click('text=Neues Projekt')
  await page.fill('input[name="name"]', 'QA17-Zweites Projekt')
  await page.click('button:has-text("Projekt anlegen")')
  await expect(page).toHaveURL(/\/kunden\/[^/]+\/[^/]+/)

  await page.click('text=Kunden') // Nav-Link, kein page.reload()
  await expect(page).toHaveURL('/kunden')
  await expect(zweitfirmaRow.locator('td').nth(2)).toHaveText('2')

  // --- AC5 + Edge Case: Archivieren laesst Projekte unberuehrt, Reaktivieren ---
  await zweitfirmaRow.getByRole('button', { name: 'Aktionen' }).click()
  await page.click('text=Archivieren')
  await expect(page.locator('tr', { hasText: 'QA17-Zweitfirma' })).toHaveCount(0)

  await page.click('#show-archived')
  const archivedRow = page.locator('tr', { hasText: 'QA17-Zweitfirma' })
  await expect(archivedRow.getByText('Archiviert')).toBeVisible()
  await archivedRow.click()
  await expect(page.locator('tbody tr').first().getByText('Aktiv')).toBeVisible()

  await page.goBack({ waitUntil: 'networkidle' })
  await page.click('#show-archived')
  await archivedRow.getByRole('button', { name: 'Aktionen' }).click()
  await page.click('text=Reaktivieren')
  await expect(page.locator('tr', { hasText: 'QA17-Zweitfirma' }).getByText('Aktiv')).toBeVisible()

  // --- AC6 + AC7: Loesch-Schutz (Kunde hat noch Projekte -> blockiert) ---
  await zweitfirmaRow.getByRole('button', { name: 'Aktionen' }).click()
  await expect(page.getByText('Endgültig löschen').first()).toHaveAttribute('data-disabled', '')
  await page.keyboard.press('Escape')
  await page.getByRole('menu').waitFor({ state: 'hidden' })

  // --- Refine (2026-08-25): Loeschen setzt zusaetzlich voraus, dass bereits
  // archiviert wurde - erst archivieren, dann loeschen, fuer Projekte UND Kunde ---
  await zweitfirmaRow.click()
  await expect(page).toHaveURL(/\/kunden\/[^/]+$/)
  for (let i = 0; i < 2; i++) {
    const row = page.locator('tbody tr').first()
    await row.getByRole('button', { name: 'Aktionen' }).click()
    // Noch aktiv -> Loeschen ist blockiert, unabhaengig von abhaengigen Daten
    await expect(page.getByText('Endgültig löschen').first()).toHaveAttribute('data-disabled', '')
    // Exaktes Menuitem-Match noetig: die Seite hat zusaetzlich den Button
    // "Kunde archivieren", der sonst per Teilstring-Suche mitgetroffen wird.
    await page.getByRole('menuitem', { name: 'Archivieren', exact: true }).click()
    await expect(row.getByText('Archiviert')).toBeVisible()
    await row.getByRole('button', { name: 'Aktionen' }).click()
    await page.click('text=Endgültig löschen')
    await page.click('button:has-text("Endgültig löschen")')
  }
  await expect(page.getByText('Noch keine Projekte für diesen Kunden.')).toBeVisible()

  await page.goto('/kunden', { waitUntil: 'networkidle' })
  await zweitfirmaRow.getByRole('button', { name: 'Aktionen' }).click()
  await page.click('text=Archivieren')
  await expect(page.locator('tr', { hasText: 'QA17-Zweitfirma' })).toHaveCount(0)
  await page.click('#show-archived')
  await zweitfirmaRow.getByRole('button', { name: 'Aktionen' }).click()
  await page.click('text=Endgültig löschen')
  await page.click('button:has-text("Endgültig löschen")')
  await expect(page.locator('tr', { hasText: 'QA17-Zweitfirma' })).toHaveCount(0)

  // --- AC8: Dashboard-Widget ---
  // Zahlen-Muster statt exaktem Wert geprueft: die Umgebung kann bereits
  // echte Kunden/Projekte enthalten (Shared Visibility ueber alle Nutzer),
  // ein fester Erwartungswert waere fragil.
  await page.goto('/dashboard', { waitUntil: 'networkidle' })
  await expect(page.getByText(/\d+ Kunden?, \d+ aktive?s? Projekte?/)).toBeVisible()
  await expect(
    page.getByText('QA17-<img src=x onerror=alert(1)> GmbH', { exact: false }).first()
  ).toBeVisible()
  await expect(page.getByRole('link', { name: 'Alle Kunden ansehen →' })).toBeVisible()

  // --- Mobile 375px ---
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/kunden', { waitUntil: 'networkidle' })
  await expect(page.locator('table')).toBeVisible()
  await page.locator('tr', { hasText: 'QA17-' }).first().click()
  await expect(page.locator('h2', { hasText: 'Projekte' })).toBeVisible()

  expect(consoleErrors, `Konsolenfehler: ${consoleErrors.join('\n')}`).toEqual([])
})
