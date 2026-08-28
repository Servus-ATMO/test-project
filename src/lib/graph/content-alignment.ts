// Muss mit dem umgebenden Seitenlayout uebereinstimmen (siehe
// (protected)/layout.tsx: `<main className="mx-auto max-w-5xl px-4 ...">`),
// da GraphView bewusst aus dessen Breitenbeschraenkung ausbricht und sich
// trotzdem daran ausrichten will.
export const MAIN_MAX_WIDTH_PX = 1024 // max-w-5xl
export const MAIN_PADDING_PX = 16 // px-4

// Fester Versatz zwischen dem echten Bildschirmrand und der Stelle, an der
// die SICHTBAREN Spalten beginnen wuerden, wenn `marginLeft` (siehe unten)
// gleich 0 waere - muss mit der tatsaechlichen Verschachtelung in
// GraphView uebereinstimmen:
//   16px  px-4 auf dem full-bleed-Wrapper
// +  1px  border auf "graph-canvas" (Tailwind `border` = 1px)
// + 24px  p-6 auf der Spalten-Zeile selbst (marginLeft sitzt AUSSERHALB
//         dieses Innenabstands, die sichtbaren Karten aber dahinter)
// = 41px
// Ohne diesen Ausgleich wuerden die Spalten trotz "korrektem" marginLeft
// sichtbar zu weit rechts vom Titel abstehen (eigene Verifikation
// 2026-08-29, Nutzer-Feedback: "noch nicht ganz buendig").
export const FIXED_OFFSET_BEFORE_MARGIN_PX = MAIN_PADDING_PX + 1 + 24

// Nutzer-Feedback 2026-08-29: die Spalten-Zeile im Konzept-Graph bleibt am
// Seitentitel ausgerichtet (linksbuendig), solange ihr tatsaechlicher
// Inhalt in die Standardbreite der Seite (max-w-5xl) passt - erst wenn er
// breiter wird (z. B. durch eine kuenftige 4./5. Ebene), zentriert sie
// sich stattdessen im vollen Browserfenster ("graph-canvas" selbst ist
// immer volle Breite). Liefert den fuer die Spalten-Zeile zu setzenden
// `marginLeft` (relativ zu "graph-canvas").
export function computeContentMarginLeft(contentWidth: number, viewportWidth: number): number {
  const mainMargin = Math.max(0, (viewportWidth - MAIN_MAX_WIDTH_PX) / 2)
  const titleOffsetFromViewport = mainMargin + MAIN_PADDING_PX
  const defaultContentWidth = Math.min(viewportWidth - MAIN_PADDING_PX * 2, MAIN_MAX_WIDTH_PX - MAIN_PADDING_PX * 2)

  const desiredLeftEdge =
    contentWidth <= defaultContentWidth ? titleOffsetFromViewport : Math.max(0, (viewportWidth - contentWidth) / 2)

  return Math.max(0, desiredLeftEdge - FIXED_OFFSET_BEFORE_MARGIN_PX)
}
