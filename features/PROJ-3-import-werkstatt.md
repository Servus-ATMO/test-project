# PROJ-3: Import-Werkstatt

## Status: In Review
**Created:** 2026-08-25
**Last Updated:** 2026-08-27 (QA)

## Implementierungsnotizen
- Frontend umgesetzt auf `/kunden/[kundeId]/[projektId]` (ersetzt den PROJ-17-Platzhalter): Upload-Zustand (zwei Drop-Zonen), Vorschau-Zustand (Lücken-Markierung, Format-Warnung, Re-Import-Warnung, Bestätigen/Abbrechen), Lese-Übersicht-Zustand (aufklappbare Sections, "Erneut importieren"). Komponenten in `src/components/imports/`: `upload-zone.tsx`, `parsed-document-view.tsx` (gemeinsamer Renderer für Vorschau UND Übersicht), `import-panel.tsx` (State-Machine, jetzt Server-Actions-basiert statt localStorage — siehe unten).
- **Parsing (Journey + Konzept) als eigene Bibliothek in `src/lib/imports/`:** `parse-utils.ts` (gemeinsame Extraktions-Engine für alle Feld-Schreibweisen der Vorlagen: `**Label:** Wert`, `- **Label:** Wert`, `N. **Label:** Wert`, `*Label:* Wert`, `**Frage ohne Doppelpunkt?**`), `parse-journey.ts`, `parse-konzept.ts`, `format-detect.ts` (Datei-Validierung + Format-Kreuz-Erkennung). Deckt alle elf Konzept-Abschnitte und alle Journey-Fragen granular ab, inkl. der unregelmäßig geformten Abschnitte (Leitidee, Seitenstruktur mit variabler Abschnittszahl + frei-Abschnitte-Zusammenfassung, Platzhalter & offene Punkte, Testhypothesen).
- **Markdown-Normalisierung auf remark/unified umgestellt (`src/lib/imports/normalize-markdown.ts`):** Löst die in der Frontend-Phase bewusst offen gelassene Einschränkung ("zeilen-/regex-basierter Parser statt des im Tech Design vorgesehenen robusteren Markdown-Parsers"). Der Quelltext wird per `remark-parse` in einen echten Markdown-AST geparst und daraus wieder in das kanonische Zeilenformat serialisiert, das `parse-utils.ts` erwartet — die bereits getestete Feld-/Abschnitts-Logik bleibt dadurch unverändert wiederverwendbar, nur die Tokenisierung wurde ersetzt. Alle 40 bestehenden Parser-Tests liefen dagegen unverändert grün (kein Verhaltensunterschied bei wohlgeformtem Input), plus 5 neue Tests (`normalize-markdown.test.ts`), die konkret zeigen, was die Umstellung bringt: alternative Aufzählungszeichen (`*` statt `-`), Underscore-Fett (`__x__`), zusätzliche Leerzeichen um ein Label und harte Zeilenumbrüche werden jetzt korrekt erkannt — Fälle, an denen der reine Regex-Ansatz gescheitert wäre.
- **Datenmodell live umgesetzt:** vier neue Tabellen (`interview_imports`, `import_sections`, `import_entries`, `import_fields`), Migration `create_interview_imports_tables` — RLS + explizite GRANTs nach demselben Shared-Visibility-Muster wie `clients`/`projects`. `interview_imports.project_id` ist `UNIQUE` (ein aktueller Import pro Projekt) und referenziert `projects(id)` mit `ON DELETE RESTRICT` (Defense in Depth, analog zu `projects.client_id`). Re-Import löscht die bestehenden Sections eines Imports (Cascade räumt Entries/Fields mit auf) und fügt frisch geparste Daten ein — IDs werden bereits beim Parsen vergeben (`crypto.randomUUID()`), sodass Sections/Entries/Fields ohne Round-Trips per Bulk-Insert geschrieben werden können.
- **Server Actions in `src/lib/imports/actions.ts`:** `checkImportFiles` (parst serverseitig, liefert Vorschau + Format-Warnungen oder Hard-Fail zurück, schreibt nichts) und `saveImport` (parst dieselbe Datei-Inhalte **erneut** serverseitig und persistiert — Tech-Design-Vorgabe "eine einzige Parsing-Funktion, zweimal aufgerufen", garantiert dass die Vorschau exakt dem entspricht, was gespeichert wird). Rohdateien werden zusätzlich unverändert in den `imports`-Storage-Bucket hochgeladen (`{projectId}/journey-transkript.md` und `/konzept.md`, überschrieben bei Re-Import). `hasDependentImportData()` bleibt bewusst ein Stub (immer `false`, PROJ-4 existiert noch nicht) — das Re-Import-Warnungs-UI ist aber bereits vollständig verdrahtet.
- **`localStorage`-Zwischenlösung entfernt:** `src/hooks/useImport.ts` gelöscht, die Projekt-Detail-Seite ist jetzt eine Server Component (`getImportForProject` in `src/lib/imports/queries.ts` baut die verschachtelte Section/Eintrag/Feld-Struktur aus den vier flachen Tabellen zusammen), `ImportPanel` erhält den aktuellen Import als Prop und ruft nach erfolgreichem Speichern `router.refresh()`.
- **Cross-Feature-Integration mit PROJ-17 nachgezogen** (löst die in PROJ-17s Tech Design bewusst offen gelassene Erweiterungsstelle ein): `deleteProject` in `src/lib/clients/actions.ts` prüft jetzt zusätzlich, ob für das Projekt ein `interview_imports`-Datensatz existiert, und blockiert das endgültige Löschen in diesem Fall — zusätzlich zur `ON DELETE RESTRICT`-Absicherung auf DB-Ebene.
- **Kleine Refaktorierung:** den `requireAuth()`-Helper (bisher lokal in `clients/actions.ts` dupliziert) nach `src/lib/auth/require-auth.ts` verschoben, da er jetzt auch von `imports/actions.ts` gebraucht wird.
- **Beim Testen aufgefallen und behoben (kein neuer Bug, aber eine echte Lücke):** `deleteClient`/`deleteProject` gaben schon vorher ein `DeleteResult` mit Grund-Text zurück, den die UI aber komplett verworfen hat — ein abgelehntes Löschen (z. B. wegen eines vorhandenen Imports) blieb für den Nutzer unsichtbar, der Klick schien einfach nichts zu tun. In `client-list.tsx` und `client-detail-view.tsx` wird der Grund jetzt über ein `Alert` angezeigt.
- 45 Unit-Tests für die Parsing-Bibliothek (`src/lib/imports/*.test.ts`, inkl. der 5 neuen Normalisierungs-Tests).
- **Zuvor in der Frontend-Phase im Browser gefundene und behobene Bugs** (weiterhin gültig, unverändert durch die Backend-Umstellung): doppelte „frei-Abschnitte"-Zusammenfassung; „keine erkennbare Struktur"-Hard-Fail hatte Vorrang vor der Format-Kreuz-Warnung bei vertauschten Dateien.
- Vollständiger Durchlauf gegen die echte Supabase-Instanz verifiziert (Playwright, danach entfernt): echte Zeilen in allen vier Tabellen nach dem Speichern (>10 Sections, >50 Fields), Rohdatei im `imports`-Bucket korrekt abrufbar, Daten überleben einen harten Reload (kommen aus der DB, nicht aus `localStorage`), Cross-Feature-Löschschutz funktioniert inkl. sichtbarer Fehlermeldung. PROJ-2- und PROJ-17-Regressionssuiten weiterhin grün (12/12 bzw. 4/4), `build`/`lint`/`test` sauber.

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
| **[Frontend]** Zeilen-/Regex-basierter Parser (`src/lib/imports/`) als Zwischenlösung statt sofort der finalen `remark`/`unified`-Implementierung | Analog zum PROJ-17-Muster: eine echte, funktionierende (wenn auch nicht die finale) Implementierung ermöglicht es, die komplette UI im Browser zu testen, statt gegen Mock-Daten zu bauen; `/backend` ersetzt nur die Parsing-Bibliothek, die Section/Eintrag/Feld-Datenstruktur bleibt gleich | 2026-08-27 |
| **[Frontend]** `hasDependentData()` als Stub (liefert immer `false`), Re-Import-Warnungs-UI aber bereits vollständig gebaut | Gleiches erweiterbares Muster wie PROJ-17s Lösch-Schutzprüfung — PROJ-4 muss später nur die Bedingung selbst implementieren, nicht die UI drumherum | 2026-08-27 |
| **[Backend]** Doch auf remark/unified umgestellt statt den funktionierenden Regex-Parser vorerst zu behalten | Ursprünglich wegen des bereits getesteten Regex-Parsers zur Diskussion gestellt; nach Rückfrage des Nutzers ("wann wäre denn der richtige Zeitpunkt?") entschieden, dass es keinen besseren späteren Zeitpunkt gibt als jetzt, während aktive Entwicklung + Testabdeckung laufen — "später" haette die Umstellung sonst absehbar nie stattgefunden | 2026-08-27 |
| Normalisierung als eigene Schicht (`normalize-markdown.ts`) VOR der bestehenden Zeilen-Logik, statt die gesamte Feld-/Abschnitts-Extraktion auf AST-Traversal umzuschreiben | Deutlich kleinerer, risikoärmerer Eingriff — die AST übernimmt nur die Tokenisierung (Fett/Kursiv/Listen/Ueberschriften korrekt erkennen), die bereits getestete Section/Eintrag/Feld-Logik bleibt unverändert; alle 40 bestehenden Tests liefen unverändert grün als Regressionsnachweis | 2026-08-27 |
| Vierstufiges Datenmodell 1:1 wie im Tech Design umgesetzt: `interview_imports` (1 pro Projekt, `UNIQUE project_id`), `import_sections`, `import_entries`, `import_fields`, alle mit Cascade-Löschung nach unten | IDs werden bereits beim Parsen serverseitig vergeben, dadurch Bulk-Insert ohne Round-Trips zum Auslesen generierter IDs möglich | 2026-08-27 |
| `interview_imports.project_id` mit `ON DELETE RESTRICT` (nicht CASCADE) | Analog zu `projects.client_id` — ein Projekt mit Import darf nicht einfach mitgelöscht werden, erzwingt die explizite Lösch-Schutzprüfung auch auf DB-Ebene | 2026-08-27 |
| Re-Import: bestehende `import_sections` eines Imports werden gelöscht (Cascade räumt Entries/Fields mit auf), dann Neueinfügen — statt einer Versionshistorie | Deckt sich mit der Product Decision „einfacher Ersatz-Import" aus der Spec | 2026-08-27 |
| `checkImportFiles` und `saveImport` als zwei separate Server Actions, `saveImport` parst den Text ein zweites Mal statt den Vorschau-Payload vom Client entgegenzunehmen | Exakte Umsetzung der Tech-Design-Vorgabe „eine einzige Parsing-Funktion, zweimal aufgerufen" — verhindert, dass ein manipulierter oder veralteter Vorschau-Payload vom Client gespeichert wird | 2026-08-27 |
| Rohdateien im `imports`-Bucket unter `{projectId}/journey-transkript.md` bzw. `/konzept.md`, mit `upsert: true` überschrieben bei Re-Import | Fester, vorhersagbarer Pfad pro Projekt statt Zeitstempel-Dateinamen — es gibt ohnehin nur einen "aktuellen" Import pro Projekt | 2026-08-27 |
| `requireAuth()`-Helper nach `src/lib/auth/require-auth.ts` extrahiert (vorher lokal in `clients/actions.ts` dupliziert) | Wird jetzt von zwei Modulen gebraucht (`clients/actions.ts`, `imports/actions.ts`) — einzige Quelle statt zweiter Kopie, die auseinanderlaufen könnte | 2026-08-27 |
| `deleteProject` (PROJ-17) um eine `interview_imports`-Existenzprüfung ergänzt | Löst die in PROJ-17s Tech Design explizit vorgesehene Erweiterungsstelle ein ("sobald PROJ-3 gebaut wird, wird dort einfach eine weitere Bedingung ergänzt") | 2026-08-27 |

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

