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
- Als Agentur-Mitarbeiter möchte ich nach einem abgeschlossenen Import mit einem Klick eine KI-gestützte Anreicherung starten, damit ich nicht selbst die verdeckten Profildimensionen aus Journey und Konzept von Hand ableiten muss.
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
- Asynchrone Hintergrundverarbeitung (Job-Queue, Seite verlassen und später zurückkehren) — bewusst nicht vorgesehen für MVP, synchroner Ablauf mit Ladezustand
- Automatische Neu-Anreicherung bei geänderten Ebene-1-Antworten (Branch-Modell) — eigenständiges Thema von PROJ-6, PROJ-4 kennt nur den expliziten Nutzer-Trigger

## Acceptance Criteria

**Format:** Angenommen [Vorbedingung] / Wenn [Aktion] / Dann [Ergebnis]

- [ ] Angenommen ein Projekt hat einen abgeschlossenen Import (PROJ-3) aber noch keine Ebene-2-Anreicherung, wenn der Nutzer die Projekt-Detail-Seite öffnet, dann ist der „KI-Anreicherung starten"-Button aktiv
- [ ] Angenommen ein Projekt hat noch keinen abgeschlossenen Import, dann ist der „KI-Anreicherung starten"-Button deaktiviert mit einem Hinweis, dass zuerst importiert werden muss
- [ ] Angenommen der Nutzer klickt „KI-Anreicherung starten", dann wird während der Verarbeitung ein Ladezustand angezeigt, der Button ist deaktiviert (kein Doppel-Trigger möglich), und der Nutzer bleibt bis zum Abschluss auf der Seite
- [ ] Angenommen die Anreicherung läuft erfolgreich durch, dann werden alle 23 festen Profildimensionen mit mindestens einer Werte-Instanz gespeichert — „Umsetzungsrahmen" immer als genau eine projektweite Instanz, alle anderen 22 Dimensionen als eine Instanz pro erkannter Persona, sofern sich die Werte zwischen den Personas tatsächlich unterscheiden
- [ ] Angenommen die Journey-Antworten legen mehrere parallele Zielgruppen/Pfade nahe, wenn die Anreicherung läuft, dann werden diese als eigenständige Personas gespeichert (Name, Kurzbeschreibung, Bezug zu den auslösenden Ebene-1-Antworten)
- [ ] Angenommen die Journey-Antworten legen keine Segmentierung nahe, dann wird trotzdem genau eine Persona angelegt (kein Sonderfall „0 Personas")
- [ ] Angenommen eine Dimension oder eine einzelne Persona-Instanz davon lässt sich nicht zuverlässig aus den importierten Daten ableiten, dann wird sie als „nicht ableitbar" markiert statt mit einem erfundenen Wert gefüllt
- [ ] Angenommen die Anreicherung ist abgeschlossen, dann besitzt jede erzeugte Kante (Typ `informs` von einem Ebene-1-Feld zu einer Dimension-Instanz, oder Typ `shapes` von einer Dimension-Instanz zu einem Ebene-3-Content-Block) eine Gewichtung und einen Impact-Text, der ohne erfundene Fakten/Zahlen begründet, warum die Quelle das Ziel beeinflusst
- [ ] Angenommen zwei Journey-Antworten stehen inhaltlich im Widerspruch zueinander, dann wird dies als Konflikt vom Typ „explizit" erkannt und gespeichert
- [ ] Angenommen ein Content-Block wird von mehreren Personas mit widersprüchlichen Dimensionswerten adressiert, dann wird dies als Konflikt vom Typ „emergent" erkannt und gespeichert, ohne dass PROJ-4 selbst eine Lösung anbietet
- [ ] Angenommen die Anreicherung ist abgeschlossen, dann zeigt die Projekt-Detail-Seite eine lesbare Übersicht ohne Graph-Darstellung: Personas, je Persona ihre Dimensionswerte mit Impact-Text, sowie eine separate Liste aller erkannten Konflikte
- [ ] Angenommen für ein Projekt existiert bereits eine Ebene-2-Anreicherung, wenn der Nutzer erneut auf „KI-Anreicherung starten" klickt, dann erscheint eine Warnung, dass die bestehende Anreicherung vollständig ersetzt wird, die aktiv bestätigt werden muss
- [ ] Angenommen der Nutzer bestätigt die Ersetzung, dann werden alle bisherigen Personas, Dimension-Instanzen, Kanten und Konflikte gelöscht und durch die neue Anreicherung ersetzt
- [ ] Angenommen der Nutzer bricht die Re-Anreicherungs-Warnung ab, dann bleibt die bestehende Anreicherung unverändert gültig
- [ ] Angenommen ein Projekt mit abgeschlossener Ebene-2-Anreicherung wird in PROJ-3 erneut importiert, dann greift dort jetzt die reale Prüfung (nicht mehr der bisherige Stub) und zeigt die entsprechende Re-Import-Warnung
- [ ] Angenommen ein harter Fehler tritt während der Anreicherung auf (z. B. KI-Dienst nicht erreichbar), dann erscheint eine Fehlermeldung, es wird keine Teil-Anreicherung gespeichert, und der Nutzer kann erneut starten

## Edge Cases
- Nur eine Persona erkannt (der in der Praxis häufigste Fall) → jede Dimension bekommt genau eine Instanz, kein Unterschied zum „Ein-Personen"-Ablauf.
- Sehr viele Personas erkannt (keine Obergrenze) → alle werden gespeichert, die Lese-Übersicht muss mit einer variablen, potenziell zweistelligen Anzahl umgehen können.
- Ein Ebene-3-Content-Block wird von keiner Persona explizit adressiert (z. B. ein neutraler Baustein wie Footer) → erhält trotzdem `shapes`-Kanten von den ihn prägenden Dimensionen, löst aber keinen emergenten Konflikt aus, da keine widersprüchlichen Personas-Werte zusammentreffen.
- Erneutes Auslösen während eine vorherige Anreicherung noch läuft → durch den deaktivierten Button während der Verarbeitung ausgeschlossen.
- Import wurde nach bestehender Ebene-2-Anreicherung erneut hochgeladen (PROJ-3), aber die dortige Warnung wird abgebrochen → weder Import noch Anreicherung ändern sich.
- Zwei Mitarbeiter lösen gleichzeitig für dasselbe Projekt eine Anreicherung aus → kein Konfliktschutz vorgesehen, letzter abgeschlossener Lauf gewinnt (last-write-wins, konsistent mit PROJ-3/PROJ-17).

## Technical Requirements (optional)
- Security: gleiche Zugriffsregeln wie PROJ-3/PROJ-17 (alle eingeloggten Agentur-Mitarbeiter, Shared Visibility)
- Halluzinationsschutz: Impact-Texte und Dimensionswerte dürfen keine erfundenen Zahlen, Zitate oder Fakten enthalten, die nicht aus den importierten Daten hervorgehen (analog zur Regel im Original-Interview-Prompt) — kurze, faktenbasierte Formulierung
- Kein festes Performance-Ziel definiert (KI-Verarbeitung mit 23 Dimensionen × Personas + Kanten + Konflikterkennung braucht spürbar länger als eine einfache Anfrage) — sichtbarer Ladezustand ist Pflicht, eine konkrete Zeitobergrenze ist eine technische Feinabstimmung für `/architecture`

## Open Questions
- [ ] Exakte Formulierungs-/Längenvorgabe für Impact-Texte (z. B. maximale Zeichenzahl) — Feinjustierung bei `/architecture` oder `/frontend`
- [ ] Genauer KI-Anbieter/Modell und Prompt-Engineering für die Anreicherung selbst — technische Entscheidung von `/architecture`
- [ ] Genauer Mechanismus, wie pro Dimension entschieden wird, ob sich die Werte zwischen erkannten Personas tatsächlich unterscheiden (Schwelle für Aufsplitten vs. gemeinsamer Wert) — technische Feinabstimmung bei `/architecture`

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
| Trigger als Button auf der Projekt-Seite, synchroner Ablauf mit Ladezustand statt Hintergrund-Job | Einfacher als eine Job-Queue, ausreichend für MVP-Umfang, konsistent mit dem bereits etablierten PROJ-3-Pattern (kein asynchrones Verarbeitungsmodell im Projekt bisher) | 2026-08-28 |
| Erneutes Auslösen bei bestehender Anreicherung: Warnung + vollständiger Ersatz (kein additiver Merge, keine Versionshistorie) | Analog zu PROJ-3s Re-Import-Verhalten — einfacher, vorhersagbarer Umgang, konsistent mit dem bereits etablierten Muster im Projekt | 2026-08-28 |
| Keine Obergrenze für die Anzahl erkannter Personas | Bewusste Entscheidung gegen künstliche Deckelung — reale Projekte sollen nicht durch eine willkürliche Zahl eingeschränkt werden | 2026-08-28 |
| `hasDependentImportData()` in PROJ-3 wird jetzt real implementiert (prüft auf existierende Ebene-2-Anreicherung) statt weiter als Stub zu laufen | Schließt die in PROJ-3 bewusst offen gelassene Erweiterungsstelle direkt, sobald das PROJ-4-Datenmodell existiert — verhindert, dass ein Re-Import in PROJ-3 eine bestehende Anreicherung stillschweigend verwaisen lässt | 2026-08-28 |
| Bei einem harten Fehler (z. B. KI-Dienst nicht erreichbar) wird nichts gespeichert, keine Teil-Anreicherung | Analog zum bereits etablierten Fehlerverhalten aus PROJ-2/PROJ-3/PROJ-17 — ein unvollständiger, schwer nachvollziehbarer Zwischenstand wäre in einer KI-generierten Konzept-Grundlage besonders riskant | 2026-08-28 |
| Kein eigenes Bearbeiten einzelner Dimensionswerte/Kanten in PROJ-4, nur vollständige Neu-Anreicherung als „Korrektur" | Editierbarkeit einzelner Werte mit Historie ist konzeptionell näher an PROJ-6 (Branch-Datenmodell) und würde den PROJ-4-Umfang stark aufblähen | 2026-08-28 |
| Minimaler UI-Umfang: einfache Lese-Übersicht (Personas, Dimensionen je Persona mit Impact-Text, Konfliktliste) ohne Graph-Darstellung | Analog zum PROJ-3-Muster (Lese-Übersicht vor der eigentlichen Visualisierung) — gibt sichtbaren Beweis, dass die Anreicherung funktioniert hat, ohne PROJ-5s eigentliche Aufgabe vorwegzunehmen | 2026-08-28 |

### Technical Decisions
<!-- Added by /architecture -->
| Decision | Rationale | Date |
|----------|-----------|------|

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
