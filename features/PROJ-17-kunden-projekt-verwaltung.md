# PROJ-17: Kunden-/Projekt-Verwaltung

## Status: Planned
**Created:** 2026-08-25
**Last Updated:** 2026-08-25

## Dependencies
- Requires: PROJ-2 (Agentur-Login) — Auth, geschütztes Layout, Dashboard-Platzhalter

## User Stories
- Als Agentur-Mitarbeiter möchte ich Kunden anlegen können, damit ich ein importiertes Interview später einem Kunden zuordnen kann.
- Als Agentur-Mitarbeiter möchte ich zu einem Kunden mehrere Projekte anlegen können, damit auch eine zweite Landingpage für denselben Kunden abgebildet werden kann.
- Als Agentur-Mitarbeiter möchte ich Kunden/Projekte bearbeiten und archivieren können, damit abgeschlossene Projekte nicht in der aktiven Übersicht stören, aber als Historie erhalten bleiben.
- Als Agentur-Mitarbeiter möchte ich fehlerhaft angelegte Kunden/Projekte ohne echte Daten endgültig löschen können, damit die Übersicht sauber bleibt.
- Als Agentur-Mitarbeiter möchte ich auf dem Dashboard einen schnellen Überblick über meine Kunden/Projekte sehen, ohne extra navigieren zu müssen.

## Out of Scope
- Realtime-Hinweis bei gleichzeitiger Bearbeitung desselben Kunden durch mehrere Mitarbeiter (technisch machbar via Supabase Realtime Presence) — bewusst zurückgestellt, keine Notwendigkeit solange last-write-wins ausreicht; mögliche spätere Erweiterung
- Optimistic Locking / Konflikterkennung bei gleichzeitiger Bearbeitung — last-write-wins reicht für Solo-/Kleinteam-Projekt
- Rollen/Berechtigungen pro Kunde (alle eingeloggten Mitarbeiter sehen alle Kunden/Projekte) — Single-Tenant-Entscheidung aus PROJ-1
- Kunden-Zugriffslink (individueller Link für Kunden-Ansicht/Mitarbeit) — PROJ-10
- Interview-Import, Graph-Visualisierung, Wireframe-Inhalte innerhalb eines Projekts — PROJ-3 ff.
- Harte Eindeutigkeitsprüfung der Ansprechpartner-E-Mail auf DB-Ebene — nur weiche UI-Warnung
- Komplexe Filter/Sortierung (z. B. nach Status, Datum, verantwortlichem Mitarbeiter) — nur Textsuche + "Archiviert anzeigen"-Toggle für MVP
- Endgültiges Löschen von Kunden/Projekten MIT abhängigen Daten — nur Archivieren möglich, sobald echte Inhalte existieren; kann später erweitert werden

## Acceptance Criteria

**Format:** Angenommen [Vorbedingung] / Wenn [Aktion] / Dann [Ergebnis]

- [ ] Angenommen der Nutzer ist eingeloggt, wenn er auf `/kunden` einen neuen Kunden mit Firmenname und Ansprechpartner-E-Mail anlegt, dann erscheint der Kunde in der Liste und der Nutzer wird automatisch in das dabei automatisch angelegte erste Projekt dieses Kunden weitergeleitet
- [ ] Angenommen ein Kunde mit derselben Ansprechpartner-E-Mail existiert bereits, wenn ein neuer Kunde mit dieser E-Mail angelegt wird, dann erscheint eine Warnung mit Verweis auf den bestehenden Kunden, das Anlegen bleibt trotzdem möglich
- [ ] Angenommen das Kunden-Formular wird ohne Pflichtfelder (Firmenname, Ansprechpartner-E-Mail) abgeschickt, dann erscheinen Validierungsfehler für die fehlenden Felder und es wird kein Kunde angelegt
- [ ] Angenommen ein Kunde existiert, wenn der Nutzer ein weiteres Projekt für diesen Kunden anlegt, dann erscheint es in der Projekt-Liste dieses Kunden
- [ ] Angenommen ein Kunde oder Projekt existiert, wenn der Nutzer "Archivieren" wählt, dann verschwindet der Eintrag aus der Standardansicht, bleibt aber über den Filter "Archiviert anzeigen" sichtbar und kann von dort reaktiviert werden
- [ ] Angenommen ein Kunde/Projekt hat keine abhängigen Daten (z. B. noch keinen Interview-Import), wenn der Nutzer "Endgültig löschen" wählt und den Bestätigungsdialog bestätigt, dann wird der Datensatz unwiderruflich entfernt
- [ ] Angenommen ein Kunde/Projekt hat bereits abhängige Daten, wenn der Nutzer versucht, ihn endgültig zu löschen, dann ist die Löschoption deaktiviert bzw. wird verhindert, nur Archivieren bleibt möglich
- [ ] Angenommen es existiert mindestens ein Kunde, wenn der Nutzer das Dashboard aufruft, dann zeigt das Kunden-Widget die Gesamtzahl an Kunden/aktiven Projekten sowie die 3–5 zuletzt bearbeiteten Einträge, mit einem Link "Alle Kunden ansehen" zu `/kunden`
- [ ] Angenommen noch kein Kunde existiert, wenn der Nutzer `/kunden` oder das Dashboard aufruft, dann wird ein Leerzustand mit Hinweistext und "Ersten Kunden anlegen"-Button angezeigt (auf dem Dashboard in reduzierter Form)
- [ ] Angenommen der Nutzer gibt einen Suchbegriff auf `/kunden` ein, dann wird die Liste live auf Kunden gefiltert, deren Firmenname oder Ansprechpartner-Name den Begriff enthält

