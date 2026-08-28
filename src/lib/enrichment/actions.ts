'use server'

import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth/require-auth'
import { getImportForProject } from '@/lib/imports/queries'
import { buildEnrichmentPrompt } from './prompt-template'
import { parseEnrichmentResult } from './parse-enrichment'
import { flattenParsedEnrichment } from './db'
import { hasEnrichmentForProject } from './queries'
import type { ParsedEnrichment } from './types'

// Gleiche Grenze wie PROJ-3 (Text-Uploads, siehe imports/actions.ts).
const MAX_TEXT_LENGTH = 5 * 1024 * 1024

export type GeneratePromptResult =
  | { status: 'ok'; prompt: string }
  | { status: 'error'; message: string }

// Baut den Anreicherungs-Prompt aus dem aktuellen Import - kein KI-Aufruf
// hier (siehe PROJ-4 Tech Design), nur Textzusammenstellung.
export async function generateEnrichmentPrompt(
  projectId: string,
  projectName: string
): Promise<GeneratePromptResult> {
  await requireAuth()

  const parsedImport = await getImportForProject(projectId)
  if (!parsedImport) {
    return { status: 'error', message: 'Für dieses Projekt existiert noch kein Import.' }
  }

  return { status: 'ok', prompt: buildEnrichmentPrompt(projectName, parsedImport) }
}

export type CheckEnrichmentResult =
  | { status: 'ok'; preview: ParsedEnrichment }
  | { status: 'error'; message: string }

// Parsen fuer die Vorschau, schreibt nichts (analog zu checkImportFiles in
// PROJ-3). saveEnrichment parst denselben Text unten ein zweites Mal, statt
// den Vorschau-Payload vom Client entgegenzunehmen.
export async function checkEnrichmentResult(
  projectId: string,
  resultText: string
): Promise<CheckEnrichmentResult> {
  await requireAuth()

  if (resultText.length > MAX_TEXT_LENGTH) {
    return { status: 'error', message: 'Die Datei ist größer als 5 MB.' }
  }

  const parsedImport = await getImportForProject(projectId)
  if (!parsedImport) {
    return { status: 'error', message: 'Für dieses Projekt existiert kein Import mehr.' }
  }

  const preview = parseEnrichmentResult(resultText, parsedImport)
  if (!preview.hasRecognizableStructure) {
    return {
      status: 'error',
      message: 'In dieser Datei wurde praktisch keine erkennbare Struktur gefunden.',
    }
  }

  return { status: 'ok', preview }
}

export type SaveEnrichmentResult =
  | { status: 'ok' }
  | { status: 'replace-warning'; message: string }
  | { status: 'error'; message: string }

export async function saveEnrichment(
  clientId: string,
  projectId: string,
  resultText: string,
  acknowledgeReplace = false
): Promise<SaveEnrichmentResult> {
  const supabase = await requireAuth()

  const parsedImport = await getImportForProject(projectId)
  if (!parsedImport) {
    return { status: 'error', message: 'Für dieses Projekt existiert kein Import mehr.' }
  }

  const preview = parseEnrichmentResult(resultText, parsedImport)
  if (!preview.hasRecognizableStructure) {
    return {
      status: 'error',
      message: 'In dieser Datei wurde praktisch keine erkennbare Struktur gefunden.',
    }
  }

  // Erneutes Hochladen bei bereits bestehender Anreicherung: Warnung +
  // vollstaendiger Ersatz, muss aktiv bestaetigt werden (siehe Decision Log).
  if (!acknowledgeReplace && (await hasEnrichmentForProject(projectId))) {
    return {
      status: 'replace-warning',
      message:
        'Für dieses Projekt existiert bereits eine Ebene-2-Anreicherung. Sie wird beim Übernehmen vollständig ersetzt.',
    }
  }

  const { data: importRow } = await supabase
    .from('interview_imports')
    .select('id')
    .eq('project_id', projectId)
    .maybeSingle()

  const rows = flattenParsedEnrichment(preview)

  // Atomarer Speichervorgang ueber save_enrichment() - siehe Migration
  // save_enrichment_atomic, gleiche Lektion wie PROJ-3 BUG-1 von Anfang an
  // angewendet statt mehrerer getrennter Inserts.
  const { error: saveError } = await supabase.rpc('save_enrichment', {
    p_project_id: projectId,
    p_source_import_id: importRow?.id ?? null,
    p_raw_result_text: resultText,
    p_personas: rows.personas,
    p_dimensions: rows.dimensions,
    p_edges: rows.edges,
    p_conflicts: rows.conflicts,
  })
  if (saveError) {
    return { status: 'error', message: 'Die Anreicherung konnte nicht gespeichert werden.' }
  }

  revalidatePath(`/kunden/${clientId}/${projectId}`)
  return { status: 'ok' }
}
