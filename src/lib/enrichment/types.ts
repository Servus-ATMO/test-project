export type EdgeType = 'informs' | 'shapes'
export type ConflictType = 'explicit' | 'emergent'
export type DimensionStatus = 'found' | 'gap'

export interface EnrichmentPersona {
  id: string
  name: string
  description: string
  sourceReference: string
  position: number
}

export interface EnrichmentDimension {
  id: string
  dimensionName: string
  // null = projektweite Instanz (ausschliesslich bei "Umsetzungsrahmen").
  personaId: string | null
  value: string
  status: DimensionStatus
  position: number
}

// Genau eines der beiden Quelle/Ziel-Paare ist gesetzt, je nach edgeType:
// informs: sourceFieldId -> targetDimensionId
// shapes:  sourceDimensionId -> targetEntryId
export interface EnrichmentEdge {
  id: string
  edgeType: EdgeType
  sourceFieldId: string | null
  targetDimensionId: string | null
  sourceDimensionId: string | null
  targetEntryId: string | null
  impactText: string
  weight: number
}

export interface EnrichmentConflict {
  id: string
  conflictType: ConflictType
  description: string
  fieldAId: string | null
  fieldBId: string | null
  entryId: string | null
  involvedDimensionIds: string[]
}

// Ergebnis des mechanischen Parsens einer hochgeladenen Ergebnis-Datei -
// fuer die Vorschau VOR dem Speichern (checkEnrichmentResult). Referenzen
// (z.B. "Frage 3 -> Antwort"), die sich nicht gegen den aktuellen Import
// aufloesen liessen, landen als Klartext-Warnung statt die Kante/den
// Konflikt stillschweigend fallenzulassen.
export interface ParsedEnrichment {
  personas: EnrichmentPersona[]
  dimensions: EnrichmentDimension[]
  edges: EnrichmentEdge[]
  conflicts: EnrichmentConflict[]
  unresolvedReferences: string[]
  hasRecognizableStructure: boolean
}

// Vollstaendige, bereits gespeicherte Anreicherung - fuer die Lese-Uebersicht.
export interface Enrichment {
  id: string
  projectId: string
  sourceImportId: string | null
  rawResultText: string
  createdAt: string
  updatedAt: string
  personas: EnrichmentPersona[]
  dimensions: EnrichmentDimension[]
  edges: EnrichmentEdge[]
  conflicts: EnrichmentConflict[]
}
