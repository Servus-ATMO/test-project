'use server'

import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth/require-auth'
import { flattenParsedDocument } from './db'
import { checkCrossFormat } from './format-detect'
import { parseJourney } from './parse-journey'
import { parseKonzept } from './parse-konzept'
import type { FormatWarning, ParsedImport } from './types'

// 5 MB pro Datei (siehe PROJ-3 Tech Design) - serverseitig nochmal geprueft,
// obwohl das Upload-Feld bereits clientseitig validiert (Defense in Depth).
const MAX_TEXT_LENGTH = 5 * 1024 * 1024

export type CheckImportResult =
  | { status: 'ok'; preview: ParsedImport; warnings: FormatWarning[] }
  | { status: 'error'; slot: 'journey' | 'konzept'; message: string }

// Parsing als einzige Server-Funktion, die sowohl fuer die Vorschau
// (checkImportFiles) als auch beim endgueltigen Speichern (saveImport)
// aufgerufen wird - siehe PROJ-3 Tech Design. Es gibt dadurch nur eine
// Stelle mit Parsing-Logik, und die Vorschau ist garantiert identisch mit
// dem, was gespeichert wird.
export async function checkImportFiles(
  journeyText: string,
  konzeptText: string
): Promise<CheckImportResult> {
  await requireAuth()

  if (journeyText.length > MAX_TEXT_LENGTH) {
    return { status: 'error', slot: 'journey', message: 'Die Datei ist größer als 5 MB.' }
  }
  if (konzeptText.length > MAX_TEXT_LENGTH) {
    return { status: 'error', slot: 'konzept', message: 'Die Datei ist größer als 5 MB.' }
  }

  const journey = parseJourney(journeyText)
  const konzept = parseKonzept(konzeptText)
  const journeyWarning = checkCrossFormat('journey', journeyText)
  const konzeptWarning = checkCrossFormat('konzept', konzeptText)

  // Hard-Fail nur, wenn eine Datei WEDER zu ihrem eigenen Slot noch zum
  // jeweils anderen Format passt (siehe PROJ-3 Implementierungsnotizen -
  // sonst wuerde ein einfacher Datei-Vertauscher faelschlich hart abgelehnt
  // statt die freundlichere Format-Warnung zu bekommen).
  if (!journey.hasRecognizableStructure && !journeyWarning) {
    return {
      status: 'error',
      slot: 'journey',
      message: 'In dieser Datei wurde praktisch keine erkennbare Struktur gefunden.',
    }
  }
  if (!konzept.hasRecognizableStructure && !konzeptWarning) {
    return {
      status: 'error',
      slot: 'konzept',
      message: 'In dieser Datei wurde praktisch keine erkennbare Struktur gefunden.',
    }
  }

  const warnings: FormatWarning[] = []
  if (journeyWarning) warnings.push(journeyWarning)
  if (konzeptWarning) warnings.push(konzeptWarning)

  return { status: 'ok', preview: { journey, konzept }, warnings }
}

// Aktuell immer "nein" - es gibt noch keine abhaengigen Tabellen (Ebene-2-
// Anreicherung -> PROJ-4). Eigenstaendige Funktion, damit PROJ-4 hier
// einfach eine Bedingung ergaenzen kann, ohne den Re-Import-Ablauf neu zu
// entwerfen (siehe PROJ-3 Tech Design).
export async function hasDependentImportData(_projectId: string): Promise<boolean> {
  return false
}

export type SaveImportResult =
  | { status: 'ok' }
  | { status: 'dependent-data'; message: string }
  | { status: 'error'; message: string }

export async function saveImport(
  clientId: string,
  projectId: string,
  journeyText: string,
  konzeptText: string,
  acknowledgeDependentData = false
): Promise<SaveImportResult> {
  const supabase = await requireAuth()

  const journey = parseJourney(journeyText)
  const konzept = parseKonzept(konzeptText)

  const { data: existing } = await supabase
    .from('interview_imports')
    .select('id')
    .eq('project_id', projectId)
    .maybeSingle()

  if (existing && !acknowledgeDependentData && (await hasDependentImportData(projectId))) {
    return {
      status: 'dependent-data',
      message:
        'Für dieses Projekt existieren bereits abhängige Daten. Diese werden beim Übernehmen ungültig bzw. überschrieben.',
    }
  }

  const journeyPath = `${projectId}/journey-transkript.md`
  const konzeptPath = `${projectId}/konzept.md`
  const [journeyUpload, konzeptUpload] = await Promise.all([
    supabase.storage
      .from('imports')
      .upload(journeyPath, journeyText, { contentType: 'text/markdown', upsert: true }),
    supabase.storage
      .from('imports')
      .upload(konzeptPath, konzeptText, { contentType: 'text/markdown', upsert: true }),
  ])
  if (journeyUpload.error || konzeptUpload.error) {
    return { status: 'error', message: 'Die Dateien konnten nicht im Storage gespeichert werden.' }
  }

  const importRow = {
    project_id: projectId,
    journey_file_path: journeyPath,
    konzept_file_path: konzeptPath,
    journey_datum: journey.meta.datum,
    journey_gefuehrt_mit: journey.meta.geführtMit,
    journey_prompt_version: journey.meta.promptVersion,
    konzept_datum: konzept.meta.datum,
    konzept_erstellt_mit: konzept.meta.erstelltMit,
    imported_at: new Date().toISOString(),
  }

  let importId: string
  if (existing) {
    const { error } = await supabase.from('interview_imports').update(importRow).eq('id', existing.id)
    if (error) return { status: 'error', message: 'Der Import konnte nicht gespeichert werden.' }
    importId = existing.id
    // Re-Import ersetzt die bestehende Struktur vollstaendig (siehe Decision
    // Log "einfacher Ersatz-Import") - Cascade entfernt Entries/Fields mit.
    const { error: deleteError } = await supabase
      .from('import_sections')
      .delete()
      .eq('import_id', importId)
    if (deleteError) {
      return { status: 'error', message: 'Der bestehende Import konnte nicht ersetzt werden.' }
    }
  } else {
    const { data, error } = await supabase
      .from('interview_imports')
      .insert(importRow)
      .select('id')
      .single()
    if (error || !data) return { status: 'error', message: 'Der Import konnte nicht gespeichert werden.' }
    importId = data.id
  }

  const journeyRows = flattenParsedDocument(journey, 'journey')
  const konzeptRows = flattenParsedDocument(konzept, 'konzept')
  const sectionRows = [...journeyRows.sections, ...konzeptRows.sections].map((s) => ({
    ...s,
    import_id: importId,
  }))
  const entryRows = [...journeyRows.entries, ...konzeptRows.entries]
  const fieldRows = [...journeyRows.fields, ...konzeptRows.fields]

  if (sectionRows.length > 0) {
    const { error } = await supabase.from('import_sections').insert(sectionRows)
    if (error) return { status: 'error', message: 'Die Struktur konnte nicht gespeichert werden.' }
  }
  if (entryRows.length > 0) {
    const { error } = await supabase.from('import_entries').insert(entryRows)
    if (error) return { status: 'error', message: 'Die Struktur konnte nicht gespeichert werden.' }
  }
  if (fieldRows.length > 0) {
    const { error } = await supabase.from('import_fields').insert(fieldRows)
    if (error) return { status: 'error', message: 'Die Struktur konnte nicht gespeichert werden.' }
  }

  revalidatePath(`/kunden/${clientId}/${projectId}`)
  return { status: 'ok' }
}
