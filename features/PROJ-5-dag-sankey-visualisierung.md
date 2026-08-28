# PROJ-5: DAG/Sankey-Graph-Visualisierung

## Status: Architected
**Created:** 2026-08-28
**Last Updated:** 2026-08-28 (Architecture)

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
| Neues Paket `@xyflow/react` (React Flow) für das Knoten-/Kanten-Diagramm | Bringt Zoom/Pan, Kanten-Routing und Klick-Handling für genau diese Art von Diagramm bereits mit — spart erhebliche Eigenentwicklung gegenüber einem CSS/SVG-Eigenbau. Genutzt nur zum Anzeigen: Positionen werden selbst nach der fachlichen Spalten-Logik berechnet, kein automatisches Kraft-Layout, kein Drag&Drop (Graph ist rein lesend). **Zukunftssicherheit:** Knoten-Dragging und Kanten-Neuverbindung sind in React Flow bereits eingebaut (nur für PROJ-5 deaktiviert) und Knoten sind frei gestaltbare React-Komponenten — spätere Anforderungen wie Antworten-Branching (PROJ-6), Konfliktlösung per Drag (PROJ-7) oder ein Gewichtungs-Regler direkt im Knoten (Phase-2-Fernziel „Gewichtung → Wireframe live") lassen sich damit nachrüsten, ohne die Bibliothek zu wechseln | 2026-08-28 |
| Keine neue Datenbank-Query — Graph-Seite nutzt ausschließlich die bereits bestehenden `getImportForProject()`/`getEnrichmentForProject()`-Funktionen aus PROJ-3/PROJ-4 | Beide liefern bereits alle Rohdaten, die der Graph braucht (Ebene 1/3 aus dem Import, Ebene 2 + Kanten + Konflikte aus der Anreicherung) — keine neue Tabelle, Migration oder RLS-Policy nötig | 2026-08-28 |
| Neue, reine Ableitungs-Bibliothek (analog zu `src/lib/imports/`, `src/lib/enrichment/`) übernimmt die Umrechnung von Import + Anreicherung in das anzeigefertige Knoten-/Kanten-Modell | Hält die fachliche Logik (Spalten-Zuordnung, Ebene-2-Kompression, Gap-/Konflikt-Markierung, isolierte Knoten) als reine, unabhängig testbare Funktionen getrennt von der reinen Rendering-Komponente — gleiches Muster wie `parse-enrichment.ts` | 2026-08-28 |
| Sowohl die normalen als auch die komprimierten Kanten (Ebene 2 ausgeblendet) werden beim Aufbau des Graph-Modells einmal vorab berechnet, nicht erst beim Klick auf den Schalter | Der Schalter muss nur zwischen zwei bereits fertigen Kanten-Listen umschalten, statt bei jedem Klick neu zu rechnen — vermeidet spürbare Verzögerung bei vielen Knoten | 2026-08-28 |
| Dossier-Panel als `Sheet` (bereits im Projekt als `sheet.tsx` vorhanden) statt neuer Komponente | Kein neues Paket nötig; `Sheet` verhält sich auf schmalen Bildschirmen (375px) automatisch als vollflächiges Overlay statt schmalem Seitenpanel — löst die Mobile-Frage aus den Edge Cases ohne Sonderlogik | 2026-08-28 |
| Seite als Server Component (liest die Daten wie die bestehende Projekt-Detailseite), Graph selbst als Client Component | Zoom/Pan, Knoten-Klicks, Ebene-2-Schalter und Aufklappen von Themenblöcken brauchen Interaktivität im Browser — gleiches Aufteilungsmuster wie `EnrichmentPanel`/`ImportPanel` (Server holt Daten, Client-Komponente übernimmt Darstellung + Interaktion) | 2026-08-28 |

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### A) Komponenten-Struktur

```
Graph-Unterseite (/kunden/[kundeId]/[projektId]/graph)
├── Kein-Import-Hinweis
│   └── (nur wenn kein Import vorliegt) Text + Link zurück zur Projekt-Detailseite/Import-Werkstatt
├── Keine-Anreicherung-Hinweis
│   └── (nur wenn Import, aber keine Anreicherung vorliegt) zeigt Ebene 1+3 als unverbundene Spalten + Hinweis, zuerst die KI-Anreicherung durchzuführen
└── Graph-Ansicht (Import + Anreicherung vorhanden)
    ├── Spalten-Kopfzeile
    │   ├── Spaltentitel "Themenblöcke" / "Profildimensionen" / "Content-Blöcke"
    │   └── Ebene-2-Schalter (Ein/Aus)
    ├── Graph-Leinwand (zoom-/schwenkbar)
    │   ├── Spalte Ebene 1: Themenblock-Knoten (Einstieg, Phase 1–3/4–6/7–9/10), je aufklappbar zu den zugehörigen Frage-Knoten
    │   ├── Spalte Ebene 2: Profildimension-Knoten (ein Knoten je Dimension+Persona-Instanz, „Umsetzungsrahmen" ohne Persona), mit Lücken-Badge bzw. Konflikt-Badge wo zutreffend — komplett ausblendbar über den Schalter
    │   ├── Spalte Ebene 3: Content-Block-Knoten (aus Abschnitt „Seitenstruktur"), inkl. isolierter Knoten ohne eingehende Kante, mit Konflikt-Badge wo zutreffend
    │   └── Verbindungslinien zwischen den Spalten (normale Kanten bei eingeblendeter Ebene 2, direkte komprimierte Kanten bei ausgeblendeter Ebene 2)
    └── Dossier-Panel (Seitenpanel, öffnet bei Klick auf einen Knoten)
        ├── Themenblock-/Frage-Knoten: Frage- und Antwort-Text im Klartext + Wirkung vorwärts (beeinflusste Dimensionen)
        ├── Profildimension-Knoten: Quelle rückwärts (Frage/Antwort) + Wirkung vorwärts (geprägte Content-Blöcke), inkl. Impact-Text und Gewichtung je Verbindung
        ├── Content-Block-Knoten: Herkunft rückwärts (alle prägenden Dimensionen mit Persona, Impact-Text, Gewichtung)
        └── Konflikt-Abschnitt (nur bei konfliktmarkierten Knoten): Konflikt-Beschreibung als Text, keine Lösungsoptionen
```

### B) Datenmodell (in einfacher Sprache)

Der Graph speichert **nichts Neues** — er ist eine reine Ansicht auf bereits vorhandene Daten aus PROJ-3 (Import) und PROJ-4 (Anreicherung):

- **Ebene-1-Knoten** entstehen aus den bereits importierten Journey-Themenblöcken und -Fragen.
- **Ebene-2-Knoten** entstehen aus den bereits gespeicherten Profildimension-Werten der Anreicherung — für jede tatsächlich gespeicherte Dimension+Persona-Kombination ein eigener Knoten, inklusive der als „nicht ableitbar" markierten (Lücken-Badge).
- **Ebene-3-Knoten** entstehen aus den bereits importierten Content-Blöcken (Abschnitt „Seitenstruktur").
- **Kanten** entstehen aus den bereits gespeicherten `informs`- und `shapes`-Verknüpfungen der Anreicherung.
- **Konflikt-Markierungen** entstehen aus den bereits gespeicherten, erkannten Konflikten der Anreicherung.

Alles wird bei jedem Seitenaufruf frisch aus den bestehenden Tabellen gelesen und im Browser zu einem anzeigefertigen Knoten-/Kanten-Modell zusammengesetzt — dadurch zeigt der Graph immer den aktuellen Stand, auch nach einem Re-Import oder einer erneuten Anreicherung, ohne eigene Aktualisierungs-Logik.

### C) Tech-Entscheidungen (Begründung)

- **React Flow für das Diagramm:** Statt Zoom/Pan, Kantenlinien und Klick-Erkennung von Grund auf selbst zu bauen, übernimmt eine etablierte, spezialisierte Bibliothek diese Grundfunktionen. Wir verwenden sie ausschließlich zum Anzeigen fester, selbst berechneter Positionen — kein automatisches Layout, kein Verschieben per Maus, da der Graph rein lesend ist.
- **Kein neuer Datenbankzugriff:** Die bereits für PROJ-3/PROJ-4 gebauten Funktionen zum Laden von Import und Anreicherung liefern bereits alles Nötige. Für den Graph kommt nur eine neue, reine Umrechnungs-Logik hinzu (aus den Rohdaten wird das Knoten-/Kanten-Modell abgeleitet) — kein neuer Speicherpfad.
- **Server holt Daten, Client-Komponente zeigt sie interaktiv an:** Gleiches Aufteilungsmuster wie bei der Import-Werkstatt und der KI-Anreicherung — vermeidet unnötige Rundreisen zum Server bei jeder Nutzer-Interaktion (Klick, Zoom, Ebene-2-Schalter).
- **Dossier-Panel als vorhandene `Sheet`-Komponente:** Bereits im Projekt vorhanden, verhält sich auf kleinen Bildschirmen automatisch sinnvoll (vollflächiges Overlay statt schmalem Seitenpanel).

### D) Abhängigkeiten (neue Pakete)

- `@xyflow/react` — Bibliothek für interaktive Knoten-/Kanten-Diagramme (Zoom/Pan, Kantenlinien, Klick-Handling)

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
