# KI-Anreicherung – Ausgabe-Vorlage

**Zweck:** Dieses feste Format ist das Gegenstück zu `Journey-Transkript-Vorlage.md` und `Landingpage-Konzept-Vorlage.md` — nur diesmal nicht für einen Menschen zum manuellen Ausfüllen, sondern für eine KI-Antwort, die anschließend mechanisch von PROJ-4 (`src/lib/enrichment/parse-enrichment.ts`) geparst wird. Der von der App erzeugte Anreicherungs-Prompt (`src/lib/enrichment/prompt-template.ts`) fordert genau dieses Format an.

**Ablageort im Ablauf:** Wird nicht manuell ausgefüllt — entsteht als Antwort in einem externen Claude-Chat (siehe PROJ-4 Tech Design: kein appseitiger KI-Aufruf, Nutzer führt den generierten Prompt selbst aus) und wird danach als `.md`-Datei zurück ins Tool hochgeladen.

**Parsing-Prinzip:** Wie bei den anderen beiden Vorlagen gilt Best-Effort-Parsing mit sichtbarer Lücken-Markierung statt Alles-oder-Nichts (siehe PROJ-3). Ein `**Wert:** nicht ableitbar` wird als bewusste Lücke gespeichert, kein fehlendes Feld erfunden.

**Toleranz bei „Quelle"/„Feld A"/„Feld B":** Der Prompt fordert zwar strikt genau ein `[Eintrag-Label] → [Feldname]`-Paar ohne Zusätze an, real weicht die KI davon gelegentlich ab (Bug-Report 2026-08-28, echter Import: 0 von 38 Referenzen aufgelöst). Der Parser toleriert deshalb zusätzlich: einen an den Feldnamen angehängten Klammerzusatz (z. B. „Antwort (Option D)" wird zusätzlich als „Antwort" geprüft) sowie mehrere mit Semikolon getrennte Referenzen in einer Zeile (jede wird einzeln aufgelöst, `Quelle` kann dadurch zu mehreren `informs`-Kanten führen). Freitext ohne „→" (z. B. „entfällt, …") bleibt bewusst unaufgelöst und landet als Warnung, statt geraten zu werden.

---

```markdown
# KI-Anreicherung – [Projektname]

**Datum:** [YYYY-MM-DD]
**Erstellt mit:** [z. B. Claude Sonnet 5 im claude.ai-Chat]

## Personas

### Persona: [Name]
**Beschreibung:** [Kurzbeschreibung der Zielgruppe/des Pfads]
**Bezug:** [Welche Ebene-1-Antworten diese Persona begründen, z. B. "Frage 1 Antwort, Frage 9 Antwort"]

[Für jede weitere erkannte Persona denselben Block wiederholen. Immer mindestens eine Persona, auch ohne erkennbare Segmentierung — dann z. B. "Persona: Hauptzielgruppe".]

## Dimensionen

[Für jede der 23 festen Dimensionen (siehe PROJ-4 Spec) ein eigener "### "-Block, exakt in dieser Schreibweise: Business Goal, Conversion Goal, Target Audience, Traffic Source, Awareness Level, User Intent, Problem, Desire, Value Proposition, Differentiation, Emotional Drivers, Rational Drivers, Objections, Trust Requirements, Verfügbare Beweise, Content Depth, Information Hierarchy, UX Complexity, CTA Strategy, Sprachliche Tonalität, Storytelling Potential, Conversion Pressure, Umsetzungsrahmen.]

### [Dimensionsname]

[Bei jeder Dimension AUSSER "Umsetzungsrahmen": ein "#### Persona: [Name]"-Unterblock je Persona, in der sich der Wert tatsächlich unterscheidet (mindestens einer).]

#### Persona: [Name]
**Wert:** [Konkreter Wert, ausschließlich aus den unten eingebetteten Ebene-1/3-Daten abgeleitet] ODER: nicht ableitbar
**Quelle:** GENAU EIN "[Eintrag-Label] → [Feldname]"-Paar, Feldname exakt wie unten eingebettet, OHNE Zusätze (z. B. "Frage 3 → Antwort" — NICHT "Frage 3 → Antwort (Option D)" und NICHT mehrere Quellen mit Semikolon in einer Zeile kombiniert). Stützt sich der Wert auf mehrere Journey-Antworten, die wichtigste als Quelle zitieren und die übrigen im Impact-Text erwähnen.
**Impact-Text:** [1–2 Sätze, warum diese Quelle zu diesem Wert führt — keine erfundenen Fakten/Zahlen]
**Gewichtung:** [1 = schwach, 2 = mittel, 3 = stark]

### Umsetzungsrahmen

[Immer GENAU EIN Block, ohne "Persona:"-Zeile — projektweit, nie pro Persona.]
**Wert:** [...] ODER: nicht ableitbar
**Quelle:** [Eintrag-Label] → [Feldname] (gleiche Regeln wie oben: genau ein Paar, kein Klammerzusatz, kein Semikolon)
**Impact-Text:** [...]
**Gewichtung:** [1–3]

## Kanten zu Content-Blöcken

[Ein "### Kante: "-Block pro Dimension-Content-Block-Verbindung. Ein Content-Block kann von mehreren Dimensionen geprägt sein — dann mehrere Blöcke mit demselben Ziel. JEDE Dimensionswert-Instanz aus "## Dimensionen" (außer "nicht ableitbar") muss in MINDESTENS einer Kante als Quelle vorkommen, auch strategische/indirekte Dimensionen.]

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
**Beschreibung:** [Worin der Widerspruch besteht]
```

---

## Hinweise zur Quell-Referenz

`[Eintrag-Label] → [Feldname]` muss exakt einem Eintrag/Feld aus den im Prompt eingebetteten Ebene-1/3-Daten entsprechen (z. B. `Frage 3 → Antwort` für eine Journey-Antwort, `Abschnitt 2: Hero → Baustein` für ein Konzept-Feld). Der Parser löst diese Referenz gegen den aktuellen Import auf; eine nicht auflösbare Referenz wird als Warnung angezeigt statt die Kante/den Konflikt stillschweigend zu verwerfen.

`[Content-Block-Label]` bezieht sich immer auf einen Eintrag aus Konzept-Abschnitt 4 „Seitenstruktur" (z. B. `Abschnitt 2: Hero`), nie auf ein einzelnes Feld darin.
