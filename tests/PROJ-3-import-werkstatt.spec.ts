import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import path from 'path'

// PROJ-3 Import-Werkstatt. Ein Testnutzer wird ueber die Supabase Admin API
// angelegt (siehe PROJ-2-Suite fuer die Begruendung), Test-Clients/-Projekte
// per "QA3-"-Namenspraefix isoliert und in afterAll wieder entfernt.
//
// Neugeschrieben fuer die Ein-Datei-Umstellung (`/refine`+`/backend`,
// 2026-08-28): ein Upload-Slot statt zwei, kombinierte Datei statt getrennter
// Journey-/Konzept-Dateien. Siehe PROJ-3-Spec, Decision Log.
const EMAIL = `qa-proj3-${Date.now()}@example.com`
const PASSWORD = 'QaPasswort123!'

const JOURNEY_VALID = readFileSync(path.join(__dirname, 'fixtures/proj3-journey-valid.md'), 'utf-8')
const KONZEPT_VALID = readFileSync(path.join(__dirname, 'fixtures/proj3-konzept-valid.md'), 'utf-8')
const COMBINED_VALID = readFileSync(
  path.join(__dirname, 'fixtures/proj3-interview-import-valid.md'),
  'utf-8'
)
const COMBINED_SWAPPED_ORDER = readFileSync(
  path.join(__dirname, 'fixtures/proj3-interview-import-swapped-order.md'),
  'utf-8'
)
const COMBINED_REAL_FORMAT = readFileSync(
  path.join(__dirname, 'fixtures/proj3-interview-import-real-format.md'),
  'utf-8'
)

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

// fullyParallel:true respawnt bei einem Testfehlschlag einen frischen Worker
// (fuehrt beforeAll erneut aus) - bei geteiltem Zustand ueber mehrere Tests
// hinweg (ein Test-Projekt fuer alle) fuehrt das sonst zu falschen
// Fehlschlaegen in nachfolgenden Tests (etabliertes Muster, siehe PROJ-4/PROJ-5).
test.describe.configure({ mode: 'serial' })

async function login(page: import('@playwright/test').Page) {
  await page.goto('/login', { waitUntil: 'networkidle' })
  await page.fill('input[name="email"]', EMAIL)
  await page.fill('input[name="password"]', PASSWORD)
  await page.click('button[type="submit"]')
  await expect(page).toHaveURL('/dashboard')
}

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
    .insert({ company_name: 'QA3-Testkunde', contact_email: 'qa3@example.com' })
    .select('id')
    .single()
  if (clientError || !client) throw clientError
  clientId = client.id

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .insert({ client_id: clientId, name: 'QA3-Testprojekt' })
    .select('id')
    .single()
  if (projectError || !project) throw projectError
  projectId = project.id
})

test.afterAll(async () => {
  const supabase = adminClient()
  if (clientId) {
    const { data: testProjects } = await supabase.from('projects').select('id').eq('client_id', clientId)
    for (const p of testProjects ?? []) {
      await supabase.from('enrichments').delete().eq('project_id', p.id)
      await deleteImportTree(supabase, p.id)
    }
    await supabase.from('projects').delete().eq('client_id', clientId)
    await supabase.from('clients').delete().eq('id', clientId)
  }
  if (userId) await supabase.auth.admin.deleteUser(userId)
})

test('unauthenticated access to a project page redirects to /login', async ({ page }) => {
  await page.goto(`/kunden/${clientId}/${projectId}`)
  await expect(page).toHaveURL(/\/login\?redirect=/)
})

test('anon Supabase key cannot read or write import tables directly (no GRANT for anon)', async () => {
  const supabase = anonClient()
  for (const table of ['interview_imports', 'import_sections', 'import_entries', 'import_fields']) {
    const { error: readError } = await supabase.from(table).select('*')
    expect(readError?.code, `${table} SELECT`).toBe('42501')
  }
  const { error: writeError } = await supabase
    .from('interview_imports')
    .insert({ project_id: projectId, raw_file_path: 'x' })
  expect(writeError?.code).toBe('42501')
})

