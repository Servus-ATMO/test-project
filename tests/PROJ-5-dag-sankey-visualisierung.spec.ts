import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import path from 'path'

// PROJ-5 DAG/Sankey-Graph-Visualisierung. Gleiches Muster wie PROJ-3/PROJ-4:
// isolierter Test-Nutzer + "QA5-"-Namenspraefix, in afterAll wieder entfernt.
// Der Graph selbst legt nichts Neues in der DB an (rein lesend) - das Setup
// laeuft deshalb komplett ueber den bestehenden Import- + Anreicherungs-
// Upload-Flow (PROJ-3/PROJ-4), damit ein echter End-to-End-Datenpfad getestet
// wird statt direkt in die Tabellen zu schreiben.
const EMAIL = `qa-proj5-${Date.now()}@example.com`
const PASSWORD = 'QaPasswort123!'

const JOURNEY_VALID = readFileSync(path.join(__dirname, 'fixtures/proj3-journey-valid.md'), 'utf-8')
const KONZEPT_WITH_ORPHAN = readFileSync(
  path.join(__dirname, 'fixtures/proj5-konzept-with-orphan.md'),
  'utf-8'
)
const ENRICHMENT_VALID = readFileSync(path.join(__dirname, 'fixtures/proj4-enrichment-valid.md'), 'utf-8')

// fullyParallel:true respawnt bei einem Testfehlschlag einen frischen Worker
// (fuehrt beforeAll erneut aus) - bei geteiltem Zustand ueber mehrere Tests
// hinweg (ein Test-Projekt fuer alle) fuehrt das sonst zu falschen
// Fehlschlaegen in nachfolgenden Tests (siehe PROJ-4-Regression).
test.describe.configure({ mode: 'serial' })

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const secretKey = process.env.SUPABASE_SECRET_KEY
  if (!url || !secretKey) throw new Error('Supabase env vars missing')
  return createClient(url, secretKey, { auth: { autoRefreshToken: false, persistSession: false } })
}

let userId: string | undefined
let clientId: string | undefined
let projectId: string | undefined

test.beforeAll(async () => {
  const supabase = adminClient()
  const { data, error } = await supabase.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
  })
  if (error) throw error
  userId = data.user.id

  const { data: client, error: clientError } = await supabase
    .from('clients')
    .insert({ company_name: 'QA5-Testkunde', contact_email: 'qa5@example.com' })
    .select('id')
    .single()
  if (clientError || !client) throw clientError
  clientId = client.id

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .insert({ client_id: clientId, name: 'QA5-Testprojekt' })
    .select('id')
    .single()
  if (projectError || !project) throw projectError
  projectId = project.id
})

test.afterAll(async () => {
  const supabase = adminClient()
  if (clientId) {
    const { data: testProjects } = await supabase.from('projects').select('id').eq('client_id', clientId)
    const projectIds = (testProjects ?? []).map((p) => p.id)
    if (projectIds.length > 0) {
      const { data: enrichments } = await supabase.from('enrichments').select('id').in('project_id', projectIds)
      const enrichmentIds = (enrichments ?? []).map((e) => e.id)
      if (enrichmentIds.length > 0) {
        await supabase.from('enrichment_conflicts').delete().in('enrichment_id', enrichmentIds)
        await supabase.from('enrichment_edges').delete().in('enrichment_id', enrichmentIds)
        await supabase.from('enrichment_dimensions').delete().in('enrichment_id', enrichmentIds)
        await supabase.from('enrichment_personas').delete().in('enrichment_id', enrichmentIds)
        await supabase.from('enrichments').delete().in('id', enrichmentIds)
      }
      const { data: imports } = await supabase.from('interview_imports').select('id').in('project_id', projectIds)
      const importIds = (imports ?? []).map((i) => i.id)
      if (importIds.length > 0) {
        const { data: sections } = await supabase.from('import_sections').select('id').in('import_id', importIds)
        const sectionIds = (sections ?? []).map((s) => s.id)
        if (sectionIds.length > 0) {
          const { data: entries } = await supabase.from('import_entries').select('id').in('section_id', sectionIds)
          const entryIds = (entries ?? []).map((e) => e.id)
          if (entryIds.length > 0) {
            await supabase.from('import_fields').delete().in('entry_id', entryIds)
          }
          await supabase.from('import_entries').delete().in('section_id', sectionIds)
        }
        await supabase.from('import_sections').delete().in('import_id', importIds)
      }
      await supabase.from('interview_imports').delete().in('project_id', projectIds)
    }
    await supabase.from('projects').delete().eq('client_id', clientId)
    await supabase.from('clients').delete().eq('id', clientId)
  }
  if (userId) await supabase.auth.admin.deleteUser(userId)
})

