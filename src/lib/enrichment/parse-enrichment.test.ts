import { describe, expect, it } from 'vitest'
import { parseEnrichmentResult } from './parse-enrichment'
import type { ParsedImport } from '@/lib/imports/types'

function buildFixtureImport(): ParsedImport {
  return {
    journey: {
      hasRecognizableStructure: true,
      meta: { datum: '2026-08-01', geführtMit: 'Claude', promptVersion: 'v2' },
      sections: [
        {
          id: 'sec-journey-1',
          document: 'journey',
          name: 'Phase 1-3',
          entries: [
            {
              id: 'entry-frage-1',
              label: 'Frage 1',
              fields: [
                { id: 'field-frage-1-gestellt', name: 'Gestellt', value: 'Wer ist Zielgruppe?', status: 'found' },
                { id: 'field-frage-1-antwort', name: 'Antwort', value: 'Vereine & Ligen', status: 'found' },
              ],
            },
            {
              id: 'entry-frage-2',
              label: 'Frage 2',
              fields: [
                { id: 'field-frage-2-gestellt', name: 'Gestellt', value: 'Wie hoch ist die Prioritaet?', status: 'found' },
                { id: 'field-frage-2-antwort', name: 'Antwort', value: 'Hohe Conversion-Prioritaet', status: 'found' },
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
          id: 'sec-konzept-1',
          document: 'konzept',
          name: '4. Seitenstruktur',
          entries: [
            {
              id: 'entry-abschnitt-1',
              label: 'Abschnitt 1: Hero',
              fields: [{ id: 'field-abschnitt-1-baustein', name: 'Baustein', value: 'hero-default', status: 'found' }],
            },
          ],
        },
      ],
    },
  }
}

const VALID_RESULT = `# KI-Anreicherung – Testprojekt

**Datum:** 2026-08-28
**Erstellt mit:** Claude Sonnet 5

## Personas

### Persona: Vereine & Ligen
**Beschreibung:** B2B-Zielgruppe
**Bezug:** Frage 1 → Antwort

### Persona: Investoren
**Beschreibung:** Finanzierungsseitige Zielgruppe
**Bezug:** Frage 1 → Antwort

## Dimensionen

### Business Goal

#### Persona: Vereine & Ligen
**Wert:** Partnerschaften gewinnen
**Quelle:** Frage 1 → Antwort
**Impact-Text:** Die Antwort nennt Vereine als Zielgruppe.
**Gewichtung:** 3

#### Persona: Investoren
**Wert:** nicht ableitbar
**Quelle:** Frage 1 → Antwort
**Impact-Text:** Keine ausreichende Grundlage.
**Gewichtung:** 1

### Umsetzungsrahmen

**Wert:** Bestehendes System, mittleres Budget
**Quelle:** Frage 2 → Antwort
**Impact-Text:** Ergibt sich aus dem Umsetzungsrahmen der Antwort.
**Gewichtung:** 2

## Kanten zu Content-Blöcken

### Kante: Business Goal (Persona: Vereine & Ligen) → Abschnitt 1: Hero
**Impact-Text:** Der Hero muss das Geschäftsziel transportieren.
**Gewichtung:** 3

### Kante: Unbekannte Dimension (Persona: Vereine & Ligen) → Abschnitt 1: Hero
**Impact-Text:** Sollte nicht aufgeloest werden koennen.
**Gewichtung:** 2

## Konflikte

### Konflikt 1 (explizit)
**Feld A:** Frage 1 → Antwort
**Feld B:** Frage 2 → Antwort
**Beschreibung:** Widerspruch zwischen Zielgruppen-Fokus und Conversion-Prioritaet.

### Konflikt 2 (emergent)
**Content-Block:** Abschnitt 1: Hero
**Beteiligte Dimension:** Business Goal
**Beteiligte Personas:** Vereine & Ligen
**Beschreibung:** Hero muss mehrere Ziele gleichzeitig bedienen.
`

describe('parseEnrichmentResult', () => {
  it('parses personas, dimensions, edges and conflicts from a well-formed result', () => {
    const result = parseEnrichmentResult(VALID_RESULT, buildFixtureImport())

    expect(result.hasRecognizableStructure).toBe(true)
    expect(result.personas).toHaveLength(2)
    expect(result.personas.map((p) => p.name)).toEqual(['Vereine & Ligen', 'Investoren'])

    const businessGoalVereine = result.dimensions.find(
      (d) => d.dimensionName === 'Business Goal' && d.personaId === result.personas[0].id
    )
    expect(businessGoalVereine?.status).toBe('found')
    expect(businessGoalVereine?.value).toBe('Partnerschaften gewinnen')

    const businessGoalInvestoren = result.dimensions.find(
      (d) => d.dimensionName === 'Business Goal' && d.personaId === result.personas[1].id
    )
    expect(businessGoalInvestoren?.status).toBe('gap')
    expect(businessGoalInvestoren?.value).toBe('')

    const umsetzungsrahmen = result.dimensions.find((d) => d.dimensionName === 'Umsetzungsrahmen')
    expect(umsetzungsrahmen?.personaId).toBeNull()
    expect(umsetzungsrahmen?.status).toBe('found')

    // informs-Kante fuer Business Goal / Vereine & Ligen aufgeloest
    const informsEdge = result.edges.find(
      (e) => e.edgeType === 'informs' && e.targetDimensionId === businessGoalVereine?.id
    )
    expect(informsEdge?.sourceFieldId).toBe('field-frage-1-antwort')
    expect(informsEdge?.weight).toBe(3)

    // shapes-Kante aufgeloest
    const shapesEdge = result.edges.find((e) => e.edgeType === 'shapes')
    expect(shapesEdge?.sourceDimensionId).toBe(businessGoalVereine?.id)
    expect(shapesEdge?.targetEntryId).toBe('entry-abschnitt-1')

    // nicht aufloesbare Kante ("Unbekannte Dimension") landet als Warnung, nicht als Kante
    expect(result.unresolvedReferences.some((msg) => msg.includes('Unbekannte Dimension'))).toBe(true)
    expect(result.edges.filter((e) => e.edgeType === 'shapes')).toHaveLength(1)

    expect(result.conflicts).toHaveLength(2)
    const explicit = result.conflicts.find((c) => c.conflictType === 'explicit')
    expect(explicit?.fieldAId).toBe('field-frage-1-antwort')
    expect(explicit?.fieldBId).toBe('field-frage-2-antwort')

    const emergent = result.conflicts.find((c) => c.conflictType === 'emergent')
    expect(emergent?.entryId).toBe('entry-abschnitt-1')
    expect(emergent?.involvedDimensionIds).toEqual([businessGoalVereine?.id])
  })

  it('flags text without any recognizable structure as not recognizable', () => {
    const result = parseEnrichmentResult('Das ist nur ein normaler Fliesstext ohne jede Struktur.', buildFixtureImport())
    expect(result.hasRecognizableStructure).toBe(false)
    expect(result.personas).toHaveLength(0)
  })

  it('treats a single persona result the same as the multi-persona case', () => {
    const singlePersonaResult = `# KI-Anreicherung – Testprojekt

## Personas

### Persona: Hauptzielgruppe
**Beschreibung:** Alle Besucher
**Bezug:** Frage 1 → Antwort

## Dimensionen

### Umsetzungsrahmen
**Wert:** Neubau, kleines Budget
**Quelle:** Frage 2 → Antwort
**Impact-Text:** ...
**Gewichtung:** 2

## Kanten zu Content-Blöcken

## Konflikte
`
    const result = parseEnrichmentResult(singlePersonaResult, buildFixtureImport())
    expect(result.hasRecognizableStructure).toBe(true)
    expect(result.personas).toHaveLength(1)
    expect(result.conflicts).toHaveLength(0)
  })
})