test('anon Supabase key cannot execute save_interview_import() directly (regression: DROP+CREATE grant reset during the one-file migration)', async () => {
  // Waehrend der Ein-Datei-Migration (2026-08-28) hat ein DROP FUNCTION +
  // CREATE OR REPLACE FUNCTION den zuvor bewusst gesetzten
  // REVOKE EXECUTE ... FROM PUBLIC zurueckgesetzt (Postgres-Standardverhalten:
  // neue Funktionen bekommen implizit EXECUTE fuer PUBLIC, wovon anon erbt).
  // Wurde noch waehrend /backend per has_function_privilege bemerkt und mit
  // einer Folgemigration korrigiert - permanenter Regressionstest dafuer,
  // damit ein kuenftiges DROP+CREATE denselben Fehler nicht unbemerkt wieder
  // einfuehrt.
  const supabase = anonClient()
  const { error } = await supabase.rpc('save_interview_import', {
    p_project_id: projectId,
    p_raw_file_path: 'x',
    p_journey_datum: '',
    p_journey_gefuehrt_mit: '',
    p_journey_prompt_version: '',
    p_konzept_datum: '',
    p_konzept_erstellt_mit: '',
    p_imported_at: new Date().toISOString(),
    p_sections: [],
    p_entries: [],
    p_fields: [],
  })
  expect(error).toBeTruthy()
  expect(error?.code).toBe('42501')
})

test('save_interview_import() is atomic: a failure partway through leaves no partial rows (regression for BUG-1)', async () => {
  // BUG-1 aus der ersten /qa-Runde: saveImport() schrieb interview_imports/
  // import_sections/import_entries/import_fields urspruenglich als mehrere
  // unabhaengige, nicht transaktionale Inserts - ein Fehler mitten im Vorgang
  // konnte Teildaten dauerhaft hinterlassen (verletzte die AC "keine
  // Teildaten uebernehmen"). Fix: die Postgres-Funktion save_interview_import()
  // buendelt den gesamten strukturierten Speichervorgang in einer DB-
  // Transaktion. Provoziert hier gezielt einen Fehler NACH dem (innerhalb der
  // Funktion erfolgreichen) Einfuegen von import_sections, aber WAEHREND
  // import_entries (Fremdschluessel-Verletzung durch eine bewusst falsche
  // section_id) - und prueft, dass trotzdem GAR NICHTS committet wurde.
  const admin = adminClient()
  const fakeSectionId = '11111111-1111-1111-1111-111111111111'
  const mismatchedEntrySectionId = '99999999-9999-9999-9999-999999999999'

  const { error } = await admin.rpc('save_interview_import', {
    p_project_id: projectId,
    p_raw_file_path: 'test/interview-import.md',
    p_journey_datum: '2026-08-27',
    p_journey_gefuehrt_mit: 'Test',
    p_journey_prompt_version: 'v2',
    p_konzept_datum: '2026-08-27',
    p_konzept_erstellt_mit: 'Test',
    p_imported_at: new Date().toISOString(),
    p_sections: [{ id: fakeSectionId, document: 'journey', name: 'Test-Abschnitt', position: 0 }],
    p_entries: [{ id: '22222222-2222-2222-2222-222222222222', section_id: mismatchedEntrySectionId, label: '', position: 0 }],
    p_fields: [],
  })
  expect(error).not.toBeNull()

  const { data: importRow } = await admin
    .from('interview_imports')
    .select('id')
    .eq('project_id', projectId)
    .maybeSingle()
  expect(importRow).toBeNull()

  const { data: orphanSection } = await admin
    .from('import_sections')
    .select('id')
    .eq('id', fakeSectionId)
    .maybeSingle()
  expect(orphanSection).toBeNull()
})

