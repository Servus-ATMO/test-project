import type { FormatWarning } from './types'

// 5 MB pro Datei - siehe PROJ-3 Tech Design (grosszuegig fuer reinen Text,
// verhindert trotzdem versehentliche/missbraeuchliche Uploads).
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024

export function validateFile(file: File): string | null {
  if (!file.name.toLowerCase().endsWith('.md')) {
    return 'Nur .md-Dateien werden unterstützt.'
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return 'Die Datei ist größer als 5 MB.'
  }
  return null
}

export type DetectedDocumentType = 'journey' | 'konzept' | 'unknown'

// Einfache Heuristik ueber format-typische Ueberschriften statt komplexer
// Inhaltsanalyse (siehe PROJ-3 Tech Design).
export function detectDocumentType(text: string): DetectedDocumentType {
  const journeySignals =
    (text.match(/^###\s+Frage\s+\d+/gm) ?? []).length + (/^##\s+Einstieg\s*$/m.test(text) ? 1 : 0)
  const konzeptSignals =
    (text.match(/^###\s+Abschnitt\s+\d+/gm) ?? []).length +
    (text.match(/^##\s+\d+\.\s/gm) ?? []).length

  if (journeySignals === 0 && konzeptSignals === 0) return 'unknown'
  return journeySignals >= konzeptSignals ? 'journey' : 'konzept'
}

export function checkCrossFormat(
  slot: 'journey' | 'konzept',
  text: string
): FormatWarning | null {
  const detected = detectDocumentType(text)
  if (detected === 'unknown' || detected === slot) return null

  return {
    slot,
    message:
      slot === 'journey'
        ? 'Diese Datei sieht eher wie ein Konzept-Dokument aus – trotzdem als Journey-Transkript verwenden?'
        : 'Diese Datei sieht eher wie ein Journey-Transkript aus – trotzdem als Konzept verwenden?',
  }
}
