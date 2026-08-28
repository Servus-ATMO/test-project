export type FieldStatus = 'found' | 'gap'

export interface ImportField {
  id: string
  name: string
  value: string
  status: FieldStatus
}

export interface ImportEntry {
  id: string
  label: string
  fields: ImportField[]
}

export interface ImportSection {
  id: string
  document: 'journey' | 'konzept'
  name: string
  entries: ImportEntry[]
}

export interface JourneyMeta {
  datum: string
  geführtMit: string
  promptVersion: string
}

export interface KonzeptMeta {
  datum: string
  erstelltMit: string
}

export interface ParsedDocument {
  sections: ImportSection[]
  hasRecognizableStructure: boolean
}

export interface ParsedImport {
  journey: ParsedDocument & { meta: JourneyMeta }
  konzept: ParsedDocument & { meta: KonzeptMeta }
}

// Welcher der beiden erwarteten Bloecke (Journey-Transkript / Landingpage-
// Konzept) in der hochgeladenen kombinierten Datei nicht gefunden wurde -
// null, wenn beide vorhanden sind. Siehe splitCombinedImport().
export type MissingBlock = 'journey' | 'konzept' | null