test('missing block: a file with only the Journey block shows a clear warning instead of a silent half-empty preview, gated behind explicit acknowledgement', async ({
  page,
}) => {
  await login(page)
  await page.goto(`/kunden/${clientId}/${projectId}`, { waitUntil: 'networkidle' })

  // Deckt gleichzeitig die dokumentierte Edge Case "altes Zwei-Datei-Format
  // hochgeladen" ab: eine reine Journey-Transkript.md (wie sie im alten
  // Format als eigene Datei existierte) wird jetzt genau als "ein Block
  // fehlt" erkannt, nicht als Sonderfall des alten Formats.
  await page.setInputFiles('input[type="file"]', {
    name: 'journey-transkript.md',
    mimeType: 'text/markdown',
    buffer: Buffer.from(JOURNEY_VALID),
  })
  await page.getByRole('button', { name: 'Datei prüfen' }).click()

  await expect(page.getByText('Block fehlt')).toBeVisible()
  await expect(page.getByText('In dieser Datei wurde kein Landingpage-Konzept-Block gefunden.')).toBeVisible()
  // Bestaetigen-Button darf erst nach explizitem "Trotzdem fortfahren" auftauchen.
  await expect(page.getByRole('button', { name: 'Import übernehmen' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Trotzdem fortfahren' })).toBeVisible()

  await page.getByRole('button', { name: 'Abbrechen' }).click()

  // Umgekehrte Richtung: nur Konzept-Block -> Journey wird als fehlend gemeldet.
  await page.setInputFiles('input[type="file"]', {
    name: 'konzept.md',
    mimeType: 'text/markdown',
    buffer: Buffer.from(KONZEPT_VALID),
  })
  await page.getByRole('button', { name: 'Datei prüfen' }).click()
  await expect(page.getByText('In dieser Datei wurde kein Journey-Transkript-Block gefunden.')).toBeVisible()

  await page.getByRole('button', { name: 'Trotzdem fortfahren' }).click()
  await expect(page.getByRole('button', { name: 'Import übernehmen' })).toBeVisible()
  await page.getByRole('button', { name: 'Abbrechen' }).click()
})

test('missing block: proceeding anyway ("Trotzdem fortfahren") actually saves correctly with the missing block as an empty document, no crash', async ({
  page,
}) => {
  // Eigenes isoliertes Projekt, um den geteilten Zustand der anderen Tests
  // nicht zu beruehren. Prueft konkret, dass splitCombinedImport() + die
  // parseJourney('')/parseKonzept('')-Leerfaelle bis zum tatsaechlichen
  // Speichern durchlaufen, ohne dass save_interview_import() an einem leeren
  // p_sections/p_entries/p_fields-Array fuer den fehlenden Block scheitert -
  // ein komplett neuer Codepfad seit der Ein-Datei-Umstellung, der noch nie
  // bis zum Speichern durchgetestet wurde.
  const admin = adminClient()
  const { data: client } = await admin
    .from('clients')
    .insert({ company_name: 'QA3-MissingBlockSave-Testkunde', contact_email: 'qa3-mb@example.com' })
    .select('id')
    .single()
  const { data: project } = await admin
    .from('projects')
    .insert({ client_id: client!.id, name: 'QA3-MissingBlockSave-Testprojekt' })
    .select('id')
    .single()

  await login(page)
  await page.goto(`/kunden/${client!.id}/${project!.id}`, { waitUntil: 'networkidle' })
  await page.setInputFiles('input[type="file"]', {
    name: 'journey-only.md',
    mimeType: 'text/markdown',
    buffer: Buffer.from(JOURNEY_VALID),
  })
  await page.getByRole('button', { name: 'Datei prüfen' }).click()
  await page.getByRole('button', { name: 'Trotzdem fortfahren' }).click()
  await page.getByRole('button', { name: 'Import übernehmen' }).click()
  await expect(page.getByText('Erneut importieren')).toBeVisible({ timeout: 10000 })

  const { data: importRow } = await admin
    .from('interview_imports')
    .select('id')
    .eq('project_id', project!.id)
    .single()
  expect(importRow).not.toBeNull()

  const { data: sections } = await admin
    .from('import_sections')
    .select('document')
    .eq('import_id', importRow!.id)
  expect(sections!.length).toBeGreaterThan(0)
  expect(sections!.every((s) => s.document === 'journey')).toBe(true)

  await deleteImportTree(admin, project!.id)
  await admin.from('projects').delete().eq('id', project!.id)
  await admin.from('clients').delete().eq('id', client!.id)
})

test('no recognizable structure at all: hard-fail instead of an empty preview', async ({ page }) => {
  await login(page)
  await page.goto(`/kunden/${clientId}/${projectId}`, { waitUntil: 'networkidle' })

  await page.setInputFiles('input[type="file"]', {
    name: 'unrelated.md',
    mimeType: 'text/markdown',
    buffer: Buffer.from('Dies ist irgendein Text ohne jede erkennbare Struktur.\n\nEinfach nur Prosa.'),
  })
  await page.getByRole('button', { name: 'Datei prüfen' }).click()
  await expect(
    page.getByText('In dieser Datei wurde praktisch keine erkennbare Struktur gefunden.')
  ).toBeVisible()
})

test('non-.md file is rejected with an error message', async ({ page }) => {
  await login(page)
  await page.goto(`/kunden/${clientId}/${projectId}`, { waitUntil: 'networkidle' })

  await page.setInputFiles('input[type="file"]', {
    name: 'interview-import.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('irrelevant'),
  })
  await expect(page.getByText('Nur .md-Dateien werden unterstützt.')).toBeVisible()
})

test('5-MB file size limit is enforced', async ({ page }) => {
  await login(page)
  await page.goto(`/kunden/${clientId}/${projectId}`, { waitUntil: 'networkidle' })

  const big = Buffer.alloc(5 * 1024 * 1024 + 1, 'a')
  await page.setInputFiles('input[type="file"]', {
    name: 'interview-import.md',
    mimeType: 'text/markdown',
    buffer: big,
  })
  await expect(page.getByText('Die Datei ist größer als 5 MB.')).toBeVisible()
})

test('block order does not matter: Konzept before Journey is split and parsed correctly', async ({ page }) => {
  await login(page)
  await page.goto(`/kunden/${clientId}/${projectId}`, { waitUntil: 'networkidle' })

  await page.setInputFiles('input[type="file"]', {
    name: 'interview-import.md',
    mimeType: 'text/markdown',
    buffer: Buffer.from(COMBINED_SWAPPED_ORDER),
  })
  await page.getByRole('button', { name: 'Datei prüfen' }).click()
  await expect(page.getByRole('heading', { name: 'Vorschau' })).toBeVisible()
  await expect(page.getByText('Block fehlt')).toHaveCount(0)
  await expect(page.getByText('Journey-Transkript').first()).toBeVisible()
  await expect(page.getByText('Konzept', { exact: true })).toBeVisible()

  // Beide Bloecke muessen trotz vertauschter Reihenfolge korrekt geparst sein.
  await page.getByRole('button', { name: 'Einstieg' }).click()
  await expect(page.getByText(/nachhaltige Trinkflaschen/)).toBeVisible()
})

test('PROJ-3: full one-file flow - upload, preview, confirm, read overview, re-import, delete protection', async ({
  page,
}) => {
  const consoleErrors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text())
  })

  await login(page)
  await page.goto(`/kunden/${clientId}/${projectId}`, { waitUntil: 'networkidle' })

  // --- Nur EIN Upload-Slot existiert jetzt ---
  await expect(page.locator('input[type="file"]')).toHaveCount(1)

  // --- gueltiger kombinierter Upload -> Vorschau mit Luecken-Markierung ---
  await page.setInputFiles('input[type="file"]', {
    name: 'interview-import.md',
    mimeType: 'text/markdown',
    buffer: Buffer.from(COMBINED_VALID),
  })
  await page.getByRole('button', { name: 'Datei prüfen' }).click()
  await expect(page.getByRole('heading', { name: 'Vorschau' })).toBeVisible()
  await expect(page.getByText('Block fehlt')).toHaveCount(0)

  // Frage 3 hat bewusst keine Antwort -> muss als Luecke markiert sein.
  await page.getByRole('button', { name: /Phase 1–3/ }).click()
  await expect(page.getByText('Lücke — nicht angegeben').first()).toBeVisible()

  // Sicherheit: eingeschleustes Markup in einer Antwort darf nicht als
  // echtes <img> gerendert werden (React escaped standardmaessig).
  await page.getByRole('button', { name: 'Einstieg' }).click()
  await expect(page.locator('img[src="x"]')).toHaveCount(0)
  await expect(page.getByText(/nachhaltige Trinkflaschen/)).toBeVisible()

  // Edge Case: "entfällt" ist ein bewusst leerer Wert, keine Luecke.
  await page.getByRole('button', { name: /3\. Strategisches Fundament/ }).click()
  const differenzierungRow = page.locator('div', { hasText: 'Differenzierung:' }).last()
  await expect(differenzierungRow.getByText('entfällt')).toBeVisible()

  await page.getByRole('button', { name: 'Import übernehmen' }).click()
  await expect(page.getByText('Erneut importieren')).toBeVisible({ timeout: 10000 })

  // --- Lese-Uebersicht kommt nach hartem Reload aus der DB, nicht aus Client-State ---
  await page.reload({ waitUntil: 'networkidle' })
  await expect(page.getByText('Erneut importieren')).toBeVisible()
  await expect(page.getByText('Journey-Transkript').first()).toBeVisible()
  await expect(page.getByText('Konzept', { exact: true })).toBeVisible()

  // --- Datenbank + Storage direkt verifiziert ---
  const admin = adminClient()
  const { data: importRow } = await admin
    .from('interview_imports')
    .select('id, raw_file_path')
    .eq('project_id', projectId)
    .single()
  expect(importRow).not.toBeNull()
  expect(importRow!.raw_file_path).toBe(`${projectId}/interview-import.md`)
  const importId = importRow!.id

  const { data: sections, count: sectionCount } = await admin
    .from('import_sections')
    .select('id', { count: 'exact' })
    .eq('import_id', importId)
  expect(sectionCount).toBeGreaterThan(5)

  const sectionIds = (sections ?? []).map((s) => s.id)
  const { data: entries } = await admin.from('import_entries').select('id').in('section_id', sectionIds)
  const entryIds = (entries ?? []).map((e) => e.id)
  const { count: fieldCount } = await admin
    .from('import_fields')
    .select('id', { count: 'exact', head: true })
    .in('entry_id', entryIds)
  expect(fieldCount ?? 0).toBeGreaterThan(30)

  const { data: rawFile, error: downloadError } = await admin.storage
    .from('imports')
    .download(`${projectId}/interview-import.md`)
  expect(downloadError).toBeNull()
  const rawText = await rawFile?.text()
  expect(rawText).toContain('nachhaltige Trinkflaschen')
  expect(rawText).toContain('# Journey-Transkript')
  expect(rawText).toContain('# Landingpage-Konzept')

  // Alte Zwei-Datei-Pfade duerfen nicht mehr existieren.
  const { data: listing } = await admin.storage.from('imports').list(projectId!)
  const names = (listing ?? []).map((f) => f.name)
  expect(names).toContain('interview-import.md')
  expect(names).not.toContain('journey-transkript.md')
  expect(names).not.toContain('konzept.md')

  // --- Re-Import ersetzt bestehende Struktur (gleicher Import-Datensatz) ---
  await page.getByRole('button', { name: 'Erneut importieren' }).click()
  const combinedV2 = COMBINED_VALID.replace('Frage 10', 'Frage 10 (Version 2)')
  await page.setInputFiles('input[type="file"]', {
    name: 'interview-import.md',
    mimeType: 'text/markdown',
    buffer: Buffer.from(combinedV2),
  })
  await page.getByRole('button', { name: 'Datei prüfen' }).click()
  await expect(
    page.getByText('Der bestehende Import dieses Projekts wird durch diese Version ersetzt.')
  ).toBeVisible()
  await page.getByRole('button', { name: 'Import übernehmen' }).click()
  await expect(page.getByText('Erneut importieren')).toBeVisible({ timeout: 10000 })

  const { data: importRow2 } = await admin
    .from('interview_imports')
    .select('id')
    .eq('project_id', projectId)
    .single()
  expect(importRow2!.id).toBe(importId)

  const { count: sectionCount2 } = await admin
    .from('import_sections')
    .select('id', { count: 'exact', head: true })
    .eq('import_id', importId)
  expect(sectionCount2).toBe(sectionCount)

  // --- Cross-Feature (PROJ-17): deleteProject blockiert, solange ein Import existiert ---
  await admin.from('projects').update({ status: 'archived' }).eq('id', projectId)
  await page.goto(`/kunden/${clientId}`, { waitUntil: 'networkidle' })
  await page.locator('tr', { hasText: 'QA3-Testprojekt' }).getByRole('button', { name: 'Aktionen' }).click()
  await page.click('text=Endgültig löschen')
  await page.click('button:has-text("Endgültig löschen")')
  await expect(page.getByText('Dieses Projekt hat einen Interview-Import')).toBeVisible()
  const { data: stillExists } = await admin.from('projects').select('id').eq('id', projectId).maybeSingle()
  expect(stillExists).not.toBeNull()
  await admin.from('projects').update({ status: 'active' }).eq('id', projectId)

  expect(consoleErrors, `Konsolenfehler: ${consoleErrors.join('\n')}`).toEqual([])
})

