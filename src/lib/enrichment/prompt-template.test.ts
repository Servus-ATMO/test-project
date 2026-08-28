import { describe, expect, it } from 'vitest'
import { buildEnrichmentPrompt } from './prompt-template'
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
                { id: 'f1', name: 'Gestellt', value: 'Wer ist Zielgruppe?', status: 'found' },
                { id: 'f2', name: 'Antwort', value: 'Vereine & Ligen', status: 'found' },
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
              fields: [{ id: 'f3', name: 'Baustein', value: 'hero-default', status: 'found' }],
            },
          ],
        },
        {
          id: 'sec-konzept-2',
          document: 'konzept',
          name: '1. Kurzfassung',
          entries: [{ id: 'entry-kurzfassung', label: '', fields: [{ id: 'f4', name: 'Ziel', value: '(irrelevant)', status: 'found' }] }],
        },
      ],
    },
  }
}

describe('buildEnrichmentPrompt', () => {
  it('embeds journey fields, only the Seitenstruktur content blocks, the fixed dimension catalog and the halluzination guard', () => {
    const prompt = buildEnrichmentPrompt('Testprojekt', buildFixtureImport())

    expect(prompt).toContain('Frage 1')
    expect(prompt).toContain('Vereine & Ligen')
    expect(prompt).toContain('Abschnitt 1: Hero')
    expect(prompt).toContain('hero-default')
    expect(prompt).toContain('Business Goal')
    expect(prompt).toContain('Umsetzungsrahmen')
    expect(prompt).toContain('Halluzinationsschutz')
    expect(prompt).toContain('Testprojekt')

    // Nur Abschnitt 4 "Seitenstruktur" gehoert zu Ebene 3 - andere Konzept-
    // Abschnitte (hier "1. Kurzfassung") duerfen nicht als Content-Block
    // eingebettet werden.
    expect(prompt).not.toContain('(irrelevant)')
  })

  // Nutzer-Feedback (2026-08-28): das Ergebnis musste bisher manuell aus dem
  // Chat-Text in eine .md-Datei kopiert werden, bevor es wieder hochgeladen
  // werden konnte. Die KI wird jetzt explizit angewiesen, eine herunterladbare
  // Datei/ein Artifact auszugeben statt nur Chat-Text.
  it('instructs the AI to output a downloadable file instead of plain chat text', () => {
    const prompt = buildEnrichmentPrompt('Testprojekt', buildFixtureImport())
    expect(prompt).toContain('herunterladbare Markdown-Datei')
  })

  it('falls back to a clear placeholder when Abschnitt 4 "Seitenstruktur" is missing from the import', () => {
    const withoutSeitenstruktur = buildFixtureImport()
    withoutSeitenstruktur.konzept.sections = withoutSeitenstruktur.konzept.sections.filter(
      (s) => s.name !== '4. Seitenstruktur'
    )
    const prompt = buildEnrichmentPrompt('Testprojekt', withoutSeitenstruktur)
    expect(prompt).toContain('wurde im Import nicht gefunden')
  })
})
