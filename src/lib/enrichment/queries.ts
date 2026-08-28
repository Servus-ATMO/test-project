import { createClient } from '@/lib/supabase/server'
import { assembleEnrichment } from './db'
import type {
  EnrichmentConflictRow,
  EnrichmentDimensionRow,
  EnrichmentEdgeRow,
  EnrichmentPersonaRow,
  EnrichmentRow,
} from './db'
import type { Enrichment } from './types'

export async function getEnrichmentForProject(projectId: string): Promise<Enrichment | null> {
  const supabase = await createClient()

  const { data: enrichmentRow, error: enrichmentError } = await supabase
    .from('enrichments')
    .select('*')
    .eq('project_id', projectId)
    .maybeSingle()
  if (enrichmentError) throw new Error(enrichmentError.message)
  if (!enrichmentRow) return null

  const { data: personas, error: personasError } = await supabase
    .from('enrichment_personas')
    .select('*')
    .eq('enrichment_id', enrichmentRow.id)
    .order('position')
  if (personasError) throw new Error(personasError.message)

  const { data: dimensions, error: dimensionsError } = await supabase
    .from('enrichment_dimensions')
    .select('*')
    .eq('enrichment_id', enrichmentRow.id)
    .order('position')
  if (dimensionsError) throw new Error(dimensionsError.message)

  const { data: edges, error: edgesError } = await supabase
    .from('enrichment_edges')
    .select('*')
    .eq('enrichment_id', enrichmentRow.id)
  if (edgesError) throw new Error(edgesError.message)

  const { data: conflicts, error: conflictsError } = await supabase
    .from('enrichment_conflicts')
    .select('*')
    .eq('enrichment_id', enrichmentRow.id)
  if (conflictsError) throw new Error(conflictsError.message)

  return assembleEnrichment(
    enrichmentRow as EnrichmentRow,
    personas as EnrichmentPersonaRow[],
    dimensions as EnrichmentDimensionRow[],
    edges as EnrichmentEdgeRow[],
    conflicts as EnrichmentConflictRow[]
  )
}

// Fuer die reale hasDependentImportData()-Pruefung in PROJ-3 (siehe
// src/lib/imports/actions.ts) - genuegt eine reine Existenzpruefung ohne
// die volle Anreicherung zu laden.
export async function hasEnrichmentForProject(projectId: string): Promise<boolean> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('enrichments')
    .select('id')
    .eq('project_id', projectId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data !== null
}