## Edge Cases
- Was passiert, wenn zwei Mitarbeiter gleichzeitig denselben Kunden bearbeiten? → Kein Konfliktschutz, letzter Speicherstand gewinnt (last-write-wins).
- Was passiert, wenn ein archivierter Kunde reaktiviert wird, dessen Projekte ebenfalls archiviert waren? → Nur der Kunde wird reaktiviert, seine Projekte behalten jeweils ihren eigenen Status (kein automatisches Mit-Reaktivieren).
- Was passiert bei einem Netzwerk-/Serverfehler beim Speichern eines Kunden-/Projekt-Formulars? → Fehlermeldung erscheint, eingegebene Formulardaten bleiben erhalten (analog PROJ-2 Login-Verhalten).
- Was passiert, wenn ein Projekt gelöscht/archiviert wird, aber der zugehörige Kunde noch aktiv ist? → Nur das Projekt ändert sich, der Kunde bleibt unberührt.
- Was passiert, wenn der letzte verbleibende (nicht archivierte) Kunde archiviert wird? → `/kunden` und das Dashboard-Widget zeigen den normalen Leerzustand, kein Fehler; über "Archiviert anzeigen" bleibt der Kunde sichtbar.

## Technical Requirements (optional)
- Security: Alle Routen unter dem bestehenden geschützten Layout aus PROJ-2 — nur eingeloggte Mitarbeiter erreichen `/kunden`
- Zugriff: Alle eingeloggten Mitarbeiter sehen und bearbeiten alle Kunden/Projekte (Shared Visibility, keine Owner-Einschränkung — siehe PROJ-1 Decision Log)

## Open Questions
- [ ] Genaue technische Bedingung für "abhängige Daten", die hartes Löschen verhindern (z. B. vorhandene `interview_imports`- oder `client_access_links`-Einträge) — wird bei `/architecture` konkretisiert; die referenzierten Features (PROJ-3, PROJ-10) existieren zum jetzigen Zeitpunkt noch nicht
- [ ] Realtime-Presence-Hinweis bei gleichzeitiger Bearbeitung — bewusst zurückgestellt (siehe Out of Scope), evtl. spätere Erweiterung falls in der Praxis relevant

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Datenmodell 1 Kunde : viele Projekte von Anfang an | Spätere Erweiterung (z. B. zweite Landingpage für denselben Kunden) sonst nur per Datenmodell-Migration möglich; UI bleibt trotzdem simpel (Kunde anlegen → automatisch ins erste Projekt) | 2026-08-25 |
| Kunde: Firmenname + Ansprechpartner-E-Mail Pflicht, Ansprechpartner-Name + Notizen optional | Minimum für Kontaktaufnahme; E-Mail wird später für PROJ-10 (Kunden-Zugriffslink) gebraucht | 2026-08-25 |
| Projekt: Projektname + Status Pflicht, Notizen optional; keine Inhaltsfelder | PROJ-17 baut nur die Hülle — Graph/Wireframe-Inhalte sind eigene Features ab PROJ-3 | 2026-08-25 |
| Archivieren (Status-Flag) statt hartem Löschen als Standardweg | Historie/Referenz für spätere Kalkulations-Vergleiche bleibt erhalten (siehe PRD Success Metrics), verhindert versehentlichen Datenverlust bei Kunden mit echtem Fortschritt | 2026-08-25 |
| Zusätzliches hartes Löschen möglich, aber nur ohne abhängige Daten | Erlaubt Aufräumen von Fehlanlagen/Duplikaten, ohne echten Kundenfortschritt zu gefährden; uneingeschränktes Löschen bewusst vertagt | 2026-08-25 |
| Weiche UI-Warnung statt harter Eindeutigkeitsprüfung bei doppelter Ansprechpartner-E-Mail | Legitime Fälle möglich (eine Ansprechperson betreut mehrere Kunden/Marken); Warnung reicht, um versehentliche Doppelanlage zu vermeiden | 2026-08-25 |
| Eigene Route `/kunden` für die volle Verwaltung, zusätzlich kompaktes Widget auf `/dashboard` | Dashboard bleibt schneller Überblick statt Doppelung der vollen Liste; die eigentliche Verwaltungsarbeit hat einen eigenen, dedizierten Bereich | 2026-08-25 |
| Dashboard-Widget zeigt Kennzahlen-Karte + 3–5 zuletzt bearbeitete Einträge + Link zu `/kunden` | Genug Überblick ohne die volle Liste zu duplizieren | 2026-08-25 |
| Kein Konfliktschutz bei gleichzeitiger Bearbeitung (last-write-wins) | Solo-/Kleinteam-Projekt (PRD Constraints), gleichzeitige Bearbeitung ist ein seltener Randfall, Aufwand für Konflikterkennung steht in keinem Verhältnis zum Nutzen | 2026-08-25 |
| Realtime-Presence-Hinweis explizit zurückgestellt (siehe Out of Scope) | Zusätzliche Komplexität ohne echten Konfliktschutz-Nutzen, da ohnehin last-write-wins gilt; kann bei Bedarf später nachgerüstet werden | 2026-08-25 |
| Nur Textsuche (Firmenname/Ansprechpartner) + "Archiviert anzeigen"-Toggle für die MVP-Liste | Ausreichend für realistische Kundenzahl in kleinem Team, spart UI-Komplexität gegenüber vollem Filter-/Sortier-System | 2026-08-25 |

### Technical Decisions
<!-- Added by /architecture -->
| Decision | Rationale | Date |
|----------|-----------|------|
| _Example: localStorage over Supabase_ | _No user accounts needed; data is device-local_ | YYYY-MM-DD |

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
