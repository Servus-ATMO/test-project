import type { GraphModel } from './types'

export interface HighlightResult {
  activeNodeIds: Set<string>
  activeEdgeIds: Set<string>
}

// Ermittelt beim Klick auf einen Knoten alle damit verbundenen Knoten/Kanten
// (Herkunft + Wirkung), analog zum Referenz-Sketch (siehe PROJ-5-Spec-Update
// nach Nutzer-Feedback, 2026-08-28: "trace()"-Funktion dort). Themenblock-
// Knoten werden hier bewusst nicht behandelt - sie klappen nur auf/zu, siehe
// GraphView.handleNodeClick.
export function computeHighlight(
  selectedId: string,
  model: GraphModel,
  ebene2Visible: boolean
): HighlightResult {
  const activeNodeIds = new Set<string>([selectedId])
  const activeEdgeIds = new Set<string>()

  if (!ebene2Visible) {
    for (const e of model.compressedEdges) {
      if (e.source === selectedId) {
        activeNodeIds.add(e.target)
        activeEdgeIds.add(e.id)
      } else if (e.target === selectedId) {
        activeNodeIds.add(e.source)
        activeEdgeIds.add(e.id)
      }
    }
    return { activeNodeIds, activeEdgeIds }
  }

  const isFrage = model.fragen.some((f) => f.id === selectedId)
  const isContentBlock = model.contentBlocks.some((b) => b.id === selectedId)

  if (isFrage) {
    // Vorwaerts: informierte Dimensionen, und von dort weiter geformte Content-Bloecke.
    for (const e of model.edges) {
      if (e.edgeType === 'informs' && e.source === selectedId) {
        activeNodeIds.add(e.target)
        activeEdgeIds.add(e.id)
        for (const e2 of model.edges) {
          if (e2.edgeType === 'shapes' && e2.source === e.target) {
            activeNodeIds.add(e2.target)
            activeEdgeIds.add(e2.id)
          }
        }
      }
    }
  } else if (isContentBlock) {
    // Rueckwaerts: praegende Dimensionen, und von dort weiter die informierenden Fragen.
    for (const e of model.edges) {
      if (e.edgeType === 'shapes' && e.target === selectedId) {
        activeNodeIds.add(e.source)
        activeEdgeIds.add(e.id)
        for (const e2 of model.edges) {
          if (e2.edgeType === 'informs' && e2.target === e.source) {
            activeNodeIds.add(e2.source)
            activeEdgeIds.add(e2.id)
          }
        }
      }
    }
  } else {
    // Dimension-Knoten: nur ein Hop in jede Richtung (Quelle + Wirkung).
    for (const e of model.edges) {
      if (
        (e.edgeType === 'informs' && e.target === selectedId) ||
        (e.edgeType === 'shapes' && e.source === selectedId)
      ) {
        activeNodeIds.add(e.source)
        activeNodeIds.add(e.target)
        activeEdgeIds.add(e.id)
      }
    }
  }

  return { activeNodeIds, activeEdgeIds }
}

// Globaler Persona-Filter (Nutzer-Feedback 2026-08-28): highlightet alle
// Verbindungen in eine bestimmte Persona, indem computeHighlight() fuer jede
// Dimensionsinstanz dieser Persona aufgerufen und deren Ergebnisse
// vereinigt werden - keine eigene Traversierungslogik noetig.
export function computeHighlightForPersona(
  personaName: string,
  model: GraphModel,
  ebene2Visible: boolean
): HighlightResult {
  const activeNodeIds = new Set<string>()
  const activeEdgeIds = new Set<string>()

  for (const dimension of model.dimensionen) {
    if (dimension.personaName !== personaName) continue
    const result = computeHighlight(dimension.id, model, ebene2Visible)
    for (const id of result.activeNodeIds) activeNodeIds.add(id)
    for (const id of result.activeEdgeIds) activeEdgeIds.add(id)
  }

  return { activeNodeIds, activeEdgeIds }
}
