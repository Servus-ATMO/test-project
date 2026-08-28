'use server'

import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth/require-auth'
import { hasEnrichmentForProject } from '@/lib/enrichment/queries'
import { flattenParsedDocument } from './db'
import { splitCombinedImport } from './split-combined-import'
import { parseJourney } from './parse-journey'
import { parseKonzept } from './parse-konzept'
import type { MissingBlock, ParsedImport } from './types'

// 5 MB fuer die eine kombinierte Datei (siehe PROJ-3 Tech Design) -
// serverseitig nochmal geprueft, obwohl das Upload-Feld bereits clientseitig
// validiert (Defense in Depth).
const MAX_TEXT_LENGTH = 5 * 1024 * 1024

export type CheckImportResult =
  | { status: 'ok'; preview: ParsedImport; missingBlock: MissingBlock }
  | { status: 'error'; message: string }

// Parsing als einzige Server-Funktion, die sowohl fuer die Vorschau
// (checkImportFiles) als auch beim endgueltigen Speichern (saveImport)
// aufgerufen wird - siehe PROJ-3 Tech Design. Es gibt dadurch nur eine
// Stelle mit Parsing-Logik, und die Vorschau ist garantiert identisch mit
// dem, was gespeichert wird.
export async function checkImportFiles(rawText: string): Promise<CheckImportResult> {
  await requireAuth()

  if (rawText.length > MAX_TEXT_LENGTH) {
    return { status: 'error', message: 'Die Datei ist größer als 5 MB.' }
  }

  const { journeyText, konzeptText, missingBlock } = splitCombinedImport(rawText)

  // Hard-Fail nur, wenn ueberhaupt keine der beiden bekannten
  // Block-Ueberschriften gefunden wurde (siehe AC "praktisch keine
  // erkennbare Struktur") - ein einzelner fehlender Block bekommt
  // stattdessen die weniger drastische Fehlender-Block-Warnung unten.
  if (!journeyText && !konzeptText) {
    return {
      status: 'error',
      message: 'In dieser Datei wurde praktisch keine erkennbare Struktur gefunden.',
    }
  }

  const journey = parseJourney(journeyText ?? '')
  const konzept = parseKonzept(konzeptText ?? '')

  return { status: 'ok', preview: { journey, konzept }, missingBlock }
}

// PROJ-4 (KI-Anreicherung) ist die erste abhaengige Tabelle - siehe PROJ-3
// Tech Design ("hat abhaengige Daten"-Pruefung als eigenstaendige,
// erweiterbare Funktion angelegt, genau fuer diesen Fall). Ein Re-Import
// wuerde sonst eine bestehende Ebene-2-Anreicherung stillschweigend
// verwaisen lassen, ohne dass die PROJ-3-Warnung greift.
export async function hasDependentImportData(projectId: string): Promise<boolean> {
  return hasEnrichmentForProject(projectId)
}

export type SaveImportResult =
  | { status: 'ok' }
  | { status: 'storage-warning'; message: string }
  | { status: 'dependent-data'; message: string }
  | { status: 'error'; message: string }

export async function saveImport(
  clientId: string,
  projectId: string,
  rawText: string,
  acknowledgeDependentData = false
): Promise<SaveImportResult> {
  const supabase = await requireAuth()

  const { journeyText, konzeptText } = splitCombinedImport(rawText)
  const journey = parseJourney(journeyText ?? '')
  const konzept = parseKonzept(konzeptText ?? '')

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

  const rawFilePath = `${projectId}/interview-import.md`

  const journeyRows = flattenParsedDocument(journey, 'journey')
  const konzeptRows = flattenParsedDocument(konzept, 'konzept')

  // Strukturierte Daten zuerst und atomar ueber eine einzige Postgres-
  // Funktion speichern (QA-BUG-1-Fix, 2026-08-27, weiterhin gueltig nach der
  // Ein-Datei-Umstellung): save_interview_import() buendelt Upsert + Ersatz-
  // Insert in einer DB-Transaktion - entweder alles oder nichts. Schlaegt
  // dieser Schritt fehl, wurde noch nichts hochgeladen - kein verwaistes
  // Storage-Objekt moeglich (siehe auch QA-BUG-2).
  const { data: importId, error: saveError } = await supabase.rpc('save_interview_import', {
    p_project_id: projectId,
    p_raw_file_path: rawFilePath,
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

  // Rohdatei erst NACH dem erfolgreichen, atomaren Speichern hochladen.
  // Schlaegt NUR dieser Schritt fehl, sind die strukturierten Daten (das,
  // was der Rest der App tatsaechlich nutzt) bereits vollstaendig und
  // korrekt gespeichert - nur die redundante Rohdatei-Sicherung fehlt dann,
  // ein erneuter Import behebt das (kein "error", sondern ein Warn-Hinweis).
  const { error: uploadError } = await supabase.storage
    .from('imports')
    .upload(rawFilePath, rawText, { contentType: 'text/markdown', upsert: true })

  revalidatePath(`/kunden/${clientId}/${projectId}`)

  if (uploadError) {
    return {
      status: 'storage-warning',
      message:
        'Der Import wurde vollständig gespeichert, aber die zusätzliche Rohdatei-Sicherung im Storage ist fehlgeschlagen. Ein erneuter Import behebt das.',
    }
  }

  return { status: 'ok' }
}