test('PROJ-3: Journey-Fragen im realen Prompt-Output-Format werden korrekt geparst (Regression BUG-3)', async ({
  page,
}) => {
  // Bug-Report vom Nutzer anhand echter Kundendaten (2026-08-28): der externe
  // Interview-Prompt gibt Fragen tatsaechlich als Freitext-Absatz ohne
  // "**Gestellt:**"-Label aus, Optionen als rohe "A) ..."-Zeilen, und die
  // Antwort unter "**Gewählte Antwort:**" statt "**Antwort:**" - der alte
  // Parser markierte dadurch Gestellt/Antwort faelschlich als Luecke, obwohl
  // die Datei inhaltlich vollstaendig war. Siehe PROJ-3-Spec, "BUG-3". Als
  // eine kombinierte Datei (Journey im echten Format + gueltiges Konzept)
  // hochgeladen, da es seit der Ein-Datei-Umstellung nur einen Slot gibt.
  await login(page)
  await page.goto(`/kunden/${clientId}/${projectId}`, { waitUntil: 'networkidle' })
  const reimportButton = page.getByRole('button', { name: 'Erneut importieren' })
  if (await reimportButton.isVisible()) await reimportButton.click()

  await page.setInputFiles('input[type="file"]', {
    name: 'interview-import.md',
    mimeType: 'text/markdown',
    buffer: Buffer.from(COMBINED_REAL_FORMAT),
  })
  await page.getByRole('button', { name: 'Datei prüfen' }).click()
  await expect(page.getByRole('heading', { name: 'Vorschau' })).toBeVisible()

  await page.getByRole('button', { name: /Phase 1–3/ }).click()

  // Jeder Frage-Eintrag ist ein eigener ".border-l-2"-Container (siehe
  // parsed-document-view.tsx) - darauf skopiert statt auf einzelne
  // dt/dd-Zeilen, da "Gestellt:"/"Antwort:" bei mehreren Fragen vorkommen.
  const frage1 = page.locator('div.border-l-2', { has: page.getByText('Frage 1', { exact: true }) })
  await expect(frage1).toContainText('Wer soll über die Landingpage in erster Linie erreicht werden?')
  await expect(frage1).toContainText('A) Privatkunden')
  await expect(frage1).toContainText('Privatkunden und Wiederverkäufer gleichermaßen')
  await expect(frage1).not.toContainText('Lücke — nicht angegeben')
  await expect(frage1).not.toContainText('Gewählte Antwort')

  // Frage 3 blieb bewusst unbeantwortet -> muss weiterhin als echte Luecke erkannt werden.
  const frage3 = page.locator('div.border-l-2', { has: page.getByText('Frage 3', { exact: true }) })
  await expect(frage3).toContainText('Lücke — nicht angegeben')
})

