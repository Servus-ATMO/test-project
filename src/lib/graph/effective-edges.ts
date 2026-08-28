import type { GraphModel } from './types'

export interface EffectiveEdge {
  id: string
  source: string
  target: string
  // Die urspruenglichen Kanten-IDs aus model.edges/compressedEdges, die in
  // dieser (ggf. zusammengefassten) Kante zusammenlaufen - fuer den Abgleich
  // mit computeHighlight()'s activeEdgeIds (die auf den Original-IDs basiert).
  originalEdgeIds: string[]
}

// Baut die tatsaechlich zu rendernden Kanten: ist der Themenblock eines
// Fragen-Knotens eingeklappt (der Knoten selbst also nicht sichtbar), wird
// die Kante stattdessen vom Themenblock-Knoten aus gezeichnet (Sammel-Kante)
// statt komplett zu verschwinden - Nutzer-Feedback 2026-08-28, angelehnt an
// den Referenz-Sketch: dort ist der Themenblock der einzige Ebene-1-Knoten
// mit Kanten, einzelne Fragen sind dort nur Dossier-Detailtext. Bei uns
// bleiben Fragen eigene Knoten (praezise Kanten nach dem Aufklappen), aber
// im eingeklappten Zustand darf eine informierte Dimension nicht wie
// unbegruendet aussehen. Mehrere eingeklappte Fragen desselben Themenblocks,
// die dieselbe Dimension/denselben Content-Block informieren, werden zu
// einer Sammel-Kante zusammengefasst.
export function buildEffectiveEdges(
  model: GraphModel,
  visibleFrageIds: Set<string>,
  ebene2Visible: boolean
): EffectiveEdge[] {
  const themenblockByFrageId = new Map(model.fragen.map((f) => [f.id, f.themenblockId]))
  const resolveSource = (frageId: string): string | null =>
    visibleFrageIds.has(frageId) ? frageId : (themenblockByFrageId.get(frageId) ?? null)

  const grouped = new Map<string, EffectiveEdge>()
  const add = (source: string | null, target: string, originalId: string) => {
    if (!source) return
    const key = `${source}|||${target}`
    const existing = grouped.get(key)
    if (existing) {
      existing.originalEdgeIds.push(originalId)
      return
    }
    grouped.set(key, { id: `effective-${key}`, source, target, originalEdgeIds: [originalId] })
  }

  if (ebene2Visible) {
    const dimensionIds = new Set(model.dimensionen.map((d) => d.id))
    for (const e of model.edges) {
      if (e.edgeType === 'informs') {
        if (!dimensionIds.has(e.target)) continue
        add(resolveSource(e.source), e.target, e.id)
      } else {
        add(e.source, e.target, e.id)
      }
    }
  } else {
    const contentBlockIds = new Set(model.contentBlocks.map((b) => b.id))
    for (const e of model.compressedEdges) {
      if (!contentBlockIds.has(e.target)) continue
      add(resolveSource(e.source), e.target, e.id)
    }
  }

  return Array.from(grouped.values())
}
