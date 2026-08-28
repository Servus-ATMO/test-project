import { describe, expect, it } from 'vitest'
import { buildGraphModel } from './build-graph-model'
import type { ParsedImport } from '@/lib/imports/types'
import type { Enrichment } from '@/lib/enrichment/types'

function buildParsedImport(): ParsedImport {
  return {
    journey: {
      hasRecognizableStructure: true,
      meta: { datum: '2026-08-01', geführtMit: 'Claude', promptVersion: 'v2' },
      sections: [
        {
          id: 'sec-einstieg',
          document: 'journey',
          name: 'Einstieg',
          entries: [
            {
              id: 'entry-einstieg',
              label: '',
              fields: [
                { id: 'field-einstieg-frage', name: 'Frage', value: 'Was ist euer Produkt?', status: 'found' },
                { id: 'field-einstieg-antwort', name: 'Antwort', value: 'Ein Sammelkartenspiel.', status: 'found' },
              ],
            },
          ],
        },
        {
          id: 'sec-phase1',
          document: 'journey',
          name: 'Phase 1–3',
          entries: [
            {
              id: 'entry-frage1',
              label: 'Frage 1',
              fields: [
                { id: 'field-frage1-gestellt', name: 'Gestellt', value: 'Wer ist Zielgruppe?', status: 'found' },
                { id: 'field-frage1-optionen', name: 'Optionen', value: 'A) X\nB) Y', status: 'found' },
                { id: 'field-frage1-antwort', name: 'Antwort', value: 'Vereine & Ligen', status: 'found' },
              ],
            },
            {
              id: 'entry-frage2',
              label: 'Frage 2',
              fields: [
                { id: 'field-frage2-gestellt', name: 'Gestellt', value: 'Was ist das Ziel?', status: 'gap' },
                { id: 'field-frage2-antwort', name: 'Antwort', value: '', status: 'gap' },
              ],
            },
          ],
        },
        {
          id: 'sec-notizen',
          document: 'journey',
          name: 'Notizen zur Aufnahme',
          entries: [
            {
              id: 'entry-notizen',
              label: '',
              fields: [
                {
                  id: 'field-notizen-uebersprungen',
                  name: 'Übersprungene oder zusätzliche Fragen',
                  value: 'Keine.',
                  status: 'found',
                },
              ],
            },
          ],
        },
      ],
    },
    konzept: {
      hasRecognizableStructure: true,
      meta: { datum: '2026-08-01', erstelltMit: 'Claude' },
      sections: [
        {
          id: 'sec-seitenstruktur',
          document: 'konzept',
          name: '4. Seitenstruktur',
          entries: [
            {
              id: 'entry-abschnitt1',
              label: 'Abschnitt 1: Hero',
              fields: [{ id: 'field-abschnitt1-baustein', name: 'Baustein', value: 'hero-default', status: 'found' }],
            },
            {
              id: 'entry-abschnitt2',
              label: 'Abschnitt 2: Trust',
              fields: [{ id: 'field-abschnitt2-baustein', name: 'Baustein', value: 'trust-default', status: 'found' }],
            },
          ],
        },
      ],
    },
  }
}

function buildEnrichment(overrides: Partial<Enrichment> = {}): Enrichment {
  return {
    id: 'enrichment-1',
    projectId: 'project-1',
    sourceImportId: 'import-1',
    rawResultText: '',
    createdAt: '2026-08-01T00:00:00Z',
    updatedAt: '2026-08-01T00:00:00Z',
    personas: [{ id: 'persona-vereine', name: 'Vereine & Ligen', description: '', sourceReference: '', position: 0 }],
    dimensions: [
      {
        id: 'dim-business-goal',
        dimensionName: 'Business Goal',
        personaId: 'persona-vereine',
        value: 'Partnerschaften gewinnen',
        status: 'found',
        position: 0,
      },
      {
        id: 'dim-umsetzungsrahmen',
        dimensionName: 'Umsetzungsrahmen',
        personaId: null,
        value: 'Bestehendes System',
        status: 'found',
        position: 1,
      },
    ],
    edges: [
      {
        id: 'edge-informs-1',
        edgeType: 'informs',
        sourceFieldId: 'field-frage1-antwort',
        targetDimensionId: 'dim-business-goal',
        sourceDimensionId: null,
        targetEntryId: null,
        impactText: 'Die Antwort nennt Vereine als Zielgruppe.',
        weight: 3,
      },
      {
        id: 'edge-shapes-1',
        edgeType: 'shapes',
        sourceFieldId: null,
        targetDimensionId: null,
        sourceDimensionId: 'dim-business-goal',
        targetEntryId: 'entry-abschnitt1',
        impactText: 'Der Hero muss das Ziel transportieren.',
        weight: 3,
      },
    ],
    conflicts: [],
    ...overrides,
  }
}