**Tested:** 2026-08-27
**App URL:** http://localhost:3000
**Tester:** QA Engineer (AI)

### Vorgehen
- `npm test` (70 Unit-Tests, alle grün) und `npm run lint` / `npm run build` vor der eigentlichen QA-Runde geprüft.
- Code-Review aller neuen Dateien (`src/lib/imports/*`, `src/components/imports/*`, Server Actions, Migration).
- RLS-Policies und GRANTs der vier neuen Tabellen sowie die Storage-Policies des `imports`-Buckets direkt in Supabase geprüft (`pg_policies`, `information_schema.role_table_grants`) — insbesondere wegen der BUG-1-Lektion aus PROJ-17 (RLS muss dieselbe Regel durchsetzen wie die Server Action).
- Manuelle Red-Team-Exploration im Browser (Format-Vertauschung, Hard-Fail, XSS-Payload in einem Antwortfeld, Dateigrößenlimit).
- Neue permanente Playwright-Suite `tests/PROJ-3-import-werkstatt.spec.ts` geschrieben und gegen die echte (lokale) Supabase-Instanz ausgeführt, inkl. direkter DB-/Storage-Verifikation nach jedem Speichervorgang.
- Vollständige Regression: PROJ-2- und PROJ-17-Suiten erneut ausgeführt (Chromium).
- Mobile-Layout (375px) visuell per Screenshot geprüft (Upload-Zustand + Vorschau-Zustand).

