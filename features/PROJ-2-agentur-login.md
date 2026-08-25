# PROJ-2: Agentur-Login

## Status: Planned
**Created:** 2026-08-25
**Last Updated:** 2026-08-25

## Dependencies
- Requires: PROJ-1 (Supabase Infrastructure Setup) — Auth, `profiles`-Tabelle, Proxy-Session-Refresh

## User Stories
- Als Agentur-Mitarbeiter möchte ich mich mit E-Mail/Passwort einloggen, damit ich auf den geschützten Bereich des Tools zugreifen kann.
- Als Agentur-Mitarbeiter möchte ich mein Passwort zurücksetzen können, wenn ich es vergessen habe, ohne einen Admin kontaktieren zu müssen.
- Als Agentur-Mitarbeiter möchte ich mich ausloggen können, damit die Sitzung auf gemeinsam genutzten Geräten nicht offen bleibt.
- Als nicht eingeloggter Nutzer möchte ich beim Aufruf einer geschützten Seite zum Login weitergeleitet und danach zur ursprünglich gewünschten Seite zurückgebracht werden.

## Out of Scope
- Kunden-/Projekt-Verwaltung — PROJ-17
- Registrierung/Sign-up — bewusst nicht vorgesehen (siehe PROJ-1 Decision Log)
- Sichtbare UI-Sperre bei zu vielen Login-Versuchen — Supabase-Auth-Standard-Rate-Limiting reicht für MVP
- Profil-Bearbeitung (Anzeigename ändern etc.)
- 2FA/MFA
- Rollen/Berechtigungen (Admin vs. Mitarbeiter) — Single-Tenant, alle gleichberechtigt

## Acceptance Criteria

**Format:** Angenommen [Vorbedingung] / Wenn [Aktion] / Dann [Ergebnis]

- [ ] Angenommen ein gültiger Account existiert, wenn der Nutzer E-Mail+Passwort korrekt eingibt und auf "Anmelden" klickt, dann wird er zur ursprünglich gewünschten Seite (oder `/dashboard` als Standard) weitergeleitet und sieht seine E-Mail-Adresse im Header
- [ ] Angenommen kein Account mit dieser E-Mail existiert oder das Passwort ist falsch, wenn der Login-Versuch abgeschickt wird, dann erscheint eine generische Fehlermeldung ("E-Mail oder Passwort falsch"), ohne zu verraten, welcher Teil falsch war
- [ ] Angenommen das Login-Formular wird leer abgeschickt, dann erscheinen Validierungsfehler für E-Mail und Passwort, ohne dass ein Request an Supabase geschickt wird
- [ ] Angenommen der Nutzer ist nicht eingeloggt, wenn er eine geschützte Seite (z. B. `/dashboard`) direkt aufruft, dann wird er zu `/login` weitergeleitet, mit einem Rücksprung-Parameter zur ursprünglichen Seite
- [ ] Angenommen der Nutzer ist eingeloggt, wenn er auf "Logout" klickt, dann wird die Session beendet und er landet auf `/login`
- [ ] Angenommen der Nutzer hat sein Passwort vergessen, wenn er auf "Passwort vergessen?" klickt und seine E-Mail einträgt, dann erhält er bei existierendem Account eine Reset-E-Mail; die Bestätigungsmeldung ist identisch, unabhängig davon ob der Account existiert (kein Enumeration-Leak)
- [ ] Angenommen der Nutzer klickt auf den Reset-Link aus der E-Mail, wenn er ein neues Passwort setzt (min. 8 Zeichen), dann wird das Passwort aktualisiert und er wird zum Login weitergeleitet
- [ ] Angenommen die Supabase-API ist nicht erreichbar, wenn der Login abgeschickt wird, dann erscheint eine Fehlermeldung und die eingegebene E-Mail bleibt im Feld erhalten (Passwort wird aus Sicherheitsgründen nicht wiederhergestellt)

## Edge Cases
- Was passiert bei doppeltem schnellem Klick auf "Anmelden" (Doppel-Submit)? → Button wird während des Requests deaktiviert/zeigt Ladezustand, verhindert doppelten Request.
- Was passiert, wenn die Session während der Nutzung abläuft? → Proxy aktualisiert sie im Hintergrund; ist der Refresh-Token selbst abgelaufen/ungültig, erfolgt beim nächsten Seitenwechsel ein Redirect zu `/login`.
- Was passiert, wenn jemand einen abgelaufenen/bereits benutzten Passwort-Reset-Link erneut aufruft? → Supabase Auth weist den Link zurück, klare Fehlermeldung mit Link, "Passwort vergessen?" erneut anzufordern.
- Was passiert, wenn der `?redirect=`-Parameter manipuliert wird, um auf eine externe Domain umzuleiten (Open-Redirect-Angriff)? → Nur relative Pfade innerhalb der App werden als Redirect-Ziel akzeptiert, alles andere fällt auf `/dashboard` zurück.
- Was passiert, wenn ein bereits eingeloggter Nutzer die `/login`-Seite direkt aufruft? → Automatischer Redirect zu `/dashboard` (oder dem Redirect-Ziel), das Formular wird nicht erneut angezeigt.

## Technical Requirements (optional)
- Security: Redirect-Parameter nur relative Pfade (kein Open Redirect)
- Security: Passwort-Reset-Link läuft nach Supabase-Standardzeit ab
- Auth: E-Mail/Passwort via Supabase Auth (siehe PROJ-1)

## Open Questions
- [ ] Passwort-Mindestanforderungen über reine Länge (8 Zeichen) hinaus? — kann bei `/architecture` verfeinert werden

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| PROJ-2 aus "Agentur-Login & Kunden/Projekt-Verwaltung" herausgelöst | Single Responsibility — Login und CRUD unabhängig testbar/deploybar, unterschiedliche UI-Bereiche | 2026-08-25 |
| Minimale `/dashboard`-Platzhalterseite Teil von PROJ-2 | Login-Erfolg braucht ein sichtbares, testbares Ergebnis; PROJ-17 ersetzt den Inhalt später | 2026-08-25 |
| Geteiltes Layout für eingeloggten Bereich (Header mit E-Mail + Logout) in PROJ-2 angelegt | Vermeidet Doppelbau des Headers in PROJ-17 und späteren Features | 2026-08-25 |
| Passwort-Reset-Flow (Supabase-Standard-E-Mail) im MVP enthalten | Standardfunktionalität, geringer Zusatzaufwand mit Supabase Auth | 2026-08-25 |
| Kein zusätzliches UI-Rate-Limiting, nur Supabase-Auth-Standard | Ausreichend für kleines internes Team, spart Aufwand | 2026-08-25 |
| Redirect-Rücksprung nach Login (`?redirect=`) mit Whitelist auf relative Pfade | Bessere UX + verhindert Open-Redirect-Sicherheitslücke | 2026-08-25 |

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
