import { DIMENSION_NAMES } from './constants'
import type { ImportSection } from '@/lib/imports/types'
import type { ParsedImport } from '@/lib/imports/types'

// Serialisiert eine Ebene-1/3-Section zurueck in lesbaren Text, mit genau
// den Eintrag-Labels, die der Parser spaeter als Quell-/Ziel-Referenz
// ("[Eintrag-Label] -> [Feldname]") wiedererkennen muss.
function renderSection(section: ImportSection): string {
  const lines: string[] = [`### ${section.name}`]
  for (const entry of section.entries) {
    if (entry.label) lines.push(`#### ${entry.label}`)
    for (const field of entry.fields) {
      const value = field.status === 'gap' ? '(keine Angabe)' : field.value
      lines.push(`- **${field.name}:** ${value}`)
    }
  }
  return lines.join('\n')
}

const OUTPUT_FORMAT = `# KI-Anreicherung – [Projektname]

**Datum:** [YYYY-MM-DD]
**Erstellt mit:** [z. B. Claude Sonnet 5 im claude.ai-Chat]

## Personas

### Persona: [Name]
**Beschreibung:** [Kurzbeschreibung der Zielgruppe/des Pfads]
**Bezug:** [Welche Ebene-1-Antworten diese Persona begründen, z. B. "Frage 1 Antwort, Frage 9 Antwort"]

[Für jede weitere erkannte Persona denselben Block wiederholen. Immer mindestens eine Persona, auch ohne erkennbare Segmentierung — dann z. B. "Persona: Hauptzielgruppe".]

## Dimensionen

[Für jede der 23 festen Dimensionen unten ein eigener "### "-Block, exakt in der vorgegebenen Schreibweise.]

### [Dimensionsname]

[Bei jeder Dimension AUSSER "Umsetzungsrahmen": ein "#### Persona: [Name]"-Unterblock je Persona, in der sich der Wert tatsächlich unterscheidet (mindestens einer).]

#### Persona: [Name]
**Wert:** [Konkreter Wert, ausschließlich aus den unten eingebetteten Ebene-1/3-Daten abgeleitet] ODER: nicht ableitbar
**Quelle:** [Eintrag-Label] → [Feldname] (z. B. "Frage 3 → Antwort")
**Impact-Text:** [1–2 Sätze, warum diese Quelle zu diesem Wert führt — keine erfundenen Fakten/Zahlen]
**Gewichtung:** [1 = schwach, 2 = mittel, 3 = stark]

### Umsetzungsrahmen

[Immer GENAU EIN Block, ohne "Persona:"-Zeile — projektweit, nie pro Persona.]
**Wert:** [...] ODER: nicht ableitbar
**Quelle:** [Eintrag-Label] → [Feldname]
**Impact-Text:** [...]
**Gewichtung:** [1–3]

## Kanten zu Content-Blöcken

[Ein "### Kante: "-Block pro Dimension-Content-Block-Verbindung. Ein Content-Block kann von mehreren Dimensionen geprägt sein — dann mehrere Blöcke mit demselben Ziel.]

### Kante: [Dimensionsname] (Persona: [Name]) → [Content-Block-Label]

[Bei Umsetzungsrahmen ohne Persona-Klammer: "### Kante: Umsetzungsrahmen → [Content-Block-Label]"]

**Impact-Text:** [1–2 Sätze, warum diese Dimension diesen Content-Block prägt]
**Gewichtung:** [1–3]

## Konflikte

[Ein "### Konflikt N (explizit)"- oder "### Konflikt N (emergent)"-Block je erkanntem Konflikt. Leer lassen (nur die Überschrift "## Konflikte" ohne Unterblöcke), falls keine Konflikte erkannt wurden.]

### Konflikt 1 (explizit)
**Feld A:** [Eintrag-Label] → [Feldname]
**Feld B:** [Eintrag-Label] → [Feldname]
**Beschreibung:** [Worin der Widerspruch besteht]

### Konflikt 2 (emergent)
**Content-Block:** [Eintrag-Label]
**Beteiligte Dimension:** [Dimensionsname — welche Dimension konkret widersprüchlich ist]
**Beteiligte Personas:** [Name1], [Name2]
**Beschreibung:** [Worin der Widerspruch besteht]`