test('unauthenticated access to the graph page redirects to /login', async ({ page }) => {
  await page.goto(`/kunden/${clientId}/${projectId}/graph`)
  await expect(page).toHaveURL(/\/login\?redirect=/)
})

async function login(page: import('@playwright/test').Page) {
  await page.goto('/login', { waitUntil: 'networkidle' })
  await page.fill('input[name="email"]', EMAIL)
  await page.fill('input[name="password"]', PASSWORD)
  await page.click('button[type="submit"]')
  await expect(page).toHaveURL('/dashboard')
}

test('AC: no import yet shows a hint with a link to the Import-Werkstatt, not an empty graph', async ({
  page,
}) => {
  await login(page)
  await page.goto(`/kunden/${clientId}/${projectId}/graph`, { waitUntil: 'networkidle' })
  await expect(page.getByText('noch kein Interview-Import vor')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Zur Import-Werkstatt' })).toBeVisible()
  await expect(page.locator('.react-flow')).toHaveCount(0)
})

test('PROJ-5: full flow - import-without-enrichment hint, then full graph with all node/edge/highlight behaviors', async ({
  page,
}) => {
  const consoleErrors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text())
  })
  page.on('pageerror', (err) => consoleErrors.push(err.message))

  await login(page)
  await page.goto(`/kunden/${clientId}/${projectId}`, { waitUntil: 'networkidle' })

  // --- Setup: Import hochladen (Journey + Konzept mit einem verwaisten Block) ---
  await page.setInputFiles('input[type="file"] >> nth=0', {
    name: 'journey-transkript.md',
    mimeType: 'text/markdown',
    buffer: Buffer.from(JOURNEY_VALID),
  })
  await page.setInputFiles('input[type="file"] >> nth=1', {
    name: 'konzept.md',
    mimeType: 'text/markdown',
    buffer: Buffer.from(KONZEPT_WITH_ORPHAN),
  })
  await page.getByRole('button', { name: 'Dateien prüfen' }).click()
  await expect(page.getByText('Vorschau')).toBeVisible()
  await page.getByRole('button', { name: 'Import übernehmen' }).click()
  await expect(page.getByText('Erneut importieren')).toBeVisible({ timeout: 10000 })

  // --- AC: Import vorhanden, aber keine Anreicherung -> Ebene 1+3 unverbunden + Hinweis ---
  await page.goto(`/kunden/${clientId}/${projectId}/graph`, { waitUntil: 'networkidle' })
  await expect(page.getByText('noch keine KI-Anreicherung durchgeführt')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Zur KI-Anreicherung' })).toBeVisible()

  // --- Setup: Anreicherung hochladen ---
  await page.goto(`/kunden/${clientId}/${projectId}`, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: 'Anreicherungs-Prompt erzeugen' }).click()
  await expect(page.locator('textarea')).toBeVisible({ timeout: 10000 })
  await page.setInputFiles('input[type="file"]', {
    name: 'anreicherung-ergebnis.md',
    mimeType: 'text/markdown',
    buffer: Buffer.from(ENRICHMENT_VALID),
  })
  await page.getByRole('button', { name: 'Datei prüfen' }).click()
  await expect(page.getByText('Erkannte Anreicherung')).toBeVisible()
  await page.getByRole('button', { name: 'Anreicherung übernehmen' }).click()
  await expect(page.getByText('Neuen Prompt erzeugen')).toBeVisible({ timeout: 10000 })

  // --- AC: Import + Anreicherung vorhanden -> voller Graph ---
  await page.goto(`/kunden/${clientId}/${projectId}/graph`, { waitUntil: 'networkidle' })
  await expect(page.getByText('Konzept-Graph')).toBeVisible()
  await expect(page.locator('.react-flow')).toBeVisible()

  // --- AC: Themenblock als Hauptknoten, Fragen erst nach Aufklappen sichtbar ---
  await expect(page.getByText('Phase 1–3 – Ziel, Kontext & Herkunft')).toBeVisible()
  await expect(page.getByText('Frage 1', { exact: true })).toHaveCount(0)
  await page.getByText('Phase 1–3 – Ziel, Kontext & Herkunft').click()
  await expect(page.getByText('Frage 1', { exact: true })).toBeVisible()

  // --- AC: explizite Konflikte markieren auch die beiden beteiligten Frage-Knoten ---
  const frage1Node = page.locator('.react-flow__node').filter({ hasText: 'Frage 1' })
  const frage2Node = page.locator('.react-flow__node').filter({ hasText: 'Frage 2' })
  await expect(frage1Node.getByText('Konflikt')).toBeVisible()
  await expect(frage2Node.getByText('Konflikt')).toBeVisible()

  // --- AC: Ebene 2 standardmaessig ausgeblendet, Sammel-/komprimierte Kante trotzdem sichtbar ---
  await expect(page.getByText('Business Goal').first()).toHaveCount(0)
  await expect(page.locator('.react-flow__edge').first()).toBeVisible()

  // --- AC: Ebene-2-Schalter blendet Profildimension-Knoten ein ---
  await page.getByRole('switch').click()
  await expect(page.getByText('Business Goal').first()).toBeVisible()

  // --- AC: Multi-Persona - zwei "Business Goal"-Knoten fuer zwei Personas ---
  const businessGoalNodes = page.locator('.react-flow__node').filter({ hasText: 'Business Goal' })
  await expect(businessGoalNodes).toHaveCount(2)
  await expect(page.getByText('Direktkäufer').first()).toBeVisible()
  await expect(page.getByText('Influencer-Partner').first()).toBeVisible()

  // --- AC: Gap-Dimension zeigt Luecken-Badge statt ausgeblendet zu werden ---
  const gapDimensionNode = businessGoalNodes.filter({ hasText: 'Influencer-Partner' })
  await expect(gapDimensionNode.getByText('Lücke')).toBeVisible()

  // --- AC: Klick auf Profildimension-Knoten -> Dossier zeigt Herkunft + Wirkung ---
  await businessGoalNodes.filter({ hasText: 'Direktkäufer' }).click()
  await expect(page.getByText('Herkunft (Journey-Antworten)')).toBeVisible()
  await expect(page.getByText('Wirkung (geprägte Content-Blöcke)')).toBeVisible()
  await expect(page.getByText('Direktverkauf maximieren')).toBeVisible()
  await expect(page.getByText(/Gewichtung: 3/).first()).toBeVisible()
  await page.getByRole('button', { name: 'Schließen' }).click()

  // --- AC: Klick auf Content-Block -> Dossier zeigt Herkunft rueckwaerts ---
  await page.getByText('Abschnitt 1: Hero').click()
  await expect(page.getByText('Herkunft (prägende Profildimensionen)')).toBeVisible()
  await expect(page.getByText('Der Hero muss den Direktverkauf sofort transportieren.')).toBeVisible()
  await page.getByRole('button', { name: 'Schließen' }).click()

  // --- AC: verwaister Content-Block (keine shapes-Kante) erscheint trotzdem als Knoten ---
  await expect(page.getByText('Abschnitt 3: Newsletter')).toBeVisible()
  await page.getByText('Abschnitt 3: Newsletter').click()
  await expect(page.getByText('Keine Profildimension aus der Anreicherung begründet diesen Block.')).toBeVisible()
  await page.getByRole('button', { name: 'Schließen' }).click()

  // --- AC: konfliktmarkierter Knoten zeigt Konflikt-Beschreibung, keine Loesungsoptionen ---
  const heroConflictBadge = page.locator('.react-flow__node').filter({ hasText: 'Abschnitt 1: Hero' })
  await expect(heroConflictBadge.getByText('Konflikt')).toBeVisible()
  await heroConflictBadge.click()
  await expect(page.getByText('Der Hero muss gleichzeitig auf Direktverkauf und Empfehlungslogik')).toBeVisible()
  await expect(page.getByText('Lösungsoption')).toHaveCount(0)
  await page.getByRole('button', { name: 'Schließen' }).click()

  // --- AC: Klick hebt verbundene Knoten/Kanten hervor (Herkunft/Wirkung-Highlight) ---
  await businessGoalNodes.filter({ hasText: 'Direktkäufer' }).click()
  await expect
    .poll(
      async () =>
        page.locator('.react-flow__edge-path').evaluateAll((paths) =>
          paths.filter((p) => p.getAttribute('style')?.includes('rgb(249, 115, 22)')).length
        ),
      { message: 'erwarte mindestens eine orange hervorgehobene Kante nach Knoten-Klick' }
    )
    .toBeGreaterThan(0)
  await page.getByRole('button', { name: 'Schließen' }).click()

  // --- AC: Ebene 2 wieder ausblenden -> Profildimension-Knoten verschwinden, komprimierte Kante bleibt ---
  await page.getByRole('switch').click()
  await expect(page.getByText('Business Goal').first()).toHaveCount(0)
  await expect(page.locator('.react-flow__edge').first()).toBeVisible()

  expect(consoleErrors, `Konsolenfehler: ${consoleErrors.join('\n')}`).toEqual([])
})

test('mobile viewport (375px): graph page renders and the switch is usable', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 })
  await login(page)
  await page.goto(`/kunden/${clientId}/${projectId}/graph`, { waitUntil: 'networkidle' })
  await expect(page.getByText('Konzept-Graph')).toBeVisible()
  await expect(page.getByRole('switch')).toBeVisible()
  await expect(page.locator('.react-flow')).toBeVisible()
})
