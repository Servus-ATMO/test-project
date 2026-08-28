# PROJ-4: KI-Anreicherung

## Status: Planned
**Created:** 2026-08-28
**Last Updated:** 2026-08-28

## Dependencies
- Requires: PROJ-1 (Supabase Infrastructure Setup) — Datenbank
- Requires: PROJ-3 (Import-Werkstatt) — liefert Ebene 1 (Journey-Fragen/-Antworten) und Ebene 3 (Konzept-Content-Blöcke aus Abschnitt 4 „Seitenstruktur") als Eingabedaten für die Anreicherung
- Ermöglicht: PROJ-5 (DAG/Sankey-Graph-Visualisierung — konsumiert Personas/Dimensionen/Kanten), PROJ-7 (Konflikterkennung & -auflösung — löst die hier erkannten, aber noch nicht aufgelösten Konflikte)

## Kontext: Fachliches Modell (Referenz)

Diese Spec baut auf einem ursprünglich vorhandenen, durch Kontext-Kompaktierung verlorenen Konzeptdokument (`Konzeptfäden-Spezifikation.md`) auf, das während dieses Interviews vom Nutzer erneut bereitgestellt wurde, sowie auf dem Original-Prompt `Adaptiver Landingpage-Konzeptions-Prompt v2.md`. Kernidee: Zwischen einer Journey-Frage (Ebene 1) und einem Content-Block (Ebene 3) liegt keine direkte Verbindung, sondern eine dritte, im externen Interview-Prompt selbst nie ausgegebene Zwischenschicht — das interne „Landingpage-Profil", das der Prompt während der Journey kontinuierlich mitführt. PROJ-4 rekonstruiert diese verdeckte Ebene 2 nachträglich aus den bereits importierten Ebene-1/3-Daten.

**Der feste Katalog der 23 Profildimensionen** (Quelle: Abschnitt „Interne Bewertung" des Original-Prompts):
Business Goal, Conversion Goal, Target Audience, Traffic Source, Awareness Level, User Intent, Problem, Desire, Value Proposition, Differentiation, Emotional Drivers, Rational Drivers, Objections, Trust Requirements, Verfügbare Beweise, Content Depth, Information Hierarchy, UX Complexity, CTA Strategy, Sprachliche Tonalität, Storytelling Potential, Conversion Pressure, Umsetzungsrahmen.

Dieser Katalog ist für PROJ-4 **fix** (kein KI-frei-generierter, kein nutzer-editierbarer Katalog) — er korrigiert die frühere, nur überschlagene Zahl „22" aus dem verlorenen Referenzdokument.

## User Stories
- Als Agentur-Mitarbeiter möchte ich aus einem abgeschlossenen Import einen fertigen Anreicherungs-Prompt erzeugen und das Ergebnis nach dem Ausführen in meinem eigenen Claude-Account wieder importieren können, damit ich nicht selbst die verdeckten Profildimensionen aus Journey und Konzept von Hand ableiten muss — ohne dass dafür laufende API-Kosten oder ein neuer Anbieter-Vertrag nötig sind.
- Als Agentur-Mitarbeiter möchte ich sehen, welche Personas/Zielgruppenpfade die KI im Projekt erkannt hat, damit ich nachvollziehen kann, wie die Anreicherung strukturiert ist, bevor ich mit dem Konzept weiterarbeite.
- Als Agentur-Mitarbeiter möchte ich für jede abgeleitete Dimension eine kurze Begründung (Impact-Text) sehen, damit das Ergebnis nicht wie eine nicht nachvollziehbare Black Box wirkt.
- Als Agentur-Mitarbeiter möchte ich erkannte Konflikte zwischen Content-Blöcken/Personas sehen, damit ich frühzeitig weiß, wo später eine Konfliktlösung (PROJ-7) nötig sein wird.
- Als Agentur-Mitarbeiter möchte ich eine bestehende Anreicherung mit deutlicher Warnung erneut auslösen können, damit ich nach einem verbesserten Import oder bei einem unbefriedigenden Ergebnis neu starten kann, ohne versehentlich Daten zu verlieren.

## Out of Scope
- DAG/Sankey-Graph-Visualisierung der erzeugten Daten — PROJ-5
- Konfliktauflösung (Katalog-Varianten, strukturelle Eingriffe) — PROJ-7 löst nur, PROJ-4 erkennt und speichert lediglich
- Manuelles Bearbeiten einzelner Dimensionswerte/Kanten/Impact-Texte durch den Nutzer — in PROJ-4 rein lesende Übersicht; einzige „Korrektur" ist die vollständige Neu-Anreicherung
- Live-Kopplung Ebene 2 ↔ Wireframe (Regler-Bedienoberfläche) — PROJ-13, Fernziel „Phase 2"
- Mehrseiten-/Ebene-4-Cross-Page-Links — PROJ-11
- Obergrenze für die Anzahl erkannter Personas — bewusst nicht vorgesehen
- Automatischer KI-API-Aufruf (Ein-Klick-Anreicherung ohne manuellen Zwischenschritt) — bewusst nicht für MVP (siehe Tech Design/Korrektur im Decision Log), Datenmodell bleibt dafür bewusst vorbereitet
- Automatische Neu-Anreicherung bei geänderten Ebene-1-Antworten (Branch-Modell) — eigenständiges Thema von PROJ-6, PROJ-4 kennt nur den expliziten Nutzer-Trigger

## Acceptance Criteria

**Format:** Angenommen [Vorbedingung] / Wenn [Aktion] / Dann [Ergebnis]

- [ ] Angenommen ein Projekt hat einen abgeschlossenen Import (PROJ-3) aber noch keine Ebene-2-Anreicherung, wenn der Nutzer die Projekt-Detail-Seite öffnet, dann ist der „Anreicherungs-Prompt erzeugen"-Button aktiv
- [ ] Angenommen ein Projekt hat noch keinen abgeschlossenen Import, dann ist der „Anreicherungs-Prompt erzeugen"-Button deaktiviert mit einem Hinweis, dass zuerst importiert werden muss
- [ ] Angenommen der Nutzer klickt „Anreicherungs-Prompt erzeugen", dann wird sofort ein vollständiger, kopierbarer Prompt angezeigt, der die importierten Ebene-1- und Ebene-3-Daten bereits eingebettet enthält, sowie eine Anleitung, ihn in einem eigenen Claude-Chat auszuführen und das Ergebnis danach hochzuladen
- [ ] Angenommen der Nutzer lädt die aus seinem Claude-Chat exportierte Ergebnis-Datei hoch, dann wird sie geparst und eine Vorschau (Personas, Dimensionswerte, Kanten, Konflikte) angezeigt, bevor irgendetwas endgültig gespeichert wird
- [ ] Angenommen die hochgeladene Ergebnis-Datei entspricht nicht dem erwarteten Anreicherungs-Schema, dann werden erkannte Teile übernommen und nicht erkennbare Teile in der Vorschau deutlich als Lücke markiert — analog zu PROJ-3s Best-Effort-Parsing
- [ ] Angenommen in der hochgeladenen Datei ist praktisch keine erkennbare Struktur vorhanden, dann wird der Import mit einer klaren Fehlermeldung abgelehnt, statt eine fast leere Vorschau anzuzeigen
- [ ] Angenommen die Vorschau sieht korrekt aus, wenn der Nutzer sie bestätigt, dann werden alle 23 festen Profildimensionen mit mindestens einer Werte-Instanz gespeichert — „Umsetzungsrahmen" immer als genau eine projektweite Instanz, alle anderen 22 Dimensionen als eine Instanz pro erkannter Persona, sofern sich die Werte zwischen den Personas laut Ergebnis-Datei tatsächlich unterscheiden
- [ ] Angenommen das Ergebnis legt mehrere parallele Zielgruppen/Pfade nahe, wenn es übernommen wird, dann werden diese als eigenständige Personas gespeichert (Name, Kurzbeschreibung, Bezug zu den auslösenden Ebene-1-Antworten)
- [ ] Angenommen das Ergebnis legt keine Segmentierung nahe, dann wird trotzdem genau eine Persona angelegt (kein Sonderfall „0 Personas")
- [ ] Angenommen eine Dimension oder eine einzelne Persona-Instanz davon ist im Ergebnis explizit als „nicht ableitbar" gekennzeichnet, dann wird sie auch so gespeichert statt mit einem Wert gefüllt
- [ ] Angenommen die Übernahme ist abgeschlossen, dann besitzt jede gespeicherte Kante (Typ `informs` von einem Ebene-1-Feld zu einer Dimension-Instanz, oder Typ `shapes` von einer Dimension-Instanz zu einem Ebene-3-Content-Block) eine Gewichtung und einen Impact-Text
- [ ] Angenommen zwei Journey-Antworten stehen laut Ergebnis-Datei inhaltlich im Widerspruch zueinander, dann wird dies als Konflikt vom Typ „explizit" gespeichert
- [ ] Angenommen ein Content-Block wird laut Ergebnis-Datei von mehreren Personas mit widersprüchlichen Dimensionswerten adressiert, dann wird dies als Konflikt vom Typ „emergent" gespeichert, ohne dass PROJ-4 selbst eine Lösung anbietet
- [ ] Angenommen die Übernahme ist abgeschlossen, dann zeigt die Projekt-Detail-Seite eine lesbare Übersicht ohne Graph-Darstellung: Personas, je Persona ihre Dimensionswerte mit Impact-Text, sowie eine separate Liste aller erkannten Konflikte
- [ ] Angenommen für ein Projekt existiert bereits eine Ebene-2-Anreicherung, wenn der Nutzer eine neue Ergebnis-Datei hochlädt und die Vorschau bestätigt, dann erscheint vor der endgültigen Übernahme eine Warnung, dass die bestehende Anreicherung vollständig ersetzt wird, die aktiv bestätigt werden muss
- [ ] Angenommen der Nutzer bestätigt die Ersetzung, dann werden alle bisherigen Personas, Dimension-Instanzen, Kanten und Konflikte gelöscht und durch die neue Anreicherung ersetzt
- [ ] Angenommen der Nutzer bricht die Re-Anreicherungs-Warnung ab, dann bleibt die bestehende Anreicherung unverändert gültig
- [ ] Angenommen ein Projekt mit abgeschlossener Ebene-2-Anreicherung wird in PROJ-3 erneut importiert, dann greift dort jetzt die reale Prüfung (nicht mehr der bisherige Stub) und zeigt die entsprechende Re-Import-Warnung
- [ ] Angenommen ein Netzwerk- oder Serverfehler tritt während des Hochladens oder Speicherns auf, dann erscheint eine Fehlermeldung, es wird keine Teil-Anreicherung gespeichert, und die bereits hochgeladene Datei bleibt im Upload-Feld erhalten

## Edge Cases
- Nur eine Persona erkannt (der in der Praxis häufigste Fall) → jede Dimension bekommt genau eine Instanz, kein Unterschied zum „Ein-Personen"-Ablauf.
- Sehr viele Personas erkannt (keine Obergrenze) → alle werden gespeichert, die Lese-Übersicht muss mit einer variablen, potenziell zweistelligen Anzahl umgehen können.
- Ein Ebene-3-Content-Block wird von keiner Persona explizit adressiert (z. B. ein neutraler Baustein wie Footer) → erhält trotzdem `shapes`-Kanten von den ihn prägenden Dimensionen, löst aber keinen emergenten Konflikt aus, da keine widersprüchlichen Personas-Werte zusammentreffen.
- Nutzer erzeugt den Prompt mehrfach hintereinander, ohne ihn auszuführen → unproblematisch, der Prompt spiegelt immer den aktuellen Importstand, keine Datenänderung bis zum tatsächlichen Ergebnis-Upload.
- Der in einem externen Claude-Chat erzeugte Ergebnistext weicht vom erwarteten Schema ab (z. B. unvollständig ausgeführt oder vom Nutzer nachträglich manuell bearbeitet) → wird wie jede Strukturabweichung behandelt: erkannte Teile übernehmen, Rest als Lücke markieren, Hard-Fail nur bei praktisch keiner erkennbaren Struktur — analog zu PROJ-3.
- Import wurde nach bestehender Ebene-2-Anreicherung erneut hochgeladen (PROJ-3), aber die dortige Warnung wird abgebrochen → weder Import noch Anreicherung ändern sich.
- Zwei Mitarbeiter laden gleichzeitig für dasselbe Projekt ein Anreicherungs-Ergebnis hoch → kein Konfliktschutz vorgesehen, letzter abgeschlossene Speichervorgang gewinnt (last-write-wins, konsistent mit PROJ-3/PROJ-17).

## Technical Requirements (optional)
- Security: gleiche Zugriffsregeln wie PROJ-3/PROJ-17 (alle eingeloggten Agentur-Mitarbeiter, Shared Visibility)
- Halluzinationsschutz: Impact-Texte und Dimensionswerte dürfen keine erfundenen Zahlen, Zitate oder Fakten enthalten, die nicht aus den importierten Daten hervorgehen (analog zur Regel im Original-Interview-Prompt) — kurze, faktenbasierte Formulierung, als Vorgabe im Anreicherungs-Prompt selbst verankert
- Kein KI-Dienst wird server-/appseitig aufgerufen (siehe Tech Design) — kein neues API-Secret, keine laufenden Kosten für MVP

## Open Questions
- [ ] Exakte Formulierungs-/Längenvorgabe für Impact-Texte (z. B. maximale Zeichenzahl) — Teil des Prompt-Wordings, Feinjustierung bei `/backend`
- [x] ~~Genauer KI-Anbieter/Modell für die Anreicherung~~ — bei `/architecture` geklärt: kein appseitiger API-Aufruf für MVP, Nutzer führt einen generierten Prompt manuell im eigenen Claude-Account aus (siehe Tech Design/Decision Log)
- [ ] Genauer Mechanismus, wie pro Dimension entschieden wird, ob sich die Werte zwischen erkannten Personas tatsächlich unterscheiden (Schwelle für Aufsplitten vs. gemeinsamer Wert) — Teil des Prompt-Wordings, Feinjustierung bei `/backend`

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Fester Katalog von 23 Profildimensionen (statt frei von der KI generiert), Quelle: „Interne Bewertung"-Abschnitt des Original-Interview-Prompts | Der Prompt führt selbst ein festes internes Profil mit, das nie ausgegeben wird — PROJ-4 rekonstruiert genau dieses feste Profil, kein neues, projektspezifisches Vokabular | 2026-08-28 |
| Multi-Persona-Instanziierung wird bereits in PROJ-4 (MVP) umgesetzt, nicht auf später verschoben | Ohne Mehrfach-Instanzierung wären „emergente Output-Konflikte" (Block bedient mehrere widersprüchliche Profile) aus der Referenz-Spezifikation grundsätzlich nicht erkennbar — bewusste Entscheidung für höheren Aufwand statt reduziertem Funktionsumfang | 2026-08-28 |
| Feste Klassifikation: „Umsetzungsrahmen" ist immer genau eine projektweite Instanz, alle anderen 22 Dimensionen sind potenziell persona-spezifisch | Zeit/Budget/System/Pflege sind eindeutig projektweite Rahmenbedingungen, keine Zielgruppen-Eigenschaft — eine einfache, vorhersagbare Regel statt einer für jede Dimension neu zu bewertenden Freiform-Entscheidung | 2026-08-28 |
| Personas/Pfade als eigenständige Datensätze (Name, Kurzbeschreibung, Bezug zu Ebene-1-Antworten), nicht nur als Text-Tag an Dimensionswerten | Nötig, damit Dimension-Instanzen, Kanten und Konflikte sauber zuordenbar sind und PROJ-5/PROJ-7 später darauf aufbauen können | 2026-08-28 |
| Kanten (`informs`/`shapes`) speichern zusätzlich zu Quelle/Ziel/Typ/Impact-Text auch eine Gewichtung | PROJ-5 braucht für die Sankey-Darstellung unterschiedlich dicke Flüsse — soll nicht nachträglich in PROJ-5 ergänzt werden müssen | 2026-08-28 |
| Beide Konflikttypen aus der Referenz-Spezifikation werden erkannt: explizite Frage-gegen-Frage-Widersprüche und emergente Block-vs-Personas-Konflikte | Erst durch die Multi-Persona-Entscheidung überhaupt möglich; deckt die ursprüngliche fachliche Spezifikation vollständig ab | 2026-08-28 |
| Nicht zuverlässig ableitbare Dimensionswerte werden als „nicht ableitbar" markiert statt mit einem KI-Best-Guess gefüllt | Konsistent mit dem Halluzinationsschutz-Prinzip des Original-Prompts und mit PROJ-3s Lücken-Markierung — ein erfundener Wert wäre in einer Konzept-Grundlage besonders riskant | 2026-08-28 |
| ~~Trigger als Button auf der Projekt-Seite, synchroner Ablauf mit Ladezustand statt Hintergrund-Job~~ — **überholt, siehe unten** | War von einem appseitigen KI-API-Aufruf ausgegangen | 2026-08-28 |
| **Korrektur bei `/architecture`:** kein appseitiger KI-API-Aufruf für MVP. Trigger erzeugt stattdessen einen kopierbaren Prompt (inkl. eingebetteter Ebene-1/3-Daten); Nutzer führt ihn manuell im eigenen Claude-Account aus und lädt das Ergebnis zurück hoch (Vorschau → Bestätigen, wie bei PROJ-3) | Nutzer hat nur einen Claude-Pro-Account (Flatrate, interaktiv), keinen API-Zugang — bewusst gegen ein neues, verbrauchsabhängiges Secret mit unkalkulierbaren Kosten entschieden. Folgt exakt dem in PROJ-3 bereits bewährten Muster (externer Prompt-Lauf → Datei-Import → mechanisches Parsing). Datenmodell bleibt bewusst entkoppelt von der Erzeugungsmethode, ein späterer automatisierter API-Weg könnte dieselben Tabellen befüllen | 2026-08-28 |
| Erneutes Auslösen bei bestehender Anreicherung: Warnung + vollständiger Ersatz (kein additiver Merge, keine Versionshistorie) | Analog zu PROJ-3s Re-Import-Verhalten — einfacher, vorhersagbarer Umgang, konsistent mit dem bereits etablierten Muster im Projekt | 2026-08-28 |
| Keine Obergrenze für die Anzahl erkannter Personas | Bewusste Entscheidung gegen künstliche Deckelung — reale Projekte sollen nicht durch eine willkürliche Zahl eingeschränkt werden | 2026-08-28 |
| `hasDependentImportData()` in PROJ-3 wird jetzt real implementiert (prüft auf existierende Ebene-2-Anreicherung) statt weiter als Stub zu laufen | Schließt die in PROJ-3 bewusst offen gelassene Erweiterungsstelle direkt, sobald das PROJ-4-Datenmodell existiert — verhindert, dass ein Re-Import in PROJ-3 eine bestehende Anreicherung stillschweigend verwaisen lässt | 2026-08-28 |
| Bei einem harten Fehler (Netzwerk-/Serverfehler beim Hochladen/Speichern, oder eine Ergebnis-Datei ohne erkennbare Struktur) wird nichts gespeichert, keine Teil-Anreicherung | Analog zum bereits etablierten Fehlerverhalten aus PROJ-2/PROJ-3/PROJ-17 — ein unvollständiger, schwer nachvollziehbarer Zwischenstand wäre in einer KI-generierten Konzept-Grundlage besonders riskant. Angepasst bei `/architecture`: „KI-Dienst nicht erreichbar" entfällt als Fehlerfall, da kein appseitiger KI-Aufruf mehr stattfindet | 2026-08-28 |
| Kein eigenes Bearbeiten einzelner Dimensionswerte/Kanten in PROJ-4, nur vollständige Neu-Anreicherung als „Korrektur" | Editierbarkeit einzelner Werte mit Historie ist konzeptionell näher an PROJ-6 (Branch-Datenmodell) und würde den PROJ-4-Umfang stark aufblähen | 2026-08-28 |
| Minimaler UI-Umfang: einfache Lese-Übersicht (Personas, Dimensionen je Persona mit Impact-Text, Konfliktliste) ohne Graph-Darstellung | Analog zum PROJ-3-Muster (Lese-Übersicht vor der eigentlichen Visualisierung) — gibt sichtbaren Beweis, dass die Anreicherung funktioniert hat, ohne PROJ-5s eigentliche Aufgabe vorwegzunehmen | 2026-08-28 |

### Technical Decisions
<!-- Added by /architecture -->
| Decision | Rationale | Date |
|----------|-----------|------|
| Fünf neue, von PROJ-3 unabhängige Tabellen (Anreicherung, Persona, Dimension-Instanz, Kante, Konflikt) statt Erweiterung der bestehenden Import-Tabellen | Sauberer Schnitt: ein Re-Import in PROJ-3 kann Ebene 1/3 unabhängig ersetzen, ohne die Anreicherungs-Tabellen anzufassen; die PROJ-3-Re-Import-Prüfung muss nur auf Existenz eines Anreicherungs-Datensatzes zum Projekt prüfen | 2026-08-28 |
| `informs`-Kanten referenzieren einen `import_fields`-Eintrag aus PROJ-3 als Quelle, `shapes`-Kanten referenzieren einen `import_entries`-Eintrag aus PROJ-3 (Abschnitt aus „Seitenstruktur") als Ziel | Nutzt das bereits granular vorhandene PROJ-3-Datenmodell direkt weiter, statt Ebene-1/3-Daten ein zweites Mal zu speichern — eine Kante zeigt exakt auf das ursprünglich importierte Feld bzw. den Content-Block | 2026-08-28 |
| Rohtext der hochgeladenen Ergebnis-Datei wird zusammen mit dem Anreicherungs-Datensatz gespeichert | Nachvollziehbarkeit/Fehlersuche, falls der Parser etwas falsch interpretiert — analog zu den im `imports`-Bucket aufbewahrten PROJ-3-Rohdateien | 2026-08-28 |
| Feste, parsbare Markdown-Ausgabevorlage für das Anreicherungsergebnis (neue Datei unter `docs/reference/`, analog zu `Journey-Transkript-Vorlage.md`/`Landingpage-Konzept-Vorlage.md`), mechanisches Parsing statt einer zweiten KI-Anfrage fürs Verarbeiten | Ermöglicht denselben Best-Effort-Parse-mit-Lücken-Markierung-Ansatz wie PROJ-3 (`remark`/`unified`), ohne dass die App selbst noch einmal ein KI-Modell aufrufen muss | 2026-08-28 |
| Kein neues Package/SDK für KI-Zugriff | Die eigentliche KI-Verarbeitung läuft außerhalb der App im eigenen Claude-Account des Nutzers — die App selbst ruft kein KI-Modell auf | 2026-08-28 |

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### A) Komponenten-Struktur (visueller Baum)

```
Projekt-Detail-Seite (/kunden/[kundeId]/[projektId])
├── Projekt-Stammdaten-Karte (bestehend, PROJ-17, unverändert)
├── Import-Bereich (bestehend, PROJ-3, unverändert)
└── KI-Anreicherungs-Bereich (neuer Inhalt)
    │
    ├── Zustand "Kein Import vorhanden"
    │   └── Hinweistext + deaktivierter "Anreicherungs-Prompt erzeugen"-Button
    │
    ├── Zustand "Import vorhanden, keine Anreicherung"
    │   ├── Aktiver "Anreicherungs-Prompt erzeugen"-Button
    │   └── Nach Klick: kopierbarer Prompt-Textblock (Ebene-1/3-Daten bereits eingebettet)
    │       + Anleitungstext ("in eigenem Claude-Chat ausführen, Ergebnis unten hochladen")
    │       + Upload-Zone für die Ergebnis-Datei
    │
    ├── Zustand "Ergebnis hochgeladen, Vorschau" (nach Datei-Upload, vor Übernahme)
    │   ├── Struktur-/Lücken-Warnung (Best-Effort-Parsing, analog PROJ-3)
    │   ├── Persona-Vorschau (erkannte Personas + ihre Dimensionswerte, Lücken markiert)
    │   ├── Konflikt-Vorschau (getrennt "explizit"/"emergent")
    │   ├── Re-Anreicherungs-Warnung (nur falls bereits eine Anreicherung existiert)
    │   └── "Anreicherung übernehmen" / "Abbrechen"
    │
    └── Zustand "Anreicherung vorhanden" (Lese-Übersicht)
        ├── Persona-Liste (aufklappbar je Persona)
        │   └── je Persona: 23 Dimensionswerte + Impact-Text je zugehöriger Kante
        ├── Konfliktliste (getrennt "explizit"/"emergent")
        └── "Neuen Prompt erzeugen"-Button (führt zurück in den Prompt-Zustand)
```

### B) Datenmodell (in einfacher Sprache)

Fünf neue Tabellen, unabhängig von PROJ-3s eigenen vier Tabellen, mit Cascade-Löschung nach unten (wie bei PROJ-3):

**Anreicherung** — ein Datensatz pro Projekt (ein erneuter Import des Ergebnisses ersetzt den bestehenden):
- Eindeutige ID, Verknüpfung zum Projekt (ein aktueller Stand pro Projekt)
- Erzeugt-Zeitstempel
- Rohtext der hochgeladenen Ergebnis-Datei (für Nachvollziehbarkeit)

**Persona** — eine erkannte Zielgruppe/ein Pfad:
- Eindeutige ID, Verknüpfung zur Anreicherung
- Name, Kurzbeschreibung, Bezug zu den auslösenden Ebene-1-Antworten
- Reihenfolge

**Dimension-Instanz** — der Wert einer der 23 festen Dimensionen:
- Eindeutige ID, Verknüpfung zur Anreicherung
- Dimensionsname (validiert gegen die feste 23er-Liste)
- Verknüpfung zur Persona (leer bei „Umsetzungsrahmen" — immer genau eine projektweite Instanz)
- Wert (Text) oder Status „nicht ableitbar"

**Kante** — Verbindung zwischen zwei Knoten:
- Eindeutige ID, Verknüpfung zur Anreicherung
- Typ: `informs` (Ebene-1-Feld → Dimension-Instanz) oder `shapes` (Dimension-Instanz → Ebene-3-Content-Block)
- Quellverweis/Zielverweis (bei `informs`: ein bestehendes `import_fields`-Feld aus PROJ-3; bei `shapes`: ein bestehender `import_entries`-Content-Block-Abschnitt aus PROJ-3)
- Impact-Text, Gewichtung

**Konflikt** — ein erkannter Widerspruch:
- Eindeutige ID, Verknüpfung zur Anreicherung
- Typ: „explizit" oder „emergent"
- Beteiligte Knoten-Referenzen (bei explizit: zwei Ebene-1-Felder; bei emergent: ein Ebene-3-Content-Block + die betroffenen Dimension-Instanzen/Personas)
- Beschreibungstext

Gespeichert in: Supabase (PostgreSQL), gleiche Shared-Visibility wie PROJ-3/PROJ-17.

**Wichtig für spätere Erweiterung:** Das Datenmodell ist bewusst unabhängig davon, WIE die Werte entstehen. Ein künftiger automatisierter API-Weg (siehe Out of Scope) würde exakt dieselben fünf Tabellen über denselben Parser befüllen, nur ohne den manuellen Kopier-Schritt dazwischen.

### C) Tech-Entscheidungen (Begründung)

- **Manueller Prompt-Export/Import statt appseitigem KI-API-Aufruf:** Der Nutzer hat nur einen Claude-Pro-Account (Flatrate, an interaktive Nutzung gebunden) — kein API-Zugang mit nutzungsbasierter Abrechnung. Ein automatischer Server-Aufruf würde immer ein neues, verbrauchsabhängiges Secret mit nicht vollständig kalkulierbaren Kosten voraussetzen, unabhängig vom gewählten Anbieter. Der manuelle Weg vermeidet das vollständig und nutzt exakt das in PROJ-3 bereits bewährte Muster (externer Prompt-Lauf → strukturierter Datei-Import → mechanisches Parsing).
- **Feste, parsbare Ausgabe-Vorlage für das Anreicherungsergebnis:** Ermöglicht denselben Best-Effort-Parse-mit-Lücken-Markierung-Ansatz wie PROJ-3, ohne dass die App selbst ein KI-Modell aufrufen muss — das Parsen ist rein mechanisch (Markdown-Struktur → Datenbank), genau wie bei den Journey-/Konzept-Parsern.
- **Fünf neue, von PROJ-3 unabhängige Tabellen:** Ein Re-Import in PROJ-3 kann Ebene 1/3 unabhängig ersetzen, ohne die Anreicherungs-Tabellen anzufassen; die dortige Re-Import-Warnung prüft nur auf deren Existenz.
- **Datenmodell entkoppelt von der Erzeugungsmethode:** Ermöglicht einen späteren, rein additiven Umstieg auf einen automatisierten API-Weg (Ein-Klick-Button + Kosten-Tracking), sobald das Kosten-/Vertragsbedenken ausgeräumt ist — ohne das Datenmodell oder nachgelagerte Features (PROJ-5/6/7) ändern zu müssen.

### D) Abhängigkeiten (Pakete)

- **Keine neuen Pakete nötig.** Kein KI-SDK erforderlich, da die eigentliche KI-Verarbeitung außerhalb der App im eigenen Claude-Account des Nutzers läuft. Das Parsen der hochgeladenen Ergebnis-Datei nutzt dieselben bereits vorhandenen Bausteine wie PROJ-3 (native File-API, `remark`/`unified` für Markdown-Parsing, bereits installierte shadcn/ui-Komponenten wie `Alert`, `Accordion`, `AlertDialog`).

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
