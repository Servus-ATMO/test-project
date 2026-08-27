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
  | { status: 'storage-warning'; message: string }
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

  const journeyRows = flattenParsedDocument(journey, 'journey')
  const konzeptRows = flattenParsedDocument(konzept, 'konzept')

  // Strukturierte Daten zuerst und atomar ueber eine einzige Postgres-
  // Funktion speichern (QA-BUG-1-Fix, 2026-08-27: die vorherige Implementierung
  // schrieb interview_imports/Sections/Entries/Fields als mehrere unabhaengige,
  // nicht transaktionale Inserts - ein Fehler mitten im Vorgang konnte
  // Teildaten dauerhaft hinterlassen). save_interview_import() buendelt Upsert
  // + Ersatz-Insert in einer DB-Transaktion: entweder alles oder nichts.
  // Schlaegt dieser Schritt fehl, wurde noch nichts hochgeladen - kein
  // verwaistes Storage-Objekt moeglich (siehe auch QA-BUG-2).
  const { data: importId, error: saveError } = await supabase.rpc('save_interview_import', {
    p_project_id: projectId,
    p_journey_file_path: journeyPath,
    p_konzept_file_path: konzeptPath,
    p_journey_datum: journey.meta.datum,
    p_journey_gefuehrt_mit: journey.meta.geführtMit,
    p_journey_prompt_version: journey.meta.promptVersion,
    p_konzept_datum: konzept.meta.datum,
    p_konzept_erstellt_mit: konzept.meta.erstelltMit,
    p_imported_at: new Date().toISOString(),
    p_sections: [...journeyRows.sections, ...konzeptRows.sections],
    p_entries: [...journeyRows.entries, ...konzeptRows.entries],
    p_fields: [...journeyRows.fields, ...konzeptRows.fields],
  })
  if (saveError || !importId) {
    return { status: 'error', message: 'Der Import konnte nicht gespeichert werden.' }
  }

  // Rohdateien erst NACH dem erfolgreichen, atomaren Speichern hochladen.
  // Schlaegt NUR dieser Schritt fehl, sind die strukturierten Daten (das,
  // was der Rest der App tatsaechlich nutzt) bereits vollstaendig und
  // korrekt gespeichert - nur die redundante Rohdatei-Sicherung fehlt dann,
  // ein erneuter Import behebt das (kein "error", sondern ein Warn-Hinweis).
  const [journeyUpload, konzeptUpload] = await Promise.all([
    supabase.storage
      .from('imports')
      .upload(journeyPath, journeyText, { contentType: 'text/markdown', upsert: true }),
    supabase.storage
      .from('imports')
      .upload(konzeptPath, konzeptText, { contentType: 'text/markdown', upsert: true }),
  ])

  revalidatePath(`/kunden/${clientId}/${projectId}`)

  if (journeyUpload.error || konzeptUpload.error) {
    return {
      status: 'storage-warning',
      message:
        'Der Import wurde vollständig gespeichert, aber die zusätzliche Rohdatei-Sicherung im Storage ist fehlgeschlagen. Ein erneuter Import behebt das.',
    }
  }

  return { status: 'ok' }
}
