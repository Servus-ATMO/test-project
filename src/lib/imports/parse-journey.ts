import { makeId, buildFields, extractLabeledFields, splitByHeadingLevel } from './parse-utils'
import type { ImportEntry, ImportSection, JourneyMeta, ParsedDocument } from './types'

// Nur "Gestellt" und "Antwort" gelten als zwingend erwartet - "Optionen"
// fehlt in Phase 10 (Konzeptionelle Synthese) laut Vorlage bewusst, ein
// Fehlen dort waere also keine echte Luecke (siehe PROJ-3 Tech Design).
const FRAGE_EXPECTED = ['Gestellt', 'Antwort']
const EINSTIEG_EXPECTED = ['Frage', 'Antwort']
const NOTIZEN_EXPECTED = [
  'Beobachtungen zur adaptiven Logik',
  'Abweichungen vom Standard-Antwortformat',
  'Übersprungene oder zusätzliche Fragen',
]

export function parseJourneyMeta(text: string): JourneyMeta {
  const meta = extractLabeledFields(text)
  return {
    datum: meta.get('Datum') ?? '',
    geführtMit: meta.get('Geführt mit') ?? '',
    promptVersion: meta.get('Prompt-Version') ?? '',
  }
}

export function parseJourney(text: string): ParsedDocument & { meta: JourneyMeta } {
  const meta = parseJourneyMeta(text)
  const sections: ImportSection[] = []

  for (const { title, body } of splitByHeadingLevel(text, 2)) {
    if (title === 'Einstieg') {
      sections.push({
        id: makeId(),
        document: 'journey',
        name: title,
        entries: [{ id: makeId(), label: '', fields: buildFields(body, EINSTIEG_EXPECTED) }],
      })
      continue
    }

    if (title === 'Notizen zur Aufnahme') {
      sections.push({
        id: makeId(),
        document: 'journey',
        name: title,
        entries: [{ id: makeId(), label: '', fields: buildFields(body, NOTIZEN_EXPECTED) }],
      })
      continue
    }

    // Phase-Abschnitte: enthalten eine variable Anzahl "### Frage N"-Bloecke
    // (siehe Edge Case "adaptive Fragenanzahl" in der Spec - keine feste
    // Zahl angenommen).
    const fragen = splitByHeadingLevel(body, 3)
    if (fragen.length === 0) continue

    const entries: ImportEntry[] = fragen.map(({ title: fragTitle, body: fragBody }) => ({
      id: makeId(),
      label: fragTitle,
      fields: buildFields(fragBody, FRAGE_EXPECTED),
    }))
    sections.push({ id: makeId(), document: 'journey', name: title, entries })
  }

  const hasRecognizableStructure = sections.some((s) =>
    s.entries.some((e) => e.fields.some((f) => f.status === 'found'))
  )

  return { sections, meta, hasRecognizableStructure }
}
