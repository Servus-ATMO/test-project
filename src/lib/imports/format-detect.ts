// 5 MB fuer die eine kombinierte Datei - siehe PROJ-3 Tech Design
// (grosszuegig fuer reinen Text, verhindert trotzdem versehentliche/
// missbraeuchliche Uploads).
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
