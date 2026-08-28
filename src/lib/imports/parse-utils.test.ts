import { describe, it, expect } from 'vitest'
import { buildFields, buildFrageFields, extractLabeledFields, isPlaceholder, splitByHeadingLevel } from './parse-utils'

describe('isPlaceholder', () => {
  it('treats empty, ellipsis and bracketed text as placeholders', () => {
    expect(isPlaceholder('')).toBe(true)
    expect(isPlaceholder('   ')).toBe(true)
    expect(isPlaceholder('…')).toBe(true)
    expect(isPlaceholder('...')).toBe(true)
    expect(isPlaceholder('[noch auszufüllen]')).toBe(true)
  })

  it('does not treat real content as a placeholder', () => {
    expect(isPlaceholder('Kleine Studios ohne eigenes Marketing-Team')).toBe(false)
    expect(isPlaceholder('A, B')).toBe(false)
  })
})

describe('extractLabeledFields', () => {
  it('parses bold-colon fields with inline values', () => {
    const result = extractLabeledFields('**Datum:** 2026-08-20\n**Prompt-Version:** v2')
    expect(result.get('Datum')).toBe('2026-08-20')
    expect(result.get('Prompt-Version')).toBe('v2')
  })

  it('collects multi-line continuation until the next field (Optionen list)', () => {
    const block = [
      '**Gestellt:** Was ist dein Ziel?',
      '**Optionen:**',
      '- A: Leads sammeln',
      '- B: Verkaufen',
      '**Antwort:** A',
    ].join('\n')
    const result = extractLabeledFields(block)
    expect(result.get('Gestellt')).toBe('Was ist dein Ziel?')
    expect(result.get('Optionen')).toBe('- A: Leads sammeln\n- B: Verkaufen')
    expect(result.get('Antwort')).toBe('A')
  })

  it('parses bullet-style bold fields', () => {
    const result = extractLabeledFields('- **Zielgruppe:** Indie-Studios\n- **Kernproblem:** Zu wenig Sichtbarkeit')
    expect(result.get('Zielgruppe')).toBe('Indie-Studios')
    expect(result.get('Kernproblem')).toBe('Zu wenig Sichtbarkeit')
  })

  it('parses numbered bold fields', () => {
    const result = extractLabeledFields('1. **Must Have:** Hero-Sektion\n2. **Should Have:** FAQ')
    expect(result.get('Must Have')).toBe('Hero-Sektion')
    expect(result.get('Should Have')).toBe('FAQ')
  })

  it('parses italic-colon fields', () => {
    const result = extractLabeledFields('*Erwarteter Effekt:* Mehr Anmeldungen\n*Erkennbar an:* Conversion-Rate')
    expect(result.get('Erwarteter Effekt')).toBe('Mehr Anmeldungen')
    expect(result.get('Erkennbar an')).toBe('Conversion-Rate')
  })

  it('parses bold-only headings (no colon) as field starts', () => {
    const result = extractLabeledFields('**Für wen ist sie?**\nIndie-Entwickler mit wenig Budget')
    expect(result.get('Für wen ist sie?')).toBe('Indie-Entwickler mit wenig Budget')
  })
})

describe('buildFields', () => {
  it('marks expected fields as found or gap, and keeps extra found fields', () => {
    const block = '**Gestellt:** Was ist dein Ziel?\n**Antwort:** Mehr Leads'
    const fields = buildFields(block, ['Gestellt', 'Optionen', 'Antwort'])
    const byName = Object.fromEntries(fields.map((f) => [f.name, f]))
    expect(byName['Gestellt']).toMatchObject({ status: 'found', value: 'Was ist dein Ziel?' })
    expect(byName['Optionen']).toMatchObject({ status: 'gap', value: '' })
    expect(byName['Antwort']).toMatchObject({ status: 'found', value: 'Mehr Leads' })
  })

  it('treats a placeholder value as a gap even when the label is present', () => {
    const fields = buildFields('**Zielgruppe:** …', ['Zielgruppe'])
    expect(fields[0]).toMatchObject({ status: 'gap', value: '' })
  })
})

describe('buildFrageFields', () => {
  it('parses the Vorlage-labeled format as before (Gestellt/Optionen/Antwort)', () => {
    const block = [
      '**Gestellt:** Was ist dein Ziel?',
      '**Optionen:**',
      '- A: Leads sammeln',
      '- B: Verkaufen',
      '**Antwort:** A',
    ].join('\n')
    const fields = buildFrageFields(block)
    const byName = Object.fromEntries(fields.map((f) => [f.name, f]))
    expect(byName['Gestellt']).toMatchObject({ status: 'found', value: 'Was ist dein Ziel?' })
    expect(byName['Optionen']).toMatchObject({ status: 'found' })
    expect(byName['Antwort']).toMatchObject({ status: 'found', value: 'A' })
  })

  // Der tatsaechliche Output des externen Interview-Prompts (siehe
  // docs/reference/Adaptiver-Landingpage-Konzeptions-Prompt-v2.md, Zeilen
  // 192-197): Frage als Freitext-Absatz ohne Label, Optionen als "A) ..."-
  // Zeilen, Antwort unter "**Gewählte Antwort:**" - Bug-Report PROJ-3.
  it('recovers Gestellt/Optionen/Antwort from the real prompt-output format', () => {
    const block = [
      'Welche strategische Richtung passt am besten zu eurem Vorhaben?',
      '',
      'A) Klarster Hauptweg, der sich aus dem bisherigen Profil ergibt',
      'B) Gegenläufige strategische Richtung',
      'C) Hybride Ausrichtung, die zwei Richtungen verbindet',
      '',
      '**Gewählte Antwort:** C — Hybride Ausrichtung passt am besten.',
    ].join('\n')
    const fields = buildFrageFields(block)
    const byName = Object.fromEntries(fields.map((f) => [f.name, f]))
    expect(byName['Gestellt']).toMatchObject({
      status: 'found',
      value: 'Welche strategische Richtung passt am besten zu eurem Vorhaben?',
    })
    expect(byName['Optionen']?.status).toBe('found')
    expect(byName['Optionen']?.value).toContain('A) Klarster Hauptweg')
    expect(byName['Antwort']).toMatchObject({
      status: 'found',
      value: 'C — Hybride Ausrichtung passt am besten.',
    })
    expect(byName['Gewählte Antwort']).toBeUndefined()
  })

  it('still marks a fully unanswered question as gaps, not crashes', () => {
    const fields = buildFrageFields('')
    const byName = Object.fromEntries(fields.map((f) => [f.name, f]))
    expect(byName['Gestellt']).toMatchObject({ status: 'gap', value: '' })
    expect(byName['Antwort']).toMatchObject({ status: 'gap', value: '' })
    expect(byName['Optionen']).toBeUndefined()
  })
})

describe('splitByHeadingLevel', () => {
  it('splits on the given heading level only', () => {
    const text = [
      '# Title',
      '## Section A',
      'content a',
      '### Sub A1',
      'nested, ignored at level 2',
      '## Section B',
      'content b',
    ].join('\n')
    const sections = splitByHeadingLevel(text, 2)
    expect(sections).toHaveLength(2)
    expect(sections[0].title).toBe('Section A')
    expect(sections[0].body).toContain('content a')
    expect(sections[0].body).toContain('### Sub A1')
    expect(sections[1].title).toBe('Section B')
  })

  it('returns an empty array when no heading of that level exists', () => {
    expect(splitByHeadingLevel('just some text', 2)).toEqual([])
  })
})
