import { describe, expect, it } from 'vitest'
import { computeHighlight, computeHighlightForPersona } from './highlight'
import type { GraphModel } from './types'

function buildModel(): GraphModel {
  return {
    themenbloecke: [{ type: 'themenblock', id: 'tb-1', sectionName: 'Phase 1-3', frageIds: ['frage-1'] }],
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
      {
        type: 'dimension',
        id: 'dim-2',
        dimensionName: 'Awareness Level',
        personaName: null,
        value: 'nicht ableitbar',
        status: 'gap',
        hasConflict: false,
      },
    ],
    contentBlocks: [
      { type: 'contentblock', id: 'block-1', label: 'Abschnitt 1: Hero', fields: [], hasConflict: false },
      { type: 'contentblock', id: 'block-2', label: 'Abschnitt 2: Trust', fields: [], hasConflict: false },
    ],
    edges: [
      { id: 'e-informs-1', source: 'frage-1', target: 'dim-1', edgeType: 'informs', impactText: '', weight: 3 },
      { id: 'e-shapes-1', source: 'dim-1', target: 'block-1', edgeType: 'shapes', impactText: '', weight: 3 },
    ],
    compressedEdges: [
      { id: 'compressed-1', source: 'frage-1', target: 'block-1', edgeType: 'compressed', impactText: '', weight: 2 },
    ],
    conflictsByNodeId: {},
  }
}

describe('computeHighlight', () => {
  it('traces forward from a Frage node through its dimension to the shaped content block', () => {
    const { activeNodeIds, activeEdgeIds } = computeHighlight('frage-1', buildModel(), true)
    expect(activeNodeIds).toEqual(new Set(['frage-1', 'dim-1', 'block-1']))
    expect(activeEdgeIds).toEqual(new Set(['e-informs-1', 'e-shapes-1']))
  })

  it('traces backward from a Content-Block node through its dimension to the informing Frage', () => {
    const { activeNodeIds, activeEdgeIds } = computeHighlight('block-1', buildModel(), true)
    expect(activeNodeIds).toEqual(new Set(['block-1', 'dim-1', 'frage-1']))
    expect(activeEdgeIds).toEqual(new Set(['e-shapes-1', 'e-informs-1']))
  })

  it('traces one hop each direction from a Dimension node', () => {
    const { activeNodeIds, activeEdgeIds } = computeHighlight('dim-1', buildModel(), true)
    expect(activeNodeIds).toEqual(new Set(['dim-1', 'frage-1', 'block-1']))
    expect(activeEdgeIds).toEqual(new Set(['e-informs-1', 'e-shapes-1']))
  })

  it('only includes the node itself when it has no connections', () => {
    const { activeNodeIds, activeEdgeIds } = computeHighlight('block-2', buildModel(), true)
    expect(activeNodeIds).toEqual(new Set(['block-2']))
    expect(activeEdgeIds.size).toBe(0)
  })

  it('uses the compressed edges when Ebene 2 is hidden, skipping the dimension entirely', () => {
    const { activeNodeIds, activeEdgeIds } = computeHighlight('frage-1', buildModel(), false)
    expect(activeNodeIds).toEqual(new Set(['frage-1', 'block-1']))
    expect(activeEdgeIds).toEqual(new Set(['compressed-1']))
  })
})

function buildModelWithPersonas(): GraphModel {
  return {
    themenbloecke: [{ type: 'themenblock', id: 'tb-1', sectionName: 'Phase 1-3', frageIds: ['frage-1'] }],
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
    ],
    dimensionen: [
      {
        type: 'dimension',
        id: 'dim-vereine',
        dimensionName: 'Business Goal',
        personaName: 'Vereine & Ligen',
        value: 'Partnerschaften gewinnen',
        status: 'found',
        hasConflict: false,
      },
      {
        type: 'dimension',
        id: 'dim-direkt',
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
      { id: 'e-informs-1', source: 'frage-1', target: 'dim-vereine', edgeType: 'informs', impactText: '', weight: 3 },
      { id: 'e-shapes-1', source: 'dim-vereine', target: 'block-1', edgeType: 'shapes', impactText: '', weight: 3 },
      { id: 'e-shapes-2', source: 'dim-direkt', target: 'block-1', edgeType: 'shapes', impactText: '', weight: 2 },
    ],
    compressedEdges: [],
    conflictsByNodeId: {},
  }
}

describe('computeHighlightForPersona', () => {
  it('unions the highlight of every dimension instance belonging to the given persona', () => {
    const { activeNodeIds, activeEdgeIds } = computeHighlightForPersona(
      'Vereine & Ligen',
      buildModelWithPersonas(),
      true
    )
    expect(activeNodeIds).toEqual(new Set(['dim-vereine', 'frage-1', 'block-1']))
    expect(activeEdgeIds).toEqual(new Set(['e-informs-1', 'e-shapes-1']))
  })

  it('only highlights the instances of the selected persona, not other personas of the same dimension', () => {
    const { activeNodeIds } = computeHighlightForPersona('Direktkäufer', buildModelWithPersonas(), true)
    expect(activeNodeIds).toEqual(new Set(['dim-direkt', 'block-1']))
    expect(activeNodeIds.has('dim-vereine')).toBe(false)
  })

  it('returns an empty result for a persona with no dimension instances', () => {
    const { activeNodeIds, activeEdgeIds } = computeHighlightForPersona(
      'Unbekannte Persona',
      buildModelWithPersonas(),
      true
    )
    expect(activeNodeIds.size).toBe(0)
    expect(activeEdgeIds.size).toBe(0)
  })
})
