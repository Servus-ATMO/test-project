import type { ParsedImport } from '@/lib/imports/types'
import type { Enrichment } from '@/lib/enrichment/types'
import type {
  ContentBlockNode,
  DimensionNode,
  FrageNode,
  GraphEdge,
  GraphModel,
  ThemenblockNode,
} from './types'

const SEITENSTRUKTUR_SECTION = '4. Seitenstruktur'
// "Notizen zur Aufnahme" ist redaktionelle Reflexion, kein Themenblock der
// eigentlichen Fragen-Journey (siehe PROJ-5-Spec: "Phase 1–3, 4–6, 7–9, 10
// bzw. Einstieg" - Notizen ist dort bewusst nicht gelistet).
const EXCLUDED_JOURNEY_SECTIONS = new Set(['Notizen zur Aufnahme'])

function edgeKey(source: string, target: string) {
  return `${source}|||${target}`
}

// Baut aus den bereits importierten (PROJ-3) und angereicherten (PROJ-4)
// Rohdaten das anzeigefertige Knoten-/Kanten-Modell fuer den Graph - reine
// Ableitung, nichts davon wird gespeichert (siehe PROJ-5 Tech Design).
export function buildGraphModel(parsedImport: ParsedImport, enrichment: Enrichment): GraphModel {
  const themenbloecke: ThemenblockNode[] = []
  const fragen: FrageNode[] = []
  // Feld-ID der Antwort -> Frage-Knoten-ID, fuer die Aufloesung von
  // informs-Kanten (die auf die Feld-ID zeigen, nicht auf den Eintrag).
  const antwortFieldToFrageId = new Map<string, string>()

  for (const section of parsedImport.journey.sections) {
    if (EXCLUDED_JOURNEY_SECTIONS.has(section.name)) continue

    const frageIds: string[] = []
    for (const entry of section.entries) {
      const frageField = entry.fields.find((f) => f.name === 'Gestellt' || f.name === 'Frage')
      const antwortField = entry.fields.find((f) => f.name === 'Antwort')

      fragen.push({
        type: 'frage',
        id: entry.id,
        themenblockId: section.id,
        label: entry.label || section.name,
        frageText: frageField?.value ?? '',
        frageStatus: frageField?.status ?? 'gap',
        antwortText: antwortField?.value ?? '',
        antwortStatus: antwortField?.status ?? 'gap',
        antwortFieldId: antwortField?.id ?? null,
        hasConflict: false,
      })
      frageIds.push(entry.id)
      if (antwortField) antwortFieldToFrageId.set(antwortField.id, entry.id)
    }

    themenbloecke.push({ type: 'themenblock', id: section.id, sectionName: section.name, frageIds })
  }

  const contentBlocks: ContentBlockNode[] = (
    parsedImport.konzept.sections.find((s) => s.name === SEITENSTRUKTUR_SECTION)?.entries ?? []
  ).map((entry) => ({
    type: 'contentblock',
    id: entry.id,
    label: entry.label,
    fields: entry.fields.map((f) => ({ name: f.name, value: f.value, status: f.status })),
    hasConflict: false,
  }))
  const contentBlockIds = new Set(contentBlocks.map((b) => b.id))

  const personaNameById = new Map(enrichment.personas.map((p) => [p.id, p.name]))
  const dimensionen: DimensionNode[] = enrichment.dimensions.map((d) => ({
    type: 'dimension',
    id: d.id,
    dimensionName: d.dimensionName,
    personaName: d.personaId ? (personaNameById.get(d.personaId) ?? null) : null,
    value: d.value,
    status: d.status,
    hasConflict: false,
  }))
  const dimensionIds = new Set(dimensionen.map((d) => d.id))

  // Kanten fuer die eingeblendete Ebene 2. Referenziert eine informs-Kante
  // ein Feld ausserhalb der hier abgebildeten Themenbloecke (z. B. ein
  // "Notizen zur Aufnahme"- oder Konzept-Feld, siehe BUG-6), wird sie ohne
  // Absturz uebersprungen - Best-Effort wie im Rest des Projekts.
  const edges: GraphEdge[] = []
  for (const e of enrichment.edges) {
    if (e.edgeType === 'informs' && e.sourceFieldId && e.targetDimensionId) {
      const frageId = antwortFieldToFrageId.get(e.sourceFieldId)
      if (!frageId || !dimensionIds.has(e.targetDimensionId)) continue
      edges.push({
        id: e.id,
        source: frageId,
        target: e.targetDimensionId,
        edgeType: 'informs',
        impactText: e.impactText,
        weight: e.weight,
      })
    } else if (e.edgeType === 'shapes' && e.sourceDimensionId && e.targetEntryId) {
      if (!dimensionIds.has(e.sourceDimensionId) || !contentBlockIds.has(e.targetEntryId)) continue
      edges.push({
        id: e.id,
        source: e.sourceDimensionId,
        target: e.targetEntryId,
        edgeType: 'shapes',
        impactText: e.impactText,
        weight: e.weight,
      })
    }
  }

  // Komprimierte Kanten fuer die ausgeblendete Ebene 2: direkte Frage ->
  // Content-Block-Verbindung ueber jede Dimension, die beide verbindet.
  // Vorab berechnet (siehe Tech Design), auf ein Vorkommen je Paar dedupliziert.
  const compressedEdges: GraphEdge[] = []
  const seenCompressed = new Set<string>()
  const informsByDimension = new Map<string, GraphEdge[]>()
  const shapesByDimension = new Map<string, GraphEdge[]>()
  for (const e of edges) {
    const map = e.edgeType === 'informs' ? informsByDimension : shapesByDimension
    const key = e.edgeType === 'informs' ? e.target : e.source
    const list = map.get(key) ?? []
    list.push(e)
    map.set(key, list)
  }
  for (const dimensionId of dimensionIds) {
    const incoming = informsByDimension.get(dimensionId) ?? []
    const outgoing = shapesByDimension.get(dimensionId) ?? []
    for (const into of incoming) {
      for (const out of outgoing) {
        const key = edgeKey(into.source, out.target)
        if (seenCompressed.has(key)) continue
        seenCompressed.add(key)
        compressedEdges.push({
          id: `compressed-${key}`,
          source: into.source,
          target: out.target,
          edgeType: 'compressed',
          impactText: '',
          weight: 2,
        })
      }
    }
  }

  // Konflikt-Markierung: explizite Konflikte betreffen zwei Frage-Knoten
  // (ueber deren Antwort-Feld), emergente betreffen einen Content-Block und
  // seine beteiligten Dimensionen.
  const conflictsByNodeId: Record<string, { description: string }[]> = {}
  const markConflict = (nodeId: string | undefined | null, description: string) => {
    if (!nodeId) return
    const list = conflictsByNodeId[nodeId] ?? []
    list.push({ description })
    conflictsByNodeId[nodeId] = list
  }

  for (const c of enrichment.conflicts) {
    if (c.conflictType === 'explicit') {
      markConflict(c.fieldAId ? antwortFieldToFrageId.get(c.fieldAId) : null, c.description)
      markConflict(c.fieldBId ? antwortFieldToFrageId.get(c.fieldBId) : null, c.description)
    } else {
      markConflict(c.entryId, c.description)
      for (const dimensionId of c.involvedDimensionIds) markConflict(dimensionId, c.description)
    }
  }

  for (const f of fragen) f.hasConflict = Boolean(conflictsByNodeId[f.id])
  for (const d of dimensionen) d.hasConflict = Boolean(conflictsByNodeId[d.id])
  for (const b of contentBlocks) b.hasConflict = Boolean(conflictsByNodeId[b.id])

  return { themenbloecke, fragen, dimensionen, contentBlocks, edges, compressedEdges, conflictsByNodeId }
}
