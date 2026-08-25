# PROJ-17: Kunden-/Projekt-Verwaltung

## Status: In Progress
**Created:** 2026-08-25
**Last Updated:** 2026-08-25 (Frontend)

## Implementierungsnotizen
- Frontend umgesetzt: `/kunden` (Kunden-Übersicht mit Suche + "Archiviert anzeigen"-Toggle), `/kunden/[kundeId]` (Kunde-Detail + Projekt-Liste), `/kunden/[kundeId]/[projektId]` (Projekt-Detail-Platzhalter für PROJ-3 ff.), Dashboard-Widget auf `/dashboard`. Navigation im geschützten Header (`src/app/(protected)/layout.tsx`) um einen "Kunden"-Link ergänzt.
- Komponenten in `src/components/clients/`: `client-list.tsx`, `client-detail-view.tsx`, `project-detail-view.tsx`, `client-form-dialog.tsx`, `project-form-dialog.tsx`, `delete-alert-dialog.tsx`, `dashboard-widget.tsx`. Formulare mit `react-hook-form` + `zod` (`src/lib/validations/clients.ts`), Typen in `src/lib/clients/types.ts`.
- **Datenhaltung vorübergehend über `localStorage`, nicht Supabase.** Die `clients`/`projects`-Tabellen aus dem Tech Design existieren erst nach `/backend` — bis dahin übernimmt der Hook `src/hooks/useClients.ts` (inkl. Unit-Tests `useClients.test.ts`) das komplette CRUD-Verhalten 1:1 nach dem im Tech Design beschriebenen Datenmodell (gleiche Feldnamen, gleiche Lösch-Schutzprüfung), damit `/backend` die Persistenz austauschen kann, ohne die UI anzufassen (siehe Backend-Skill-Checkliste "Replace any mock data or localStorage with API calls").
- Alle Acceptance Criteria im Browser durchgespielt (Playwright, temporäres Review-Skript, danach wieder entfernt): Kunde anlegen → Auto-Redirect ins erste Projekt, Duplikat-E-Mail-Warnung samt "Trotzdem anlegen", Pflichtfeld-Validierung, Projekt anlegen, Archivieren/Reaktivieren (Kunde behält Projekte unverändert), Lösch-Schutzprüfung (deaktiviertes Menü-Item bei vorhandenen Projekten), Dashboard-Widget-Zahlen, Leerzustände auf `/kunden` und Dashboard, Textsuche — keine Konsolenfehler. Zusätzlich PROJ-2-Regressionssuite erneut grün (12/12), da der gemeinsame Header verändert wurde.
- Beim Testen aufgefallen und behoben: Die E-Mail-Adresse im Header lief bei 375px (Mobile) aus dem sichtbaren Bereich heraus, sobald der neue "Kunden"-Link dazukam — jetzt `hidden sm:inline` auf dem E-Mail-`<span>`, betrifft auch den bestehenden PROJ-2-Header.

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
- [x] ~~Genaue technische Bedingung für "abhängige Daten", die hartes Löschen verhindern~~ — bei `/architecture` konkretisiert, siehe Tech Design Abschnitt "Lösch-Schutzprüfung"
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
| Zwei neue Supabase-Tabellen `clients` + `projects` (Postgres, nicht localStorage) | Daten müssen für alle eingeloggten Mitarbeiter geräteübergreifend sichtbar sein (Shared Visibility, siehe PROJ-1); Tabellennamen folgen dem in PROJ-1 bereits skizzierten Schema-Entwurf | 2026-08-25 |
| RLS + explizite GRANTs für `authenticated` (SELECT/INSERT/UPDATE/DELETE), kein Grant für `anon` | Gleiches Muster wie `profiles` aus PROJ-1; PROJ-1s QA hat gezeigt, dass Supabase GRANTs nicht automatisch vergibt (BUG-1) — hier von Anfang an explizit gesetzt statt erst in der QA nachzubessern | 2026-08-25 |
| Kein Owner-Feld auf `clients`/`projects` (keine RLS-Einschränkung nach Ersteller) | Deckt sich mit der Single-Tenant-/Shared-Visibility-Entscheidung aus PROJ-1 — alle Mitarbeiter sehen und bearbeiten alle Datensätze | 2026-08-25 |
| Server Actions statt eigener API-Routen für alle Schreiboperationen (Kunde/Projekt anlegen, bearbeiten, archivieren, löschen) | Konsistent mit dem in PROJ-2 etablierten Muster (`src/lib/auth/actions.ts`); Datenlisten (Übersicht, Dashboard-Widget) werden per Server Component direkt gelesen | 2026-08-25 |
| Kunde-Anlegen erzeugt serverseitig automatisch ein erstes Projekt (Default-Name = Firmenname, sofort umbenennbar) | Setzt die Vorgabe "Kunde anlegen → automatisch ins erste Projekt springen" technisch um, ohne dass der Nutzer einen zweiten Schritt braucht | 2026-08-25 |
| Duplikat-E-Mail-Warnung als serverseitige Prüfung vor dem eigentlichen Insert (nicht als DB-Constraint) | Muss weich bleiben (Anlegen trotzdem möglich) — ein DB-Constraint würde das erzwingen; die Prüfung liest zuerst vorhandene Kunden mit gleicher E-Mail, das UI entscheidet dann über Warnung vs. direktes Anlegen | 2026-08-25 |
| Lösch-Schutzprüfung als eigenständige, erweiterbare Funktion statt fest verdrahteter Bedingung | Siehe Tech-Design-Abschnitt "Lösch-Schutzprüfung" — löst die bisher offene Frage zur genauen Bedingung für "abhängige Daten" | 2026-08-25 |
| Suche client-seitig (im Browser) über die bereits geladene Kundenliste, kein serverseitiger Such-Endpoint | Für die realistische Kundenzahl eines Solo-/Kleinteam-Tools ausreichend performant, spart einen zusätzlichen Request-Roundtrip pro Tastenanschlag | 2026-08-25 |
| Routing: `/kunden` (Übersicht), `/kunden/[kundeId]` (Projekt-Liste eines Kunden), `/kunden/[kundeId]/[projektId]` (Projekt-Detail/Platzhalter) | Bildet die 1:viele-Beziehung direkt in der URL-Struktur ab, `/kunden/[kundeId]/[projektId]` ist bereits der spätere Einstiegspunkt für PROJ-3 ff. | 2026-08-25 |
| Keine neuen npm-Pakete nötig | `react-hook-form`, `zod`, alle benötigten shadcn/ui-Komponenten (Table, Dialog, AlertDialog, DropdownMenu, Badge, Input) sind bereits aus PROJ-1/PROJ-2 vorhanden | 2026-08-25 |
| Frontend-Phase nutzt `localStorage` (Hook `useClients`) statt Supabase-Aufrufen | `clients`/`projects`-Tabellen existieren erst nach `/backend`; Hook bildet Feldnamen, IDs und Lösch-Schutzprüfung 1:1 nach dem Tech-Design-Datenmodell nach, damit `/backend` nur die Persistenzschicht austauschen muss, ohne Komponenten/Props zu ändern | 2026-08-25 |

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### A) Komponenten-Struktur (visueller Baum)