// Baut den vollstaendigen, kopierbaren Anreicherungs-Prompt inkl. bereits
// eingebetteter Ebene-1/3-Daten - siehe PROJ-4 Tech Design ("Korrektur bei
// /architecture": kein appseitiger KI-Aufruf, Nutzer fuehrt diesen Prompt
// manuell im eigenen Claude-Account aus). Ausgabeformat siehe
// docs/reference/KI-Anreicherungs-Ergebnis-Vorlage.md (dort dokumentiert,
// hier dupliziert, da beides synchron gehalten werden muss).
export function buildEnrichmentPrompt(projectName: string, parsedImport: ParsedImport): string {
  const journeyText = parsedImport.journey.sections.map(renderSection).join('\n\n')
  const seitenstruktur = parsedImport.konzept.sections.find(
    (s) => s.name === '4. Seitenstruktur'
  )
  const konzeptText = seitenstruktur
    ? renderSection(seitenstruktur)
    : '(Abschnitt 4 "Seitenstruktur" wurde im Import nicht gefunden.)'

  return `Du bist ein erfahrener Landingpage-Stratege. Deine Aufgabe: aus den unten eingebetteten Journey-Antworten (Ebene 1) und Content-Blöcken (Ebene 3) eines bereits abgeschlossenen Landingpage-Konzepts das verdeckte "interne Landingpage-Profil" rekonstruieren, das ein externer Interview-Prompt bei der Konzepterstellung intern mitführt, aber nie ausgibt.

WICHTIG — Halluzinationsschutz: Leite jeden Wert, jeden Impact-Text und jede Kante ausschließlich aus den unten eingebetteten Daten ab. Erfinde keine Fakten, Zahlen, Zitate oder Zusammenhänge, die dort nicht belegt sind. Lässt sich ein Wert nicht zuverlässig ableiten, schreibe explizit "nicht ableitbar" statt zu raten.

## Schritt 1 — Personas erkennen

Prüfe, ob die Journey-Antworten mehrere parallele Zielgruppen/Pfade nahelegen (z. B. unterschiedliche Traffic-Quellen, explizit genannte unterschiedliche Zielgruppen). Falls ja, lege für jede eine eigenständige Persona an. Falls nein, lege trotzdem genau eine Persona an (z. B. "Hauptzielgruppe").

## Schritt 2 — 23 feste Profildimensionen ableiten

Für jede der folgenden 23 Dimensionen (exakte Schreibweise beibehalten) einen Wert ableiten:
${DIMENSION_NAMES.map((name) => `- ${name}`).join('\n')}

"Umsetzungsrahmen" ist die einzige Dimension, die IMMER genau einen projektweiten Wert hat (nie pro Persona). Alle anderen 22 Dimensionen bekommen eine Werte-Instanz pro Persona, aber NUR dort, wo sich der Wert zwischen den Personas tatsächlich unterscheidet — unterscheidet er sich nicht, reicht eine einzige Instanz (z. B. bei "Persona: Alle" oder einfach bei nur einer erkannten Persona).

Für jede Werte-Instanz: Zitiere die genaue Quelle (Eintrag-Label → Feldname, exakt wie unten eingebettet), begründe in einem kurzen Impact-Text, warum diese Quelle zu diesem Wert führt, und vergib eine Gewichtung (1 = schwach, 2 = mittel, 3 = stark).

## Schritt 3 — Kanten zu den Content-Blöcken

Ordne jedem Content-Block aus Ebene 3 (unten eingebettet) die Dimensionen zu, die ihn geprägt haben (ein Content-Block kann von mehreren Dimensionen geprägt sein). Auch hier: Impact-Text + Gewichtung je Kante.

## Schritt 4 — Konflikte erkennen (nur erkennen, NICHT lösen)

Zwei Arten:
- **Explizit:** Zwei Journey-Antworten widersprechen sich inhaltlich.
- **Emergent:** Ein Content-Block wird von mehreren Personas mit widersprüchlichen Dimensionswerten adressiert (z. B. unterschiedliche CTA-Strategien für denselben Block).

Schlage KEINE Lösung vor — nur erkennen und beschreiben.

## Ausgabeformat

Antworte AUSSCHLIESSLICH mit einem Markdown-Dokument in exakt diesem Format (Platzhalter in eckigen Klammern ersetzen, Struktur/Überschriften unverändert lassen):

\`\`\`markdown
${OUTPUT_FORMAT}
\`\`\`

## Eingebettete Daten

### Ebene 1 — Journey (Fragen & Antworten)

${journeyText}

### Ebene 3 — Content-Blöcke (Konzept, Abschnitt 4 "Seitenstruktur")

${konzeptText}

---

Projekt: ${projectName}
`
}
