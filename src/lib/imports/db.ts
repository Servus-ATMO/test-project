import type {
  FieldStatus,
  ImportEntry,
  ImportField,
  ImportSection,
  JourneyMeta,
  KonzeptMeta,
  ParsedDocument,
  ParsedImport,
} from './types'

export interface InterviewImportRow {
  id: string
  project_id: string
  journey_file_path: string
  konzept_file_path: string
  journey_datum: string
  journey_gefuehrt_mit: string
  journey_prompt_version: string
  konzept_datum: string
  konzept_erstellt_mit: string
  imported_at: string
}

export interface ImportSectionRow {
  id: string
  import_id: string
  document: 'journey' | 'konzept'
  name: string
  position: number
}

export interface ImportEntryRow {
  id: string
  section_id: string
  label: string
  position: number
}

export interface ImportFieldRow {
  id: string
  entry_id: string
  name: string
  value: string
  status: FieldStatus
  position: number
}

// Baut die verschachtelte Section/Eintrag/Feld-Struktur aus den vier flachen
// Tabellen wieder zusammen (Gegenstueck zu flattenParsedImport in actions.ts).
export function assembleParsedImport(
  importRow: InterviewImportRow,
  sectionRows: ImportSectionRow[],
  entryRows: ImportEntryRow[],
  fieldRows: ImportFieldRow[]
): ParsedImport {
  const fieldsByEntry = new Map<string, ImportField[]>()
  for (const row of fieldRows) {
    const list = fieldsByEntry.get(row.entry_id) ?? []
    list.push({ id: row.id, name: row.name, value: row.value, status: row.status })
    fieldsByEntry.set(row.entry_id, list)
  }

  const entriesBySection = new Map<string, ImportEntry[]>()
  for (const row of entryRows) {
    const list = entriesBySection.get(row.section_id) ?? []
    list.push({ id: row.id, label: row.label, fields: fieldsByEntry.get(row.id) ?? [] })
    entriesBySection.set(row.section_id, list)
  }

  const journeySections: ImportSection[] = []
  const konzeptSections: ImportSection[] = []
  for (const row of sectionRows) {
    const section: ImportSection = {
      id: row.id,
      document: row.document,
      name: row.name,
      entries: entriesBySection.get(row.id) ?? [],
    }
    if (row.document === 'journey') journeySections.push(section)
    else konzeptSections.push(section)
  }

  const journeyMeta: JourneyMeta = {
    datum: importRow.journey_datum,
    geführtMit: importRow.journey_gefuehrt_mit,
    promptVersion: importRow.journey_prompt_version,
  }
  const konzeptMeta: KonzeptMeta = {
    datum: importRow.konzept_datum,
    erstelltMit: importRow.konzept_erstellt_mit,
  }

  const journey: ParsedDocument & { meta: JourneyMeta } = {
    sections: journeySections,
    meta: journeyMeta,
    hasRecognizableStructure: journeySections.length > 0,
  }
  const konzept: ParsedDocument & { meta: KonzeptMeta } = {
    sections: konzeptSections,
    meta: konzeptMeta,
    hasRecognizableStructure: konzeptSections.length > 0,
  }

  return { journey, konzept }
}

export interface FlattenedImportRows {
  sections: Omit<ImportSectionRow, 'import_id'>[]
  entries: ImportEntryRow[]
  fields: ImportFieldRow[]
}

// Zerlegt die verschachtelte Struktur zurueck in flache Zeilen-Arrays fuer
// Bulk-Inserts. IDs werden bereits beim Parsen vergeben (crypto.randomUUID
// in parse-utils.ts), sodass hier keine Round-Trips zum Auslesen generierter
// IDs noetig sind - Sections/Entries/Fields referenzieren sich direkt.
export function flattenParsedDocument(document: ParsedDocument, doc: 'journey' | 'konzept'): FlattenedImportRows {
  const sections: Omit<ImportSectionRow, 'import_id'>[] = []
  const entries: ImportEntryRow[] = []
  const fields: ImportFieldRow[] = []

  document.sections.forEach((section, sectionIndex) => {
    sections.push({ id: section.id, document: doc, name: section.name, position: sectionIndex })
    section.entries.forEach((entry, entryIndex) => {
      entries.push({ id: entry.id, section_id: section.id, label: entry.label, position: entryIndex })
      entry.fields.forEach((field, fieldIndex) => {
        fields.push({
          id: field.id,
          entry_id: entry.id,
          name: field.name,
          value: field.value,
          status: field.status,
          position: fieldIndex,
        })
      })
    })
  })

  return { sections, entries, fields }
}
