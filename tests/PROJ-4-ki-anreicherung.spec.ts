import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import path from 'path'

// PROJ-4 KI-Anreicherung. Gleiches Setup-Muster wie die PROJ-3-Suite: ein
// Testnutzer wird ueber die Supabase Admin API angelegt, Test-Client/-Projekt
// per "QA4-"-Namenspraefix isoliert und in afterAll wieder entfernt.
const EMAIL = `qa-proj4-${Date.now()}@example.com`
const PASSWORD = 'QaPasswort123!'

const JOURNEY_VALID = readFileSync(path.join(__dirname, 'fixtures/proj3-journey-valid.md'), 'utf-8')
const KONZEPT_VALID = readFileSync(path.join(__dirname, 'fixtures/proj3-konzept-valid.md'), 'utf-8')
const ENRICHMENT_VALID = readFileSync(path.join(__dirname, 'fixtures/proj4-enrichment-valid.md'), 'utf-8')
const ENRICHMENT_INVALID = readFileSync(path.join(__dirname, 'fixtures/proj4-enrichment-invalid.md'), 'utf-8')

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

async function deleteEnrichmentTree(admin: ReturnType<typeof adminClient>, projectId: string) {
  const { data: enrichments } = await admin.from('enrichments').select('id').eq('project_id', projectId)
  const enrichmentIds = (enrichments ?? []).map((e) => e.id)
  if (enrichmentIds.length > 0) {
    await admin.from('enrichment_edges').delete().in('enrichment_id', enrichmentIds)
    await admin.from('enrichment_conflicts').delete().in('enrichment_id', enrichmentIds)
    await admin.from('enrichment_dimensions').delete().in('enrichment_id', enrichmentIds)
    await admin.from('enrichment_personas').delete().in('enrichment_id', enrichmentIds)
    await admin.from('enrichments').delete().in('id', enrichmentIds)
  }
}

async function deleteImportTree(admin: ReturnType<typeof adminClient>, projectId: string) {
  const { data: imports } = await admin.from('interview_imports').select('id').eq('project_id', projectId)
  const importIds = (imports ?? []).map((i) => i.id)
  if (importIds.length > 0) {
    const { data: sections } = await admin.from('import_sections').select('id').in('import_id', importIds)
    const sectionIds = (sections ?? []).map((s) => s.id)
    if (sectionIds.length > 0) {
      const { data: entries } = await admin.from('import_entries').select('id').in('section_id', sectionIds)
      const entryIds = (entries ?? []).map((e) => e.id)
      if (entryIds.length > 0) await admin.from('import_fields').delete().in('entry_id', entryIds)
      await admin.from('import_entries').delete().in('section_id', sectionIds)
    }
    await admin.from('import_sections').delete().in('import_id', importIds)
  }
  await admin.from('interview_imports').delete().eq('project_id', projectId)
}

let userId: string | undefined
let clientId: string | undefined
let projectId: string | undefined

test.describe.configure({ mode: 'serial' })

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
    .insert({ company_name: 'QA4-Testkunde', contact_email: 'qa4@example.com' })
    .select('id')
    .single()
  if (clientError || !client) throw clientError
  clientId = client.id

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .insert({ client_id: clientId, name: 'QA4-Testprojekt' })
    .select('id')
    .single()
  if (projectError || !project) throw projectError
  projectId = project.id
})

test.afterAll(async () => {
  const supabase = adminClient()
  if (clientId && projectId) {
    await deleteEnrichmentTree(supabase, projectId)
    await deleteImportTree(supabase, projectId)
    await supabase.from('projects').delete().eq('client_id', clientId)
    await supabase.from('clients').delete().eq('id', clientId)
  }
  if (userId) await supabase.auth.admin.deleteUser(userId)
})

test('anon Supabase key cannot read/write enrichment tables or execute save_enrichment (no GRANT for anon)', async () => {
  const supabase = anonClient()
  for (const table of [
    'enrichments',
    'enrichment_personas',
    'enrichment_dimensions',
    'enrichment_edges',
    'enrichment_conflicts',
  ]) {
    const { error: readError } = await supabase.from(table).select('*')
    expect(readError?.code, `${table} SELECT`).toBe('42501')
  }
  const { error: writeError } = await supabase.from('enrichments').insert({ project_id: projectId })
  expect(writeError?.code).toBe('42501')

  const { error: rpcError } = await supabase.rpc('save_enrichment', {
    p_project_id: projectId,
    p_source_import_id: null,
    p_raw_result_text: '',
    p_personas: [],
    p_dimensions: [],
    p_edges: [],
    p_conflicts: [],
  })
  expect(rpcError).toBeTruthy()
})

