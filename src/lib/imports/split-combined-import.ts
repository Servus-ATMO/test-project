import type { MissingBlock } from './types'

// Die beiden Block-Ueberschriften sind bereits die jeweils eigene erste
// Zeile der beiden bestehenden Vorlagen (Journey-Transkript-Vorlage.md,
// Landingpage-Konzept-Vorlage.md) - kein neues Trennzeichen noetig, siehe
// docs/reference/Interview-Import-Vorlage.md und PROJ-3 Tech Design.
const JOURNEY_HEADING = /^#\s+Journey-Transkript\b.*$/m
const KONZEPT_HEADING = /^#\s+Landingpage-Konzept\b.*$/m

export interface SplitCombinedImportResult {
  journeyText: string | null
  konzeptText: string | null
  missingBlock: MissingBlock
}

// Zerlegt die eine hochgeladene Datei an den beiden bekannten Ueberschriften
// in zwei Rohtext-Bloecke, unabhaengig von ihrer Reihenfolge im Dokument
// (siehe Edge Case "vertauschte Reihenfolge" in der Spec). Fehlt eine der
// beiden Ueberschriften, wird der jeweilige Block als fehlend markiert statt
// als Parsing-Luecke innerhalb eines gefundenen Blocks behandelt.
export function splitCombinedImport(rawText: string): SplitCombinedImportResult {
  const journeyMatch = JOURNEY_HEADING.exec(rawText)
  const konzeptMatch = KONZEPT_HEADING.exec(rawText)

  if (!journeyMatch && !konzeptMatch) {
    return { journeyText: null, konzeptText: null, missingBlock: null }
  }

  const marks: { block: 'journey' | 'konzept'; index: number }[] = []
  if (journeyMatch) marks.push({ block: 'journey', index: journeyMatch.index })
  if (konzeptMatch) marks.push({ block: 'konzept', index: konzeptMatch.index })
  marks.sort((a, b) => a.index - b.index)

  const result: { journeyText: string | null; konzeptText: string | null } = {
    journeyText: null,
    konzeptText: null,
  }
  marks.forEach((mark, i) => {
    const end = i + 1 < marks.length ? marks[i + 1].index : rawText.length
    const chunk = rawText.slice(mark.index, end)
    if (mark.block === 'journey') result.journeyText = chunk
    else result.konzeptText = chunk
  })

  const missingBlock: MissingBlock = !result.journeyText ? 'journey' : !result.konzeptText ? 'konzept' : null
  return { ...result, missingBlock }
}
