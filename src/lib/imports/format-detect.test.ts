import { describe, it, expect } from 'vitest'
import { validateFile, MAX_FILE_SIZE_BYTES } from './format-detect'

function makeFile(name: string, sizeBytes = 100): File {
  return new File([new Uint8Array(sizeBytes)], name)
}

describe('validateFile', () => {
  it('accepts a reasonably sized .md file', () => {
    expect(validateFile(makeFile('Interview-Import.md'))).toBeNull()
  })

  it('rejects non-.md files', () => {
    expect(validateFile(makeFile('Interview-Import.pdf'))).toMatch(/\.md/)
  })

  it('rejects files over the size limit', () => {
    expect(validateFile(makeFile('big.md', MAX_FILE_SIZE_BYTES + 1))).toMatch(/5 MB/)
  })
})
