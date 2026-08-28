import type {
  ConflictType,
  DimensionStatus,
  EdgeType,
  Enrichment,
  EnrichmentConflict,
  EnrichmentDimension,
  EnrichmentEdge,
  EnrichmentPersona,
  ParsedEnrichment,
} from './types'

export interface EnrichmentRow {
  id: string
  project_id: string
  source_import_id: string | null
  raw_result_text: string
  created_at: string
  updated_at: string
}

export interface EnrichmentPersonaRow {
  id: string
  enrichment_id: string
  name: string
  description: string
  source_reference: string
  position: number
}

export interface EnrichmentDimensionRow {
  id: string
  enrichment_id: string
  persona_id: string | null
  dimension_name: string
  value: string
  status: DimensionStatus
  position: number
}

export interface EnrichmentEdgeRow {
  id: string
  enrichment_id: string
  edge_type: EdgeType
  source_field_id: string | null
  source_dimension_id: string | null
  target_dimension_id: string | null
  target_entry_id: string | null
  impact_text: string
  weight: number
}

export interface EnrichmentConflictRow {
  id: string
  enrichment_id: string
  conflict_type: ConflictType
  description: string
  field_a_id: string | null
  field_b_id: string | null
  entry_id: string | null
  involved_dimension_ids: string[]
}

// Baut die vollstaendige Anreicherung aus den fuenf flachen Tabellen wieder
// zusammen (Gegenstueck zu flattenParsedEnrichment) - analog zu
// assembleParsedImport in src/lib/imports/db.ts.
export function assembleEnrichment(
  enrichmentRow: EnrichmentRow,
  personaRows: EnrichmentPersonaRow[],
  dimensionRows: EnrichmentDimensionRow[],
  edgeRows: EnrichmentEdgeRow[],
  conflictRows: EnrichmentConflictRow[]
): Enrichment {
  const personas: EnrichmentPersona[] = personaRows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    sourceReference: row.source_reference,
    position: row.position,
  }))

  const dimensions: EnrichmentDimension[] = dimensionRows.map((row) => ({
    id: row.id,
    dimensionName: row.dimension_name,
    personaId: row.persona_id,
    value: row.value,
    status: row.status,
    position: row.position,
  }))

  const edges: EnrichmentEdge[] = edgeRows.map((row) => ({
    id: row.id,
    edgeType: row.edge_type,
    sourceFieldId: row.source_field_id,
    targetDimensionId: row.target_dimension_id,
    sourceDimensionId: row.source_dimension_id,
    targetEntryId: row.target_entry_id,
    impactText: row.impact_text,
    weight: row.weight,
  }))

  const conflicts: EnrichmentConflict[] = conflictRows.map((row) => ({
    id: row.id,
    conflictType: row.conflict_type,
    description: row.description,
    fieldAId: row.field_a_id,
    fieldBId: row.field_b_id,
    entryId: row.entry_id,
    involvedDimensionIds: row.involved_dimension_ids,
  }))

  return {
    id: enrichmentRow.id,
    projectId: enrichmentRow.project_id,
    sourceImportId: enrichmentRow.source_import_id,
    rawResultText: enrichmentRow.raw_result_text,
    createdAt: enrichmentRow.created_at,
    updatedAt: enrichmentRow.updated_at,
    personas,
    dimensions,
    edges,
    conflicts,
  }
}

export interface FlattenedEnrichmentRows {
  personas: Omit<EnrichmentPersonaRow, 'enrichment_id'>[]
  dimensions: Omit<EnrichmentDimensionRow, 'enrichment_id'>[]
  edges: Omit<EnrichmentEdgeRow, 'enrichment_id'>[]
  conflicts: Omit<EnrichmentConflictRow, 'enrichment_id'>[]
}

// Zerlegt das Parse-Ergebnis in flache Zeilen-Arrays fuer die save_enrichment
// RPC-Funktion. IDs werden bereits beim Parsen vergeben (crypto.randomUUID
// in parse-enrichment.ts), keine Round-Trips noetig.
export function flattenParsedEnrichment(parsed: ParsedEnrichment): FlattenedEnrichmentRows {
  return {
    personas: parsed.personas.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      source_reference: p.sourceReference,
      position: p.position,
    })),
    dimensions: parsed.dimensions.map((d) => ({
      id: d.id,
      persona_id: d.personaId,
      dimension_name: d.dimensionName,
      value: d.value,
      status: d.status,
      position: d.position,
    })),
    edges: parsed.edges.map((e) => ({
      id: e.id,
      edge_type: e.edgeType,
      source_field_id: e.sourceFieldId,
      source_dimension_id: e.sourceDimensionId,
      target_dimension_id: e.targetDimensionId,
      target_entry_id: e.targetEntryId,
      impact_text: e.impactText,
      weight: e.weight,
    })),
    conflicts: parsed.conflicts.map((c) => ({
      id: c.id,
      conflict_type: c.conflictType,
      description: c.description,
      field_a_id: c.fieldAId,
      field_b_id: c.fieldBId,
      entry_id: c.entryId,
      involved_dimension_ids: c.involvedDimensionIds,
    })),
  }
}
