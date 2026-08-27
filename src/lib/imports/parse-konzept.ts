import {
  makeId,
  buildFields,
  extractLabeledFields,
  isPlaceholder,
  splitByHeadingLevel,
} from './parse-utils'
import { normalizeMarkdown } from './normalize-markdown'
import type { ImportEntry, ImportSection, KonzeptMeta, ParsedDocument } from './types'

const KURZFASSUNG_EXPECTED = [
  'Was soll die Landingpage erreichen?',
  'Für wen ist sie?',
  'Woher kommt der Besucher und was weiß er bereits?',
  'Was ist das zentrale Problem?',
  'Was ist das zentrale Versprechen?',
  'Warum sollte der Nutzer glauben, dass das Angebot dieses Versprechen erfüllt?',
  'Was ist die wichtigste Conversion?',
]
const FUNDAMENT_EXPECTED = [
  'Zielgruppe',
  'Kernproblem',
  'Kernbedürfnis',
  'Value Proposition',
  'Differenzierung',
  'Hauptargument',
  'Emotionaler Kern',
  'Rationaler Kern',
  'Einwände',
  'Vertrauensfaktoren',
]
const ABSCHNITT_EXPECTED = [
  'Baustein',
  'Ziel',
  'Kernbotschaft',
  'Headline',
  'Subline',
  'Inhalt',
  'Medien',
  'CTA',
  'Interaktion',
  'Position',
]
const CONVERSION_EXPECTED = [
  'Primary CTA',
  'Secondary CTA',
  'CTA-Platzierung',
  'Conversion-Hürden',
  'Einwandbehandlung',
  'Vertrauensaufbau',
  'Proof Points',
  'Micro-Conversions',
]
const MESSAGE_EXPECTED = [
  'Leitversprechen',
  'Messaging Pillars',
  'Kernargumente',
  'Wichtigste Benefits',
  'Einwand-Antwort-Paare',
  'Mögliche Social-Proof-Mechanik',
]
const NUTZERFUEHRUNG_EXPECTED = [
  'Informationshierarchie',
  'Nutzerführung',
  'Scan-Verhalten',
  'Content-Dichte',
  'Interaktionsgrad',
  'Scroll-Dramaturgie',
  'CTA-Logik',
  'Mobile-Priorität',
]
const PRIORISIERUNG_EXPECTED = ['Must Have', 'Should Have', 'Nice to Have', 'Weglassen', 'Begründung']
const ABSCHLUSS_EXPECTED = [
  'Wichtigste strategische Entscheidung',
  'Was bei der Umsetzung auf keinen Fall verwässert werden darf',
  'Was der größte Fehler bei der Umsetzung wäre',
]

export function parseKonzeptMeta(text: string): KonzeptMeta {
  const meta = extractLabeledFields(text)
  return {
    datum: meta.get('Datum') ?? '',
    erstelltMit: meta.get('Erstellt mit') ?? '',
  }
}

function singleEntry(body: string, expected: string[]): ImportEntry[] {
  return [{ id: makeId(), label: '', fields: buildFields(body, expected) }]
}

// Abschnitt 2 "Leitidee" folgt keinem Label-Schema: ein zitierter Leitsatz,
// danach ein freier Absatz. Feldnamen sind hier bewusst synthetisch, da die
// Vorlage selbst keine vergibt.
function parseLeitidee(body: string): ImportEntry[] {
  const paragraphs = body
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l !== '' && l !== '---')
  const leitsatz = paragraphs[0] ?? ''
  const kontext = paragraphs.slice(1).join(' ')
  return [
    {
      id: makeId(),
      label: '',
      fields: [
        {
          id: makeId(),
          name: 'Leitsatz',
          value: isPlaceholder(leitsatz) ? '' : leitsatz,
          status: isPlaceholder(leitsatz) ? 'gap' : 'found',
        },
        {
          id: makeId(),
          name: 'Kontext',
          value: isPlaceholder(kontext) ? '' : kontext,
          status: isPlaceholder(kontext) ? 'gap' : 'found',
        },
      ],
    },
  ]
}

// Abschnitt 4 "Seitenstruktur": eine variable Anzahl "### Abschnitt N"-
// Bloecke, plus eine abschliessende "frei-Abschnitte"-Zusammenfassung, die
// ausserhalb jedes einzelnen Abschnitts steht.
function parseSeitenstruktur(body: string): ImportEntry[] {
  // "frei-Abschnitte" steht ausserhalb jedes einzelnen "### Abschnitt"-
  // Blocks, muss also VOR dem Aufteilen in Eintraege abgetrennt werden -
  // sonst landet die Zeile faelschlich als Zusatzfeld im letzten Abschnitt.
  const lines = body.split('\n')
  const freiIndex = lines.findIndex((l) => /^\*\*frei-Abschnitte:\*\*/.test(l.trim()))
  const entriesBody = freiIndex === -1 ? body : lines.slice(0, freiIndex).join('\n')
  const freiBody = freiIndex === -1 ? '' : lines.slice(freiIndex).join('\n')

  const entries = splitByHeadingLevel(entriesBody, 3).map(({ title, body: entryBody }) => ({
    id: makeId(),
    label: title,
    fields: buildFields(entryBody, ABSCHNITT_EXPECTED),
  }))

  const summary = extractLabeledFields(freiBody)
  const freiValue = summary.get('frei-Abschnitte') ?? ''
  entries.push({
    id: makeId(),
    label: 'Zusammenfassung',
    fields: [
      {
        id: makeId(),
        name: 'frei-Abschnitte',
        value: isPlaceholder(freiValue) ? '' : freiValue,
        status: isPlaceholder(freiValue) ? 'gap' : 'found',
      },
    ],
  })
  return entries
}