### Acceptance Criteria Status

#### AC-1: Beide Dateien hochladen → Vorschau vor dem Speichern
- [x] Drag&Drop/Dateiauswahl für beide Slots funktioniert, Vorschau erscheint erst nach „Dateien prüfen", nichts wird vor Bestätigung gespeichert (DB blieb bis zur expliziten Bestätigung leer)

#### AC-2: Nur eine Datei ausgewählt → Import wird verhindert
- [x] Hinweistext „Bitte auch die Konzept-Datei auswählen…" erscheint, „Dateien prüfen"-Button bleibt deaktiviert, solange nicht beide Dateien gewählt sind

#### AC-3: Keine `.md`-Datei → Ablehnung mit Fehlermeldung
- [x] `.txt`-Datei wird sofort mit „Nur .md-Dateien werden unterstützt." abgelehnt (clientseitig in `validateFile`)

#### AC-4: Inhaltliche Kreuz-Format-Erkennung → Warnung mit „Trotzdem fortfahren"
- [x] Journey-Inhalt im Konzept-Slot löst die Warnung „sieht eher wie ein Journey-Transkript aus…" aus, „Trotzdem fortfahren" schaltet frei

#### AC-5: Strukturabweichung → erkannte Teile übernehmen, Rest als Lücke markieren
- [x] Fehlende „Frage 3"-Antwort wird korrekt als „Lücke — nicht angegeben" markiert, alle anderen Felder des Eintrags bleiben normal sichtbar

