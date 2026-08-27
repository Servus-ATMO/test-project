import { createClient } from '@/lib/supabase/server'
import { assembleParsedImport } from './db'
import type {
  ImportEntryRow,
  ImportFieldRow,
  ImportSectionRow,
  InterviewImportRow,
} from './db'
import type { ParsedImport } from './types'

export async function getImportForProject(projectId: string): Promise<ParsedImport | null> {
  const supabase = await createClient()

  const { data: importRow, error: importError } = await supabase
    .from('interview_imports')
    .select('*')
    .eq('project_id', projectId)
    .maybeSingle()
  if (importError) throw new Error(importError.message)
  if (!importRow) return null

  const { data: sections, error: sectionsError } = await supabase
    .from('import_sections')
    .select('*')
    .eq('import_id', importRow.id)
    .order('position')
  if (sectionsError) throw new Error(sectionsError.message)

  const sectionIds = (sections as ImportSectionRow[]).map((s) => s.id)
  const { data: entries, error: entriesError } =
    sectionIds.length > 0
      ? await supabase.from('import_entries').select('*').in('section_id', sectionIds).order('position')
      : { data: [] as ImportEntryRow[], error: null }
  if (entriesError) throw new Error(entriesError.message)

  const entryIds = (entries as ImportEntryRow[]).map((e) => e.id)
  const { data: fields, error: fieldsError } =
    entryIds.length > 0
      ? await supabase.from('import_fields').select('*').in('entry_id', entryIds).order('position')
      : { data: [] as ImportFieldRow[], error: null }
  if (fieldsError) throw new Error(fieldsError.message)

  return assembleParsedImport(
    importRow as InterviewImportRow,
    sections as ImportSectionRow[],
    entries as ImportEntryRow[],
    fields as ImportFieldRow[]
  )
}
