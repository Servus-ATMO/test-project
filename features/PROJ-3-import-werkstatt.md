# PROJ-3: Import-Werkstatt

## Status: Architected
**Created:** 2026-08-25
**Last Updated:** 2026-08-27 (Architektur)

## Dependencies
- Requires: PROJ-1 (Supabase Infrastructure Setup) — Storage-Buckets `imports`/`exports`
- Requires: PROJ-17 (Kunden-/Projekt-Verwaltung) — Projekt-Detail-Seite (`/kunden/[kundeId]/[projektId]`) als Einstiegspunkt, Kunde/Projekt-Datenmodell

## User Stories
- Als Agentur-Mitarbeiter möchte ich die beiden vom externen Interview-Prompt erzeugten Dateien (Journey-Transkript.md + Konzept.md) direkt auf der Projekt-Seite hochladen können, damit ich das Interview-Ergebnis ohne Umwege ins Tool bekomme.
- Als Agentur-Mitarbeiter möchte ich vor der endgültigen Übernahme sehen, was das Tool aus den Dateien erkannt hat, damit mir Parsing-Fehler sofort auffallen, statt sie erst später in der Graph-Ansicht zu entdecken.
- Als Agentur-Mitarbeiter möchte ich bei einer fehlerhaften oder falsch zugeordneten Datei eine klare Rückmeldung bekommen, damit ich weiß, was zu korrigieren ist.
- Als Agentur-Mitarbeiter möchte ich ein Projekt erneut importieren können, wenn der externe Interview-Prompt verbessert wurde, ohne versehentlich bereits geleistete Anreicherungsarbeit zu verlieren.
- Als Agentur-Mitarbeiter möchte ich nach dem Import sofort eine lesbare Übersicht der importierten Inhalte sehen, damit ich Vertrauen habe, dass alles korrekt übernommen wurde.

## Out of Scope
- Inline-Bearbeitung importierter Werte in der Vorschau oder danach — eigenständiges Thema von PROJ-6 (Branch-Datenmodell, Original/Branch-Vergleich)
- Graph-/Sankey-Visualisierung der importierten Daten — PROJ-5
- KI-Anreicherung (Ebene 2 Profildimensionen, Konflikterkennung, Impact-Texte) — PROJ-4
- Wireframe-Erzeugung aus den importierten Content-Blöcken — PROJ-8
- Getrennter/zeitversetzter Upload der beiden Dateien — bewusst nicht vorgesehen, die Dateien gehören inhaltlich zusammen
- Mehrseiten-/Ebene-4-Struktur (Hub + Unterseiten) — PROJ-11
- Manuelles Löschen nur des Imports ohne das ganze Projekt zu löschen — Re-Import deckt den „nochmal von vorne"-Fall bereits ab

## Acceptance Criteria

**Format:** Angenommen [Vorbedingung] / Wenn [Aktion] / Dann [Ergebnis]