```
/kunden (Kunden-Übersicht — ersetzt keine bestehende Seite, neue Route)
├── Suchfeld (Textsuche über Firmenname/Ansprechpartner-Name)
├── "Archiviert anzeigen"-Umschalter
├── "Neuer Kunde"-Button → öffnet Kunde-Anlegen-Dialog
├── Kunden-Liste (Tabelle: Firmenname, Ansprechpartner, Anzahl Projekte, Status)
│   ├── Kunden-Zeile → Klick öffnet Kunden-Detail
│   │   └── Aktionen-Menü (Bearbeiten, Archivieren/Reaktivieren, Endgültig löschen)
│   └── Leerzustand ("Noch keine Kunden angelegt" + "Ersten Kunden anlegen"-Button)
└── Kunde-Anlegen/Bearbeiten-Dialog
    ├── Formularfelder: Firmenname*, Ansprechpartner-Name, Ansprechpartner-E-Mail*, Notizen
    └── Weiche Duplikat-Warnung (erscheint erst nach Absenden, falls E-Mail bereits existiert)

/kunden/[kundeId] (Kunden-Detail — Projekt-Liste dieses Kunden)
├── Kunden-Stammdaten-Karte (Bearbeiten-Button)
├── "Neues Projekt"-Button → öffnet Projekt-Anlegen-Dialog
├── Projekt-Liste (Tabelle: Projektname, Status)
│   ├── Projekt-Zeile → Klick öffnet Projekt-Detail
│   │   └── Aktionen-Menü (Bearbeiten, Archivieren/Reaktivieren, Endgültig löschen)
│   └── Leerzustand ("Noch keine Projekte" + "Erstes Projekt anlegen"-Button)
└── Lösch-Bestätigungsdialog (gemeinsam genutzt für Kunde + Projekt; zeigt "Endgültig löschen"
    nur an, wenn die Lösch-Schutzprüfung grün ist — siehe unten)

/kunden/[kundeId]/[projektId] (Projekt-Detail)
└── Projekt-Stammdaten + Platzhalter-Hinweis ("Interview-Import folgt in PROJ-3") —
    dieser Platzhalter wird durch PROJ-3 ff. ersetzt, die Route selbst bleibt bestehen

Dashboard-Widget (auf bestehender /dashboard-Seite, ergänzt den bisherigen Platzhalter)
├── Kennzahlen-Karte ("X Kunden, Y aktive Projekte")
├── Liste der 3–5 zuletzt bearbeiteten Kunden/Projekte
├── Leerzustand (reduzierte Variante: "Noch keine Kunden – Kunden anlegen →")
└── Link "Alle Kunden ansehen" → /kunden
```

