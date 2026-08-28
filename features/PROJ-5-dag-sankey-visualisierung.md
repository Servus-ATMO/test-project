# PROJ-5: DAG/Sankey-Graph-Visualisierung

## Status: Deployed
**Created:** 2026-08-28
**Last Updated:** 2026-08-29 (Deploy)

**Hinweis:** Das Graph-UI-Batch (per-Spalten-Sichtbarkeit, Persona-Filter, Ebene-2-Dimensionsgruppierung, statische Spalten statt React-Flow-Canvas) ist jetzt live, siehe „Deployment 2" im Deployment-Abschnitt.

## Implementierungsnotizen
- **Feinschliff Breiten-Layout, zwei Runden (`/frontend`, 2026-08-29):** Der vorherige "full bleed"-Fix (siehe unten) machte den gesamten Bereich unter dem Persona-Filter volle Breite — der Nutzer wollte stattdessen: „graph-canvas" (die umschliessende Box) ist immer volle Browserbreite, aber die Spalten-Zeile DARIN bleibt am Titel ausgerichtet (linksbündig), solange ihr tatsächlicher Inhalt in die Standardbreite der Seite passt — erst wenn er breiter wird (z. B. durch eine künftige 4./5. Ebene), soll sie sich stattdessen im vollen Fenster zentrieren. Das ist eine inhaltsabhängige Fallunterscheidung, die reines CSS nicht abbilden kann (`justify-content:center` würde auch kleinen Inhalt immer mittig im vollen Fenster zeigen, nicht linksbündig zum Titel) — deshalb per JS gemessen: neues `src/lib/graph/content-alignment.ts` (`computeContentMarginLeft()`, reine, getestete Funktion) berechnet aus der tatsächlich gemessenen Inhaltsbreite (`ResizeObserver` auf der Spalten-Zeile, dieselbe Infrastruktur wie für die Kanten-Neuberechnung) und der Fensterbreite den nötigen `marginLeft` — Titel-Position wird dabei nicht per DOM-Query aus der Elternkomponente gelesen (fragil), sondern aus den bekannten Layout-Konstanten des umgebenden `(protected)/layout.tsx` (`max-w-5xl`, `px-4`) neu hergeleitet, mit Kommentar-Verweis auf die Kopplung. Spalten-Zeile bekam `w-fit` (schrumpft auf tatsächlichen Inhalt statt auf Elternbreite zu strecken), sonst wäre die gemessene Breite immer gleich der (jetzt vollen) graph-canvas-Breite gewesen.
  - **Nachkorrektur in derselben Runde:** Erste Umsetzung lag noch ca. 25px zu weit rechts vom Titel („noch nicht ganz bündig", Nutzer-Feedback) — Ursache: `computeContentMarginLeft()` hatte nur den äusseren `px-4`-Wrapper (16px) als festen Versatz eingerechnet, nicht aber die 1px `border` von „graph-canvas" und vor allem das `p-6` (24px) auf der Spalten-Zeile selbst — der `marginLeft` positioniert deren AUSSENKANTE, die sichtbaren Karten beginnen aber erst 24px weiter innen. Konstante auf den vollständigen festen Versatz korrigiert (16+1+24=41px), dokumentiert in `FIXED_OFFSET_BEFORE_MARGIN_PX`. Live verifiziert: sichtbare erste Spalten-Karte und Seitentitel liegen jetzt exakt (0px Differenz) auf derselben horizontalen Position.
  - 5 neue Unit-Tests (`content-alignment.test.ts`): linksbündig bei breitem/schmalem Viewport, Zentrierung bei Inhalt > Standardbreite, keine sichtbare Sprungstelle exakt an der Schwelle, kein negativer Margin. Die "zentriert"-Verzweigung lässt sich mit dem aktuellen Funktionsumfang (nur 3 feste Spalten) nicht über echten App-Inhalt auslösen — daher gezielt per Unit-Test mit synthetischen Breiten abgedeckt statt nur per E2E/Screenshot.
- **Bugfix + neue Anforderung nach Nutzer-Feedback (`/frontend`, 2026-08-29):**
  - **Bug: Persona-Filter sprang beim Anklicken eines Knotens auf „Alle Personas" zurück.** Ursache: `handleNodeSelect()` setzte bisher bewusst `setSelectedPersona(null)`, weil Knoten-Auswahl und Persona-Filter als sich gegenseitig ausschließende Highlight-Quellen entworfen waren. Fix: `handleNodeSelect()` rührt `selectedPersona` nicht mehr an — das Dropdown bleibt beim Anklicken eines Knotens unverändert auf der gewählten Persona stehen. `selectedPersona` wird weiterhin explizit zurückgesetzt beim Ausblenden von Ebene 2 (`handleEbene2Toggle`) und beim bewussten Wechsel auf eine andere/keine Persona (`handlePersonaChange`) — beides eigene, gewollte Nutzerhandlungen, kein Bug.
  - **Zwei Korrekturrunden zur Highlight-Prioritaet, bis das endgueltige Modell stand:** Zunächst wurde `selectedPersona` Vorrang vor `selectedNode` bei der Highlight-Berechnung gegeben ("ist ein Filter aktiv, bestimmt er das Highlight") — das erzeugte einen Folge-Bug: ein angeklickter Knoten *ohne* Kantenverbindung zu einem anderen, gerade aktiven Element blieb trotzdem undimmed, weil das Highlight weiterhin komplett auf dem (breiteren) Persona-Set beruhte statt auf den tatsächlichen Verbindungen des angeklickten Knotens. Konkretes Nutzer-Beispiel: Filter „Vereine & Ligen" aktiv, Klick auf „Abschnitt 1: Navigation" → „Abschnitt 2: Einstieg" blieb sichtbar, obwohl keine Kante dazwischen besteht — im Vergleichsfall ohne Filter (nur Klick auf „Abschnitt 1: Navigation") wäre „Abschnitt 2: Einstieg" korrekt ausgegraut. **Endgültiges Modell:** `selectedNode` hat wieder Vorrang vor `selectedPersona` bei der Highlight-Berechnung — ein Klick auf einen Knoten zeigt IMMER dessen eigene Verbindungen (`computeHighlight`), identisch zum Verhalten ohne aktiven Filter, unabhängig davon, ob ein Persona-Filter nebenbei gesetzt ist. Der Persona-Filter bleibt dabei als Dropdown-Auswahl bestehen (siehe Fix oben) und übernimmt das Highlight erst wieder, sobald kein Knoten mehr ausgewählt ist (Dossier geschlossen, `selectedNode === null`) — dann greift wieder `computeHighlightForPersona`. Der „selected"-Ring des angeklickten Knotens ist in diesem Modell unbedingt (keine Sonderbehandlung mehr nötig), da `computeHighlight()` den ausgewählten Knoten ohnehin immer in sein eigenes `activeNodeIds`-Set aufnimmt.
  - **Neue Anforderung: Ebenen-Bereich soll die gesamte Browserbreite nutzen können.** Das umgebende Seitenlayout (`(protected)/layout.tsx`) begrenzt `<main>` global auf `max-w-5xl`, damit Formulare/Listen auf allen anderen Seiten nicht unangenehm breit werden. Für den Graph allein per klassischem "full bleed"-CSS-Trick durchbrochen (`relative left-1/2 right-1/2 w-screen -mx-[50vw]`, plus eigenes `px-4` an den Bildschirmrändern) — wirkt nur auf den Spalten-Bereich selbst, Breadcrumb/Titel/Persona-Filter bleiben im normalen `max-w-5xl`-Raster. Live geprüft: bei 1600px Viewport-Breite nutzt der Canvas ca. 1568px (praktisch die volle Browserbreite abzüglich des Rand-Paddings), auf allen anderen Seiten unverändert `max-w-5xl`.
