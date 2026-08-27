import { describe, it, expect } from 'vitest'
import { normalizeMarkdown } from './normalize-markdown'
import { extractLabeledFields } from './parse-utils'

// Diese Faelle sind der eigentliche Grund fuer die Umstellung auf einen
// echten Markdown-Parser (remark/unified statt Regex, siehe PROJ-3 Tech
// Design): Formatabweichungen, die ein zeilen-basierter Regex-Ansatz nicht
// zuverlaessig erkannt haette.

describe('normalizeMarkdown', () => {
  it('normalizes an alternate bullet marker (*) to the canonical "- "', () => {
    const normalized = normalizeMarkdown('**Optionen:**\n* A: Leads sammeln\n* B: Direktverkauf')
    const fields = extractLabeledFields(normalized)
    expect(fields.get('Optionen')).toBe('- A: Leads sammeln\n- B: Direktverkauf')
  })

  it('normalizes underscore-style bold/italic to asterisk-style', () => {
    const normalized = normalizeMarkdown('__Zielgruppe:__ Indie-Studios')
    expect(extractLabeledFields(normalized).get('Zielgruppe')).toBe('Indie-Studios')
  })

  it('tolerates extra inline whitespace around a label', () => {
    const normalized = normalizeMarkdown('**Gestellt:**    Was ist dein Ziel?')
    expect(extractLabeledFields(normalized).get('Gestellt')).toBe('Was ist dein Ziel?')
  })

  it('preserves a hard line break inside a paragraph as a real newline', () => {
    const normalized = normalizeMarkdown('Erste Zeile.  \nZweite Zeile.')
    expect(normalized).toContain('Erste Zeile.\nZweite Zeile.')
  })

  it('keeps multi-line field values intact end-to-end through parseJourney-style content', () => {
    const normalized = normalizeMarkdown(
      '**Optionen:**\n- A: Leads sammeln\n- B: Direktverkauf\n- C: App-Downloads\n\n**Antwort:** C'
    )
    const fields = extractLabeledFields(normalized)
    expect(fields.get('Optionen')).toBe('- A: Leads sammeln\n- B: Direktverkauf\n- C: App-Downloads')
    expect(fields.get('Antwort')).toBe('C')
  })
})
