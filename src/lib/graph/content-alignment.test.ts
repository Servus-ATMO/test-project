import { describe, expect, it } from 'vitest'
import { computeContentMarginLeft } from './content-alignment'

describe('computeContentMarginLeft', () => {
  it('aligns with the page title when content fits the default width, wide viewport', () => {
    // 1600px Viewport: main-Margin = (1600-1024)/2 = 288, Titel-Offset = 304.
    // marginLeft = 304 - 41 (fester Versatz: px-4 + border + p-6) = 263.
    const marginLeft = computeContentMarginLeft(880, 1600)
    expect(marginLeft).toBe(263)
  })

  it('aligns with the page title when content fits the default width, narrow viewport (below max-w-5xl)', () => {
    // main hat hier keine automatischen Raender (Inhalt < max-w-5xl passt
    // ohnehin), Titel-Offset ist nur das feste px-4 (16px) - kleiner als der
    // feste Versatz (41px), das Ergebnis wird auf 0 begrenzt (kein negativer
    // Margin).
    const marginLeft = computeContentMarginLeft(700, 900)
    expect(marginLeft).toBe(0)
  })

  it('centers the content within the full viewport once it exceeds the default width', () => {
    // 1600px Viewport, Inhalt 1200px (> 992px Standardbreite) ->
    // zentriert: (1600-1200)/2 = 200, minus festem Versatz (41) = 159.
    const marginLeft = computeContentMarginLeft(1200, 1600)
    expect(marginLeft).toBe(159)
  })

  it('is continuous at the exact default-width threshold (no visual jump)', () => {
    // Bei genau 992px (Standardbreite) sollten beide Zweige dasselbe Ergebnis
    // liefern - die Fallunterscheidung darf keinen sichtbaren Sprung erzeugen.
    const atThreshold = computeContentMarginLeft(992, 1600)
    const justBelow = computeContentMarginLeft(991, 1600)
    const justAbove = computeContentMarginLeft(993, 1600)
    expect(atThreshold).toBe(justBelow)
    expect(Math.abs(atThreshold - justAbove)).toBeLessThanOrEqual(1)
  })

  it('never returns a negative margin even for content wider than the viewport', () => {
    const marginLeft = computeContentMarginLeft(2000, 900)
    expect(marginLeft).toBeGreaterThanOrEqual(0)
  })
})