### B) Datenmodell (in einfacher Sprache)

**Kunde (Tabelle `clients`)**
- Eindeutige ID
- Firmenname (Pflicht)
- Ansprechpartner-Name (optional)
- Ansprechpartner-E-Mail (Pflicht)
- Notizen (optional, Freitext)
- Status: Aktiv oder Archiviert
- Angelegt-Zeitstempel, Zuletzt-bearbeitet-Zeitstempel (steuert die "zuletzt bearbeitet"-Sortierung im Dashboard-Widget)

**Projekt (Tabelle `projects`)**
- Eindeutige ID
- Verknüpfung zum zugehörigen Kunden (Pflicht)
- Projektname (Pflicht)
- Status: Aktiv oder Archiviert
- Notizen (optional, Freitext)
- Angelegt-Zeitstempel, Zuletzt-bearbeitet-Zeitstempel

Gespeichert in: Supabase (PostgreSQL) — wie alle bisherigen Daten des Tools. Sichtbarkeit: alle eingeloggten Agentur-Mitarbeiter sehen und bearbeiten alle Kunden/Projekte (kein Besitzer-Konzept, siehe PROJ-1 Single-Tenant-Entscheidung).

**Lösch-Schutzprüfung** (löst die bisherige offene Frage aus dem Spec-Interview): Bevor "Endgültig löschen" angeboten wird, prüft das System, ob abhängige Daten existieren:
- Bei einem **Kunden**: blockiert, sobald der Kunde mindestens ein Projekt hat (unabhängig vom Projekt-Status) — der Kunde muss zuerst all seine Projekte losgeworden sein.
- Bei einem **Projekt**: aktuell blockiert diese Prüfung nichts, da die Tabellen mit "echten Inhalten" (Interview-Importe aus PROJ-3, Zugriffslinks aus PROJ-10) noch nicht existieren. Die Prüfung ist bewusst als eigenständiger, erweiterbarer Baustein angelegt — sobald PROJ-3/PROJ-10 gebaut werden, wird dort einfach eine weitere Bedingung ergänzt, ohne den Lösch-Ablauf selbst neu zu entwerfen.

### C) Tech-Entscheidungen (Begründung)

- **Supabase statt localStorage:** Die Daten müssen für alle Mitarbeiter (nicht nur ein Gerät) sichtbar sein — localStorage scheidet damit aus, das Tool nutzt ohnehin bereits Supabase seit PROJ-1.
- **Server Actions statt eigener API-Routen:** Für Formulare (Anlegen/Bearbeiten/Archivieren/Löschen) wird das gleiche Muster wie beim Login (PROJ-2) verwendet — spart eine parallele API-Schicht, Listen werden direkt serverseitig gelesen.
- **Automatisches erstes Projekt beim Kunden-Anlegen:** Erspart dem Nutzer einen zweiten manuellen Schritt und setzt die im Interview festgelegte "Kunde anlegen → direkt ins erste Projekt springen"-Erwartung um.
- **Client-seitige Suche:** Bei der zu erwartenden Kundenanzahl eines kleinen Agentur-Teams reicht es, die geladene Liste im Browser zu filtern — kein zusätzlicher Server-Roundtrip pro Tastendruck nötig.
- **Erweiterbare Lösch-Schutzprüfung:** Verhindert, dass spätere Features (PROJ-3, PROJ-10) eine Neu-Konzeption des Lösch-Ablaufs erzwingen — sie müssen nur ihre eigene Bedingung ergänzen.

### D) Abhängigkeiten (Pakete)

Keine neuen npm-Pakete nötig — alle benötigten Bausteine (`react-hook-form`, `zod`, `@hookform/resolvers`, shadcn/ui `Table`/`Dialog`/`AlertDialog`/`DropdownMenu`/`Badge`/`Input`, `@supabase/ssr`) sind bereits aus PROJ-1/PROJ-2 im Projekt vorhanden.

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
