# PROJ-17: Kunden-/Projekt-Verwaltung

## Status: Deployed
**Created:** 2026-08-25
**Last Updated:** 2026-08-27 (Deploy)

## Implementierungsnotizen
- **BUG-1-Fix (2026-08-25):** Migration `enforce_archived_before_delete` — `ALTER POLICY` auf den DELETE-Policies von `clients` und `projects`, von `USING (true)` auf `USING (status = 'archived')`. Die Archivieren-vor-Löschen-Regel gilt damit auch auf Datenbankebene, nicht mehr nur in der Server Action — konsistent mit dem bereits bestehenden `ON DELETE RESTRICT` für die "hat noch Projekte"-Bedingung. Live verifiziert (echter Bypass-Versuch mit normaler Nutzer-Session: vorher `count: 1`/Zeile weg, nachher `count: 0`/Zeile bleibt, nach Archivieren dann `count: 1`/Zeile weg). Als permanenter Regressionstest in `tests/PROJ-17-kunden-projekt-verwaltung.spec.ts` ergänzt (4/4 grün auf Chromium + WebKit). PROJ-2-Regressionssuite weiterhin 12/12, `npm test`/`build`/`lint` unverändert sauber.
- **Refine nachgezogen (Lösch-Schutz-Verschärfung, 2026-08-25):** `deleteClient`/`deleteProject` in `src/lib/clients/actions.ts` prüfen jetzt zusätzlich `status === 'archived'`, bevor überhaupt die abhängige-Daten-Prüfung greift — serverseitig, unabhängig von der UI (Defense in Depth, gleiches Muster wie die bestehende Projekt-Zählung). Auf UI-Seite spiegelt `client-list.tsx` (`getDeleteBlockReason`) und `client-detail-view.tsx` (`getProjectDeleteBlockReason`, dort vorher komplett ungeschützt — Projekte hatten bislang gar keine Lösch-Bedingung) dieselbe Logik mit differenzierten Tooltip-Texten ("Muss zuerst archiviert werden…" vs. "…hat noch Projekte"). Bestehende permanente E2E-Suite (`tests/PROJ-17-kunden-projekt-verwaltung.spec.ts`) entsprechend angepasst (archiviert jetzt vor jedem Löschversuch) und erneut grün auf Chromium + WebKit, PROJ-2-Regressionssuite weiterhin 12/12.
- **Beim Testen aufgefallen und behoben (Test-Skript, kein App-Bug):** Die Umgebung enthält inzwischen dauerhaft echte Kunden ("1. Testkunde"/"2. Testkunde", vom Nutzer selbst angelegt) — die permanente Suite prüfte bislang einen exakten "0 Kunden gesamt"-Leerzustand und einen exakten Dashboard-Zahlenwert, beides war dadurch nicht mehr zuverlässig. Auf Muster-Matching (`/\d+ Kunden?, .../`) bzw. auf die umgebungsunabhängige Such-Leerzustand-Variante umgestellt; der reine "0 Kunden"-Leerzustand bleibt durch die ursprüngliche `/qa`-Runde (gegen eine damals leere Datenbank) abgedeckt.
- Frontend umgesetzt: `/kunden` (Kunden-Übersicht mit Suche + "Archiviert anzeigen"-Toggle), `/kunden/[kundeId]` (Kunde-Detail + Projekt-Liste), `/kunden/[kundeId]/[projektId]` (Projekt-Detail-Platzhalter für PROJ-3 ff.), Dashboard-Widget auf `/dashboard`. Navigation im geschützten Header (`src/app/(protected)/layout.tsx`) um einen "Kunden"-Link ergänzt.
- Komponenten in `src/components/clients/`: `client-list.tsx`, `client-detail-view.tsx`, `project-detail-view.tsx`, `client-form-dialog.tsx`, `project-form-dialog.tsx`, `delete-alert-dialog.tsx`, `dashboard-widget.tsx`. Formulare mit `react-hook-form` + `zod` (`src/lib/validations/clients.ts`), Typen in `src/lib/clients/types.ts`.
- Alle Acceptance Criteria im Browser durchgespielt (Playwright, temporäres Review-Skript, danach wieder entfernt): Kunde anlegen → Auto-Redirect ins erste Projekt, Duplikat-E-Mail-Warnung samt "Trotzdem anlegen", Pflichtfeld-Validierung, Projekt anlegen, Archivieren/Reaktivieren (Kunde behält Projekte unverändert), Lösch-Schutzprüfung (deaktiviertes Menü-Item bei vorhandenen Projekten), Dashboard-Widget-Zahlen, Leerzustände auf `/kunden` und Dashboard, Textsuche — keine Konsolenfehler. Zusätzlich PROJ-2-Regressionssuite erneut grün (12/12), da der gemeinsame Header verändert wurde.
- Beim Testen aufgefallen und behoben: Die E-Mail-Adresse im Header lief bei 375px (Mobile) aus dem sichtbaren Bereich heraus, sobald der neue "Kunden"-Link dazukam — jetzt `hidden sm:inline` auf dem E-Mail-`<span>`, betrifft auch den bestehenden PROJ-2-Header.
- **Backend umgesetzt:** Migration `create_clients_and_projects_tables` legt `public.clients` + `public.projects` an (Felder wie im Tech Design), RLS aktiviert, vier Policies je Tabelle (SELECT/INSERT/UPDATE/DELETE für `authenticated`, Shared Visibility ohne Owner-Filter — analog `profiles` aus PROJ-1), explizite GRANTs für `authenticated`/`service_role` (kein Grant für `anon`, siehe PROJ-1 BUG-1-Lektion). `updated_at` wird per Trigger (`set_updated_at()`) automatisch gepflegt statt clientseitig. `projects.client_id` referenziert `clients.id` mit `ON DELETE RESTRICT` — setzt die Lösch-Schutzprüfung zusätzlich auf DB-Ebene durch (Defense in Depth neben der Server-Action-Prüfung).
- Datenzugriff aufgeteilt: `src/lib/clients/queries.ts` (reine Lesefunktionen für Server Components, u. a. `getClients`, `getClientById`, `getProjectsForClient`), `src/lib/clients/actions.ts` (Server Actions für alle Mutationen: `createClientAndFirstProject`, `updateClient`, `setClientStatus`, `deleteClient`, `createProject`, `updateProject`, `setProjectStatus`, `deleteProject` — jede beginnt mit einem eigenen `requireAuth()`-Check trotz Schutz durch Layout + RLS, Defense in Depth gemäß `.claude/rules/backend.md`). Jede Mutation ruft `revalidatePath()` für die betroffenen Routen auf.
- **`localStorage`-Zwischenlösung aus der Frontend-Phase entfernt:** `src/hooks/useClients.ts` (+ Test) gelöscht, alle Seiten sind jetzt Server Components, die per `queries.ts` echte Daten laden und als Props an die (weiterhin interaktiven) Client-Komponenten weiterreichen; Mutationen laufen über die neuen Server Actions statt über den Hook.
- Duplikat-E-Mail-Prüfung läuft jetzt serverseitig (Server Action prüft per `ilike` auf `contact_email` vor dem Insert, zweiter Aufruf mit `confirmDuplicate=true` überspringt die Prüfung) statt gegen ein lokales Array.
- Backend-Verifikation per Playwright gegen die echte Supabase-Instanz (temporäres Review-Skript, danach entfernt): Kunde/Projekt-CRUD inkl. Duplikat-Warnung funktioniert mit echter Persistenz (Daten überleben einen harten Reload), Lösch-Schutzprüfung greift korrekt, und — wichtig für die Shared-Visibility-Entscheidung — ein zweiter, unabhängig eingeloggter Testnutzer sieht dieselben Kunden/Projekte. PROJ-2-Regressionssuite erneut grün (12/12).
- `mcp__supabase__get_advisors` (security + performance) nach der Migration geprüft: keine RLS-bezogenen Befunde; die einzigen Hinweise sind vier "Unused Index"-INFOs (erwartbar bei leeren, gerade erst angelegten Tabellen) und die bereits aus PROJ-1 bekannte, unabhängige "Leaked Password Protection"-Warnung.

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
- Endgültiges Löschen direkt aus dem aktiven Zustand (ohne vorherige Archivierung) — bewusst nicht möglich, erzwingt einen Zwischenschritt gegen versehentliches Löschen (ergänzt bei der PROJ-3-Spec-Interview, 2026-08-25)

