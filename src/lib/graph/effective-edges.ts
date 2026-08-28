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

export interface EdgeVisibility {
  ebene1Visible: boolean
  ebene2Visible: boolean
  ebene3Visible: boolean
  // Fragen, die einzeln als eigener Knoten gerendert werden (Themenblock
  // aufgeklappt) - siehe GraphView.
  visibleFrageIds: Set<string>
  // Dimensionen, die einzeln als eigener Knoten gerendert werden (Gruppe
  // aufgeklappt, oder eine Einzelinstanz ohne Gruppierung) - siehe GraphView.
  visibleDimensionIds: Set<string>
}

// Baut die tatsaechlich zu rendernden Kanten aus dem vollstaendigen Modell.
// Zwei unabhaengige "Sammel-Kante statt verschwinden"-Mechanismen:
//
// 1. Frage -> Themenblock (Ebene 1 aufgeklappt/eingeklappt): ist eine Frage
//    eingeklappt, wird ihre Kante stattdessen vom Themenblock aus gezeichnet
//    (Nutzer-Feedback 2026-08-28, siehe Implementierungsnotizen).
// 2. Dimension -> Dimensionsgruppe (Ebene 2 Gruppierung nach Dimensionsname,
//    Nutzer-Feedback 2026-08-28): ist eine wiederkehrende Dimension
//    eingeklappt, wird ihre Kante stattdessen vom Gruppen-Knoten aus
//    gezeichnet. Einzelinstanzen (z. B. "Umsetzungsrahmen") werden nie
//    gruppiert, siehe GraphView.
//
// Zusaetzlich: ist eine ganze Spalte (Ebene 1/2/3) ausgeblendet, gibt es fuer
// eine daran haengende Kante keinen sinnvollen "Sammel"-Zielknoten mehr - sie
// wird dann komplett verworfen statt an eine unsichtbare ID zu haengen.
export function buildEffectiveEdges(model: GraphModel, visibility: EdgeVisibility): EffectiveEdge[] {
  const { ebene1Visible, ebene2Visible, ebene3Visible, visibleFrageIds, visibleDimensionIds } = visibility

  const themenblockByFrageId = new Map(model.fragen.map((f) => [f.id, f.themenblockId]))
  const resolveFrage = (frageId: string): string | null => {
    if (!ebene1Visible) return null
    if (visibleFrageIds.has(frageId)) return frageId
    return themenblockByFrageId.get(frageId) ?? null
  }

  const dimensionCountByName = new Map<string, number>()
  for (const d of model.dimensionen) {
    dimensionCountByName.set(d.dimensionName, (dimensionCountByName.get(d.dimensionName) ?? 0) + 1)
  }
  const groupIdByDimensionId = new Map(
    model.dimensionen
      .filter((d) => (dimensionCountByName.get(d.dimensionName) ?? 0) > 1)
      .map((d) => [d.id, `dimgroup:${d.dimensionName}`])
  )
  const resolveDimension = (dimensionId: string): string | null => {
    if (!ebene2Visible) return null
    if (visibleDimensionIds.has(dimensionId)) return dimensionId
    return groupIdByDimensionId.get(dimensionId) ?? null
  }

  const grouped = new Map<string, EffectiveEdge>()
  const add = (source: string | null, target: string | null, originalId: string) => {
    if (!source || !target) return
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
    const contentBlockIds = new Set(model.contentBlocks.map((b) => b.id))
    for (const e of model.edges) {
      if (e.edgeType === 'informs') {
        if (!dimensionIds.has(e.target)) continue
        add(resolveFrage(e.source), resolveDimension(e.target), e.id)
      } else {
        if (!ebene3Visible || !contentBlockIds.has(e.target)) continue
        add(resolveDimension(e.source), e.target, e.id)
      }
    }
  } else {
    const contentBlockIds = new Set(model.contentBlocks.map((b) => b.id))
    for (const e of model.compressedEdges) {
      if (!ebene3Visible || !contentBlockIds.has(e.target)) continue
      add(resolveFrage(e.source), e.target, e.id)
    }
  }

  return Array.from(grouped.values())
}