- [ ] Angenommen der Nutzer befindet sich auf der Projekt-Detail-Seite eines Projekts ohne Import, wenn er beide Dateien (Journey-Transkript.md + Konzept.md) per Drag & Drop hochlädt, dann werden beide Dateien geparst und eine Vorschau der erkannten Fragen/Antworten und Abschnitte/Felder angezeigt, bevor irgendetwas endgültig gespeichert wird
- [ ] Angenommen nur eine der beiden Dateien wurde ausgewählt, wenn der Nutzer versucht den Import zu starten, dann wird das verhindert mit dem Hinweis, dass beide Dateien benötigt werden
- [ ] Angenommen eine hochgeladene Datei ist keine `.md`-Datei, dann wird der Upload mit einer Fehlermeldung abgelehnt
- [ ] Angenommen eine hochgeladene `.md`-Datei sieht inhaltlich eher wie das jeweils andere Dokument aus (z. B. Konzept-Struktur im Journey-Transkript-Slot), dann erscheint eine Warnung mit der Möglichkeit, trotzdem fortzufahren
- [ ] Angenommen eine Datei weicht von der erwarteten Struktur ab (z. B. eine „Frage N" oder ein „Abschnitt N" fehlt), wenn sie geparst wird, dann werden erkannte Teile übernommen und nicht erkennbare Teile in der Vorschau deutlich als Lücke markiert
- [ ] Angenommen in einer Datei ist praktisch keine erkennbare Struktur vorhanden, dann wird der Import mit einer klaren Fehlermeldung abgelehnt, statt eine fast leere Vorschau anzuzeigen
- [ ] Angenommen die Vorschau sieht korrekt aus, wenn der Nutzer den Import bestätigt, dann werden alle Felder aus beiden Dateien vollständig strukturiert gespeichert (jedes `**Label:**`-Feld aus beiden Vorlagen, nicht nur die Fragen und die Seitenstruktur) und die Rohdateien zusätzlich unverändert im `imports`-Bucket abgelegt
- [ ] Angenommen der Import wurde erfolgreich übernommen, dann zeigt die Projekt-Detail-Seite eine strukturierte Lese-Übersicht der Journey (Fragen + Antworten) und des Konzepts (alle Abschnitte mit ihren Feldern) an
- [ ] Angenommen für ein Projekt existiert bereits ein Import und es existieren bereits abhängige Daten (z. B. Ebene-2-Anreicherung aus PROJ-4), wenn erneut hochgeladen und die Vorschau bestätigt wird, dann wird vor dem endgültigen Übernehmen eine Warnung angezeigt, dass diese abhängigen Daten ungültig werden bzw. überschrieben werden, die aktiv bestätigt werden muss
- [ ] Angenommen für ein Projekt existiert bereits ein Import ohne abhängige Daten, wenn erneut hochgeladen wird, dann läuft der Re-Import als normaler Ersatz-Import durch dieselbe Vorschau
- [ ] Angenommen ein Netzwerk- oder Serverfehler tritt während Upload oder Parsen auf, dann erscheint eine Fehlermeldung, es werden keine Teildaten übernommen, und die bereits ausgewählten Dateien bleiben im Upload-Feld erhalten, sodass kein erneutes Auswählen nötig ist

## Edge Cases
- Was passiert, wenn die Journey mehr oder weniger als die im Beispiel gezeigten 10 Fragen enthält (adaptiver Prompt kann variieren)? → Wird unterstützt: Es werden so viele „Frage N"-Blöcke geparst, wie tatsächlich vorhanden sind, keine feste Annahme von genau 10.
- Was passiert, wenn Konzept.md in Abschnitt 4 mehr oder weniger Abschnitte enthält als im Beispiel? → Ebenso variabel, alle vorhandenen „Abschnitt N"-Blöcke werden geparst.
- Was passiert, wenn eine Antwort im `[frei]`-Format vorliegt statt Buchstabe(n) + Optionstext? → Wird korrekt als Freitext-Antwort erkannt und gespeichert, zählt nicht als Lücke.
- Was passiert, wenn ein Feld in Konzept.md explizit „entfällt"/„keiner"/„keine"/„kein Medium" enthält? → Wird als gültiger, bewusst leerer Wert gespeichert, nicht als Parsing-Lücke markiert (Unterschied zu einem tatsächlich fehlenden Feld).
- Was passiert, wenn zwei Mitarbeiter gleichzeitig für dasselbe Projekt importieren? → Kein Konfliktschutz, letzter Speicherstand gewinnt (last-write-wins, konsistent mit PROJ-17).
- Was passiert mit ungewöhnlich großen Dateien (z. B. sehr langes Interview)? → Groß­zügiges, aber vorhandenes Limit (siehe Open Questions), da es sich um reinen Text handelt.

## Technical Requirements (optional)
- Security: Upload/Import nur innerhalb des geschützten Bereichs, gleiche Zugriffsregeln wie PROJ-17 (alle eingeloggten Mitarbeiter, Shared Visibility)
- Speicherung: Rohdateien im bestehenden `imports`-Bucket (siehe PROJ-1), zusätzlich vollständig strukturiertes Parsing beider Dateien in die Datenbank