## Acceptance Criteria

**Format:** Angenommen [Vorbedingung] / Wenn [Aktion] / Dann [Ergebnis]

- [ ] Angenommen der Nutzer ist eingeloggt, wenn er auf `/kunden` einen neuen Kunden mit Firmenname und Ansprechpartner-E-Mail anlegt, dann erscheint der Kunde in der Liste und der Nutzer wird automatisch in das dabei automatisch angelegte erste Projekt dieses Kunden weitergeleitet
- [ ] Angenommen ein Kunde mit derselben Ansprechpartner-E-Mail existiert bereits, wenn ein neuer Kunde mit dieser E-Mail angelegt wird, dann erscheint eine Warnung mit Verweis auf den bestehenden Kunden, das Anlegen bleibt trotzdem möglich
- [ ] Angenommen das Kunden-Formular wird ohne Pflichtfelder (Firmenname, Ansprechpartner-E-Mail) abgeschickt, dann erscheinen Validierungsfehler für die fehlenden Felder und es wird kein Kunde angelegt
- [ ] Angenommen ein Kunde existiert, wenn der Nutzer ein weiteres Projekt für diesen Kunden anlegt, dann erscheint es in der Projekt-Liste dieses Kunden
- [ ] Angenommen ein Kunde oder Projekt existiert, wenn der Nutzer "Archivieren" wählt, dann verschwindet der Eintrag aus der Standardansicht, bleibt aber über den Filter "Archiviert anzeigen" sichtbar und kann von dort reaktiviert werden
- [ ] Angenommen ein Kunde/Projekt ist bereits archiviert und hat keine abhängigen Daten (z. B. noch keinen Interview-Import), wenn der Nutzer "Endgültig löschen" wählt und den Bestätigungsdialog bestätigt, dann wird der Datensatz unwiderruflich entfernt
- [ ] Angenommen ein Kunde/Projekt ist noch aktiv (nicht archiviert), dann ist die Löschoption deaktiviert — unabhängig davon, ob abhängige Daten existieren; zuerst muss archiviert werden
- [ ] Angenommen ein bereits archivierter Kunde/Projekt hat abhängige Daten, wenn der Nutzer versucht, ihn endgültig zu löschen, dann ist die Löschoption weiterhin deaktiviert bzw. wird verhindert
- [ ] Angenommen es existiert mindestens ein Kunde, wenn der Nutzer das Dashboard aufruft, dann zeigt das Kunden-Widget die Gesamtzahl an Kunden/aktiven Projekten sowie die 3–5 zuletzt bearbeiteten Einträge, mit einem Link "Alle Kunden ansehen" zu `/kunden`
- [ ] Angenommen noch kein Kunde existiert, wenn der Nutzer `/kunden` oder das Dashboard aufruft, dann wird ein Leerzustand mit Hinweistext und "Ersten Kunden anlegen"-Button angezeigt (auf dem Dashboard in reduzierter Form)
- [ ] Angenommen der Nutzer gibt einen Suchbegriff auf `/kunden` ein, dann wird die Liste live auf Kunden gefiltert, deren Firmenname oder Ansprechpartner-Name den Begriff enthält