#### AC-6: Praktisch keine erkennbare Struktur → Hard-Fail statt leerer Vorschau
- [x] Reiner Fließtext ohne jede Vorlagen-Struktur wird mit klarer Fehlermeldung abgelehnt, es erscheint keine (fast) leere Vorschau

#### AC-7: Vollständiges granulares Speichern beider Dateien + Rohdateien im Bucket
- [x] Nach Bestätigung: >5 Sections, >30 Fields in der DB verifiziert (Journey + alle 11 Konzept-Abschnitte), Rohdateien unter `{projectId}/journey-transkript.md` bzw. `/konzept.md` im `imports`-Bucket abrufbar und inhaltlich korrekt

#### AC-8: Post-Import-Lese-Übersicht
- [x] Nach hartem Reload (nicht nur Client-State) zeigt die Seite die vollständige Journey- und Konzept-Übersicht — bestätigt, dass die Daten aus der DB kommen (Server Component + `getImportForProject`)

#### AC-9: Re-Import mit abhängigen Daten → aktive Bestätigung nötig
- [ ] **Nicht testbar in dieser Runde** — `hasDependentImportData()` ist bewusst ein Stub (liefert immer `false`, siehe Decision Log), da PROJ-4 noch nicht existiert. UI-Pfad (Warnung + „Trotzdem übernehmen") ist vollständig gebaut und verdrahtet, aber ohne echte abhängige Daten nicht auslösbar. Kein Bug — folgt der bewusst offen gelassenen Erweiterungsstelle.

#### AC-10: Re-Import ohne abhängige Daten → normaler Ersatz-Import
- [x] Zweiter Import über denselben Import-Datensatz bestätigt (gleiche `interview_imports.id`, gleiche Section-Anzahl nach Ersatz statt Verdopplung), Warnbanner „Der bestehende Import dieses Projekts wird durch diese Version ersetzt." erscheint korrekt

#### AC-11: Fehlerverhalten bei Upload-/Parse-Fehler
- [~] **Teilweise bestätigt, mit einem Fund** — der Hard-Fail-Pfad (AC-6) verhält sich korrekt (Fehlermeldung, ausgewählte Dateien bleiben erhalten, keine DB-Schreibung). Der mehrstufige Speichervorgang selbst (`saveImport`) ist jedoch **nicht transaktional** — siehe BUG-1 unten. Dieser Teilaspekt der Acceptance Criteria („keine Teildaten übernehmen") ist dadurch nicht in jedem Fehlerfall garantiert.

### Edge Cases Status

#### EC-1: Variable Fragenanzahl (Journey)
- [x] Test-Fixture mit nur 4 statt 10 Fragen (Frage 1–3 + Frage 10) korrekt geparst, keine falschen Lücken für die fehlenden Zwischenfragen

#### EC-2: Variable Abschnittsanzahl (Seitenstruktur)
- [x] Test-Fixture mit nur 2 Abschnitten korrekt geparst, „frei-Abschnitte"-Zusammenfassung korrekt als eigener „Zusammenfassung"-Eintrag angehängt, keine Vermischung mit dem letzten Abschnitt (bereits in der Frontend-Phase gefundener und behobener Bug bleibt behoben)

#### EC-3: `[frei]`-Antwortformat
- [x] Frage 2 mit `[frei] Hauptsächlich über Instagram…` korrekt als vollständiger Antworttext erkannt, nicht als Lücke

#### EC-4: „entfällt"/„keiner" als bewusst leerer Wert
- [x] „Differenzierung: entfällt" und „Subline: entfällt" korrekt als gefüllter Wert `entfällt` gespeichert, nicht als Lücke markiert — Unterscheidung zu echtem Fehlen funktioniert wie spezifiziert

#### EC-5: Große Dateien (5-MB-Limit)
- [x] Datei > 5 MB wird clientseitig mit „Die Datei ist größer als 5 MB." abgelehnt (serverseitige Prüfung in `checkImportFiles`/`saveImport` als zweite Absicherung im Code vorhanden, siehe `MAX_TEXT_LENGTH`)

### Security Audit Results
- [x] Authentication: `/kunden/[kundeId]/[projektId]` ohne Login → Redirect zu `/login?redirect=…` (auch mit Import-Inhalt dahinter)
- [x] Authorization/RLS: `anon`-Key hat weder SELECT- noch INSERT-Recht auf `interview_imports`, `import_sections`, `import_entries`, `import_fields` (Postgres verweigert bereits auf GRANT-Ebene, Code `42501` — RLS-Policies selbst sind zusätzlich korrekt auf `true` für `authenticated` gesetzt, kein PROJ-17-BUG-1-artiger Gap gefunden)
- [x] Storage: `imports`-Bucket-Policy ist auf `authenticated` beschränkt (kein `anon`-Zugriff), Bucket ist `public: false`
- [x] Input validation / XSS: eingeschleuster `<img src=x onerror=alert(1)>`-Payload in einer Journey-Antwort wird beim Rendern der Vorschau/Übersicht als reiner Text angezeigt (React-Escaping in `parsed-document-view.tsx`, kein `dangerouslySetInnerHTML` verwendet), kein echtes `<img>`-Element im DOM
- [x] Cross-Feature-Zugriffskontrolle: `deleteProject` blockiert korrekt, solange ein Interview-Import existiert (zusätzlich zur `ON DELETE RESTRICT`-Absicherung auf DB-Ebene)
- [ ] BUG-1 (siehe unten): fehlende Transaktion beim mehrstufigen Speichervorgang — kein Zugriffskontrollproblem, aber eine Datenintegritäts-/Zuverlässigkeitslücke, die im Security-Audit-Sinn als „unvollständige Fehlerbehandlung" zählt

### Regression Testing
- [x] PROJ-17-Suite (4 Tests, inkl. BUG-1-RLS-Regressionstest): weiterhin grün
- [x] PROJ-2-Suite (12 Tests): weiterhin grün
- [x] Gesamt: 20/20 Playwright-Tests grün (Chromium), 70/70 Vitest-Unit-Tests grün, `npm run lint` und `npm run build` sauber

### Bugs Found

#### BUG-1: `saveImport` ist nicht transaktional — ein Fehler mitten im Speichervorgang kann Teildaten dauerhaft in der DB hinterlassen
- **Severity:** High
- **Gefunden durch:** Code-Review (nicht empirisch im Browser reproduziert — ein gezielter Fehler-Injektionsversuch über ein kurzzeitiges Entziehen des INSERT-Rechts auf `import_entries` wurde vom Auto-Mode-Classifier als riskante Aktion auf der echten Datenbank blockiert und daher nicht durchgeführt; die Analyse unten basiert auf genauer Lektüre von `src/lib/imports/actions.ts`)
- **Beschreibung:** `saveImport()` (`src/lib/imports/actions.ts:81-181`) führt den eigentlichen Schreibvorgang als **fünf separate, nicht in einer DB-Transaktion gebündelte Schritte** aus: (1) Storage-Upload beider Rohdateien, (2) Upsert von `interview_imports`, (3) bei Re-Import: Löschen der alten `import_sections` (Cascade räumt Entries/Fields mit auf), (4) Insert von `import_sections`, (5) Insert von `import_entries`, (6) Insert von `import_fields`. Schlägt einer der späteren Schritte fehl (z. B. ein transienter Netzwerk-/DB-Fehler zwischen zwei `await supabase.from(...).insert(...)`-Aufrufen), werden die bereits erfolgreich ausgeführten Schritte **nicht zurückgerollt**. Die Funktion gibt zwar `{ status: 'error', ... }` zurück, aber `interview_imports` und ggf. bereits eingefügte `import_sections`/`import_entries` bleiben in der DB bestehen.
- **Steps to Reproduce (aus dem Code abgeleitet, nicht live verifiziert):**
  1. Einen gültigen Import für ein neues Projekt starten und bestätigen
  2. Angenommen der `import_fields`-Insert (letzter Schritt) schlägt fehl, während `import_sections` und `import_entries` bereits erfolgreich eingefügt wurden
  3. Erwartet laut AC-11: „keine Teildaten übernommen"
  4. Tatsächlich: Die Fehlermeldung erscheint im UI, aber `interview_imports`, die zugehörigen `import_sections` und `import_entries` bleiben in der DB bestehen — nur die Felder fehlen. Ein Reload würde eine unvollständige „Lese-Übersicht" zeigen (Abschnitte/Einträge ganz ohne Felder), ohne dass der Fehler noch sichtbar ist
- **Einschränkend:** Ein erneuter, erfolgreicher Import desselben Projekts repariert den Zustand selbst (Re-Import-Pfad löscht `import_sections` per Cascade und schreibt sauber neu) — der Fehler ist also nicht dauerhaft unreparierbar, aber zwischen dem Fehlschlag und einem manuellen erneuten Import zeigt die Anwendung einen stillen, unvollständigen Datenstand ohne erkennbaren Hinweis darauf.
- **Priority:** Fix before deployment (verletzt eine explizite Acceptance Criteria; Datenintegrität)

#### BUG-2: Storage-Uploads können bei partiellem Fehlschlag eine verwaiste Rohdatei hinterlassen
- **Severity:** Low
- **Beschreibung:** In `saveImport()` laufen die beiden Storage-Uploads parallel per `Promise.all`. Schlägt nur einer der beiden fehl, wurde der andere bereits erfolgreich hochgeladen/überschrieben, obwohl die Funktion insgesamt einen Fehler zurückgibt und keine DB-Zeile anlegt. Die hochgeladene Datei ist dann ein harmloses Waisenobjekt im `imports`-Bucket (wird bei einem späteren erfolgreichen Speichervorgang für dasselbe Projekt automatisch überschrieben, `upsert: true`) — kein Sicherheits- oder Sichtbarkeitsproblem, da die UI Storage-Inhalte nie direkt aus dem Bucket lädt, sondern ausschließlich über die DB-Struktur.
- **Priority:** Nice to have

### Summary
- **Acceptance Criteria:** 9/11 vollständig bestanden, 1 bewusst nicht testbar (AC-9, Stub-Abhängigkeit von PROJ-4), 1 teilweise bestanden mit Fund (AC-11 / BUG-1)
- **Bugs Found:** 2 total (1 High, 1 Low)
- **Security:** Pass — RLS/GRANTs/Storage-Policies korrekt, kein PROJ-17-BUG-1-artiger Gap, XSS-sicher, Auth/Cross-Feature-Zugriffskontrolle korrekt. BUG-1 ist ein Datenintegritäts-, kein Zugriffskontrollproblem.
- **Production Ready:** NO
- **Recommendation:** BUG-1 vor Deploy beheben (`saveImport` transaktional machen, z. B. über eine Postgres-Funktion/RPC, die alle Schritte in einer einzigen DB-Transaktion ausführt) — betrifft die Kernzusicherung des Features („kein Teil-Speichern bei Fehlern"). BUG-2 kann optional mitgenommen werden, ist aber nicht blockierend.

## Deployment
_To be added by /deploy_
