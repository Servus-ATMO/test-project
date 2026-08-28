import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import path from 'path'

// PROJ-3 Import-Werkstatt. Ein Testnutzer wird ueber die Supabase Admin API
// angelegt (siehe PROJ-2-Suite fuer die Begruendung), Test-Clients/-Projekte
// per "QA3-"-Namenspraefix isoliert und in afterAll wieder entfernt.
const EMAIL = `qa-proj3-${Date.now()}@example.com`
const PASSWORD = 'QaPasswort123!'

const JOURNEY_VALID = readFileSync(path.join(__dirname, 'fixtures/proj3-journey-valid.md'), 'utf-8')
const KONZEPT_VALID = readFileSync(path.join(__dirname, 'fixtures/proj3-konzept-valid.md'), 'utf-8')
const JOURNEY_REAL_FORMAT = readFileSync(
  path.join(__dirname, 'fixtures/proj3-journey-real-format.md'),
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
    const projectIds = (testProjects ?? []).map((p) => p.id)
    if (projectIds.length > 0) {
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

test('save_interview_import() is atomic: a failure partway through leaves no partial rows (regression for BUG-1)', async () => {
  // BUG-1 aus der ersten /qa-Runde: saveImport() schrieb interview_imports/
  // import_sections/import_entries/import_fields urspruenglich als mehrere
  // unabhaengige, nicht transaktionale Inserts - ein Fehler mitten im Vorgang
  // konnte Teildaten dauerhaft hinterlassen (verletzte AC-11 "keine Teildaten
  // uebernehmen"). Fix: die Postgres-Funktion save_interview_import() buendelt
  // den gesamten strukturierten Speichervorgang in einer DB-Transaktion.
  // Provoziert hier gezielt einen Fehler NACH dem (innerhalb der Funktion
  // erfolgreichen) Einfuegen von import_sections, aber WAEHREND import_entries
  // (Fremdschluessel-Verletzung durch eine bewusst falsche section_id) - und
  // prueft, dass trotzdem GAR NICHTS committet wurde.
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

test('PROJ-3: Upload, Validierung, Vorschau, Übernahme, Lese-Übersicht, Re-Import, Löschschutz', async ({
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

  await page.goto(`/kunden/${clientId}/${projectId}`, { waitUntil: 'networkidle' })

  // --- AC2: nur eine Datei ausgewählt -> Hinweis + Button deaktiviert ---
  await page.setInputFiles('input[type="file"] >> nth=0', {
    name: 'journey-transkript.md',
    mimeType: 'text/markdown',
    buffer: Buffer.from(JOURNEY_VALID),
  })
  await expect(page.getByText('Bitte auch die Konzept-Datei auswählen')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Dateien prüfen' })).toBeDisabled()

  // --- AC3: keine .md-Datei wird abgelehnt ---
  await page.setInputFiles('input[type="file"] >> nth=1', {
    name: 'konzept.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('irrelevant'),
  })
  await expect(page.getByText('Nur .md-Dateien werden unterstützt.')).toBeVisible()

  // --- AC6: praktisch keine erkennbare Struktur -> Hard-Fail statt leerer Vorschau ---
  await page.setInputFiles('input[type="file"] >> nth=1', {
    name: 'konzept.md',
    mimeType: 'text/markdown',
    buffer: Buffer.from('Dies ist irgendein Text ohne jede erkennbare Struktur.\n\nEinfach nur Prosa.'),
  })
  await expect(page.getByRole('button', { name: 'Dateien prüfen' })).toBeEnabled()
  await page.getByRole('button', { name: 'Dateien prüfen' }).click()
  await expect(
    page.getByText('In dieser Datei wurde praktisch keine erkennbare Struktur gefunden.')
  ).toBeVisible()

  // --- AC4: Format-Kreuz-Erkennung (Journey-Inhalt im Konzept-Slot) -> Warnung statt Hard-Fail ---
  await page.setInputFiles('input[type="file"] >> nth=1', {
    name: 'konzept.md',
    mimeType: 'text/markdown',
    buffer: Buffer.from(JOURNEY_VALID),
  })
  await page.getByRole('button', { name: 'Dateien prüfen' }).click()
  await expect(page.getByText(/sieht eher wie ein Journey-Transkript aus/)).toBeVisible()
  await page.getByRole('button', { name: 'Abbrechen' }).click()

  // --- AC1 + AC5 + AC7: gültiger Upload -> Vorschau mit Lücken-Markierung ---
  await page.setInputFiles('input[type="file"] >> nth=0', {
    name: 'journey-transkript.md',
    mimeType: 'text/markdown',
    buffer: Buffer.from(JOURNEY_VALID),
  })
  await page.setInputFiles('input[type="file"] >> nth=1', {
    name: 'konzept.md',
    mimeType: 'text/markdown',
    buffer: Buffer.from(KONZEPT_VALID),
  })
  await page.getByRole('button', { name: 'Dateien prüfen' }).click()
  await expect(page.getByText('Vorschau')).toBeVisible()

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

  // --- AC8: Lese-Uebersicht kommt nach hartem Reload aus der DB, nicht aus Client-State ---
  await page.reload({ waitUntil: 'networkidle' })
  await expect(page.getByText('Erneut importieren')).toBeVisible()
  await expect(page.getByText('Journey-Transkript')).toBeVisible()
  await expect(page.getByText('Konzept', { exact: true })).toBeVisible()

  // --- Datenbank + Storage direkt verifiziert ---
  const admin = adminClient()
  const { data: importRow } = await admin
    .from('interview_imports')
    .select('id')
    .eq('project_id', projectId)
    .single()
  expect(importRow).not.toBeNull()
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

  const { data: journeyFile, error: journeyDownloadError } = await admin.storage
    .from('imports')
    .download(`${projectId}/journey-transkript.md`)
  expect(journeyDownloadError).toBeNull()
  const journeyText = await journeyFile?.text()
  expect(journeyText).toContain('nachhaltige Trinkflaschen')

  // --- AC9/AC10: Re-Import ersetzt bestehende Struktur (gleicher Import-Datensatz) ---
  await page.getByRole('button', { name: 'Erneut importieren' }).click()
  const journeyV2 = JOURNEY_VALID.replace('Frage 10', 'Frage 10 (Version 2)')
  await page.setInputFiles('input[type="file"] >> nth=0', {
    name: 'journey-transkript.md',
    mimeType: 'text/markdown',
    buffer: Buffer.from(journeyV2),
  })
  await page.setInputFiles('input[type="file"] >> nth=1', {
    name: 'konzept.md',
    mimeType: 'text/markdown',
    buffer: Buffer.from(KONZEPT_VALID),
  })
  await page.getByRole('button', { name: 'Dateien prüfen' }).click()
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

test('PROJ-3: 5-MB-Dateigrößenlimit wird durchgesetzt', async ({ page }) => {
  await page.goto('/login', { waitUntil: 'networkidle' })
  await page.fill('input[name="email"]', EMAIL)
  await page.fill('input[name="password"]', PASSWORD)
  await page.click('button[type="submit"]')
  await expect(page).toHaveURL('/dashboard')

  await page.goto(`/kunden/${clientId}/${projectId}`, { waitUntil: 'networkidle' })
  // Der vorherige Test hat bereits einen Import angelegt -> "Lese-Uebersicht"-
  // Zustand, erst "Erneut importieren" fuehrt zurueck zum Upload-Zustand.
  const reimportButton = page.getByRole('button', { name: 'Erneut importieren' })
  if (await reimportButton.isVisible()) await reimportButton.click()
  const big = Buffer.alloc(5 * 1024 * 1024 + 1, 'a')
  await page.setInputFiles('input[type="file"] >> nth=0', {
    name: 'journey-transkript.md',
    mimeType: 'text/markdown',
    buffer: big,
  })
  await expect(page.getByText('Die Datei ist größer als 5 MB.')).toBeVisible()
})

test('PROJ-3: Journey-Fragen im realen Prompt-Output-Format werden korrekt geparst (Regression BUG-3)', async ({
  page,
}) => {
  // Bug-Report vom Nutzer anhand echter Kundendaten (2026-08-28): der externe
  // Interview-Prompt gibt Fragen tatsaechlich als Freitext-Absatz ohne
  // "**Gestellt:**"-Label aus, Optionen als rohe "A) ..."-Zeilen, und die
  // Antwort unter "**Gewählte Antwort:**" statt "**Antwort:**" - der alte
  // Parser markierte dadurch Gestellt/Antwort faelschlich als Luecke, obwohl
  // die Datei inhaltlich vollstaendig war. Siehe PROJ-3-Spec, "BUG-3".
  await page.goto('/login', { waitUntil: 'networkidle' })
  await page.fill('input[name="email"]', EMAIL)
  await page.fill('input[name="password"]', PASSWORD)
  await page.click('button[type="submit"]')
  await expect(page).toHaveURL('/dashboard')

  await page.goto(`/kunden/${clientId}/${projectId}`, { waitUntil: 'networkidle' })
  const reimportButton = page.getByRole('button', { name: 'Erneut importieren' })
  if (await reimportButton.isVisible()) await reimportButton.click()

  await page.setInputFiles('input[type="file"] >> nth=0', {
    name: 'journey-transkript.md',
    mimeType: 'text/markdown',
    buffer: Buffer.from(JOURNEY_REAL_FORMAT),
  })
  await page.setInputFiles('input[type="file"] >> nth=1', {
    name: 'konzept.md',
    mimeType: 'text/markdown',
    buffer: Buffer.from(KONZEPT_VALID),
  })
  await page.getByRole('button', { name: 'Dateien prüfen' }).click()
  await expect(page.getByText('Vorschau')).toBeVisible()

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
