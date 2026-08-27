import { describe, it, expect } from 'vitest'
import { checkCrossFormat, detectDocumentType, validateFile, MAX_FILE_SIZE_BYTES } from './format-detect'

function makeFile(name: string, sizeBytes = 100): File {
  return new File([new Uint8Array(sizeBytes)], name)
}

describe('validateFile', () => {
  it('accepts a reasonably sized .md file', () => {
    expect(validateFile(makeFile('Journey-Transkript.md'))).toBeNull()
  })

  it('rejects non-.md files', () => {
    expect(validateFile(makeFile('Konzept.pdf'))).toMatch(/\.md/)
  })

  it('rejects files over the size limit', () => {
    expect(validateFile(makeFile('big.md', MAX_FILE_SIZE_BYTES + 1))).toMatch(/5 MB/)
  })
})

describe('detectDocumentType', () => {
  it('recognizes Journey-Transkript structure', () => {
    const text = '## Einstieg\n\n### Frage 1\n**Gestellt:** …'
    expect(detectDocumentType(text)).toBe('journey')
  })

  it('recognizes Konzept structure', () => {
    const text = '## 1. Kurzfassung\n\n## 4. Seitenstruktur\n\n### Abschnitt 1: Hero'
    expect(detectDocumentType(text)).toBe('konzept')
  })

  it('returns unknown for unrelated text', () => {
    expect(detectDocumentType('Just a normal document with no special headings.')).toBe('unknown')
  })
})

describe('checkCrossFormat', () => {
  it('warns when a Konzept-shaped file is dropped into the journey slot', () => {
    const text = '## 1. Kurzfassung\n\n## 4. Seitenstruktur\n\n### Abschnitt 1: Hero'
    const warning = checkCrossFormat('journey', text)
    expect(warning?.slot).toBe('journey')
    expect(warning?.message).toContain('Konzept')
  })

  it('warns when a Journey-shaped file is dropped into the konzept slot', () => {
    const text = '## Einstieg\n\n### Frage 1\n**Gestellt:** …'
    const warning = checkCrossFormat('konzept', text)
    expect(warning?.slot).toBe('konzept')
    expect(warning?.message).toContain('Journey-Transkript')
  })

  it('does not warn when the file matches its slot', () => {
    const text = '## Einstieg\n\n### Frage 1\n**Gestellt:** …'
    expect(checkCrossFormat('journey', text)).toBeNull()
  })

  it('does not warn for unrecognizable text (handled separately as a hard failure)', () => {
    expect(checkCrossFormat('journey', 'random text')).toBeNull()
  })
})