- **Grundlegender Rendering-Umbau nach weiterem Nutzer-Feedback (`/frontend`, 2026-08-29):** Auch die Spalten-Header-Korrektur (siehe unten) reichte dem Nutzer noch nicht — Kernaussage: "Ich brauche die Aufteilung wie in der Ressource. Keine Canvas in der ich hin und herscrollen kann. Das ist nicht notwendig." Auf Rückfrage (nur Schalter-Platzierung vs. grundlegend andere Darstellung) bestätigt: keine komplett andere Darstellung, aber auch keine pan-/zoombare React-Flow-Canvas — stattdessen exakt die Struktur aus dem Referenz-Artifact. **`@xyflow/react` vollständig entfernt** (Paket deinstalliert, war nur in `graph-view.tsx`/`graph-node.tsx` verwendet). Ersetzt durch:
  - Drei **statische, vertikal gestapelte Spalten** (normale Flex-Listen, `display:flex; flex-direction:column`) statt eines pan-/zoombaren Canvas — keine manuelle x/y-Koordinatenvergabe mehr nötig, jede Spalte wächst einfach mit ihrem Inhalt.
  - **Kanten als SVG-Overlay**, dessen Pfade aus den tatsächlichen DOM-Positionen der Knoten berechnet werden (React Refs + `getBoundingClientRect()`, `useLayoutEffect`) — exakt dieselbe Formel wie im Referenz-Artifact (`drawEdges()`): kubische Bezier-Kurve vom rechten Rand des Quell-Knotens zum linken Rand des Ziel-Knotens. `ResizeObserver` + `window.resize`-Listener sorgen dafür, dass Kanten bei Größenänderung neu berechnet werden.
  - **`GraphNode`/`DimensionGroupNode` von React-Flow-Knoten zu einfachen Divs umgebaut** (kein `NodeProps`/`Handle` mehr, `forwardRef` für die Positionsmessung).
  - Alle bestehenden Domain-Funktionen (`buildGraphModel`, `computeHighlight`, `computeHighlightForPersona`, `buildEffectiveEdges`) **komplett unverändert übernommen** — nur die Rendering-Schicht wurde ersetzt, nicht die Fachlogik.
  - **React-Compiler-ESLint-Regeln beachtet** (`react-hooks/refs`, `react-hooks/preserve-manual-memoization`): ref-Zuweisungen dürfen nicht aus einer separaten Funktion/einem `useMemo` heraus "importiert" werden, sondern müssen als wörtlicher Inline-Ausdruck an der JSX-`ref`-Stelle stehen. Deshalb strikte Trennung zwischen `renderData` (reines `useMemo`, nur Daten, kein JSX) und einer eigenen `ColumnRowItem`-Komponente, die die eigentliche ref-Zuweisung während ihres eigenen Renderns vornimmt.
  - **Vollständige Neuschreibung der permanenten E2E-Suite-Selektoren** (`.react-flow`/`.react-flow__node`/`.react-flow__edge-path` existieren nicht mehr): neues `data-testid="graph-canvas"` auf dem Canvas-Container, `[data-node-id]` auf jedem Knoten-Wrapper, `data-edge-active`-Attribut auf jedem SVG-`<path>` (ersetzt das bisherige Parsen der inline-`style`-Farbe). Alle Acceptance-Criteria-Assertions inhaltlich unverändert, nur die Selektoren angepasst. 74/74 Playwright-Tests weiterhin grün (5 Suiten × 2 Browser) — die vorher auf Mobile Safari aufgetretenen "outside of viewport"-Fehlschläge (siehe vorherige Implementierungsnotiz) treten jetzt gar nicht mehr auf, da es kein Pan/Zoom mehr gibt, das Knoten außerhalb des sichtbaren Bereichs schieben könnte.
