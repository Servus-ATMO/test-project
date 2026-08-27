import { describe, it, expect } from 'vitest'
import { parseKonzept } from './parse-konzept'

const SAMPLE = `# Landingpage-Konzept: Sammelkartenspiel OffSeason

**Datum:** 2026-08-20
**Erstellt mit:** Adaptiver Landingpage-Konzeptions-Prompt, Version 2 (gestaltungsfrei)
**Hinweis:** Dieses Konzept ist ausdrücklich gestaltungsfrei.

---

## 1. Kurzfassung

**Was soll die Landingpage erreichen?**
App-Downloads generieren.

**Für wen ist sie?**
Fußballfans mit Interesse an Sammelkartenspielen.

**Woher kommt der Besucher und was weiß er bereits?**
…

**Was ist das zentrale Problem?**
…

**Was ist das zentrale Versprechen?**
…

**Warum sollte der Nutzer glauben, dass das Angebot dieses Versprechen erfüllt?**
…

**Was ist die wichtigste Conversion?**
…

---

## 2. Leitidee

„Auch in der Nebensaison bleibt der Ball im Spiel."

Die Landingpage positioniert das Spiel als Überbrückung zwischen zwei Saisons.

---

## 3. Strategisches Fundament

- **Zielgruppe:** Fußballfans, 20–40 Jahre
- **Kernproblem:** Nebensaison-Leere
- **Kernbedürfnis:** …
- **Value Proposition:** …
- **Differenzierung:** …
- **Hauptargument:** …
- **Emotionaler Kern:** …
- **Rationaler Kern:** …
- **Einwände:** …
- **Vertrauensfaktoren:** …

---

## 4. Seitenstruktur

### Abschnitt 1: Hero
- **Baustein:** \`hero-default\`
- **Ziel:** Aufmerksamkeit
- **Kernbotschaft:** Der Ball bleibt im Spiel
- **Headline:** OffSeason beginnt
- **Subline:** entfällt
- **Inhalt:** …
- **Medien:** kein Medium
- **CTA:** Jetzt spielen
- **Interaktion:** keine
- **Position:** Direkt am Seitenanfang

### Abschnitt 2: Feature-Übersicht
…

**frei-Abschnitte:** Keine. Alle inhaltlich notwendigen Abschnitte lassen sich mit vorhandenen Bausteinen abbilden.

---

## 5. Conversion-Konzept

- **Primary CTA:** Jetzt spielen
- **Secondary CTA:** …
- **CTA-Platzierung:** …
- **Conversion-Hürden:** …
- **Einwandbehandlung:** …
- **Vertrauensaufbau:** …
- **Proof Points:** …
- **Micro-Conversions:** …

---

## 6. Message-Architektur

**Leitversprechen:** Der Ball bleibt im Spiel.

**Messaging Pillars:** …

**Kernargumente:** …

**Wichtigste Benefits:**
„Sammeln ohne Pause"
„Neue Karten jede Woche"

**Einwand-Antwort-Paare:**
Einwand „Zu teuer" → Antwort „Kostenloser Einstieg"

**Mögliche Social-Proof-Mechanik:** …

---

## 7. Nutzerführung

- **Informationshierarchie:** …
- **Nutzerführung:** …
- **Scan-Verhalten:** …
- **Content-Dichte:** …
- **Interaktionsgrad:** …
- **Scroll-Dramaturgie:** …
- **CTA-Logik:** …
- **Mobile-Priorität:** …

---

## 8. Priorisierung

1. **Must Have:** Hero-Sektion
2. **Should Have:** FAQ
3. **Nice to Have:** …
4. **Weglassen:** …

**Begründung:** …

---

## 9. Platzhalter & offene Punkte

- **[Preismodell]** fehlt/ist ungeklärt, betrifft Abschnitt 3. Muss vom Kunden geliefert werden.
- **[Markenfarben]** fehlt/ist ungeklärt, betrifft Abschnitt 1. Muss von der Marketingabteilung geliefert werden.

---

## 10. Testhypothesen

**Hypothese 1 (höchste Priorität, größte verbleibende Unsicherheit):**
Ein klarer Saison-Bezug erhöht die Klickrate auf den CTA.
*Erwarteter Effekt:* Mehr App-Downloads
*Erkennbar an:* Conversion-Rate im ersten Monat

**Hypothese 2:**
…

---

## 11. Abschlussempfehlung

**Wichtigste strategische Entscheidung:** Fokus auf die Nebensaison-Erzählung.

**Was bei der Umsetzung auf keinen Fall verwässert werden darf:** …

**Was der größte Fehler bei der Umsetzung wäre:** …
`

