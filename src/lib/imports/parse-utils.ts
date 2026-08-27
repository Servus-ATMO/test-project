import type { FieldStatus, ImportField } from './types'

// Provisorischer Zeilen-basierter Parser fuer die Frontend-Phase von PROJ-3.
// Deckt beide Vorlagenformate (docs/reference/*.md) ab, ersetzt aber NICHT
// die im Tech Design vorgesehene, robustere Markdown-Parser-Implementierung
// (remark/unified), die /backend liefert - siehe PROJ-3 Decision Log.

export function makeId(): string {
  return crypto.randomUUID()
}

// Eine Zeile gilt als "Luecke", wenn sie leer ist oder noch wie unausgefuellter
// Vorlagentext aussieht (Ellipse oder eckige Klammern der Anleitung).
export function isPlaceholder(value: string): boolean {
  const v = value.trim()
  if (v === '') return true
  if (v === '…' || v === '...') return true
  if (/^\[.*\]$/.test(v)) return true
  return false
}

const NUMBERED_BOLD_COLON = /^\d+\.\s+\*\*([^*]+):\*\*\s*(.*)$/
const BULLET_BOLD_COLON = /^-\s+\*\*([^*]+):\*\*\s*(.*)$/
const BOLD_COLON = /^\*\*([^*]+):\*\*\s*(.*)$/
const ITALIC_COLON = /^\*([^*]+):\*\s*(.*)$/
const BOLD_ONLY = /^\*\*(.+?)\*\*$/

// Erkennt alle drei im Vorlagenformat vorkommenden Feld-Schreibweisen:
// "**Label:** Wert", "- **Label:** Wert", "N. **Label:** Wert",
// "*Label:* Wert" (Testhypothesen) sowie "**Frage ohne Doppelpunkt?**"
// (Kurzfassung). Werte, die ueber mehrere Zeilen gehen (z. B. "Optionen"-
// Listen), werden bis zum naechsten erkannten Feld gesammelt.
export function extractLabeledFields(block: string): Map<string, string> {
  const lines = block.split('\n')
  const raw = new Map<string, string[]>()
  let currentLabel: string | null = null

  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed === '' || trimmed === '---') continue
    // Ueberschriften (z. B. eine verschachtelte "## "-Zeile) beenden das
    // aktuell offene Feld, statt in dessen Wert mit aufgenommen zu werden.
    if (/^#{1,6}\s/.test(trimmed)) {
      currentLabel = null
      continue
    }

    const numbered = trimmed.match(NUMBERED_BOLD_COLON)
    const bullet = trimmed.match(BULLET_BOLD_COLON)
    const boldColon = trimmed.match(BOLD_COLON)
    const italic = trimmed.match(ITALIC_COLON)
    const boldOnly = trimmed.match(BOLD_ONLY)

    const match = numbered ?? bullet ?? boldColon ?? italic ?? boldOnly
    if (match) {
      currentLabel = match[1].trim()
      const rest = (match[2] ?? '').trim()
      raw.set(currentLabel, rest ? [rest] : [])
      continue
    }

    if (currentLabel) {
      const arr = raw.get(currentLabel) ?? []
      arr.push(trimmed)
      raw.set(currentLabel, arr)
    }
  }

  const joined = new Map<string, string>()
  for (const [label, valueLines] of raw) {
    joined.set(label, valueLines.join('\n'))
  }
  return joined
}

// Baut die finalen Felder fuer einen Eintrag: erwartete Felder immer in
// fester Reihenfolge (mit Luecken-Markierung, falls fehlend/Platzhalter),
// zusaetzlich gefundene, nicht erwartete Felder werden ebenfalls
// uebernommen - nichts wird verworfen.
export function buildFields(block: string, expectedLabels: string[]): ImportField[] {
  const found = extractLabeledFields(block)
  const fields: ImportField[] = []
  const used = new Set<string>()

  for (const label of expectedLabels) {
    used.add(label)
    fields.push(toField(label, found.get(label) ?? ''))
  }
  for (const [label, value] of found) {
    if (used.has(label)) continue
    fields.push(toField(label, value))
  }
  return fields
}

function toField(name: string, rawValue: string): ImportField {
  const placeholder = isPlaceholder(rawValue)
  const status: FieldStatus = placeholder ? 'gap' : 'found'
  return { id: makeId(), name, value: placeholder ? '' : rawValue.trim(), status }
}

export interface HeadingBlock {
  title: string
  body: string
}

// Zerlegt Text an Ueberschriften einer bestimmten Ebene (## = 2, ### = 3).
// Text vor der ersten passenden Ueberschrift wird verworfen (Titelzeile,
// Kopf-Metadaten - die werden separat ausgelesen).
export function splitByHeadingLevel(text: string, level: number): HeadingBlock[] {
  const marker = '#'.repeat(level) + ' '
  const lines = text.split('\n')
  const result: HeadingBlock[] = []
  let currentTitle: string | null = null
  let currentBody: string[] = []

  for (const line of lines) {
    if (line.startsWith(marker)) {
      if (currentTitle !== null) {
        result.push({ title: currentTitle, body: currentBody.join('\n') })
      }
      currentTitle = line.slice(marker.length).trim()
      currentBody = []
    } else if (currentTitle !== null) {
      currentBody.push(line)
    }
  }
  if (currentTitle !== null) {
    result.push({ title: currentTitle, body: currentBody.join('\n') })
  }
  return result
}