describe('buildGraphModel', () => {
  it('creates a Frage node for Einstieg with the section name as label (empty entry.label)', () => {
    const model = buildGraphModel(buildParsedImport(), buildEnrichment())
    const einstieg = model.fragen.find((f) => f.id === 'entry-einstieg')
    expect(einstieg?.label).toBe('Einstieg')
    expect(einstieg?.frageText).toBe('Was ist euer Produkt?')
    expect(einstieg?.antwortText).toBe('Ein Sammelkartenspiel.')
  })

  it('excludes "Notizen zur Aufnahme" from the Themenblock/Frage nodes', () => {
    const model = buildGraphModel(buildParsedImport(), buildEnrichment())
    expect(model.themenbloecke.some((t) => t.sectionName === 'Notizen zur Aufnahme')).toBe(false)
    expect(model.fragen.some((f) => f.id === 'entry-notizen')).toBe(false)
  })

  it('groups Fragen under their Themenblock', () => {
    const model = buildGraphModel(buildParsedImport(), buildEnrichment())
    const phase1 = model.themenbloecke.find((t) => t.id === 'sec-phase1')
    expect(phase1?.frageIds).toEqual(['entry-frage1', 'entry-frage2'])
  })

  it('keeps a gap Frage/Antwort as a node instead of dropping it', () => {
    const model = buildGraphModel(buildParsedImport(), buildEnrichment())
    const frage2 = model.fragen.find((f) => f.id === 'entry-frage2')
    expect(frage2?.frageStatus).toBe('gap')
    expect(frage2?.antwortStatus).toBe('gap')
  })

  it('resolves an informs edge from the Antwort field to the Frage node, and a shapes edge to the content block', () => {
    const model = buildGraphModel(buildParsedImport(), buildEnrichment())
    const informs = model.edges.find((e) => e.edgeType === 'informs')
    expect(informs?.source).toBe('entry-frage1')
    expect(informs?.target).toBe('dim-business-goal')

    const shapes = model.edges.find((e) => e.edgeType === 'shapes')
    expect(shapes?.source).toBe('dim-business-goal')
    expect(shapes?.target).toBe('entry-abschnitt1')
  })

  it('resolves personaName for a per-persona dimension, and null for the global Umsetzungsrahmen', () => {
    const model = buildGraphModel(buildParsedImport(), buildEnrichment())
    const businessGoal = model.dimensionen.find((d) => d.id === 'dim-business-goal')
    expect(businessGoal?.personaName).toBe('Vereine & Ligen')

    const umsetzungsrahmen = model.dimensionen.find((d) => d.id === 'dim-umsetzungsrahmen')
    expect(umsetzungsrahmen?.personaName).toBeNull()
  })

  it('shows a content block without any incoming shapes edge as an isolated node', () => {
    const model = buildGraphModel(buildParsedImport(), buildEnrichment())
    const abschnitt2 = model.contentBlocks.find((b) => b.id === 'entry-abschnitt2')
    expect(abschnitt2).toBeDefined()
    expect(model.edges.some((e) => e.target === 'entry-abschnitt2')).toBe(false)
  })

  it('silently skips an informs edge whose source field lies outside the modeled Themenbloecke (e.g. Notizen zur Aufnahme)', () => {
    const enrichment = buildEnrichment({
      edges: [
        {
          id: 'edge-informs-notizen',
          edgeType: 'informs',
          sourceFieldId: 'field-notizen-uebersprungen',
          targetDimensionId: 'dim-business-goal',
          sourceDimensionId: null,
          targetEntryId: null,
          impactText: 'x',
          weight: 2,
        },
      ],
    })
    const model = buildGraphModel(buildParsedImport(), enrichment)
    expect(model.edges).toHaveLength(0)
    // Der Dimension-Knoten selbst bleibt trotzdem bestehen.
    expect(model.dimensionen.some((d) => d.id === 'dim-business-goal')).toBe(true)
  })

  it('builds a deduplicated compressed edge from Frage directly to Content-Block through the dimension', () => {
    const model = buildGraphModel(buildParsedImport(), buildEnrichment())
    expect(model.compressedEdges).toHaveLength(1)
    expect(model.compressedEdges[0]).toMatchObject({ source: 'entry-frage1', target: 'entry-abschnitt1' })
  })

  it('marks both Frage nodes of an explicit conflict', () => {
    const enrichment = buildEnrichment({
      conflicts: [
        {
          id: 'conflict-1',
          conflictType: 'explicit',
          description: 'Widerspruch zwischen Frage 1 und Frage 2.',
          fieldAId: 'field-frage1-antwort',
          fieldBId: 'field-frage2-antwort',
          entryId: null,
          involvedDimensionIds: [],
        },
      ],
    })
    const model = buildGraphModel(buildParsedImport(), enrichment)
    const frage1 = model.fragen.find((f) => f.id === 'entry-frage1')
    const frage2 = model.fragen.find((f) => f.id === 'entry-frage2')
    expect(frage1?.hasConflict).toBe(true)
    expect(frage2?.hasConflict).toBe(true)
    expect(model.conflictsByNodeId['entry-frage1']).toHaveLength(1)
  })

  it('marks the content block and involved dimensions of an emergent conflict', () => {
    const enrichment = buildEnrichment({
      conflicts: [
        {
          id: 'conflict-2',
          conflictType: 'emergent',
          description: 'Hero muss mehrere Ziele gleichzeitig bedienen.',
          fieldAId: null,
          fieldBId: null,
          entryId: 'entry-abschnitt1',
          involvedDimensionIds: ['dim-business-goal'],
        },
      ],
    })
    const model = buildGraphModel(buildParsedImport(), enrichment)
    const abschnitt1 = model.contentBlocks.find((b) => b.id === 'entry-abschnitt1')
    const businessGoal = model.dimensionen.find((d) => d.id === 'dim-business-goal')
    expect(abschnitt1?.hasConflict).toBe(true)
    expect(businessGoal?.hasConflict).toBe(true)
  })
})
