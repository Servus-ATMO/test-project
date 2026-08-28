import { describe, expect, it } from 'vitest'
import { buildEffectiveEdges } from './effective-edges'
import type { GraphModel } from './types'

function buildModel(): GraphModel {
  return {
    themenbloecke: [{ type: 'themenblock', id: 'tb-1', sectionName: 'Phase 1-3', frageIds: ['frage-1', 'frage-2'] }],
    fragen: [
      {
        type: 'frage',
        id: 'frage-1',
        themenblockId: 'tb-1',
        label: 'Frage 1',
        frageText: 'Wer ist Zielgruppe?',
        frageStatus: 'found',
        antwortText: 'Vereine & Ligen',
        antwortStatus: 'found',
        antwortFieldId: 'field-1',
        hasConflict: false,
      },
      {
        type: 'frage',
        id: 'frage-2',
        themenblockId: 'tb-1',
        label: 'Frage 2',
        frageText: 'Wie hoch ist die Prioritaet?',
        frageStatus: 'found',
        antwortText: 'Hoch',
        antwortStatus: 'found',
        antwortFieldId: 'field-2',
        hasConflict: false,
      },
    ],
    dimensionen: [
      {
        type: 'dimension',
        id: 'dim-1',
        dimensionName: 'Business Goal',
        personaName: null,
        value: 'Partnerschaften gewinnen',
        status: 'found',
        hasConflict: false,
      },
    ],
    contentBlocks: [
      { type: 'contentblock', id: 'block-1', label: 'Abschnitt 1: Hero', fields: [], hasConflict: false },
    ],
    edges: [
      { id: 'e-informs-1', source: 'frage-1', target: 'dim-1', edgeType: 'informs', impactText: '', weight: 3 },
      { id: 'e-informs-2', source: 'frage-2', target: 'dim-1', edgeType: 'informs', impactText: '', weight: 2 },
      { id: 'e-shapes-1', source: 'dim-1', target: 'block-1', edgeType: 'shapes', impactText: '', weight: 3 },
    ],
    compressedEdges: [
      { id: 'compressed-1', source: 'frage-1', target: 'block-1', edgeType: 'compressed', impactText: '', weight: 2 },
      { id: 'compressed-2', source: 'frage-2', target: 'block-1', edgeType: 'compressed', impactText: '', weight: 2 },
    ],
    conflictsByNodeId: {},
  }
}

describe('buildEffectiveEdges', () => {
  it('keeps a precise Frage-level edge when the Frage is visible (expanded)', () => {
    const edges = buildEffectiveEdges(buildModel(), new Set(['frage-1', 'frage-2']), true)
    const sources = edges.filter((e) => e.target === 'dim-1').map((e) => e.source)
    expect(sources.sort()).toEqual(['frage-1', 'frage-2'])
  })

  it('rolls up an edge to the Themenblock when its Frage is collapsed/invisible', () => {
    const edges = buildEffectiveEdges(buildModel(), new Set(), true)
    const toDim = edges.filter((e) => e.target === 'dim-1')
    expect(toDim).toHaveLength(1)
    expect(toDim[0].source).toBe('tb-1')
    expect(toDim[0].originalEdgeIds.sort()).toEqual(['e-informs-1', 'e-informs-2'])
  })

  it('passes shapes edges through unchanged (dimension/content-block are always visible)', () => {
    const edges = buildEffectiveEdges(buildModel(), new Set(), true)
    const shapes = edges.find((e) => e.source === 'dim-1' && e.target === 'block-1')
    expect(shapes?.originalEdgeIds).toEqual(['e-shapes-1'])
  })

  it('rolls up compressed edges to the Themenblock when Ebene 2 is hidden and Fragen are collapsed', () => {
    const edges = buildEffectiveEdges(buildModel(), new Set(), false)
    expect(edges).toHaveLength(1)
    expect(edges[0]).toMatchObject({ source: 'tb-1', target: 'block-1' })
    expect(edges[0].originalEdgeIds.sort()).toEqual(['compressed-1', 'compressed-2'])
  })

  it('keeps precise compressed edges when Fragen are visible', () => {
    const edges = buildEffectiveEdges(buildModel(), new Set(['frage-1', 'frage-2']), false)
    expect(edges.map((e) => e.source).sort()).toEqual(['frage-1', 'frage-2'])
  })
})