## Edge Cases
- Was passiert, wenn zwei Mitarbeiter gleichzeitig denselben Kunden bearbeiten? → Kein Konfliktschutz, letzter Speicherstand gewinnt (last-write-wins).
- Was passiert, wenn ein archivierter Kunde reaktiviert wird, dessen Projekte ebenfalls archiviert waren? → Nur der Kunde wird reaktiviert, seine Projekte behalten jeweils ihren eigenen Status (kein automatisches Mit-Reaktivieren).
- Was passiert bei einem Netzwerk-/Serverfehler beim Speichern eines Kunden-/Projekt-Formulars? → Fehlermeldung erscheint, eingegebene Formulardaten bleiben erhalten (analog PROJ-2 Login-Verhalten).
- Was passiert, wenn ein Projekt gelöscht/archiviert wird, aber der zugehörige Kunde noch aktiv ist? → Nur das Projekt ändert sich, der Kunde bleibt unberührt.
- Was passiert, wenn der letzte verbleibende (nicht archivierte) Kunde archiviert wird? → `/kunden` und das Dashboard-Widget zeigen den normalen Leerzustand, kein Fehler; über "Archiviert anzeigen" bleibt der Kunde sichtbar.
- Was passiert, wenn ein aktiver Kunde/Projekt ohne jegliche abhängige Daten gelöscht werden soll? → Nicht direkt möglich; "Endgültig löschen" bleibt deaktiviert, bis der Kunde/das Projekt zuerst archiviert wurde (Sicherheitsbremse gegen versehentliches Löschen, ergänzt bei der PROJ-3-Spec-Interview).

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
| **[Refine]** Endgültiges Löschen erfordert zusätzlich, dass der Kunde/das Projekt bereits archiviert ist — nicht mehr direkt aus dem aktiven Zustand löschbar, gilt einheitlich für Kunde UND Projekt | Ergänzende Sicherheitsbremse, während der PROJ-3-Spec-Interview festgelegt: ein erzwungener Zwischenschritt (erst archivieren) reduziert versehentliche endgültige Löschungen; einheitliche Regel statt unterschiedlicher Löschlogik je Entität ist leichter zu merken | 2026-08-25 |

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
| `projects.client_id` mit `ON DELETE RESTRICT` statt `CASCADE` | Setzt die Lösch-Schutzprüfung ("Kunde mit Projekten nicht endgültig löschbar") zusätzlich auf DB-Ebene durch — schützt auch dann, wenn die Zählung in der Server Action durch eine parallele Änderung veraltet wäre (last-write-wins, siehe Product Decisions) | 2026-08-25 |
| `updated_at` per Trigger (`set_updated_at()`) statt clientseitig gesetzt | Gilt dann fuer jeden Schreibpfad garantiert (auch direkte SQL-Änderungen), nicht nur für Aufrufe über die Server Actions | 2026-08-25 |
| Datenzugriff aufgeteilt in `queries.ts` (reine Lesefunktionen für Server Components) und `actions.ts` (Server Actions für Mutationen) | Seiten bleiben async Server Components, die Daten laden und als Props durchreichen; Client-Komponenten bleiben interaktiv, rufen aber nur noch Server Actions statt eines lokalen Hooks auf | 2026-08-25 |
| Jede Server Action beginnt mit eigenem `requireAuth()`-Check (Supabase `getClaims()`) statt sich allein auf das geschützte Layout zu verlassen | Server Actions sind eigene Endpunkte, die theoretisch auch ohne Seitenaufruf erreichbar wären; explizite Prüfung ist Defense in Depth gemäß `.claude/rules/backend.md`, RLS ist die dritte, unabhängige Ebene | 2026-08-25 |
| Duplikat-E-Mail-Prüfung per `ilike` in der Server Action (kein DB-Constraint) | Muss weich bleiben (Anlegen trotzdem möglich); ein Unique-Constraint würde das erzwingen. Der bereits angelegte funktionale Index auf `lower(contact_email)` unterstützt die Abfrage | 2026-08-25 |
| **[BUG-1-Fix]** DELETE-RLS-Policies auf `clients`/`projects` per `ALTER POLICY` von `USING (true)` auf `USING (status = 'archived')` verschärft | QA (zweite Runde) fand, dass die Archivieren-vor-Löschen-Regel nur in der Server Action galt und per direktem Supabase-Aufruf umgehbar war; jetzt konsistent mit dem bereits bestehenden `ON DELETE RESTRICT`-Schutz auf DB-Ebene | 2026-08-25 |

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