// Abschnitt 9 "Platzhalter & offene Punkte": eine formlose Aufzaehlung
// (keine "**Label:**"-Struktur pro Punkt) - jede Aufzaehlungszeile wird ein
// eigener Eintrag mit einem einzelnen Beschreibungsfeld.
function parsePlatzhalter(body: string): ImportEntry[] {
  const bulletLines = body
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.startsWith('- '))
    .map((l) => l.slice(2).trim())
    .filter((l) => !l.startsWith('[Für jeden weiteren'))

  if (bulletLines.length === 0) {
    return [
      {
        id: makeId(),
        label: '',
        fields: [{ id: makeId(), name: 'Beschreibung', value: '', status: 'gap' }],
      },
    ]
  }

  return bulletLines.map((line, i) => ({
    id: makeId(),
    label: `Punkt ${i + 1}`,
    fields: [
      {
        id: makeId(),
        name: 'Beschreibung',
        value: isPlaceholder(line) ? '' : line,
        status: isPlaceholder(line) ? 'gap' : 'found',
      },
    ],
  }))
}

const HYPOTHESE_HEADING = /^\*\*Hypothese\s+\d+[^*]*:\*\*$/

// Abschnitt 10 "Testhypothesen": Eintraege sind fett hervorgehobene
// "**Hypothese N (...):**"-Zeilen statt einer Markdown-Ueberschrift, gefolgt
// von einer Aussage und zwei kursiven "*Label:*"-Feldern.
function parseTesthypothesen(body: string): ImportEntry[] {
  const lines = body.split('\n')
  const blocks: { title: string; lines: string[] }[] = []
  let current: { title: string; lines: string[] } | null = null

  for (const rawLine of lines) {
    const trimmed = rawLine.trim()
    if (HYPOTHESE_HEADING.test(trimmed)) {
      if (current) blocks.push(current)
      current = { title: trimmed.replace(/^\*\*|:\*\*$/g, ''), lines: [] }
      continue
    }
    if (current) current.lines.push(rawLine)
  }
  if (current) blocks.push(current)

  return blocks.map(({ title, lines: blockLines }) => {
    const blockText = blockLines.join('\n')
    const fieldLineIndex = blockLines.findIndex((l) => /^\*[^*]+:\*/.test(l.trim()))
    const aussageLines =
      fieldLineIndex === -1 ? blockLines : blockLines.slice(0, fieldLineIndex)
    const aussage = aussageLines
      .map((l) => l.trim())
      .filter((l) => l !== '' && l !== '---')
      .join(' ')

    const fields = buildFields(blockText, ['Erwarteter Effekt', 'Erkennbar an'])
    fields.unshift({
      id: makeId(),
      name: 'Aussage',
      value: isPlaceholder(aussage) ? '' : aussage,
      status: isPlaceholder(aussage) ? 'gap' : 'found',
    })

    return { id: makeId(), label: title, fields }
  })
}

const SECTION_PARSERS: Record<string, (body: string) => ImportEntry[]> = {
  '1. Kurzfassung': (body) => singleEntry(body, KURZFASSUNG_EXPECTED),
  '2. Leitidee': parseLeitidee,
  '3. Strategisches Fundament': (body) => singleEntry(body, FUNDAMENT_EXPECTED),
  '4. Seitenstruktur': parseSeitenstruktur,
  '5. Conversion-Konzept': (body) => singleEntry(body, CONVERSION_EXPECTED),
  '6. Message-Architektur': (body) => singleEntry(body, MESSAGE_EXPECTED),
  '7. Nutzerführung': (body) => singleEntry(body, NUTZERFUEHRUNG_EXPECTED),
  '8. Priorisierung': (body) => singleEntry(body, PRIORISIERUNG_EXPECTED),
  '9. Platzhalter & offene Punkte': parsePlatzhalter,
  '10. Testhypothesen': parseTesthypothesen,
  '11. Abschlussempfehlung': (body) => singleEntry(body, ABSCHLUSS_EXPECTED),
}

export function parseKonzept(rawText: string): ParsedDocument & { meta: KonzeptMeta } {
  const text = normalizeMarkdown(rawText)
  const meta = parseKonzeptMeta(text)
  const sections: ImportSection[] = []

  for (const { title, body } of splitByHeadingLevel(text, 2)) {
    const parser = SECTION_PARSERS[title]
    if (!parser) continue
    sections.push({ id: makeId(), document: 'konzept', name: title, entries: parser(body) })
  }

  const hasRecognizableStructure = sections.some((s) =>
    s.entries.some((e) => e.fields.some((f) => f.status === 'found'))
  )

  return { sections, meta, hasRecognizableStructure }
}
