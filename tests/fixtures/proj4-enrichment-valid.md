# KI-Anreicherung – QA4-Testprojekt

**Datum:** 2026-08-28
**Erstellt mit:** Claude Sonnet 5 im claude.ai-Chat

## Personas

### Persona: Direktkäufer
**Beschreibung:** Kauft <img src=x onerror=alert(1)> die Flasche direkt im Shop
**Bezug:** Frage 1 → Antwort

### Persona: Influencer-Partner
**Beschreibung:** Kommt über Kooperationen und empfiehlt weiter
**Bezug:** Frage 2 → Antwort

## Dimensionen

### Business Goal

#### Persona: Direktkäufer
**Wert:** Direktverkauf maximieren
**Quelle:** Frage 1 → Antwort
**Impact-Text:** Die Antwort nennt Direktverkauf als Hauptziel.
**Gewichtung:** 3

#### Persona: Influencer-Partner
**Wert:** nicht ableitbar
**Quelle:** Frage 2 → Antwort
**Impact-Text:** Keine ausreichende Grundlage für einen konkreten Wert.
**Gewichtung:** 1

### Target Audience

#### Persona: Direktkäufer
**Wert:** Umweltbewusste Einzelkäufer
**Quelle:** Frage 3 → Antwort
**Impact-Text:** Ergibt sich aus der grob beschriebenen Zielgruppe.
**Gewichtung:** 2

### Umsetzungsrahmen

**Wert:** Bestehendes System, kein festes Budget angegeben
**Quelle:** Frage 10 → Antwort
**Impact-Text:** Ergibt sich aus dem abschließenden Hinweis zur Nachhaltigkeit als Rahmenbedingung.
**Gewichtung:** 2

## Kanten zu Content-Blöcken

### Kante: Business Goal (Persona: Direktkäufer) → Abschnitt 1: Hero
**Impact-Text:** Der Hero muss den Direktverkauf sofort transportieren.
**Gewichtung:** 3

### Kante: Business Goal (Persona: Influencer-Partner) → Abschnitt 2: Social Proof
**Impact-Text:** Social Proof stützt die Empfehlungslogik der Influencer-Partner.
**Gewichtung:** 2

### Kante: Target Audience (Persona: Nicht-Existente-Persona) → Abschnitt 1: Hero
**Impact-Text:** Diese Kante darf nicht auflösbar sein (Testfall für unresolvedReferences).
**Gewichtung:** 1

## Konflikte

### Konflikt 1 (explizit)
**Feld A:** Frage 1 → Antwort
**Feld B:** Frage 2 → Antwort
**Beschreibung:** Direktverkauf als Hauptziel widerspricht der influencer-getriebenen Empfehlungslogik.

### Konflikt 2 (emergent)
**Content-Block:** Abschnitt 1: Hero
**Beteiligte Dimension:** Business Goal
**Beteiligte Personas:** Direktkäufer, Influencer-Partner
**Beschreibung:** Der Hero muss gleichzeitig auf Direktverkauf und Empfehlungslogik einzahlen.