**Tested:** 2026-08-25 (zweite Runde, nach Refine „erst archivieren, dann löschen")
**App URL:** http://localhost:3000
**Tester:** QA Engineer (AI)

**Nachtrag zur zweiten Runde:** AC-6/AC-7 unten sind gegenüber der ersten QA-Runde aktualisiert und decken jetzt die Archivieren-vor-Löschen-Regel ab. Ein neuer Sicherheitsbefund (BUG-1) kam dabei hinzu — siehe „Bugs Found".

### Acceptance Criteria Status

#### AC-1: Kunde anlegen → Auto-Redirect ins erste Projekt
- [x] Firmenname + E-Mail eingeben, "Kunde anlegen" → Kunde erscheint in der Liste, Weiterleitung auf `/kunden/[kundeId]/[projektId]` des automatisch erstellten ersten Projekts (Default-Name = Firmenname)

#### AC-2: Duplikat-E-Mail-Warnung
- [x] Zweiter Kunde mit identischer E-Mail (auch bei abweichender Groß-/Kleinschreibung) → Warnung mit Name des bestehenden Kunden erscheint, "Trotzdem anlegen" legt den Kunden trotzdem an

#### AC-3: Pflichtfeld-Validierung
- [x] Leeres Formular abschicken → "Firmenname ist erforderlich" und "Ungültige E-Mail-Adresse" erscheinen, kein Request an den Server

#### AC-4: Neues Projekt erscheint in der Projekt-Liste
- [x] Zweites Projekt für einen bestehenden Kunden angelegt → erscheint in dessen Projekt-Liste
- [x] Projekt-Anzahl-Spalte auf `/kunden` aktualisiert sich korrekt nach Rücknavigation über den Nav-Link (kein harter Reload nötig) — siehe Hinweis unter "Untersuchte, nicht bestätigte Vermutung"

#### AC-5: Archivieren/Reaktivieren + Filter
- [x] "Archivieren" → Kunde verschwindet aus Standardansicht, bleibt über "Archiviert anzeigen" sichtbar und reaktivierbar

#### AC-6: Endgültiges Löschen — nur wenn bereits archiviert und ohne abhängige Daten
- [x] Kunde/Projekt archiviert und ohne abhängige Daten → "Endgültig löschen" + Bestätigung entfernt den Datensatz unwiderruflich (verifiziert per SQL: Zeile nach dem Löschen nicht mehr vorhanden), sowohl für Kunde als auch für Projekt

#### AC-7: Löschoption deaktiviert bei aktivem Status oder abhängigen Daten
- [x] Aktiver (nicht archivierter) Kunde/Projekt → "Endgültig löschen" ist deaktiviert (`data-disabled`), Tooltip „Muss zuerst archiviert werden…", unabhängig davon ob abhängige Daten existieren
- [x] Archivierter Kunde mit mindestens einem Projekt → weiterhin deaktiviert, Tooltip „…hat noch Projekte"
- [x] Tooltip-Priorität verifiziert: Bei einem aktiven Kunden MIT Projekten wird der "Erst archivieren"-Hinweis angezeigt, nicht der "hat noch Projekte"-Hinweis (der naheliegendere erste Schritt)
- [x] Vorher fehlender Lösch-Schutz für Projekte in der UI ergänzt (`client-detail-view.tsx` hatte zuvor gar keine Bedingung — jedes Projekt war unabhängig vom Status direkt löschbar)

#### AC-8: Dashboard-Widget
- [x] Widget zeigt korrekte Kennzahlen ("X Kunden, Y aktive Projekte") und den Link "Alle Kunden ansehen →"

#### AC-9: Leerzustände
- [x] `/kunden` ohne Kunden → Hinweistext + "Ersten Kunden anlegen"-Button
- [x] Dashboard ohne Kunden → reduzierte Widget-Variante mit "Kunden anlegen"-Button

#### AC-10: Textsuche
- [x] Suchbegriff ohne Treffer → "Keine Kunden gefunden für …"; Suchbegriff mit Treffer → Liste filtert live auf Firmenname/Ansprechpartner

### Edge Cases Status

#### EC-1: Gleichzeitige Bearbeitung durch zwei Mitarbeiter
- [x] Verifiziert in `/backend`: zwei unabhängig eingeloggte Testnutzer sehen dieselben Kunden/Projekte (Shared Visibility). Konfliktverhalten selbst (last-write-wins) ist eine bewusste Design-Entscheidung ohne eigene Schutzmechanik — nichts zu testen, was fehlschlagen könnte

#### EC-2: Archivierter Kunde reaktivieren, Projekte behalten ihren Status
- [x] Kunde archiviert und wieder reaktiviert → sein (aktives) Projekt blieb während der gesamten Zeit "Aktiv", kein automatisches Mit-Archivieren/Reaktivieren

#### EC-3: Netzwerk-/Serverfehler beim Speichern
- [ ] Nicht per echter Netzwerksimulation getestet (kein einfacher Weg, einen Supabase-Ausfall gezielt zu erzwingen). Per Code-Review verifiziert: alle Server Actions geben bei Fehlern `{ error }` zurück, alle Formulardialoge zeigen das über ein `Alert` an und schließen sich nicht — Verhalten ist strukturell identisch zum bereits in PROJ-2 getesteten Login-Formular

#### EC-4: Projekt ändert sich, Kunde bleibt unberührt
- [x] Projekte angelegt/gelöscht → Kunden-Stammdaten und -Status unverändert

#### EC-5: Letzter verbleibender Kunde wird archiviert → Leerzustand
- [ ] Nicht als exakt dieses Szenario durchgespielt (stattdessen wurde der letzte Test-Kunde gelöscht statt archiviert). Der Leerzustand-Code-Pfad selbst ist über AC-9 (0 Kunden gesamt) abgedeckt und identisch für "0 Kunden" und "0 nicht-archivierte Kunden bei ausgeblendetem Archiv-Filter"

### Untersuchte, nicht bestätigte Vermutung
Beim Code-Review fiel auf, dass `createProject` (`src/lib/clients/actions.ts`) nur `/kunden/[kundeId]` und `/dashboard` revalidiert, nicht `/kunden` selbst — die Vermutung war, dass die Projekt-Anzahl-Spalte auf `/kunden` nach dem Anlegen eines Projekts ohne harten Reload veraltet bleiben könnte. Gezielt nachgetestet (Projekt anlegen → über den "Kunden"-Nav-Link zurück, kein `page.reload()`): die Spalte zeigt korrekt den neuen Wert. Next.js' Router Cache invalidiert dynamische Routen offenbar bei jeder Navigation, der fehlende `revalidatePath('/kunden')`-Aufruf hat in der Praxis keine sichtbare Auswirkung. Kein Bug, aber der Vollständigkeit halber dokumentiert.

### Security Audit Results
- [x] Authentication: `/kunden` und `/kunden/[kundeId]` ohne Login → Redirect zu `/login?redirect=…` (Proxy-Schutz aus PROJ-2 greift auch für die neuen Routen)
- [x] Authorization/RLS: Anon-Supabase-Key wird bereits auf GRANT-Ebene abgewiesen (`42501 permission denied`, sowohl bei SELECT als auch INSERT) — stärker als ein rein RLS-gefiltertes leeres Ergebnis, da kein Client-seitiger Zugriff überhaupt möglich ist
- [x] Input validation / XSS: Firmenname `QA17-<img src=x onerror=alert(1)> GmbH` wird als reiner Text gerendert (kein `<img>`-Element im DOM, kein Alert ausgelöst) — React entschärft das automatisch, es wird nirgends `dangerouslySetInnerHTML` verwendet
- [x] Shared Visibility ist beabsichtigt (Single-Tenant, siehe PROJ-1 Decision Log) und funktioniert wie vorgesehen — kein IDOR-Test anwendbar, da es kein Besitzer-Konzept gibt
- [ ] N/A Rate limiting: für dieses CRUD-Feature nicht spezifiziert (siehe PROJ-2 Decision Log: kein zusätzliches UI-Rate-Limiting im MVP)
- [x] **BUG-1 — behoben (siehe unten):** "Erst archivieren, dann löschen" wird jetzt zusätzlich per RLS-Policy durchgesetzt, nicht mehr nur in der Server Action

### Regressionstests (zweite Runde)
- [x] `npm test` (Vitest): 25/25 grün
- [x] `npm run build` / `npm run lint`: fehlerfrei
- [x] PROJ-2-Regressionssuite: 12/12 grün auf Chromium
- [x] `tests/PROJ-17-kunden-projekt-verwaltung.spec.ts`: 4/4 grün auf Chromium UND Mobile Safari/WebKit — Suite musste angepasst werden (archiviert jetzt vor jedem Löschversuch; Dashboard-/Leerzustand-Prüfungen auf Muster statt Exaktwert umgestellt, da die Umgebung inzwischen dauerhaft echte Kunden enthält, siehe Implementierungsnotizen); neuer Test für BUG-1 als permanente Regression ergänzt

### Bugs Found

#### BUG-1: „Erst archivieren, dann löschen" nur in der Server Action durchgesetzt, nicht in der Datenbank — **BEHOBEN**
- **Severity:** Medium
- **Steps to Reproduce:**
  1. Einen aktiven (nicht archivierten) Kunden anlegen
  2. Statt über die App direkt per Supabase-Client (mit einer normalen, eingeloggten Nutzer-Session, nicht Service-Role) einen `DELETE` auf `clients` mit der passenden `id` ausführen
  3. Erwartet: Wird abgelehnt, da der Kunde noch nicht archiviert ist (wie es die App über die Server Action erzwingt)
  4. Tatsächlich (vor dem Fix): Der Löschvorgang wurde von der Datenbank anstandslos ausgeführt — die RLS-DELETE-Policy lautete `USING (true)`, sie kannte die Archiviert-Bedingung nicht. Live nachgestellt (Testnutzer via Supabase-Admin-API angelegt, `signInWithPassword` + direkter `.from('clients').delete()`-Aufruf): `count: 1`, Zeile war anschließend weg.
- **Einordnung:** Kein Sicherheitsloch im engeren Sinn — alle eingeloggten Mitarbeiter dürfen laut Shared-Visibility-Entscheidung ohnehin jeden Kunden/jedes Projekt löschen, ein Bypass verschaffte also keine neuen Rechte, nur einen übersprungenen Bestätigungsschritt. Aber inkonsistent mit dem im selben Feature bereits etablierten Defense-in-Depth-Muster (die „hat noch Projekte"-Bedingung ist zusätzlich per `ON DELETE RESTRICT` auf DB-Ebene abgesichert).
- **Fix:** Migration `enforce_archived_before_delete` — `ALTER POLICY` auf beiden DELETE-Policies (`clients`, `projects`) von `USING (true)` auf `USING (status = 'archived')`. Live erneut nachgestellt: derselbe Bypass-Versuch liefert jetzt `count: 0`, Zeile bleibt bestehen; nach Archivieren liefert derselbe Aufruf `count: 1`, Zeile ist weg. Als permanenter Regressionstest in `tests/PROJ-17-kunden-projekt-verwaltung.spec.ts` ergänzt.
- **Priority:** Behoben vor Re-Deployment.

### Summary
- **Acceptance Criteria:** 10/10 passed
- **Edge Cases:** 3/5 aktiv verifiziert, 2/5 per Code-Review abgedeckt (siehe oben, keine offenen Zweifel)
- **Bugs Found:** 1 (Medium), behoben — 0 offen
- **Security:** Pass (Auth-Schutz, GRANT-Schutz, XSS-Schutz, RLS-Lücke aus BUG-1 alle bestätigt behoben/geprüft)
- **Production Ready:** YES
- **Recommendation:** Deploy

## Deployment

**Deployed:** 2026-08-25
**Production URL:** https://test-project-woad-theta.vercel.app
**Vercel Project:** atmodesign/test-project

Migration `create_clients_and_projects_tables` lief bereits während `/backend` gegen dieselbe Supabase-Instanz, die auch von Produktion genutzt wird (kein separates Staging-Projekt, siehe PROJ-1) — kein zusätzlicher Migrationsschritt beim Deploy nötig. Keine neuen Umgebungsvariablen, keine neuen npm-Pakete (siehe Tech Design).

Live verifiziert nach Deploy: `/login`, `/dashboard` und `/kunden` laden fehlerfrei (200, Security-Header aktiv), `/kunden` ohne Login leitet korrekt mit 307 zu `/login?redirect=...` weiter. Login mit dem bereits bestehenden Arbeits-Account (`servus@atmodesign.de`) gegen Produktion durchgeführt und per Screenshot geprüft: Dashboard-Widget und `/kunden` zeigen beide korrekt den echten Leerzustand ("Noch keine Kunden angelegt") — bestätigt die Live-Verbindung zur Produktions-Datenbank, keine Konsolenfehler. Kein Test-Kunde in Produktion angelegt (gleiche Vorsicht wie beim PROJ-2-Deploy, um die Produktionsdaten nicht zu verschmutzen) — die volle CRUD-Funktionalität wurde bereits in `/qa` gegen dieselbe Supabase-Instanz ausführlich verifiziert.

PROJ-2-Regressionssuite (12/12) und die neue PROJ-17-Suite (3/3, Chromium + WebKit) liefen vor dem Push lokal grün gegen dieselbe Datenbank.

### Nachdeploy: Refine + BUG-1-Fix (2026-08-27)

**Deployed:** 2026-08-27
**Anlass:** Lösch-Schutz-Verschärfung (erst archivieren, dann löschen) aus der PROJ-3-Spec-Interview, inkl. BUG-1-Fix (RLS-Policy statt nur Server-Action-Prüfung).

Migration `enforce_archived_before_delete` lief bereits während der QA/Backend-Phase gegen dieselbe Supabase-Instanz wie Produktion — beim eigentlichen Deploy also bereits aktiv, kein separater Migrationsschritt nötig. Keine neuen Umgebungsvariablen, keine neuen npm-Pakete.

Live verifiziert nach Deploy: `/login` und `/kunden` laden fehlerfrei (200/307 wie erwartet). Login mit dem bestehenden Arbeits-Account gegen Produktion durchgeführt: Aktionen-Menü eines aktiven Kunden zeigt „Endgültig löschen" korrekt deaktiviert mit dem Tooltip „Muss zuerst archiviert werden…" — bestätigt, dass die neue Regel live greift. Keine Konsolenfehler. Die RLS-Policy selbst wurde zusätzlich direkt per SQL gegen die Produktions-Datenbank geprüft (`USING (status = 'archived')` auf beiden DELETE-Policies). Kein Test-Kunde in Produktion angelegt — die volle Bypass-Verifikation lief bereits in `/qa`/`/backend` gegen dieselbe Supabase-Instanz.
