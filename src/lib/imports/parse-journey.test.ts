import { describe, it, expect } from 'vitest'
import { parseJourney } from './parse-journey'

const SAMPLE = `# Journey-Transkript – Sammelkartenspiel OffSeason

**Datum:** 2026-08-20
**Geführt mit:** Claude Code
**Prompt-Version:** \`Adaptiver Landingpage-Konzeptions-Prompt v2.md\`

---

## Einstieg

**Frage:**
Beschreib dein Produkt kurz.

**Antwort:**
Ein digitales Sammelkartenspiel für die Fußball-Nebensaison.

---

## Phase 1–3 – Ziel, Kontext & Herkunft

### Frage 1
**Gestellt:** Was ist das Hauptziel der Landingpage?
**Optionen:**
- A: Leads sammeln
- B: Direktverkauf
- C: App-Downloads

**Antwort:** C

### Frage 2
**Gestellt:** Wer ist deine Zielgruppe?
**Optionen:** …
**Antwort:** [frei] Fußballfans zwischen 20 und 40, die auch andere Sammelkartenspiele kennen.

### Frage 3
**Gestellt:** …
**Optionen:** …
**Antwort:** …

---

## Phase 10 – Konzeptionelle Synthese

### Frage 10
**Gestellt:** Was ist die wichtigste Erkenntnis aus diesem Gespräch?
**Antwort:** Die Zielgruppe kennt das Genre bereits, Erklärbedarf ist gering.

---

## Notizen zur Aufnahme

**Beobachtungen zur adaptiven Logik:**
Die freie Antwort bei Frage 2 hat Frage 5 sichtbar beeinflusst.

**Abweichungen vom Standard-Antwortformat:**
…

**Übersprungene oder zusätzliche Fragen:**
Phasen 4-9 wurden in dieser Demo ausgelassen.
`

describe('parseJourney', () => {
  it('extracts header metadata', () => {
    const result = parseJourney(SAMPLE)
    expect(result.meta).toEqual({
      datum: '2026-08-20',
      geführtMit: 'Claude Code',
      promptVersion: '`Adaptiver Landingpage-Konzeptions-Prompt v2.md`',
    })
  })

  it('parses Einstieg as a single entry', () => {
    const result = parseJourney(SAMPLE)
    const einstieg = result.sections.find((s) => s.name === 'Einstieg')
    expect(einstieg?.entries).toHaveLength(1)
    const frage = einstieg?.entries[0].fields.find((f) => f.name === 'Frage')
    expect(frage).toMatchObject({ status: 'found', value: 'Beschreib dein Produkt kurz.' })
  })

  it('parses a variable number of Frage entries per phase, in order', () => {
    const result = parseJourney(SAMPLE)
    const phase1 = result.sections.find((s) => s.name.startsWith('Phase 1–3'))
    expect(phase1?.entries.map((e) => e.label)).toEqual(['Frage 1', 'Frage 2', 'Frage 3'])
  })

  it('captures the Optionen list as a single multi-line field', () => {
    const result = parseJourney(SAMPLE)
    const phase1 = result.sections.find((s) => s.name.startsWith('Phase 1–3'))
    const frage1 = phase1?.entries[0]
    const optionen = frage1?.fields.find((f) => f.name === 'Optionen')
    expect(optionen?.value).toBe('- A: Leads sammeln\n- B: Direktverkauf\n- C: App-Downloads')
  })

  it('recognizes a [frei] answer as real content, not a gap', () => {
    const result = parseJourney(SAMPLE)
    const phase1 = result.sections.find((s) => s.name.startsWith('Phase 1–3'))
    const frage2Antwort = phase1?.entries[1].fields.find((f) => f.name === 'Antwort')
    expect(frage2Antwort?.status).toBe('found')
    expect(frage2Antwort?.value).toContain('[frei] Fußballfans')
  })

  it('marks a fully unanswered question as gaps, not crashes', () => {
    const result = parseJourney(SAMPLE)
    const phase1 = result.sections.find((s) => s.name.startsWith('Phase 1–3'))
    const frage3 = phase1?.entries[2]
    expect(frage3?.fields.find((f) => f.name === 'Gestellt')?.status).toBe('gap')
    expect(frage3?.fields.find((f) => f.name === 'Antwort')?.status).toBe('gap')
  })

  it('does not treat a missing Optionen field in Phase 10 as a gap (not expected there)', () => {
    const result = parseJourney(SAMPLE)
    const phase10 = result.sections.find((s) => s.name.startsWith('Phase 10'))
    const frage10 = phase10?.entries[0]
    expect(frage10?.fields.find((f) => f.name === 'Optionen')).toBeUndefined()
    expect(frage10?.fields.find((f) => f.name === 'Antwort')?.status).toBe('found')
  })

  it('parses Notizen zur Aufnahme with its three fields', () => {
    const result = parseJourney(SAMPLE)
    const notizen = result.sections.find((s) => s.name === 'Notizen zur Aufnahme')
    const fields = notizen?.entries[0].fields ?? []
    expect(fields.find((f) => f.name === 'Beobachtungen zur adaptiven Logik')?.status).toBe('found')
    expect(fields.find((f) => f.name === 'Abweichungen vom Standard-Antwortformat')?.status).toBe(
      'gap'
    )
  })

  it('reports hasRecognizableStructure as true for a real document', () => {
    expect(parseJourney(SAMPLE).hasRecognizableStructure).toBe(true)
  })

  it('reports hasRecognizableStructure as false for unrelated text', () => {
    expect(parseJourney('Just some random notes, not a journey transcript at all.').hasRecognizableStructure).toBe(
      false
    )
  })
})