describe('parseKonzept', () => {
  it('extracts header metadata', () => {
    expect(parseKonzept(SAMPLE).meta).toEqual({
      datum: '2026-08-20',
      erstelltMit: 'Adaptiver Landingpage-Konzeptions-Prompt, Version 2 (gestaltungsfrei)',
    })
  })

  it('parses Kurzfassung with a mix of found fields and gaps', () => {
    const kurzfassung = parseKonzept(SAMPLE).sections.find((s) => s.name === '1. Kurzfassung')
    const fields = kurzfassung?.entries[0].fields ?? []
    expect(fields.find((f) => f.name === 'Was soll die Landingpage erreichen?')?.status).toBe('found')
    expect(fields.find((f) => f.name === 'Was ist das zentrale Problem?')?.status).toBe('gap')
  })

  it('parses Leitidee into a synthetic Leitsatz/Kontext pair', () => {
    const leitidee = parseKonzept(SAMPLE).sections.find((s) => s.name === '2. Leitidee')
    const fields = leitidee?.entries[0].fields ?? []
    expect(fields.find((f) => f.name === 'Leitsatz')?.value).toContain('Nebensaison')
    expect(fields.find((f) => f.name === 'Kontext')?.value).toContain('Überbrückung')
  })

  it('parses a variable number of Seitenstruktur-Abschnitte plus a trailing summary entry', () => {
    const seitenstruktur = parseKonzept(SAMPLE).sections.find((s) => s.name === '4. Seitenstruktur')
    const labels = seitenstruktur?.entries.map((e) => e.label) ?? []
    expect(labels).toEqual(['Abschnitt 1: Hero', 'Abschnitt 2: Feature-Übersicht', 'Zusammenfassung'])

    const hero = seitenstruktur?.entries[0].fields ?? []
    expect(hero.find((f) => f.name === 'Baustein')?.value).toBe('`hero-default`')
    expect(hero.find((f) => f.name === 'Subline')?.status).toBe('found') // "entfällt" ist ein gültiger Wert
    expect(hero.find((f) => f.name === 'Subline')?.value).toBe('entfällt')

    const summary = seitenstruktur?.entries[2].fields ?? []
    expect(summary.find((f) => f.name === 'frei-Abschnitte')?.status).toBe('found')

    // Regression: "frei-Abschnitte" darf nicht zusaetzlich im letzten
    // "### Abschnitt"-Eintrag auftauchen (stand ausserhalb jedes Abschnitts).
    const featureUebersicht = seitenstruktur?.entries[1].fields ?? []
    expect(featureUebersicht.find((f) => f.name === 'frei-Abschnitte')).toBeUndefined()
  })

  it('parses Platzhalter & offene Punkte as one entry per bullet', () => {
    const platzhalter = parseKonzept(SAMPLE).sections.find(
      (s) => s.name === '9. Platzhalter & offene Punkte'
    )
    expect(platzhalter?.entries).toHaveLength(2)
    expect(platzhalter?.entries[0].fields[0].value).toContain('Preismodell')
  })

  it('parses Testhypothesen with Aussage + italic sub-fields, variable count', () => {
    const hypothesen = parseKonzept(SAMPLE).sections.find((s) => s.name === '10. Testhypothesen')
    expect(hypothesen?.entries).toHaveLength(2)
    const h1 = hypothesen?.entries[0].fields ?? []
    expect(h1.find((f) => f.name === 'Aussage')?.value).toContain('Saison-Bezug')
    expect(h1.find((f) => f.name === 'Erwarteter Effekt')?.value).toBe('Mehr App-Downloads')
    const h2 = hypothesen?.entries[1].fields ?? []
    expect(h2.find((f) => f.name === 'Aussage')?.status).toBe('gap')
  })

  it('reports hasRecognizableStructure as true for a real document', () => {
    expect(parseKonzept(SAMPLE).hasRecognizableStructure).toBe(true)
  })

  it('reports hasRecognizableStructure as false for unrelated text', () => {
    expect(parseKonzept('Just some random notes.').hasRecognizableStructure).toBe(false)
  })
})