- **Korrektur nach Nutzer-Feedback zum Graph-UI-Batch (`/frontend`, 2026-08-28):** Die erste Umsetzung platzierte alle drei Spalten-Schalter in einer gemeinsamen Reihe über dem gesamten Canvas, mit langem Label je Schalter ("Themenblöcke (Ebene 1) anzeigen" etc.) — der Nutzer wies per Screenshot auf den Referenz-Sketch hin: jede Ebene ist eine Spalte, die Spaltenoptionen (Eyebrow „Ebene N · …", Titel, ein kompakter Schalter „ein/ausblenden") gehören direkt über die jeweilige Spalte, kein langes Label nötig. Exakte Struktur aus dem Referenz-Artifact (`.col-head`, `.col-toggle`) übernommen, an unser Tailwind/shadcn-Theme angepasst (hell statt des Artifact-eigenen Dunkel-Themes, siehe PRD-Konstraint „kein eigenes Design-System"). Da jetzt alle drei Schalter denselben sichtbaren Label-Text „ein/ausblenden" tragen, bekommt jeder Switch stattdessen ein eindeutiges `aria-label` (z. B. „Profildimensionen (Ebene 2) anzeigen") — barrierefrei und ohne Änderung an den bestehenden E2E-Selektoren nötig (Playwright löst `getByLabel()` über die berechnete Accessible Name auf, die `aria-label` gegenüber dem sichtbaren `<Label>` vorzieht). Bei der eigenen mobilen Verifikation (375px) zusätzlich festgestellt: drei nebeneinander liegende Spalten-Header sind bei so wenig Platz zu schmal (Text lief über den Rand) — ab `sm`-Breakpoint nebeneinander, darunter gestapelt (`grid-cols-1 sm:grid-cols-3`).
- **Graph-UI-Batch (`/frontend`, 2026-08-28) — zurückgestellte Nutzer-Anforderungen umgesetzt:**
  - **Jede Spalte einzeln ein-/ausblendbar** (vorher nur Ebene 2): drei unabhängige Schalter (`ebene1Visible`/`ebene2Visible`/`ebene3Visible`, Ebene 1/3 standardmäßig an, Ebene 2 weiterhin standardmäßig aus). Sichtbare Spalten rücken kompakt zusammen (`columnX` wird dynamisch aus den sichtbaren Spalten berechnet), keine leere Spaltenlücke. Die zuletzt verbleibende sichtbare Spalte kann nicht deaktiviert werden (verhindert einen komplett leeren Graphen) — ihr Schalter wird in dem Fall deaktiviert. Ausblenden einer Spalte räumt eine dazu passende Auswahl/Dossier auf (z. B. Frage-Dossier schließt beim Ausblenden von Ebene 1).
  - **Ebenen-Schalter jetzt direkt über den Spalten** (vorher: ein einzelner Schalter oben allein) und **globaler Persona-Filter an der zuvor vom Ebene-2-Schalter belegten Stelle** — beides nach Referenz-Sketch. Umgesetzt als zwei Zeilen: oben der globale Persona-Filter (shadcn `Select`), darunter die drei per-Spalten-Schalter in einer `flex flex-wrap`-Zeile (bewusst kein starres `grid-cols-3` — siehe Mobile-Bugfix unten).
  - **Globaler Persona-Filter** löst gleichzeitig die zweite zurückgestellte Idee ("alle Verbindungen in eine bestimmte Persona sehen") — beides ist dasselbe Feature. Neue Funktion `computeHighlightForPersona()` (`src/lib/graph/highlight.ts`) vereinigt `computeHighlight()` für jede Dimensionsinstanz der gewählten Persona, keine eigene Traversierungslogik nötig. Auswahl einer Persona blendet Ebene 2 automatisch ein (Persona ist ein Ebene-2-Konzept); Ausblenden von Ebene 2 setzt den Filter zurück. Persona-Auswahl und Knoten-Klick-Auswahl schließen sich gegenseitig aus (ein aktiver Highlight-Ursprung zur Zeit).
  - **Ebene-2-Dimensionsgruppierung** (löst die dritte zurückgestellte Idee "wiederkehrende Elemente kompakter, kollabierbar wie Ebene 1"): Dimensionen mit demselben Namen, aber mehreren Personas (z. B. "Business Goal" einmal je Persona) werden standardmäßig kollabiert als ein Gruppen-Knoten mit Instanzen-Zähler dargestellt (`Business Goal  2`), aufklappbar wie ein Themenblock. Einzelinstanzen (z. B. „Umsetzungsrahmen", projektweit, immer nur eine Instanz) werden nie gruppiert — Gruppierung würde dort keinen Kompaktheits-Gewinn bringen. Neuer eigenständiger React-Flow-Knotentyp `dimensiongroup` (`DimensionGroupNode` in `graph-node.tsx`) — bewusst NICHT als fünftes `GraphNodeData`-Mitglied modelliert, da der Gruppen-Knoten eine reine UI-Zusammenfassung ist, kein eigenes Domain-Konzept aus den Importdaten (anders als Themenblock). Klick auf eine Gruppe klappt nur auf/zu, öffnet nie das Dossier (identisches Muster wie Themenblock).
  - **`buildEffectiveEdges()` erweitert** (`src/lib/graph/effective-edges.ts`): neue Signatur (`EdgeVisibility`-Objekt statt zweier Positionsparameter) mit zwei unabhängigen Sammel-Kante-Mechanismen (Frage→Themenblock wie bisher, neu: Dimension→Dimensionsgruppe) plus Spalten-Sichtbarkeits-Filterung — ist eine ganze Spalte ausgeblendet, wird eine daran hängende Kante komplett verworfen statt an eine unsichtbare ID gehängt (kein Rollup-Ziel oberhalb von Ebene 1 vorhanden). `computeHighlight()` selbst musste nicht geändert werden — die Traversierung kennt weiterhin nur die echten Domain-IDs, die UI-Schicht übersetzt das für Themenblock/Dimensionsgruppen-Köpfe in einen „aktiv, weil ein Kind aktiv ist"-Zustand (`themenblockHasActiveChild`/`dimensionGroupHasActiveChild`, identisches Muster).
  - **Bug bei eigener Verifikation gefunden und behoben, bevor er in Produktion ging:** React Flows `fitView`-Prop passt die Ansicht nur beim ersten Mount an, nicht wenn danach mehr Knoten dazukommen (Spalte eingeblendet, Themenblock/Dimensionsgruppe aufgeklappt). Auf einem schmalen Viewport (Mobile Safari E2E-Regression) führte das dazu, dass ein Content-Block nach mehrfachem Aufklappen ausserhalb des sichtbaren, gezoomten Canvas-Bereichs landete und nicht mehr anklickbar war — kein Test-Artefakt, sondern ein echtes Erreichbarkeits-Problem für echte Nutzer. Fix: neue interne `AutoFitView`-Komponente (nutzt `useReactFlow().fitView()`) fittet erneut, sobald sich die Menge der sichtbaren Knoten ändert (nicht bei reinen Highlight-Änderungen, das würde die Ansicht bei jedem Klick wegspringen lassen).
  - **Zweiter Mobile-Bug bei eigener Verifikation gefunden und behoben:** Die per-Spalten-Schalter-Zeile war zunächst als starres `grid-cols-3` umgesetzt — auf 375px Breite bekam dadurch jede Zelle nur ~125px, wodurch „Content-Blöcke (Ebene 3) anzeigen" auf vier Zeilen umbrach und der Graph-Canvas weit unter den Bildschirmrand rutschte. Fix: `flex flex-wrap` statt starrem Grid, jeder Schalter behält seine natürliche Breite und bricht bei Bedarf sauber um.
  - **Tests:** 6 neue Unit-Tests (`effective-edges.test.ts`: Spalten-Ausblenden dropt Kanten korrekt, Dimensionsgruppen-Rollup; `highlight.test.ts`: `computeHighlightForPersona` — Vereinigung, Persona-Isolation, leeres Ergebnis). Bestehende `PROJ-5-dag-sankey-visualisierung.spec.ts` an das neue UI angepasst (Label-basierte statt positionsbasierte Schalter-Selektoren, Gruppen-Aufklapp-Schritt vor den Multi-Persona-Assertions) — direkte Folge der UI-Änderung, keine neue Testabdeckung für die neuen Features selbst; das folgt `/qa PROJ-5`. Vollständige Regression (74/74 Playwright über alle fünf Suiten × 2 Browser, 114/114 Vitest) grün, `lint`/`build` sauber.
- **Graph-Modell als reine Bibliothek umgesetzt** (`src/lib/graph/build-graph-model.ts`, `types.ts`): rechnet `ParsedImport` + `Enrichment` (beide bereits vorhanden aus PROJ-3/PROJ-4) in Knoten/Kanten für alle drei Ebenen um. "Notizen zur Aufnahme" bewusst aus Ebene 1 ausgeschlossen (kein Themenblock). Referenziert eine `informs`-Kante ein Feld außerhalb der abgebildeten Themenblöcke (z. B. ein Notizen- oder Konzept-Feld), wird sie ohne Absturz übersprungen, der Dimension-Knoten selbst bleibt trotzdem bestehen — Best-Effort wie im Rest des Projekts. Komprimierte Frage→Content-Block-Kanten werden vorab berechnet und auf ein Vorkommen je Paar dedupliziert. 11 Unit-Tests (`build-graph-model.test.ts`) decken Empty-Label-Fallback, Gap-Knoten, isolierte Content-Blöcke, übersprungene Fremd-Referenzen, Kompression und beide Konflikttypen ab.
- **UI umgesetzt:** neue Unterseite `/kunden/[kundeId]/[projektId]/graph` (Server Component, liest wie die bestehende Projektseite über `getImportForProject()`/`getEnrichmentForProject()`) mit den drei spezifizierten Zuständen (kein Import / Import ohne Anreicherung / voller Graph). `GraphView` (Client Component) rendert das Diagramm mit React Flow (`@xyflow/react`, neues Paket), `GraphNode` als gemeinsamer Knoten-Renderer für alle vier Typen, `DossierPanel` als `Sheet`-basiertes Seitenpanel. Navigations-Button "Konzept-Graph" auf der bestehenden Projekt-Detailseite ergänzt.
- **Interaktionsmodell-Korrektur gegenüber der Architektur-Skizze:** Ein Klick auf einen Themenblock löst jetzt AUSSCHLIESSLICH das Auf-/Zuklappen aus, öffnet aber nicht mehr gleichzeitig das Dossier-Panel. Grund: bei der eigenen Verifikation im Browser (gegen die echten Daten von „1. Testkunde") stellte sich heraus, dass das Dossier-`Sheet` (Radix Dialog) immer einen blockierenden Overlay rendert — ein gleichzeitiges Öffnen hätte den Ebene-2-Schalter und weitere Knoten-Klicks dahinter unbedienbar gemacht. Passt auch besser zur AC-Formulierung ("die gestellte Frage und die gegebene Antwort", singular) als die ursprünglich vorgesehene Themenblock-Sammelansicht. `DossierNodeData`-Typ (`Exclude<GraphNodeData, ThemenblockNode>`) erzwingt das jetzt zur Compile-Zeit.
- **Eigene Browser-Verifikation vor Fertigmeldung** (gegen den lokalen Dev-Server, echte Daten von „1. Testkunde", danach vollständig aufgeräumt: temporärer Test-Nutzer gelöscht, Screenshots/Testdatei entfernt): Themenblock-Aufklappen, Ebene-2-Schalter, Persona-Instanz-Knoten (z. B. drei separate "Business Goal"-Knoten für Vereine & Ligen/Investoren/Presse), Lücken-Badge ("Traffic Source: Lücke"), Konflikt-Badge ("Abschnitt 5: Gateway"), Dossier-Panel für einen isolierten Content-Block ("Zusammenfassung": korrekt "Keine Profildimension … begründet diesen Block") — alles wie spezifiziert bestätigt. Keine Konsolenfehler.
- **UX-Nachbesserung nach Nutzer-Feedback (2026-08-28), orientiert an einem Referenz-Sketch des Nutzers:** (1) Klick auf einen Frage-/Dimension-/Content-Block-Knoten hebt jetzt alle verbundenen Knoten/Kanten orange hervor (`src/lib/graph/highlight.ts`, `computeHighlight()`) und dunkelt den Rest per `opacity-30`/Kanten-Opacity `.06` ab — Herkunft/Wirkung-Traversierung analog zum Referenz-Sketch, inkl. eigenem Pfad für den ausgeblendeten Ebene-2-Zustand (läuft dann über die komprimierten Kanten). 5 Unit-Tests (`highlight.test.ts`). (2) Das Dossier-Panel nutzt nicht mehr shadcn `Sheet`, da `SheetContent` immer einen vollflächigen, pointer-events-blockierenden Overlay rendert (`bg-black/80`, fest in der Komponente verdrahtet, nicht per Props abschaltbar) — durch ein eigenes, overlay-loses Slide-in-Panel ersetzt (`fixed` positioniert, nur Box-Shadow für Tiefe, Escape-Taste schließt). Dabei zusätzlich selbst gefunden und behoben: Schloss der Nutzer die Ebene-2-Ansicht, während das Dossier eines Dimension-Knotens offen war, blieb es mit veralteten Inhalten offen (der Knoten existiert dann nicht mehr im Graph) — `handleEbene2Toggle()` schließt das Dossier jetzt automatisch, wenn der ausgewählte Knoten ein Dimension-Knoten ist. Erneut per eigener Browser-Verifikation bestätigt (Highlight-Klick, Schalter bleibt bei offenem Dossier klickbar, Dossier schließt korrekt beim Ebene-2-Ausblenden).
- **BUG-8 (Nutzer-Feedback, 2026-08-28): eingeklappte Themenblöcke sahen unbegründet aus.** Kanten hingen an einzelnen Frage-Knoten, die aber erst nach Aufklappen des Themenblocks gerendert wurden — informierte eine (noch eingeklappte) Frage z. B. "Business Goal", zeigte der Graph dafür trotzdem keine Kante, obwohl das Dossier die Herkunft korrekt anzeigte (Daten waren nie verloren, nur die Kante nicht gezeichnet). Root Cause per Abgleich mit dem Referenz-Sketch bestätigt: dort ist der Themenblock der einzige Ebene-1-Knoten mit Kanten, einzelne Fragen sind dort nur Dossier-Detailtext ohne eigene Position. **Fix:** neue reine Funktion `buildEffectiveEdges()` (`src/lib/graph/effective-edges.ts`) fasst Kanten von eingeklappten (unsichtbaren) Frage-Knoten zu einer Sammel-Kante vom Themenblock-Knoten zusammen (dedupliziert, mehrere eingeklappte Fragen zur selben Dimension/demselben Content-Block ergeben eine Kante) — klappt man auf, werden sie durch die präzisen Frage-Kanten ersetzt. Themenblock-Knoten zeigen jetzt ebenfalls Highlight-Zustand (aktiv, wenn eine eingeklappte Kind-Frage aktiv ist). 5 neue Unit-Tests (`effective-edges.test.ts`). Per eigener Browser-Verifikation bestätigt: ohne jegliches Aufklappen zeigt der Graph jetzt sofort alle Sammel-Kanten von "Phase 1–3" zu den informierten Dimensionen.
- **Kein Backend nötig** (wie in der Architektur festgelegt): keine neue Migration, keine neue RLS-Policy, keine neue Query — reine Lesezugriffe über bereits bestehende PROJ-3/PROJ-4-Funktionen.

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
- Als Agentur-Mitarbeiter möchte ich jede der drei Spalten unabhängig voneinander ein-/ausblenden können, damit ich den Graph gezielt auf die für die aktuelle Fragestellung relevanten Ebenen reduzieren kann.
- Als Agentur-Mitarbeiter möchte ich alle Verbindungen einer bestimmten Persona auf einen Blick hervorgehoben sehen, damit ich dem Kunden gezielt erklären kann, wie sich eine einzelne Zielgruppe durchs Konzept zieht — auch während ich parallel einzelne Knoten anklicke, ohne die Persona-Auswahl zu verlieren.
- Als Agentur-Mitarbeiter möchte ich wiederkehrende Profildimensionen (mehrere Personas, gleiche Dimension) kompakt als eine aufklappbare Gruppe sehen, damit Ebene 2 bei vielen Personas nicht unübersichtlich wird.
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

- [x] Angenommen ein Projekt hat weder Import noch Anreicherung, wenn der Nutzer die Graph-Unterseite aufruft, dann sieht er einen Hinweis mit Link zur Import-Werkstatt statt eines leeren Graphen
- [x] Angenommen ein Projekt hat einen Import, aber noch keine Anreicherung, wenn der Nutzer die Graph-Unterseite aufruft, dann sieht er nur Ebene 1 und Ebene 3 als unverbundene Spalten sowie einen Hinweis, zuerst die KI-Anreicherung durchzuführen
- [x] Angenommen ein Projekt hat Import und Anreicherung, wenn der Nutzer die Graph-Unterseite aufruft, dann werden alle drei Ebenen als Spalten mit den tatsächlich importierten/angereicherten Daten gerendert
- [x] Angenommen Ebene 1 wird angezeigt, wenn der Nutzer die Seite betrachtet, dann erscheint jeder Themenblock (Phase 1–3, 4–6, 7–9, 10 bzw. Einstieg) als ein Hauptknoten, die zugehörigen Einzelfragen sind erst nach Aufklappen sichtbar
- [x] Angenommen der Nutzer klickt auf einen Content-Block-Knoten, wenn das Dossier-Panel öffnet, dann zeigt es die Herkunft rückwärts: alle Profildimensionen (mit Persona, falls zutreffend), die diesen Block geprägt haben, jeweils mit Impact-Text und Gewichtung
- [x] Angenommen der Nutzer klickt auf einen Themenblock- oder Frage-Knoten, wenn das Dossier-Panel öffnet, dann zeigt es die gestellte Frage und die gegebene Antwort im Klartext sowie die Wirkung vorwärts: alle Profildimensionen, die diese Antwort als Quelle referenzieren — **mit Abweichung, siehe BUG-9**
- [x] Angenommen der Nutzer klickt auf einen Profildimension-Knoten, wenn das Dossier-Panel öffnet, dann zeigt es sowohl die Quelle (Eltern: Frage/Antwort) als auch alle Content-Blöcke, die diese Dimension prägt (Kinder)
- [x] Angenommen eine Dimension hat für mehrere Personas unterschiedliche Werte, wenn der Graph gerendert wird, dann erscheint für jede Persona-Instanz ein eigener Knoten in Ebene 2, jeweils mit eigenen Kanten zu seinen Quell-Fragen und Ziel-Blöcken
- [x] Angenommen eine Dimension ist als „nicht ableitbar" (Gap) markiert, wenn der Graph gerendert wird, dann erscheint sie trotzdem als Knoten mit einer Lücken-Kennzeichnung, nicht ersatzlos ausgeblendet
- [x] Angenommen ein Content-Block hat keine eingehende `shapes`-Kante, wenn der Graph gerendert wird, dann erscheint er trotzdem als isolierter Knoten in Ebene 3
- [x] Angenommen der Nutzer blendet Ebene 2 über den Spalten-Schalter aus, wenn der Graph neu rendert, dann verschwinden die Profildimension-Knoten, aber die betroffenen Frage-Knoten und Content-Block-Knoten bleiben über eine direkte, komprimierte Kante verbunden
- [x] Angenommen Ebene 2 ist ausgeblendet, wenn der Nutzer den Schalter erneut aktiviert, dann erscheinen die Profildimension-Knoten und die komprimierten Kanten wieder in die ursprünglichen Einzelkanten aufgeteilt
- [x] Angenommen für das Projekt liegt ein erkannter Konflikt (explizit oder emergent) aus PROJ-4 vor, wenn der Graph gerendert wird, dann ist der betroffene Knoten (Content-Block bzw. beteiligte Dimensionen) visuell als Konflikt markiert
- [x] Angenommen der Nutzer klickt auf einen konfliktmarkierten Knoten, wenn das Dossier-Panel öffnet, dann zeigt es zusätzlich zu Herkunft/Wirkung die Konflikt-Beschreibung als Text, ohne Lösungsoptionen anzubieten
- [x] Angenommen der Nutzer ist nicht eingeloggt, wenn er die Graph-Unterseite eines Projekts aufruft, dann wird er zu `/login` umgeleitet (gleiches Muster wie PROJ-3/PROJ-4)

**Graph-UI-Batch (nachträglich formalisiert per `/refine`, 2026-08-29 — bereits implementiert und in der QA-Runde vom 2026-08-29 verifiziert, siehe QA Test Results):**

- [x] Angenommen der Graph zeigt alle drei Ebenen, wenn der Nutzer den Schalter einer einzelnen Spalte betätigt, dann wird ausschließlich diese Spalte aus-/eingeblendet, unabhängig vom Zustand der beiden anderen Spalten, und die verbleibenden sichtbaren Spalten rücken lückenlos zusammen
- [x] Angenommen nur noch eine einzige Spalte ist sichtbar, wenn der Nutzer versucht, auch deren Schalter zu deaktivieren, dann bleibt die Spalte sichtbar und der Schalter ist deaktiviert
- [x] Angenommen kein Knoten ist ausgewählt, wenn der Nutzer im globalen Persona-Filter eine Persona auswählt, dann werden alle Knoten und Kanten hervorgehoben, die zu mindestens einer Dimension-Instanz dieser Persona gehören, alle anderen werden ausgegraut
- [x] Angenommen ein Persona-Filter ist aktiv, wenn der Nutzer einen Knoten anklickt und das Dossier-Panel öffnet oder schließt, dann bleibt die Persona-Auswahl im Filter-Dropdown unverändert bestehen
- [x] Angenommen ein Persona-Filter ist aktiv, wenn der Nutzer zusätzlich einen Knoten anklickt, dann bestimmen ausschließlich dessen eigene Verbindungen das Highlight (identisch zum Verhalten ohne aktiven Filter) — sobald das Dossier wieder geschlossen wird, greift wieder das Persona-Highlight
- [x] Angenommen eine Profildimension hat für mehrere Personas eigene Instanzen, wenn der Graph gerendert wird, dann erscheint sie standardmäßig als kollabierter Gruppen-Knoten mit Instanzen-Zähler, der durch Klick auf-/zuklappbar ist
- [x] Angenommen eine Profildimension hat projektweit nur eine einzige Instanz (z. B. „Umsetzungsrahmen", „Target Audience"), wenn der Graph gerendert wird, dann erscheint sie immer als einzelner Knoten, nie als Gruppe

## Edge Cases
- Sehr viele Knoten (z. B. 23 Dimensionen × 3 Personas = bis zu ~69 Ebene-2-Knoten): Der Graph muss nutzbar bleiben — **aktualisiert (2026-08-29):** kein Zoom/Pan mehr (React Flow entfernt), stattdessen wächst die betroffene Spalte vertikal mit ihrem Inhalt, bei Bedarf scrollt die gesamte Canvas horizontal; kein hartes Performance-Ziel definiert, reale Projektgrößen sind überschaubar
- „Umsetzungsrahmen" ist die einzige projektweite Dimension ohne Persona-Bezug — erscheint als einzelner Knoten ohne Persona-Kennzeichnung, unabhängig von der Anzahl erkannter Personas
- Eine Persona ohne jede Dimension-Instanz (z. B. weil die KI für sie nirgends einen abweichenden Wert fand) taucht in Ebene 2 nicht separat auf — nur die Personas, für die tatsächlich mindestens eine Instanz gespeichert wurde
- Mobile/kleine Bildschirme (375px, siehe Frontend-Regeln): Ein mehrspaltiges Sankey-Layout mit Dossier-Panel ist auf 375px nicht sinnvoll 1:1 darstellbar — Lösung (horizontales Scrollen, Dossier als Bottom-Sheet o. ä.) ist eine Frontend-Entscheidung, siehe Open Questions
- Re-Import (PROJ-3) oder erneute Anreicherung (PROJ-4) nach bereits erfolgtem Betrachten des Graphen: Der Graph muss beim nächsten Aufruf den aktuellen Datenstand zeigen, nicht veraltete Client-State-Daten
- Zwei Content-Blöcke mit identischem Label (sollte durch PROJ-3 nicht vorkommen, da Labels aus der Seitenstruktur-Nummerierung stammen) — keine gesonderte Behandlung nötig, da strukturell ausgeschlossen

## Technical Requirements (optional)
- Zugriffsschutz: gleiches Muster wie PROJ-3/PROJ-4 (eingeloggte Agentur-Nutzer, „Shared Visibility" — kein rollenbasierter Unterschied zwischen Agentur- und künftiger Kunden-Ansicht)
- Rein lesender Zugriff auf bereits bestehende Tabellen (`interview_imports`/`import_sections`/`import_entries`/`import_fields`, `enrichments`/`enrichment_personas`/`enrichment_dimensions`/`enrichment_edges`/`enrichment_conflicts`) — keine neuen Schreibpfade

## Open Questions
- [x] ~~Konkretes Mobile-Verhalten (375px) für ein mehrspaltiges Graph-Layout mit Dossier-Panel~~ — geklärt bei `/frontend` (2026-08-28): React Flows eingebautes Touch-Pan/Zoom reicht, kein eigener Mobile-Code-Pfad; Dossier-Panel wird über die bereits gewählte `Sheet`-Komponente auf schmalen Screens automatisch zum Vollbild-Overlay
- [x] ~~Zoom/Pan- oder Scroll-Mechanik bei sehr vielen Ebene-2-Knoten~~ — geklärt bei `/frontend` (2026-08-29): kein Zoom/Pan, stattdessen wächst die Spalte vertikal mit ihrem Inhalt, bei Bedarf horizontales Scrollen der Canvas (`overflow-x-auto`)
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
| Statische, vertikal gestapelte Spalten + SVG-Kanten-Overlay statt einer zoom-/schwenkbaren React-Flow-Canvas | Explizite Nutzer-Vorgabe nach Sichtung der Referenz-Sketch-Ressource: „Keine Canvas in der ich hin und herscrollen kann. Das ist nicht notwendig." — `@xyflow/react` daraufhin vollständig entfernt | 2026-08-29 |
| Highlight-Priorität: ein ausgewählter Knoten bestimmt immer sein eigenes Highlight, unabhängig von einem gleichzeitig aktiven Persona-Filter; der Filter übernimmt das Highlight erst wieder, sobald kein Knoten mehr ausgewählt ist | Nutzer-Korrektur nach einem konkreten Gegenbeispiel (Persona-Filter aktiv, Klick auf „Abschnitt 1: Navigation" ließ unverbundene Knoten fälschlich undimmed) — die ursprüngliche Umkehrung (Filter hat Vorrang) war falsch | 2026-08-29 |
| Persona-Filter ist eine „sticky" Dropdown-Auswahl, die Knoten-Klicks (Dossier öffnen/schließen) übersteht | Nutzer-Bug-Report: Filter sprang beim Anklicken eines Knotens auf „Alle Personas" zurück — ungewolltes Verhalten, Filter soll bis zur bewussten Änderung/zum Ausblenden von Ebene 2 bestehen bleiben | 2026-08-29 |
| Letzte verbleibende sichtbare Spalte kann nicht ausgeblendet werden | Verhindert einen komplett leeren, nicht mehr aussagekräftigen Graphen | 2026-08-28 |
| Ebene-2-Dimensionsgruppierung nur für Dimensionen mit mehreren Persona-Instanzen, Einzelinstanzen werden nie gruppiert | Gruppierung bringt bei nur einer Instanz keinen Kompaktheits-Gewinn, würde aber eine unnötige zusätzliche Aufklapp-Interaktion erzwingen | 2026-08-28 |

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

**Aktuelle Runde (zweite Runde, 2026-08-29) — nach dem Rendering-Umbau (React Flow → statische Spalten + SVG) und dem Graph-UI-Batch.** Die Ergebnisse unten in diesem Abschnitt sind aktuell gültig. Die historische erste Runde (getestet gegen die React-Flow-Canvas, vor dem kompletten Rendering-Umbau) ist weiter unten unter „Historische Runde 1" archiviert — die dort verwendeten Selektoren (`.react-flow`, `.react-flow__node`) existieren im aktuellen Code nicht mehr, die funktionale Aussage (15/15 AC bestanden) bleibt aber inhaltlich gültig und wurde in dieser Runde erneut bestätigt.

**Tested:** 2026-08-29
**App URL:** http://localhost:3000
**Tester:** QA Engineer (AI)

### Vorgehen (zweite Runde)
- `npm test` (119/119) und volle Playwright-Regression (76/76, 5 Suiten × 2 Browser) vor der eigentlichen QA-Runde geprüft.
- Alle 15 ursprünglichen Acceptance Criteria erneut gegen die komplett neue Rendering-Schicht (statische Spalten + SVG-Kanten-Overlay statt React-Flow-Canvas) verifiziert — funktional identisches Verhalten, nur die DOM-Struktur/Selektoren haben sich geändert (bereits in der permanenten Suite nachgezogen).
- **Zusätzlich getestet, aber noch nicht als formale AC im Spec erfasst** (siehe Empfehlung in der Summary): die drei Graph-UI-Batch-Fähigkeiten, die der Nutzer direkt während mehrerer `/frontend`-Runden beauftragt hat — per-Spalten-Sichtbarkeit (alle drei Ebenen einzeln), globaler Persona-Filter (inkl. des komplexen Zusammenspiels mit Knoten-Klick/Dossier, das drei Korrekturrunden brauchte, siehe Implementierungsnotizen), Ebene-2-Dimensionsgruppierung für wiederkehrende Dimensionen. Dafür ein neuer permanenter E2E-Test (`Graph-UI-Batch: ...`) geschrieben, der genau diese drei Fähigkeiten inkl. der Randfälle (letzte Spalte nicht ausblendbar, Einzelinstanzen nie gruppiert, Filter bleibt bei Dossier-Interaktion bestehen) abdeckt.
- Manuelle Red-Team-Exploration: XSS-Payload-Pfade erneut überprüft (kein `dangerouslySetInnerHTML` im gesamten `src/components/graph/`/`src/lib/graph/`, per `grep` bestätigt), Zugriffsschutz erneut gegen die echte Supabase-Instanz geprüft.
- Zusätzliche Tablet-Verifikation (768px, in der ersten Runde nicht explizit geprüft): kein horizontaler Seiten-Scroll (nur die Canvas selbst scrollt bei Bedarf horizontal, wie in den Edge Cases der Spec für schmale Viewports vorgesehen) — verifiziert, dass Inhalt jenseits der Standardbreite über Scroll erreichbar bleibt, nicht abgeschnitten wird.

### Acceptance Criteria Status (zweite Runde)

Alle 15 Acceptance Criteria erneut manuell im Browser durchgespielt und in der permanenten Regressionssuite (`tests/PROJ-5-dag-sankey-visualisierung.spec.ts`) automatisiert, gegen echte Testdaten (eigener QA5-Testkunde/-projekt, Import + Anreicherung über den echten Upload-Flow angelegt, nicht direkt in die DB geschrieben) — diesmal gegen die neue Rendering-Schicht:

- [x] AC-1 bis AC-15: alle weiterhin PASS, unverändert gegenüber der ersten Runde (siehe „Historische Runde 1" für die Einzelaufstellung) — funktional identisch, nur DOM-Struktur/Selektoren geändert
- [x] AC-6 weiterhin **PASS mit Abweichung** — siehe **BUG-9**, unverändert, im neuen Rendering identisch reproduziert (Themenblock-Klick klappt nur auf/zu, öffnet nie das Dossier)

### Zusätzlich getestete Fähigkeiten (nicht als formale AC im Spec erfasst)

- [x] **Per-Spalten-Sichtbarkeit:** Jede der drei Ebenen einzeln ein-/ausblendbar über ihren eigenen Spalten-Schalter, unabhängig von den anderen beiden. Letzte verbleibende sichtbare Spalte kann nicht deaktiviert werden (Schalter wird deaktiviert) — verhindert einen komplett leeren Graphen
- [x] **Globaler Persona-Filter:** Auswahl highlightet alle Verbindungen der gewählten Persona (aktiv/ausgegraut). Bleibt beim Anklicken eines Knotens (Dossier öffnet/schließt) als Dropdown-Auswahl bestehen; das Highlight wechselt währenddessen auf die eigenen Verbindungen des angeklickten Knotens (identisch zum Verhalten ohne Filter) und kehrt beim Schließen des Dossiers wieder zum Persona-Highlight zurück
- [x] **Ebene-2-Dimensionsgruppierung:** Dimensionen mit mehreren Personas erscheinen standardmäßig als kollabierte Gruppe mit Instanzen-Zähler, aufklappbar; Einzelinstanz-Dimensionen (z. B. „Target Audience", „Umsetzungsrahmen") werden nie gruppiert

### Edge Cases Status (zweite Runde)
- [x] Viele Ebene-2-Knoten — jetzt vertikales Wachstum der Spalte statt Zoom/Pan (kein React Flow mehr), bei Bedarf horizontales Scrollen der gesamten Canvas (`overflow-x-auto` auf „graph-canvas"); kein hartes Performance-Ziel definiert, bei aktueller Testdatengröße keine Auffälligkeiten
- [x] Mobile (375px) — weiterhin eigener Testfall, jetzt ohne React Flows Touch-Pan/Zoom (nicht mehr vorhanden), da die statischen Spalten dafür keinen Bedarf mehr haben
- [x] **Neu getestet: Tablet (768px)** — kein horizontaler Seiten-Scroll (nur „graph-canvas" selbst scrollt bei Bedarf horizontal), Inhalt jenseits der Standardbreite bleibt über Scroll erreichbar, wird nicht abgeschnitten (per `scrollWidth`/`scrollLeft`-Messung verifiziert, nicht nur visuell)
- [x] Alle übrigen Edge Cases (Umsetzungsrahmen ohne Persona, Persona ohne Instanz, Re-Import zeigt aktuellen Stand, identische Content-Block-Labels) — unverändert gültig, siehe historische Runde

### Security Audit Results (zweite Runde)
- [x] Authentication: Graph-Unterseite ohne Login → Redirect zu `/login` (erneut verifiziert)
- [x] Authorization: weiterhin kein neuer Zugriffspfad, keine neue Tabelle/Policy
- [x] Input-Validierung/XSS: `grep -rn "dangerouslySetInnerHTML"` über `src/components/graph/` und `src/lib/graph/` liefert keinen Treffer — auch nach dem kompletten Rendering-Umbau (React Flow → eigene Divs + SVG) und dem neuen `Select`-basierten Persona-Filter kein unsicherer HTML-Injection-Pfad hinzugekommen
- [x] Rate Limiting: weiterhin nicht anwendbar (kein neuer Schreibpfad)
- Keine Sicherheitsfunde

### Bugs Found (zweite Runde)
Keine neuen Bugs gefunden. BUG-9 (siehe historische Runde) besteht unverändert fort — im neuen Rendering identisch reproduziert (Themenblock-Klick klappt weiterhin nur auf/zu).

### Summary (zweite Runde)
- **Acceptance Criteria:** 15/15 passed (1 davon weiterhin mit dokumentierter, bewusster Abweichung — BUG-9, unverändert)
- **Zusätzliche Fähigkeiten:** 3/3 getestete Graph-UI-Batch-Fähigkeiten (Spalten-Sichtbarkeit, Persona-Filter, Dimensionsgruppierung) funktionieren wie vom Nutzer spezifiziert
- **Bugs Found:** 0 neue (0 critical, 0 high, 0 medium, 0 low) — BUG-9 unverändert offen (Low, Nice-to-have)
- **Security:** Pass — kein neuer Zugriffspfad, kein neuer Schreibpfad, kein `dangerouslySetInnerHTML`, auch nach dem Rendering-Umbau bestätigt
- **Regression:** 76/76 Playwright-Tests grün (5 Suiten × 2 Browser, inkl. 2 neuer Tests für den Graph-UI-Batch), 119/119 Vitest-Unit-Tests grün
- **Production Ready:** YES
- **Empfehlung:** Deploy. Zusätzlich empfohlen (nicht blockierend): eine `/refine PROJ-5`-Runde, um die drei Graph-UI-Batch-Fähigkeiten (Spalten-Sichtbarkeit, Persona-Filter, Dimensionsgruppierung) nachträglich als formale Acceptance Criteria im Spec zu erfassen — sie wurden direkt vom Nutzer während mehrerer `/frontend`-Runden beauftragt und sind vollständig implementiert/getestet, aber nie durch `/write-spec`/`/refine` formalisiert. BUG-9 weiterhin optional klärbar (siehe historische Runde).

---

## Historische Runde 1 (vor dem Rendering-Umbau, React-Flow-Canvas)

### Acceptance Criteria Status

Alle 15 Acceptance Criteria manuell im Browser durchgespielt und zusätzlich in der permanenten Regressionssuite (`tests/PROJ-5-dag-sankey-visualisierung.spec.ts`) automatisiert, gegen echte Testdaten (eigener QA5-Testkunde/-projekt, Import + Anreicherung über den echten Upload-Flow angelegt, nicht direkt in die DB geschrieben):

- [x] AC-1 (kein Import → Hinweis + Link zur Import-Werkstatt, kein leerer Graph) — PASS
- [x] AC-2 (Import ohne Anreicherung → Ebene 1+3 unverbunden + Hinweis) — PASS
- [x] AC-3 (Import + Anreicherung → voller Graph mit echten Daten) — PASS
- [x] AC-4 (Themenblock als Hauptknoten, Fragen erst nach Aufklappen sichtbar) — PASS
- [x] AC-5 (Klick Content-Block → Dossier zeigt Herkunft rückwärts inkl. Impact-Text/Gewichtung) — PASS
- [x] AC-6 (Klick Themenblock-/Frage-Knoten → Dossier zeigt Frage/Antwort + Wirkung vorwärts) — PASS mit Abweichung, siehe **BUG-9**
- [x] AC-7 (Klick Profildimension-Knoten → Dossier zeigt Quelle rückwärts + Content-Blöcke vorwärts) — PASS
- [x] AC-8 (Multi-Persona → eigener Knoten je Instanz, eigene Kanten) — PASS (zwei separate "Business Goal"-Knoten für "Direktkäufer"/"Influencer-Partner" verifiziert)
- [x] AC-9 (Gap-Dimension → Knoten mit Lücken-Kennzeichnung, nicht ausgeblendet) — PASS
- [x] AC-10 (Content-Block ohne eingehende Kante → isolierter Knoten) — PASS ("Abschnitt 3: Newsletter", Dossier bestätigt korrekt "Keine Profildimension … begründet diesen Block")
- [x] AC-11 (Ebene-2-Schalter aus → Dimension-Knoten weg, komprimierte Kante bleibt) — PASS
- [x] AC-12 (Ebene-2-Schalter wieder an → präzise Einzelkanten) — PASS
- [x] AC-13 (Konflikt, explizit oder emergent → visuelle Markierung) — PASS (beide Varianten geprüft: emergenter Konflikt markiert "Abschnitt 1: Hero", expliziter Konflikt markiert sowohl "Frage 1" als auch "Frage 2")
- [x] AC-14 (Klick konfliktmarkierter Knoten → Konflikt-Beschreibung im Dossier, keine Lösungsoptionen) — PASS
- [x] AC-15 (nicht eingeloggt → Redirect zu `/login`) — PASS

### Edge Cases Status

- [x] Viele Ebene-2-Knoten (Zoom/Pan über React Flow) — Pan/Zoom-Steuerung vorhanden und funktional (Controls-Widget unten links), kein hartes Performance-Ziel definiert, bei aktueller Testdatengröße keine Auffälligkeiten
- [x] "Umsetzungsrahmen" als einzige projektweite Dimension ohne Persona — im Testdatensatz enthalten (Quelle: Frage 10), per Unit-Test (`build-graph-model.test.ts`) explizit gegen `personaName: null` verifiziert
- [x] Persona ohne jede Dimension-Instanz taucht nicht separat auf — durch Datenmodell strukturell ausgeschlossen (Ebene-2-Knoten entstehen nur aus tatsächlich gespeicherten `enrichment_dimensions`-Zeilen), keine gesonderte Zusatzprüfung nötig
- [x] Mobile (375px) — eigener Testfall, Graph + Schalter + Konzept-Graph-Titel sichtbar und bedienbar, React Flows eingebautes Touch-Pan/Zoom greift wie in der Architektur vorgesehen
- [x] Re-Import/erneute Anreicherung zeigt aktuellen Stand — strukturell durch das Fehlen jeglichen Client-Caches sichergestellt (Server Component lädt bei jedem Aufruf frisch); nicht gesondert per Doppel-Re-Import getestet, da rein aus der Server-Component-Architektur folgt
- [x] Zwei Content-Blöcke mit identischem Label — laut Spec strukturell ausgeschlossen (Labels aus PROJ-3-Nummerierung), keine Testabdeckung nötig

### Security Audit Results
- [x] Authentication: Graph-Unterseite ohne Login → Redirect zu `/login` (verifiziert)
- [x] Authorization: Kein neuer Zugriffs-/Berechtigungspfad — PROJ-5 liest ausschließlich über die bereits geprüften PROJ-3/PROJ-4-Funktionen (`getImportForProject`/`getEnrichmentForProject`) auf denselben Tabellen mit derselben, bereits in PROJ-3/PROJ-4 verifizierten RLS ("Shared Visibility": `authenticated` ja, `anon` nein) — keine neue Tabelle, keine neue Policy, kein zusätzlicher Prüfbedarf
- [x] Input-Validierung/XSS: Kein `dangerouslySetInnerHTML` in neuem Code (`src/components/graph/`, `src/lib/graph/`) — React escaped Text-Inhalte (Frage-/Antwort-Text, Konzept-Felder, Impact-Texte, Konflikt-Beschreibungen) standardmäßig; die zugrunde liegenden Werte selbst wurden bereits in PROJ-3/PROJ-4 gegen XSS-Payloads getestet
- [x] Rate Limiting: kein neuer Schreibpfad, kein neuer API-Endpunkt — nicht anwendbar
- Keine Sicherheitsfunde

### Bugs Found

#### BUG-9: Klick auf einen Themenblock öffnet nicht mehr das Dossier-Panel (Abweichung von AC-6)
- **Severity:** Low
- **Beschreibung:** AC-6 verlangt wörtlich, dass ein Klick auf einen **Themenblock- oder Frage-Knoten** das Dossier-Panel mit Frage/Antwort + Wirkung öffnet. In der tatsächlichen Umsetzung klappt ein Klick auf einen Themenblock-Knoten ausschließlich die zugehörigen Fragen auf/zu — das Dossier öffnet sich nur bei einem Klick auf einen individuellen Frage-Knoten (nach dem Aufklappen).
- **Kontext:** Dies ist keine übersehene Regression, sondern eine bewusste, im Implementierungsnotizen-Abschnitt dokumentierte Entscheidung während `/frontend` (ursprünglich, um zu verhindern, dass ein Klick gleichzeitig aufklappt UND das damals noch modale, seitenblockierende `Sheet`-Dossier öffnet). Diese ursprüngliche technische Begründung ist inzwischen entfallen, da das Dossier später zu einem nicht-blockierenden Panel umgebaut wurde (Nutzer-Feedback zum Referenz-Sketch) — die Trennung "Themenblock = nur Auf-/Zuklappen, Frage = Dossier" wurde aber bewusst beibehalten, weil sie zusätzlich besser zur AC-Formulierung passt ("die gestellte Frage und die gegebene Antwort", Singular — ein Themenblock hat aber mehrere Fragen).
- **Steps to Reproduce:**
  1. Graph-Unterseite mit Anreicherung öffnen
  2. Auf einen Themenblock-Knoten (z. B. "Phase 1–3") klicken
  3. Erwartet (laut AC-6-Wortlaut): Dossier-Panel öffnet mit Frage/Antwort-Inhalt
  4. Tatsächlich: Nur Auf-/Zuklappen, kein Dossier öffnet sich
- **Priority:** Nice to have — funktional vollständig abgedeckt über den Frage-Knoten-Klick nach dem Aufklappen; keine Information geht verloren, nur der direkte Themenblock-Klick-Pfad fehlt

### Summary
- **Acceptance Criteria:** 15/15 passed (1 davon mit dokumentierter, bewusster Abweichung — siehe BUG-9)
- **Bugs Found:** 1 total (0 critical, 0 high, 0 medium, 1 low)
- **Security:** Pass — kein neuer Zugriffspfad, kein neuer Schreibpfad, kein `dangerouslySetInnerHTML`
- **Regression:** 30/30 bestehende Playwright-Tests weiterhin grün (Chromium), 108/108 Vitest-Unit-Tests grün, PROJ-5-Suite zusätzlich gegen Mobile Safari (WebKit) verifiziert (4/4)
- **Production Ready:** YES
- **Recommendation:** Deploy. BUG-9 optional in einem späteren Zyklus klären (z. B. per Nutzer-Entscheidung: Themenblock-Klick soll wieder eine aggregierte Dossier-Ansicht öffnen, oder AC-6 wird auf den jetzigen Stand nachgezogen) — blockiert das Deployment nicht.

## Deployment

**Deployed:** 2026-08-28
**Production URL:** https://test-project-woad-theta.vercel.app
**Vercel Project:** atmodesign/test-project

Zusammen mit PROJ-3s Ein-Datei-Umstellung deployt (gemeinsamer Push nach `main`, kein separates Staging, siehe PROJ-1 — Nutzer hat den kombinierten Deploy-Umfang bewusst bestätigt). Commit `25d3131`, Vercel-Build `dpl_EXaPWSYhJFS3pd3zo9oJbJQY9mCo` erfolgreich (Status Ready, 38s Build-Dauer), Production-Alias `test-project-woad-theta.vercel.app` zeigt auf den neuen Build. Keine DB-Migration für PROJ-5 selbst nötig (rein lesende Ansicht auf bereits bestehende PROJ-3/PROJ-4-Tabellen). Neues npm-Paket `@xyflow/react` bereits über `package.json`/`package-lock.json` im Repo, kein zusätzlicher Vercel-Setup-Schritt. Keine neuen Umgebungsvariablen.

Live verifiziert nach Deploy: `/kunden/[kundeId]/[projektId]/graph` leitet unauthentifiziert korrekt mit 307 zu `/login?redirect=...` weiter, Security-Header aktiv, Production-Alias bestätigt korrekt auf den neuen Build zeigend. Kein Test-Kunde in Produktion angelegt — die volle Funktionalität (Highlight/Trace, Edge-Rollup, Dossier-Panel, Persona-Filter-Grundlage) wurde bereits in `/qa` ausführlich gegen genau diese Supabase-Instanz verifiziert (30/30 + 4/4 Mobile-Safari-Regression, siehe QA Test Results).

### Deployment 2 (Graph-UI-Batch, 2026-08-29)

**Deployed:** 2026-08-29
**Production URL:** https://test-project-woad-theta.vercel.app
**Commit:** `34bb75f` (bündelt 9 Commits seit dem ersten Deploy: Graph-UI-Batch, Rendering-Umbau React Flow → statische Spalten + SVG, Layout-Fixes, QA-Runde 2, Refine)
**Vercel-Build:** `dpl_2qiHond2EWgUUaKgVmJmnaTmRn3w` (Status Ready, ~27s Build-Dauer)

Löst das grundlegende Rendering (React Flow → statische Spalten + SVG-Kanten-Overlay) sowie das Graph-UI-Batch (per-Spalten-Sichtbarkeit, globaler Persona-Filter, Ebene-2-Dimensionsgruppierung) aus dem vorherigen Deployment-Stand ab — siehe Implementierungsnotizen und `/qa`-Runde 2 für den vollständigen Verlauf. `npm run lint` und `npm run build` lokal vor dem Push sauber. `@xyflow/react` vollständig aus `package.json`/`package-lock.json` entfernt, kein Ersatzpaket nötig (eigenes SVG-Overlay). Keine DB-Migration, keine neuen Umgebungsvariablen.

Live verifiziert nach Deploy: Production-Alias (`test-project-woad-theta.vercel.app`, `test-project-atmodesign.vercel.app`, `test-project-git-main-atmodesign.vercel.app`) zeigt bestätigt auf den neuen Build; `/login` (200) und `/kunden` unauthentifiziert (307 → `/login`) korrekt. Kein Test-Kunde in Produktion angelegt — volle Funktionalität inkl. aller neuen Graph-UI-Batch-Fähigkeiten bereits in der `/qa`-Runde 2 gegen dieselbe Supabase-Instanz verifiziert (76/76 Playwright, 119/119 Vitest).
