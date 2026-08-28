import { describe, expect, it } from 'vitest'
import { buildEffectiveEdges, type EdgeVisibility } from './effective-edges'
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
        personaName: 'Vereine & Ligen',
        value: 'Partnerschaften gewinnen',
        status: 'found',
        hasConflict: false,
      },
      {
        type: 'dimension',
        id: 'dim-2',
        dimensionName: 'Business Goal',
        personaName: 'Direktkäufer',
        value: 'Direktverkauf maximieren',
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
      { id: 'e-informs-3', source: 'frage-1', target: 'dim-2', edgeType: 'informs', impactText: '', weight: 2 },
      { id: 'e-shapes-1', source: 'dim-1', target: 'block-1', edgeType: 'shapes', impactText: '', weight: 3 },
      { id: 'e-shapes-2', source: 'dim-2', target: 'block-1', edgeType: 'shapes', impactText: '', weight: 2 },
    ],
    compressedEdges: [
      { id: 'compressed-1', source: 'frage-1', target: 'block-1', edgeType: 'compressed', impactText: '', weight: 2 },
      { id: 'compressed-2', source: 'frage-2', target: 'block-1', edgeType: 'compressed', impactText: '', weight: 2 },
    ],
    conflictsByNodeId: {},
  }
}

const fullVisibility = (overrides: Partial<EdgeVisibility> = {}): EdgeVisibility => ({
  ebene1Visible: true,
  ebene2Visible: true,
  ebene3Visible: true,
  visibleFrageIds: new Set(['frage-1', 'frage-2']),
  visibleDimensionIds: new Set(['dim-1', 'dim-2']),
  ...overrides,
})

describe('buildEffectiveEdges', () => {
  it('keeps a precise Frage-level edge when the Frage is visible (expanded)', () => {
    const edges = buildEffectiveEdges(buildModel(), fullVisibility())
    const sources = edges.filter((e) => e.target === 'dim-1').map((e) => e.source)
    expect(sources.sort()).toEqual(['frage-1', 'frage-2'])
  })

  it('rolls up an edge to the Themenblock when its Frage is collapsed/invisible', () => {
    const edges = buildEffectiveEdges(buildModel(), fullVisibility({ visibleFrageIds: new Set() }))
    const toDim1 = edges.filter((e) => e.target === 'dim-1')
    expect(toDim1).toHaveLength(1)
    expect(toDim1[0].source).toBe('tb-1')
    expect(toDim1[0].originalEdgeIds.sort()).toEqual(['e-informs-1', 'e-informs-2'])
  })

  it('passes shapes edges through unchanged when dimensions are individually visible', () => {
    const edges = buildEffectiveEdges(buildModel(), fullVisibility())
    const shapes = edges.find((e) => e.source === 'dim-1' && e.target === 'block-1')
    expect(shapes?.originalEdgeIds).toEqual(['e-shapes-1'])
  })

  it('rolls up compressed edges to the Themenblock when Ebene 2 is hidden and Fragen are collapsed', () => {
    const edges = buildEffectiveEdges(
      buildModel(),
      fullVisibility({ ebene2Visible: false, visibleFrageIds: new Set() })
    )
    expect(edges).toHaveLength(1)
    expect(edges[0]).toMatchObject({ source: 'tb-1', target: 'block-1' })
    expect(edges[0].originalEdgeIds.sort()).toEqual(['compressed-1', 'compressed-2'])
  })

  it('keeps precise compressed edges when Fragen are visible', () => {
    const edges = buildEffectiveEdges(buildModel(), fullVisibility({ ebene2Visible: false }))
    expect(edges.map((e) => e.source).sort()).toEqual(['frage-1', 'frage-2'])
  })

  it('rolls up both informs and shapes edges to the dimension group when its instances are collapsed', () => {
    const edges = buildEffectiveEdges(buildModel(), fullVisibility({ visibleDimensionIds: new Set() }))
    const toGroup = edges.filter((e) => e.target === 'dimgroup:Business Goal')
    expect(toGroup.map((e) => e.source).sort()).toEqual(['frage-1', 'frage-2'])
    const fromGroup = edges.find((e) => e.source === 'dimgroup:Business Goal' && e.target === 'block-1')
    expect(fromGroup?.originalEdgeIds.sort()).toEqual(['e-shapes-1', 'e-shapes-2'])
  })

  it('drops Ebene-1-originating edges entirely when Ebene 1 is hidden', () => {
    const edges = buildEffectiveEdges(buildModel(), fullVisibility({ ebene1Visible: false }))
    expect(edges.some((e) => e.target === 'dim-1' || e.target === 'dim-2')).toBe(false)
    // shapes edges (Dimension -> ContentBlock) are unaffected by Ebene 1 visibility
    expect(edges.some((e) => e.source === 'dim-1' && e.target === 'block-1')).toBe(true)
  })

  it('drops edges targeting Content-Blöcke entirely when Ebene 3 is hidden', () => {
    const edges = buildEffectiveEdges(buildModel(), fullVisibility({ ebene3Visible: false }))
    expect(edges.some((e) => e.target === 'block-1')).toBe(false)
    // informs edges (Frage -> Dimension) are unaffected by Ebene 3 visibility
    expect(edges.some((e) => e.target === 'dim-1')).toBe(true)
  })
})