test('save_enrichment() is atomic: a failure partway through leaves no partial rows', async () => {
  const admin = adminClient()
  const dimensionId = '11111111-1111-1111-1111-111111111111'
  const nonExistentFieldId = '22222222-2222-2222-2222-222222222222'

  const { error } = await admin.rpc('save_enrichment', {
    p_project_id: projectId,
    p_source_import_id: null,
    p_raw_result_text: 'atomicity-test',
    p_personas: [],
    p_dimensions: [
      {
        id: dimensionId,
        persona_id: null,
        dimension_name: 'Umsetzungsrahmen',
        value: 'x',
        status: 'found',
        position: 0,
      },
    ],
    // source_field_id verweist auf ein nicht existierendes import_fields, muss
    // die Fremdschluessel-Pruefung verletzen, NACHDEM die Dimension in
    // derselben Funktion bereits eingefuegt wurde.
    p_edges: [
      {
        id: '33333333-3333-3333-3333-333333333333',
        edge_type: 'informs',
        source_field_id: nonExistentFieldId,
        source_dimension_id: null,
        target_dimension_id: dimensionId,
        target_entry_id: null,
        impact_text: 'x',
        weight: 2,
      },
    ],
    p_conflicts: [],
  })
  expect(error).toBeTruthy()

  const { data: enrichment } = await admin.from('enrichments').select('id').eq('project_id', projectId).maybeSingle()
  expect(enrichment).toBeNull()
  const { data: dims } = await admin.from('enrichment_dimensions').select('id').eq('id', dimensionId)
  expect(dims).toHaveLength(0)
})