test('dependent-data warning: re-importing over an import with existing PROJ-4 enrichment requires explicit acknowledgement', async ({
  page,
}) => {
  // AC "existieren bereits abhaengige Daten (z. B. Ebene-2-Anreicherung aus
  // PROJ-4)": seit PROJ-4 deployt ist, ist hasDependentImportData() kein Stub
  // mehr (siehe src/lib/enrichment/queries.ts, hasEnrichmentForProject).
  // Eigenes, isoliertes Projekt, um die Haupt-Flow-Tests oben nicht zu
  // beeinflussen. Die Anreicherungs-Zeile wird direkt per Admin-Client
  // angelegt (Praeconditions muessen nicht ueber die volle PROJ-4-UI
  // aufgebaut werden) - die eigentliche End-to-End-Bestaetigung dieses
  // Verhaltens ueber den echten PROJ-4-Upload-Flow lebt bereits in
  // tests/PROJ-4-ki-anreicherung.spec.ts.
  const admin = adminClient()
  const { data: client } = await admin
    .from('clients')
    .insert({ company_name: 'QA3-DependentData-Testkunde', contact_email: 'qa3-dep@example.com' })
    .select('id')
    .single()
  const { data: project } = await admin
    .from('projects')
    .insert({ client_id: client!.id, name: 'QA3-DependentData-Testprojekt' })
    .select('id')
    .single()

  await login(page)
  await page.goto(`/kunden/${client!.id}/${project!.id}`, { waitUntil: 'networkidle' })
  await page.setInputFiles('input[type="file"]', {
    name: 'interview-import.md',
    mimeType: 'text/markdown',
    buffer: Buffer.from(COMBINED_VALID),
  })
  await page.getByRole('button', { name: 'Datei prüfen' }).click()
  await page.getByRole('button', { name: 'Import übernehmen' }).click()
  await expect(page.getByText('Erneut importieren')).toBeVisible({ timeout: 10000 })

  const { data: importBefore } = await admin
    .from('interview_imports')
    .select('id, updated_at')
    .eq('project_id', project!.id)
    .single()

  await admin.from('enrichments').insert({ project_id: project!.id, raw_result_text: 'qa-test' })

  await page.getByRole('button', { name: 'Erneut importieren' }).click()
  await page.setInputFiles('input[type="file"]', {
    name: 'interview-import-v2.md',
    mimeType: 'text/markdown',
    buffer: Buffer.from(COMBINED_VALID),
  })
  await page.getByRole('button', { name: 'Datei prüfen' }).click()
  await page.getByRole('button', { name: 'Import übernehmen' }).click()
  await expect(page.getByText(/abhängige Daten/)).toBeVisible({ timeout: 10000 })

  // Abbrechen laesst den bestehenden Import unveraendert (fuehrt zurueck in
  // den leeren Upload-Zustand, nicht in die Lese-Uebersicht - siehe
  // ImportPanel.handleCancel(), setzt showUpload nicht zurueck).
  await page.getByRole('button', { name: 'Abbrechen' }).click()
  await expect(page.getByRole('heading', { name: 'Interview-Import' })).toBeVisible()

  const { data: importAfterCancel } = await admin
    .from('interview_imports')
    .select('id, updated_at')
    .eq('project_id', project!.id)
    .single()
  expect(importAfterCancel!.id).toBe(importBefore!.id)
  expect(importAfterCancel!.updated_at).toBe(importBefore!.updated_at)

  await admin.from('enrichments').delete().eq('project_id', project!.id)
  await deleteImportTree(admin, project!.id)
  await admin.from('projects').delete().eq('id', project!.id)
  await admin.from('clients').delete().eq('id', client!.id)
})