## Open Questions
- [x] ~~Genaue Dateigrößen-Obergrenze pro Datei~~ — bei `/architecture` auf 5 MB je Datei festgelegt, siehe Tech Design
- [x] ~~Exaktes Datenmodell/Tabellenstruktur für die granularen Felder~~ — bei `/architecture` als vierstufiges Modell (Import → Abschnitt → Eintrag → Feld) festgelegt, siehe Tech Design
- [x] ~~Lösch-Schutz-Verschärfung~~ — wurde zwischenzeitlich per `/refine PROJ-17` + `/backend PROJ-17` umgesetzt und deployt (Kunde/Projekt muss erst archiviert sein, bevor endgültiges Löschen möglich ist)
- [ ] Wie sich ein Re-Import auf bereits bestehende Ebene-2-Daten (PROJ-4) auswirkt (löschen vs. als veraltet markieren) — kann erst entschieden werden, wenn PROJ-4 sein eigenes Datenmodell hat; die „hat abhängige Daten"-Prüfung in PROJ-3 ist bewusst als erweiterbarer Baustein angelegt (siehe Tech Design), analog zum bereits etablierten Muster aus PROJ-17

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Upload als Drag & Drop beider Dateien gemeinsam auf der bestehenden Projekt-Detail-Seite | Natürlichster Anknüpfungspunkt an bereits Gebautes (PROJ-1-Storage, PROJ-17-Platzhalter); entspricht dem realen Workflow, in dem beide Dateien bereits fertig vorliegen | 2026-08-25 |
| Beide Dateien müssen zusammen hochgeladen werden, kein getrennter/zeitversetzter Import | Die Dateien gehören inhaltlich untrennbar zusammen, ein getrennter Import würde nur nutzlose Zwischenzustände erzeugen | 2026-08-25 |
| Vorschau vor endgültiger Übernahme (Human-in-the-loop) | Quelldateien haben gewisse Formatfreiheit — ein Parsing-Fehler soll auffallen, bevor er unbemerkt ins Konzept einfließt | 2026-08-25 |
| Best-Effort-Parsing mit sichtbarer Lücken-Kennzeichnung statt Alles-oder-Nichts | Dateien werden von einem externen KI-Prompt anhand der Vorlagen erzeugt, nicht manuell getippt — Abweichungen entstehen durch Prompt-/LLM-Variabilität, nicht durch Tippfehler; ein zu strenges Alles-oder-Nichts würde unnötig oft blockieren | 2026-08-25 |
| Keine Inline-Bearbeitung importierter Werte in PROJ-3 | Das Ändern einzelner Antworten mit Original/Branch-Historie ist explizit das Thema von PROJ-6 und baut sauber auf einem abgeschlossenen Import auf | 2026-08-25 |
| Re-Import erlaubt, mit expliziter Warnung bei bereits vorhandenen abhängigen Daten | Verhindert versehentlichen Verlust von Anreicherungs-/Wireframe-Arbeit, ohne den einfachen Fall unnötig zu erschweren | 2026-08-25 |
| Datei-Typ-Prüfung (`.md`) plus inhaltliche Kreuz-Format-Erkennung (Konzept im Journey-Slot o. ä.) | Verhindert stille Fehluploads, die sonst erst als lauter Lücken in der Vorschau auffallen würden | 2026-08-25 |
| **Vollständiges granulares Parsen aller Felder aus beiden Dateien**, nicht nur Ebene 1 (Journey) und Ebene 3 (Konzept-Abschnitt 4) | Korrektur ggü. dem ursprünglichen PRD-Wortlaut „Ebene 1+3 parsen": alle Konzept-Abschnitte (1–3, 5–11) sind direkte Analyseergebnisse/Empfehlungen aus dem Interview-Prompt und sollen granular (Feld für Feld, nicht als Textblock) gespeichert werden, damit spätere Features (z. B. PROJ-4) einzelne Felder direkt referenzieren können | 2026-08-25 |
| Post-Import-Ansicht: einfache strukturierte Lese-Übersicht auf der Projekt-Detail-Seite, kein Graph | Die eigentliche Graph-/Sankey-Visualisierung ist PROJ-5s Aufgabe; PROJ-3 soll nur sichtbares Feedback geben, dass der Import plausibel funktioniert hat | 2026-08-25 |
| Fehlerverhalten bei Upload-/Parse-Fehlern: Fehlermeldung, keine Teildaten übernehmen, ausgewählte Dateien bleiben im Upload-Feld erhalten | Analog zum bereits etablierten Fehlerverhalten bei PROJ-2/PROJ-17-Formularen | 2026-08-25 |
| Variable Anzahl an Fragen (Journey) und Abschnitten (Konzept-Seitenstruktur) wird unterstützt, keine feste Zahl angenommen | Der adaptive Interview-Prompt kann je nach Journey unterschiedlich viele Fragen/Abschnitte erzeugen (siehe Vorlage: „Wurde die vollständige Zehn-Fragen-Struktur durchlaufen?") | 2026-08-25 |
| Lösch-Schutz wird verschärft: Ein Kunde/Projekt mit abgeschlossenem Import muss zusätzlich erst archiviert sein, bevor „Endgültig löschen" möglich ist — gilt einheitlich für Kunde UND Projekt (nicht nur Projekt) | Konsistente Regel ist einfacher zu verstehen als unterschiedliche Löschregeln je Entität; Nutzerentscheidung im Spec-Interview | 2026-08-25 |
| Umsetzung der Lösch-Schutz-Verschärfung erfolgt separat via `/refine PROJ-17`, nicht innerhalb von PROJ-3 | Reine Lösch-Regel-Korrektur an bereits deployter Funktionalität ohne inhaltliche Abhängigkeit zu PROJ-3s Kernthema (Import-Parsing) | 2026-08-25 |
| Referenzdateien `Journey-Transkript-Vorlage.md` und `Landingpage-Konzept-Vorlage.md` dauerhaft unter `docs/reference/` im Repo abgelegt | Waren zuvor nur im Chat-Verlauf vorhanden und durch Kontext-Komprimierung verloren gegangen; werden auch von PROJ-4 ff. als Quellformat-Referenz gebraucht | 2026-08-25 |

### Technical Decisions
<!-- Added by /architecture -->
| Decision | Rationale | Date |
|----------|-----------|------|
| Vierstufiges Datenmodell (Import → Abschnitt → Eintrag → Feld) statt einer eigenen Tabellenstruktur pro Konzept-Abschnitt | Die elf Konzept-Abschnitte + die Journey-Fragen haben sehr unterschiedliche Formen (einmalig vs. wiederholend, 2–10 Felder je Eintrag) — ein einheitliches, generisches Modell bildet alle ab, ohne dass jeder neue Abschnittstyp eine Schema-Änderung braucht | 2026-08-27 |
| Parsing als einzelne, reine Server-Funktion, zweimal aufgerufen (einmal für die Vorschau, einmal beim endgültigen Speichern) | Stellt sicher, dass exakt das gespeichert wird, was in der Vorschau zu sehen war — kein geparster Zwischenzustand muss vom Client zurück zum Server transportiert werden, und es gibt nur eine Stelle mit Parsing-Logik | 2026-08-27 |
| Journey-„Optionen" (A–F) werden als ein Feld mit dem vollständigen Listentext gespeichert, nicht als einzelne Unter-Felder pro Buchstabe | Optionen folgen nicht dem `**Label:** Wert`-Muster der granularen Felder, sondern sind reine Kontextinformation zur Antwort; niemand referenziert später eine einzelne Option isoliert | 2026-08-27 |
| „Antwort" bleibt ein Feld mit dem vollständigen Rohtext (inkl. Buchstaben bzw. `[frei]`-Kennzeichnung), keine weitere Aufsplittung in Antworttyp + Antworttext | Deckt sich mit dem in der Spec festgelegten Granularitätsgrad; eine weitere Zerlegung kann bei Bedarf ein späteres Feature (PROJ-4/PROJ-6) selbst vornehmen | 2026-08-27 |
| Dateigrößen-Limit: 5 MB pro Datei | Großzügig für reinen Text (ein sehr langes Interview bleibt weit darunter), verhindert trotzdem versehentliche/missbräuchliche Uploads | 2026-08-27 |
| Format-Kreuz-Erkennung über das Vorhandensein format-typischer Überschriften (z. B. „### Frage N" vs. „### Abschnitt N") | Einfache, robuste Heuristik statt komplexer Inhaltsanalyse — die beiden Vorlagen unterscheiden sich strukturell klar genug | 2026-08-27 |
| „Hat abhängige Daten"-Prüfung beim Re-Import als eigenständige, erweiterbare Funktion angelegt (liefert aktuell immer „nein", da PROJ-4 noch nicht existiert) | Analog zum bereits etablierten Muster aus PROJ-17s Lösch-Schutzprüfung — spätere Features (PROJ-4) ergänzen dort einfach ihre eigene Bedingung, ohne den Re-Import-Ablauf neu zu entwerfen | 2026-08-27 |
| Re-Import ersetzt die bestehenden Abschnitte/Einträge/Felder des Projekts vollständig (keine parallele Versionierung) | Deckt sich mit der Product Decision „einfacher Ersatz-Import"; eine Versionshistorie ist nicht verlangt | 2026-08-27 |
| Neue Abhängigkeit: ein schlankes Markdown-Parsing-Paket (z. B. aus dem `remark`/`unified`-Ökosystem) statt handgeschriebener Regex-Auswertung | Das Parsen ist der Kern dieses gesamten Features und läuft gegen KI-generierten, nicht hundertprozentig deterministischen Text — ein echter Markdown-Parser (Überschriften, Fett-Text, Listen als Struktur statt Text) ist robuster gegen kleinere Formatabweichungen als Zeilen-Regex | 2026-08-27 |

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### A) Komponenten-Struktur (visueller Baum)

```
Projekt-Detail-Seite (/kunden/[kundeId]/[projektId], ersetzt den PROJ-17-Platzhalter)
├── Projekt-Stammdaten-Karte (bestehend aus PROJ-17, unverändert)
└── Import-Bereich (neuer Inhalt anstelle des "Interview-Import folgt in PROJ-3"-Hinweises)
    │
    ├── Zustand "Kein Import vorhanden"
    │   ├── Upload-Zone "Journey-Transkript" (Drag & Drop + Dateiauswahl)
    │   ├── Upload-Zone "Konzept" (Drag & Drop + Dateiauswahl)
    │   └── "Dateien prüfen"-Button (aktiv erst, wenn beide Dateien gewählt sind)
    │
    ├── Zustand "Vorschau" (nach Dateiprüfung, vor endgültiger Übernahme)
    │   ├── Format-Warnung (falls eine Datei eher wie das jeweils andere Dokument aussieht)
    │   ├── Journey-Vorschau: Liste aller erkannten Fragen mit Antwort, Lücken deutlich markiert
    │   ├── Konzept-Vorschau: Liste aller erkannten Abschnitte mit ihren Feldern, Lücken markiert
    │   ├── Re-Import-Warnung (nur falls bereits ein Import mit abhängigen Daten existiert)
    │   └── "Import übernehmen" / "Abbrechen"
    │
    └── Zustand "Import vorhanden" (Lese-Übersicht)
        ├── Journey-Übersicht (aufklappbare Fragen-Liste)
        ├── Konzept-Übersicht (aufklappbare Abschnitte-Liste mit Feldern)
        └── "Erneut importieren"-Button (führt zurück zum Upload-Zustand)
```

### B) Datenmodell (in einfacher Sprache)

Vier Ebenen, die zusammen sowohl die Journey-Fragen als auch alle elf Konzept-Abschnitte einheitlich abbilden:

**Import** — ein Datensatz pro Projekt (ein Re-Import ersetzt den bestehenden, statt einen zweiten anzulegen):
- Eindeutige ID, Verknüpfung zum Projekt
- Verweise auf die beiden Rohdateien im `imports`-Bucket (siehe PROJ-1)
- Kopf-Metadaten aus den Dateien (Datum, Geführt-mit/Erstellt-mit, Prompt-Version)
- Importiert-Zeitstempel

**Abschnitt** — ein Eintrag pro erkanntem Bereich einer der beiden Dateien (z. B. "Einstieg", "Phase 1–3", "Strategisches Fundament", "Seitenstruktur"):
- Eindeutige ID, Verknüpfung zum Import
- Dokument (Journey-Transkript oder Konzept), Name, Reihenfolge (wie im Original)

**Eintrag** — ein oder mehrere pro Abschnitt: genau einer bei einmaligen Abschnitten (z. B. "Strategisches Fundament"), mehrere bei wiederholenden Abschnitten (je eine Frage, je ein Seitenstruktur-Abschnitt, je eine Testhypothese, je ein Platzhalter-Punkt):
- Eindeutige ID, Verknüpfung zum Abschnitt
- Bezeichnung (z. B. "Frage 3", "Abschnitt 2: Hero" — leer bei einmaligen Abschnitten), Reihenfolge

**Feld** — jedes einzelne benannte Feld innerhalb eines Eintrags (z. B. "Zielgruppe", "Antwort", "Baustein", "CTA"):
- Eindeutige ID, Verknüpfung zum Eintrag
- Feldname, Wert (Freitext, kann bei Listen wie „Optionen" oder „Wichtigste Benefits" auch mehrzeilig sein)
- Status: gefunden oder Lücke (fehlt in der Quelldatei — unterscheidet sich von einem bewusst leeren Wert wie „entfällt"/„keiner")
- Reihenfolge

Gespeichert in: Supabase (PostgreSQL), wie alle bisherigen Daten. Sichtbarkeit: wie bei PROJ-17, alle eingeloggten Mitarbeiter sehen und bearbeiten alles (Shared Visibility).

**Wichtig — was hier NICHT entschieden wird:** Ob und wie ein Re-Import bestehende Ebene-2-Daten aus PROJ-4 betrifft, kann erst PROJ-4 selbst festlegen (eigene Tabellen, eigene Verknüpfung). Die „hat abhängige Daten"-Prüfung ist bewusst als eigenständiger, erweiterbarer Baustein angelegt (siehe unten), genau wie schon bei PROJ-17.

### C) Tech-Entscheidungen (Begründung)

- **Vier-Ebenen-Modell statt einer Tabelle pro Abschnittstyp:** Die elf Konzept-Abschnitte und die Journey-Fragen sind strukturell zu unterschiedlich (einmalig/wiederholend, 2–10 Felder), um sinnvoll in feste Spalten zu pressen — ein generisches Modell bildet alles ab und bleibt erweiterbar, falls sich die Vorlagen künftig ändern.
- **Parsing als eine einzige Server-Funktion, zweimal aufgerufen:** Die Vorschau und der endgültige Speichervorgang nutzen exakt dieselbe Logik — was der Nutzer in der Vorschau sieht, ist garantiert das, was gespeichert wird, ohne einen fehleranfälligen Zwischentransport der bereits geparsten Daten durchs Frontend.
- **Markdown-Parser statt Regex:** Da dieses Parsing der Kern des gesamten Features ist und gegen von einer KI erzeugten (nicht immer hundertprozentig identisch formatierten) Text läuft, ist ein echter Markdown-Parser robuster als handgeschriebene Zeilen-Muster.
- **Erweiterbare „hat abhängige Daten"-Prüfung:** Verhindert, dass PROJ-4 später den gesamten Re-Import-Ablauf neu entwerfen muss — es ergänzt nur seine eigene Bedingung, genau wie bei PROJ-17s Lösch-Schutzprüfung.
- **5-MB-Limit pro Datei:** Rein zur Missbrauchsvermeidung, da es sich um Textdateien handelt und selbst sehr lange Interviews deutlich darunterbleiben.

### D) Abhängigkeiten (Pakete)

- Ein schlankes Markdown-Parsing-Paket (z. B. aus dem `remark`/`unified`-Ökosystem) — neue Abhängigkeit, Begründung siehe oben
- Sonst keine neuen Pakete nötig: Datei-Upload läuft über die native Browser-Drag&Drop-/File-API (kein zusätzliches UI-Paket), Formulare/Bestätigungsdialoge nutzen die bereits vorhandenen shadcn/ui-Bausteine (`Alert`, `Dialog`/`AlertDialog`, `Accordion` für die aufklappbare Lese-Übersicht — bereits installiert), `@supabase/ssr` für den Storage-Zugriff auf den `imports`-Bucket ist bereits vorhanden

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