test('PROJ-4: prompt generation, upload, preview, save, read overview, XSS-safety, replace warning, PROJ-3 cross-feature warning', async ({
  page,
}) => {
  await page.goto('/login', { waitUntil: 'networkidle' })
  await page.fill('input[name="email"]', EMAIL)
  await page.fill('input[name="password"]', PASSWORD)
  await page.click('button[type="submit"]')
  await page.waitForURL('/dashboard', { timeout: 15000 })

  // --- Vorbedingung: Import muss existieren (PROJ-3) ---
  await page.goto(`/kunden/${clientId}/${projectId}`, { waitUntil: 'networkidle' })
  await expect(page.getByRole('button', { name: 'Anreicherungs-Prompt erzeugen' })).toBeDisabled()

  await page.setInputFiles('input[type="file"] >> nth=0', {
    name: 'journey.md',
    mimeType: 'text/markdown',
    buffer: Buffer.from(JOURNEY_VALID),
  })
  await page.setInputFiles('input[type="file"] >> nth=1', {
    name: 'konzept.md',
    mimeType: 'text/markdown',
    buffer: Buffer.from(KONZEPT_VALID),
  })
  await page.click('text=Dateien prüfen')
  await page.click('text=Import übernehmen')
  await expect(page.getByText('Erneut importieren')).toBeVisible({ timeout: 10000 })

  // --- AC: Button aktiv sobald Import existiert ---
  await expect(page.getByRole('button', { name: 'Anreicherungs-Prompt erzeugen' })).toBeEnabled()

  // --- AC: Prompt enthaelt eingebettete Ebene-1/3-Daten + Anleitung ---
  await page.click('text=Anreicherungs-Prompt erzeugen')
  await expect(page.getByText(/eigenen Claude-Account ausführen/)).toBeVisible({ timeout: 10000 })
  const promptTextarea = page.locator('textarea')
  const promptValue = await promptTextarea.inputValue()
  expect(promptValue).toContain('Frage 1')
  expect(promptValue).toContain('Abschnitt 1: Hero')
  expect(promptValue).toContain('Business Goal')
  expect(promptValue).toContain('Umsetzungsrahmen')

  // --- Bugfix-Regression: bereits erzeugter Prompt bleibt nach Reload
  // erhalten (localStorage), muss nicht erneut erzeugt werden ---
  await page.reload({ waitUntil: 'networkidle' })
  await expect(page.locator('textarea')).toHaveValue(promptValue)

  // --- AC: Hard-Fail bei praktisch keiner erkennbaren Struktur ---
  await page.setInputFiles('input[type="file"] >> nth=0', {
    name: 'garbage.md',
    mimeType: 'text/markdown',
    buffer: Buffer.from(ENRICHMENT_INVALID),
  })
  await page.click('text=Datei prüfen')
  await expect(page.getByText('In dieser Datei wurde praktisch keine erkennbare Struktur gefunden.')).toBeVisible({
    timeout: 10000,
  })

  // --- AC: gueltige Ergebnis-Datei -> Vorschau vor dem Speichern ---
  await page.setInputFiles('input[type="file"] >> nth=0', {
    name: 'anreicherung.md',
    mimeType: 'text/markdown',
    buffer: Buffer.from(ENRICHMENT_VALID),
  })
  await page.click('text=Datei prüfen')
  await expect(page.getByText('Anreicherung übernehmen')).toBeVisible({ timeout: 10000 })

  // --- AC: nicht aufloesbare Kanten-Referenz wird als Warnung angezeigt ---
  await expect(page.getByText('Nicht alle Referenzen konnten zugeordnet werden')).toBeVisible()

  // --- Vorschau-Inhalte pruefen: Umsetzungsrahmen (projektweit, sofort sichtbar) ---
  await expect(page.getByText('Bestehendes System, kein festes Budget angegeben')).toBeVisible()

  // Persona-Accordion oeffnen, um Dimensionswerte + "nicht ableitbar" + XSS-Payload zu pruefen
  await page.click('button:has-text("Direktkäufer")')
  await expect(page.getByText('Direktverkauf maximieren')).toBeVisible()
  // XSS-Payload aus der Persona-Beschreibung darf nur als Text erscheinen, kein echtes <img>
  await expect(page.locator('img[src="x"]')).toHaveCount(0)

  await page.click('button:has-text("Influencer-Partner")')
  await expect(page.getByText('nicht ableitbar').first()).toBeVisible()

  // --- AC: Konflikte (explizit + emergent) in der Vorschau sichtbar ---
  await expect(page.getByText('explizit')).toBeVisible()
  await expect(page.getByText('emergent')).toBeVisible()

  // --- Uebernehmen (erster Speichervorgang, kein Replace-Fall) ---
  await page.click('text=Anreicherung übernehmen')
  await expect(page.getByText('Neuen Prompt erzeugen')).toBeVisible({ timeout: 10000 })

  // --- AC: Lese-Uebersicht nach hartem Reload (Daten kommen aus der DB) ---
  await page.reload({ waitUntil: 'networkidle' })
  await expect(page.getByText('Neuen Prompt erzeugen')).toBeVisible()
  await expect(page.getByText('Bestehendes System, kein festes Budget angegeben')).toBeVisible()

  // --- DB-Verifikation: Kanten- und Konflikttypen korrekt gespeichert ---
  const admin = adminClient()
  const { data: enrichment } = await admin.from('enrichments').select('*').eq('project_id', projectId).single()
  expect(enrichment).toBeTruthy()
  const { data: edges } = await admin.from('enrichment_edges').select('*').eq('enrichment_id', enrichment!.id)
  expect(edges!.filter((e) => e.edge_type === 'informs')).toHaveLength(4)
  expect(edges!.filter((e) => e.edge_type === 'shapes')).toHaveLength(2)
  const { data: conflicts } = await admin.from('enrichment_conflicts').select('*').eq('enrichment_id', enrichment!.id)
  expect(conflicts!.find((c) => c.conflict_type === 'explicit')).toBeTruthy()
  const emergent = conflicts!.find((c) => c.conflict_type === 'emergent')
  expect(emergent).toBeTruthy()
  expect(emergent!.involved_dimension_ids).toHaveLength(2)
  const { data: dimensions } = await admin.from('enrichment_dimensions').select('*').eq('enrichment_id', enrichment!.id)
  expect(dimensions!.find((d) => d.dimension_name === 'Business Goal' && d.status === 'gap')).toBeTruthy()

  // --- AC: erneutes Hochladen bei bestehender Anreicherung -> Warnung, Abbrechen laesst Bestand unveraendert ---
  await page.click('text=Neuen Prompt erzeugen')
  await page.click('text=Anreicherungs-Prompt erzeugen')
  await page.setInputFiles('input[type="file"] >> nth=0', {
    name: 'anreicherung-2.md',
    mimeType: 'text/markdown',
    buffer: Buffer.from(ENRICHMENT_VALID),
  })
  await page.click('text=Datei prüfen')
  await page.click('text=Anreicherung übernehmen')
  await expect(page.getByText('Bestehende Anreicherung ersetzen')).toBeVisible({ timeout: 10000 })
  await page.click('text=Abbrechen')
  await expect(page.getByText('Neuen Prompt erzeugen')).toBeVisible({ timeout: 10000 })
  const { data: enrichmentAfterCancel } = await admin
    .from('enrichments')
    .select('id, updated_at')
    .eq('project_id', projectId)
    .single()
  expect(enrichmentAfterCancel!.id).toBe(enrichment!.id)
  expect(enrichmentAfterCancel!.updated_at).toBe(enrichment!.updated_at)

  // --- AC: Bestaetigung ersetzt die Anreicherung vollstaendig ---
  await page.click('text=Neuen Prompt erzeugen')
  await page.click('text=Anreicherungs-Prompt erzeugen')
  await page.setInputFiles('input[type="file"] >> nth=0', {
    name: 'anreicherung-3.md',
    mimeType: 'text/markdown',
    buffer: Buffer.from(ENRICHMENT_VALID),
  })
  await page.click('text=Datei prüfen')
  await page.click('text=Anreicherung übernehmen')
  await expect(page.getByText('Bestehende Anreicherung ersetzen')).toBeVisible({ timeout: 10000 })
  await page.click('text=Trotzdem übernehmen')
  await expect(page.getByText('Neuen Prompt erzeugen')).toBeVisible({ timeout: 10000 })

  const { data: enrichmentAfterReplace } = await admin
    .from('enrichments')
    .select('id')
    .eq('project_id', projectId)
    .single()
  expect(enrichmentAfterReplace!.id).toBe(enrichment!.id) // gleiche Zeile (Upsert per project_id), nicht dupliziert
  const { data: personasAfterReplace } = await admin
    .from('enrichment_personas')
    .select('id')
    .eq('enrichment_id', enrichment!.id)
  expect(personasAfterReplace).toHaveLength(2) // Ersatz, keine Verdopplung

  // --- AC: PROJ-3 Re-Import warnt jetzt vor abhaengigen Daten (echte Pruefung statt Stub) ---
  await page.goto(`/kunden/${clientId}/${projectId}`, { waitUntil: 'networkidle' })
  await page.click('text=Erneut importieren')
  await page.setInputFiles('input[type="file"] >> nth=0', {
    name: 'journey.md',
    mimeType: 'text/markdown',
    buffer: Buffer.from(JOURNEY_VALID),
  })
  await page.setInputFiles('input[type="file"] >> nth=1', {
    name: 'konzept.md',
    mimeType: 'text/markdown',
    buffer: Buffer.from(KONZEPT_VALID),
  })
  await page.click('text=Dateien prüfen')
  await page.click('text=Import übernehmen')
  await expect(page.getByText(/abhängige Daten/)).toBeVisible({ timeout: 10000 })
})

test('mobile viewport (375px): enrichment panel renders usably', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/login', { waitUntil: 'networkidle' })
  await page.fill('input[name="email"]', EMAIL)
  await page.fill('input[name="password"]', PASSWORD)
  await page.click('button[type="submit"]')
  await page.waitForURL('/dashboard', { timeout: 15000 })
  await page.goto(`/kunden/${clientId}/${projectId}`, { waitUntil: 'networkidle' })
  await expect(page.getByRole('heading', { name: 'KI-Anreicherung' })).toBeVisible()
  await page.click('button:has-text("Direktkäufer")')
  await expect(page.getByText('Direktverkauf maximieren')).toBeVisible()
})
