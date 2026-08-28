import { describe, it, expect } from 'vitest'
import { splitCombinedImport } from './split-combined-import'

const JOURNEY_BLOCK = '# Journey-Transkript – Demo\n\n## Einstieg\n**Datum:** 2026-08-28\n'
const KONZEPT_BLOCK = '# Landingpage-Konzept: Demo\n\n## 1. Kurzfassung\n**Baustein:** Hero\n'

describe('splitCombinedImport', () => {
  it('splits a combined file with both blocks in the documented order', () => {
    const result = splitCombinedImport(JOURNEY_BLOCK + '\n---\n\n' + KONZEPT_BLOCK)
    expect(result.missingBlock).toBeNull()
    expect(result.journeyText).toContain('# Journey-Transkript')
    expect(result.journeyText).not.toContain('Landingpage-Konzept')
    expect(result.konzeptText).toContain('# Landingpage-Konzept')
    expect(result.konzeptText).not.toContain('Journey-Transkript')
  })

  it('splits a combined file with swapped block order', () => {
    const result = splitCombinedImport(KONZEPT_BLOCK + '\n---\n\n' + JOURNEY_BLOCK)
    expect(result.missingBlock).toBeNull()
    expect(result.journeyText).toContain('# Journey-Transkript')
    expect(result.konzeptText).toContain('# Landingpage-Konzept')
  })

  it('reports the Konzept block as missing when only Journey is present', () => {
    const result = splitCombinedImport(JOURNEY_BLOCK)
    expect(result.missingBlock).toBe('konzept')
    expect(result.journeyText).toContain('# Journey-Transkript')
    expect(result.konzeptText).toBeNull()
  })

  it('reports the Journey block as missing when only Konzept is present', () => {
    const result = splitCombinedImport(KONZEPT_BLOCK)
    expect(result.missingBlock).toBe('journey')
    expect(result.konzeptText).toContain('# Landingpage-Konzept')
    expect(result.journeyText).toBeNull()
  })

  it('returns both blocks null when neither heading is found', () => {
    const result = splitCombinedImport('Irgendein Fliesstext ohne jede erkennbare Struktur.')
    expect(result.journeyText).toBeNull()
    expect(result.konzeptText).toBeNull()
    expect(result.missingBlock).toBeNull()
  })
})
