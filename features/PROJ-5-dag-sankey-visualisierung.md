# PROJ-5: DAG/Sankey-Graph-Visualisierung

## Status: Planned
**Created:** 2026-08-28
**Last Updated:** 2026-08-28

## Dependencies
- Requires: PROJ-4 (KI-Anreicherung) — liefert Ebene 2 (Profildimensionen inkl. Persona-Instanzen), die Kanten `informs`/`shapes` und die Konflikterkennung
- Requires (indirekt, über PROJ-4): PROJ-3 (Import-Werkstatt) — liefert Ebene 1 (Journey-Fragen/Antworten) und Ebene 3 (Content-Blöcke aus Abschnitt 4 „Seitenstruktur")

## Kontext: Fachliches Modell

Grundlage ist `docs/reference/Konzeptfaeden-Spezifikation.md` (dreischichtiger Graph, dort ausführlich hergeleitet). Kurzfassung für diesen Spec:

```
Ebene 1                    Ebene 2                       Ebene 3
Themenblöcke        →      Profil-Dimensionen      →     Content-Blöcke
(Input, beantwortet)       (verdeckt, 23 Stück)          (Output, Seitenstruktur)
```

Kein Content-Block lässt sich direkt aus einer Frage ableiten — der Weg führt immer über mindestens eine Profil-Dimension. Deshalb ein spaltenbasiertes, gerichtetes Diagramm (DAG/Sankey-Hybrid) statt eines freien, kraftbasierten Graphen: Die Spalten geben die Fluss-Richtung vor.

**Wichtige Korrektur gegenüber dem INDEX.md-Titel „4 Ebenen":** Die Spaltenzahl ist architektonisch **nicht auf 4 gedeckelt**. Ebene 4+ entsteht aus der tatsächlichen Tiefe der Seitenhierarchie (Hub → Unterseite → Unter-Unterseite, …) — eine Seitenstruktur wie Home/Produkte/Produktdetail/Galerie hätte z. B. 6 Ebenen. PROJ-5 selbst liefert nur Ebene 1–3 mit echten Daten (siehe Out of Scope), die Spalten-Rendering-Logik soll aber so gebaut sein, dass PROJ-11 (Ebene 4, Mehrseiten-Struktur) und weitere Hierarchietiefen dieselbe Spalten-Mechanik ohne Umbau weiterverwenden können.

## User Stories
- Als Agentur-Mitarbeiter möchte ich nach abgeschlossener KI-Anreicherung sehen, wie Journey-Fragen über verdeckte Profildimensionen zu konkreten Content-Blöcken führen, damit ich die Herleitung des Konzepts gegenüber Kollegen und Kunden nachvollziehbar begründen kann.
- Als Agentur-Mitarbeiter möchte ich auf einen Content-Block klicken und sofort sehen, welche Journey-Antworten und Profildimensionen ihn geprägt haben (Herkunft rückwärts), damit ich Rückfragen des Kunden ("warum ist das so?") direkt beantworten kann.
- Als Agentur-Mitarbeiter möchte ich auf einen Themenblock klicken und sehen, welche Dimensionen und Content-Blöcke er beeinflusst (Wirkung vorwärts) inkl. der zugehörigen Frage/Antwort im Klartext, damit ich den Einfluss einer einzelnen Antwort auf das Gesamtkonzept einschätzen kann.
- Als Agentur-Mitarbeiter möchte ich Ebene 2 (Profildimensionen) standardmäßig ausblenden können, damit der Graph für einen ersten Überblick nicht überladen wirkt, ohne dass mir dabei der Zusammenhang zwischen Frage und Content-Block verloren geht.
- Als Agentur-Mitarbeiter möchte ich bereits erkannte Konflikte (aus PROJ-4) visuell markiert sehen, damit mir Widersprüche im Konzept auffallen, auch bevor die eigentliche Konfliktauflösung (PROJ-7) gebaut ist.
- Als Kunde möchte ich (perspektivisch, sobald PROJ-10 existiert) denselben Graph einsehen können wie die Agentur, damit die Herleitung des Konzepts für mich genauso nachvollziehbar ist wie für den Agentur-Mitarbeiter — PROJ-5 baut dafür keine reduzierte/vereinfachte Extra-Ansicht, sondern exakt eine gemeinsame Ansicht für beide Rollen.

## Out of Scope
- **Ebene 4 (Seitenhierarchie, Hub/Unterseiten, Cross-Page-Links)** — eigenes Feature PROJ-11, baut auf der hier etablierten Spalten-Mechanik auf
- **Branch-Vergleich im Dossier-Panel bei Themenblöcken** — Datenmodell dafür ist PROJ-6 (Branch-Datenmodell), noch nicht gebaut. PROJ-5 zeigt nur den aktuellen Stand einer Antwort, keine Historie/Alternativen
- **Konfliktlösungsoptionen im Dossier-Panel** — eigenes Feature PROJ-7. PROJ-5 markiert erkannte Konflikte nur visuell und zeigt die Beschreibung, bietet aber keine Lösungs-Interaktion an
- **Bearbeiten von Journey-Antworten** — PROJ-5 ist rein lesend. Antworten ändern (inkl. Branching) ist PROJ-6
- **Mini-Wireframe-Vorschau im Content-Block-Dossier** — setzt die Wireframe-Engine (PROJ-8) voraus, die noch nicht existiert
- **Eigene, vereinfachte Kunden-Ansicht** — es gibt bewusst keine zweite, laienfreundlich reduzierte Variante des Graphen; die künftige Kunden-Ansicht (PROJ-10) verwendet dieselbe Darstellung wie die Agentur-Ansicht
- **Live-Kopplung Gewichtung → Wireframe** — Fernziel „Phase 2" laut PRD, außerhalb dieses Tools in der jetzigen Form

## Acceptance Criteria

- [ ] Angenommen ein Projekt hat weder Import noch Anreicherung, wenn der Nutzer die Graph-Unterseite aufruft, dann sieht er einen Hinweis mit Link zur Import-Werkstatt statt eines leeren Graphen
- [ ] Angenommen ein Projekt hat einen Import, aber noch keine Anreicherung, wenn der Nutzer die Graph-Unterseite aufruft, dann sieht er nur Ebene 1 und Ebene 3 als unverbundene Spalten sowie einen Hinweis, zuerst die KI-Anreicherung durchzuführen
- [ ] Angenommen ein Projekt hat Import und Anreicherung, wenn der Nutzer die Graph-Unterseite aufruft, dann werden alle drei Ebenen als Spalten mit den tatsächlich importierten/angereicherten Daten gerendert
- [ ] Angenommen Ebene 1 wird angezeigt, wenn der Nutzer die Seite betrachtet, dann erscheint jeder Themenblock (Phase 1–3, 4–6, 7–9, 10 bzw. Einstieg) als ein Hauptknoten, die zugehörigen Einzelfragen sind erst nach Aufklappen sichtbar
- [ ] Angenommen der Nutzer klickt auf einen Content-Block-Knoten, wenn das Dossier-Panel öffnet, dann zeigt es die Herkunft rückwärts: alle Profildimensionen (mit Persona, falls zutreffend), die diesen Block geprägt haben, jeweils mit Impact-Text und Gewichtung
- [ ] Angenommen der Nutzer klickt auf einen Themenblock- oder Frage-Knoten, wenn das Dossier-Panel öffnet, dann zeigt es die gestellte Frage und die gegebene Antwort im Klartext sowie die Wirkung vorwärts: alle Profildimensionen, die diese Antwort als Quelle referenzieren
- [ ] Angenommen der Nutzer klickt auf einen Profildimension-Knoten, wenn das Dossier-Panel öffnet, dann zeigt es sowohl die Quelle (Eltern: Frage/Antwort) als auch alle Content-Blöcke, die diese Dimension prägt (Kinder)
- [ ] Angenommen eine Dimension hat für mehrere Personas unterschiedliche Werte, wenn der Graph gerendert wird, dann erscheint für jede Persona-Instanz ein eigener Knoten in Ebene 2, jeweils mit eigenen Kanten zu seinen Quell-Fragen und Ziel-Blöcken
- [ ] Angenommen eine Dimension ist als „nicht ableitbar" (Gap) markiert, wenn der Graph gerendert wird, dann erscheint sie trotzdem als Knoten mit einer Lücken-Kennzeichnung, nicht ersatzlos ausgeblendet
- [ ] Angenommen ein Content-Block hat keine eingehende `shapes`-Kante, wenn der Graph gerendert wird, dann erscheint er trotzdem als isolierter Knoten in Ebene 3
- [ ] Angenommen der Nutzer blendet Ebene 2 über den Spalten-Schalter aus, wenn der Graph neu rendert, dann verschwinden die Profildimension-Knoten, aber die betroffenen Frage-Knoten und Content-Block-Knoten bleiben über eine direkte, komprimierte Kante verbunden
- [ ] Angenommen Ebene 2 ist ausgeblendet, wenn der Nutzer den Schalter erneut aktiviert, dann erscheinen die Profildimension-Knoten und die komprimierten Kanten wieder in die ursprünglichen Einzelkanten aufgeteilt
- [ ] Angenommen für das Projekt liegt ein erkannter Konflikt (explizit oder emergent) aus PROJ-4 vor, wenn der Graph gerendert wird, dann ist der betroffene Knoten (Content-Block bzw. beteiligte Dimensionen) visuell als Konflikt markiert
- [ ] Angenommen der Nutzer klickt auf einen konfliktmarkierten Knoten, wenn das Dossier-Panel öffnet, dann zeigt es zusätzlich zu Herkunft/Wirkung die Konflikt-Beschreibung als Text, ohne Lösungsoptionen anzubieten
- [ ] Angenommen der Nutzer ist nicht eingeloggt, wenn er die Graph-Unterseite eines Projekts aufruft, dann wird er zu `/login` umgeleitet (gleiches Muster wie PROJ-3/PROJ-4)

## Edge Cases
- Sehr viele Knoten (z. B. 23 Dimensionen × 3 Personas = bis zu ~69 Ebene-2-Knoten): Der Graph muss nutzbar bleiben (Zoom/Pan oder vertikales Scrollen innerhalb einer Spalte), auch wenn kein hartes Performance-Ziel definiert ist — reale Projektgrößen sind überschaubar
- „Umsetzungsrahmen" ist die einzige projektweite Dimension ohne Persona-Bezug — erscheint als einzelner Knoten ohne Persona-Kennzeichnung, unabhängig von der Anzahl erkannter Personas
- Eine Persona ohne jede Dimension-Instanz (z. B. weil die KI für sie nirgends einen abweichenden Wert fand) taucht in Ebene 2 nicht separat auf — nur die Personas, für die tatsächlich mindestens eine Instanz gespeichert wurde
- Mobile/kleine Bildschirme (375px, siehe Frontend-Regeln): Ein mehrspaltiges Sankey-Layout mit Dossier-Panel ist auf 375px nicht sinnvoll 1:1 darstellbar — Lösung (horizontales Scrollen, Dossier als Bottom-Sheet o. ä.) ist eine Frontend-Entscheidung, siehe Open Questions
- Re-Import (PROJ-3) oder erneute Anreicherung (PROJ-4) nach bereits erfolgtem Betrachten des Graphen: Der Graph muss beim nächsten Aufruf den aktuellen Datenstand zeigen, nicht veraltete Client-State-Daten
- Zwei Content-Blöcke mit identischem Label (sollte durch PROJ-3 nicht vorkommen, da Labels aus der Seitenstruktur-Nummerierung stammen) — keine gesonderte Behandlung nötig, da strukturell ausgeschlossen

## Technical Requirements (optional)
- Zugriffsschutz: gleiches Muster wie PROJ-3/PROJ-4 (eingeloggte Agentur-Nutzer, „Shared Visibility" — kein rollenbasierter Unterschied zwischen Agentur- und künftiger Kunden-Ansicht)
- Rein lesender Zugriff auf bereits bestehende Tabellen (`interview_imports`/`import_sections`/`import_entries`/`import_fields`, `enrichments`/`enrichment_personas`/`enrichment_dimensions`/`enrichment_edges`/`enrichment_conflicts`) — keine neuen Schreibpfade

## Open Questions
- [ ] Konkretes Mobile-Verhalten (375px) für ein mehrspaltiges Graph-Layout mit Dossier-Panel — an `/frontend` zur Klärung übergeben
- [ ] Zoom/Pan- oder Scroll-Mechanik bei sehr vielen Ebene-2-Knoten — technische Umsetzung an `/architecture`/`/frontend`
- [ ] Genaue visuelle Unterscheidung Konflikt-Badge vs. Lücken-Badge vs. Should-/Nice-to-Have-Badge (aus der Konzeptfäden-Spezifikation, Abschnitt 5, für spätere Wireframe-Kopplung relevant) — Detailfrage für `/frontend`, nicht produktentscheidend für MVP

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| PROJ-5 deckt nur Ebene 1–3 ab, Ebene 4 bleibt PROJ-11 vorbehalten | Passt zur Dependency (nur PROJ-4), kein Mehrseiten-Datenmodell vorhanden; INDEX.md-Titel „4 Ebenen" beschreibt nicht den MVP-Umfang | 2026-08-28 |
| Spalten-Zahl ist architektonisch nicht auf 4 gedeckelt, sondern richtet sich nach der tatsächlichen Seitenstruktur-Tiefe | Nutzer-Korrektur: eine Seitenstruktur wie Home/Produkte/Produktdetail/Galerie hätte z. B. 6 Ebenen — PROJ-11 und weitere Hierarchietiefen sollen dieselbe Spalten-Mechanik ohne Umbau nutzen können | 2026-08-28 |
| Keine separate, vereinfachte Kunden-Ansicht — künftige Kunden-Ansicht (PROJ-10) nutzt exakt dieselbe Darstellung wie die Agentur-Ansicht | Explizite Nutzer-Vorgabe: keine Anpassung auf „einfache Sprache" oder Laienverständlichkeit | 2026-08-28 |
| Dossier-Panel zeigt nur Herkunft/Wirkung (+ Konflikt-Beschreibung), keinen Branch-Vergleich und keine Konfliktlösungsoptionen | Beides gehört fachlich zu PROJ-6 bzw. PROJ-7, die noch nicht existieren — vermeidet Scope-Vermischung | 2026-08-28 |
| Bereits erkannte Konflikte aus PROJ-4 werden visuell markiert, obwohl die Auflösung (PROJ-7) noch nicht existiert | Macht bereits vorhandene PROJ-4-Daten sofort nutzbar, statt sie bis PROJ-7 brachliegen zu lassen | 2026-08-28 |
| Ein Graph-Knoten pro Persona-Instanz einer Dimension (nicht ein Knoten mit Persona-Tabs) | Macht unterschiedliche Herkunft/Wirkung pro Persona direkt im Graph sichtbar, statt sie hinter einer Klick-Interaktion zu verstecken | 2026-08-28 |
| Themenblock (nicht Einzelfrage) ist der Standard-Hauptknoten in Ebene 1, Fragen sind aufklappbar | Hält den Graph auf oberster Ebene übersichtlich (4 statt bis zu 10 Hauptknoten), entspricht der Konzeptfäden-Spezifikation | 2026-08-28 |
| Gap-Dimensionen („nicht ableitbar") erscheinen als Knoten mit Lücken-Badge statt ausgeblendet zu werden | Konsistent mit der Best-Effort-Philosophie aus PROJ-3/PROJ-4: sichtbar machen, was fehlt | 2026-08-28 |
| Content-Blöcke ohne eingehende Kante erscheinen als isolierter Knoten statt ausgeblendet zu werden | Macht sichtbar, dass die Anreicherung diesen Block nicht begründet hat, statt es stillschweigend zu verschweigen | 2026-08-28 |
| Ebene-2-Schalter komprimiert Kanten beim Ausblenden auf direkte Frage→Block-Verbindungen, statt sie verschwinden zu lassen | Ebene 2 ist die einzige „verdeckte" Ebene der Konzeptfäden-Spezifikation — ihre Nachvollziehbarkeit soll auch beim Ausblenden erhalten bleiben | 2026-08-28 |
| Graph lebt auf einer eigenen Unterseite (`/kunden/[kundeId]/[projektId]/graph` o. ä.), nicht als dritter Abschnitt auf der bestehenden Projekt-Detailseite | Spalten-Layout + Dossier-Panel brauchen viel Platz; Projekt-Detailseite hat mit Import-Werkstatt + KI-Anreicherung bereits zwei Bereiche | 2026-08-28 |
| PROJ-5 ist rein lesend, keine Bearbeitung von Journey-Antworten | Editierbarkeit inkl. Branching ist PROJ-6, noch nicht gebaut | 2026-08-28 |

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
