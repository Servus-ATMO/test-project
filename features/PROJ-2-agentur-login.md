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
| Server Actions statt eigener API-Routen für Login/Logout/Passwort-Reset | Weniger Code, funktioniert ohne Client-JS (progressive enhancement), von Next.js für Formulare empfohlen | 2026-08-25 |
| Proxy aus PROJ-1 um Redirect-Logik erweitert (statt neuer, separater Middleware) | PROJ-1 hat die Session-Refresh-Logik bewusst schon vorbereitet, genau für diesen Zweck (siehe PROJ-1 Decision Log) | 2026-08-25 |
| Rücksprung-Parameter wird auf relative Pfade validiert (kein `http://`/`//`) | Open-Redirect-Schutz — verhindert Weiterleitung auf externe, bösartige Domains über einen manipulierten Link | 2026-08-25 |
| Keine neuen Pakete — `react-hook-form`/`zod`/shadcn-Formkomponenten bereits vorhanden | Vermeidet unnötige Abhängigkeiten, Projekt bringt alles Nötige für Formulare schon mit | 2026-08-25 |

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### A) Struktur (Seiten & Komponenten)

```
Öffentlicher Bereich
├── /login
│   └── LoginForm (E-Mail, Passwort, "Passwort vergessen?"-Link, Anmelden-Button)
├── /passwort-vergessen
│   └── ForgotPasswordForm (E-Mail, Absenden-Button)
└── /passwort-zuruecksetzen
    └── ResetPasswordForm (neues Passwort, Bestätigung, Absenden-Button)

Geschützter Bereich (gemeinsames Layout, künftig auch von PROJ-17 genutzt)
├── Header (zeigt eingeloggte E-Mail-Adresse + Logout-Button)
└── /dashboard (Platzhalter-Startseite — wird von PROJ-17 mit echtem Inhalt ersetzt)
```

Der in PROJ-1 angelegte Proxy wird um die Weiterleitungs-Logik erweitert: Nicht eingeloggte Nutzer, die eine Seite im geschützten Bereich aufrufen, landen auf `/login` mit einem Rücksprung-Parameter zur ursprünglich gewünschten Seite.

### B) Datenmodell

Keine neuen Tabellen — PROJ-2 nutzt vollständig, was PROJ-1 bereits bereitstellt (`profiles`, Supabase-Auth-Sessions). Die Session selbst wird nicht in einer eigenen Tabelle gespeichert, sondern von Supabase Auth als sicheres Cookie verwaltet (Mechanismus kommt aus PROJ-1).

### C) Technische Entscheidungen (Begründung)

- **Formulare rufen serverseitige Funktionen direkt auf (Server Actions), statt eigene API-Routen zu bauen:** Weniger Code, funktioniert auch ganz ohne JavaScript im Browser, und ist der von Next.js empfohlene Weg für Formulare wie Login/Logout/Passwort-Reset.
- **Rücksprung-Parameter wird geprüft, bevor weitergeleitet wird:** Nur relative Pfade innerhalb der App werden akzeptiert — verhindert, dass ein manipulierter Link Nutzer auf eine fremde, bösartige Seite umleitet (Open-Redirect-Schutz aus der Spec).
- **Passwort-Zurücksetzen nutzt den eingebauten E-Mail-Versand von Supabase Auth:** Kein eigenes E-Mail-System nötig, Standard-Funktionalität ohne Zusatzaufwand.
- **Bestätigungsmeldung beim Passwort-Reset ist immer identisch**, unabhängig davon ob die E-Mail-Adresse existiert: Verhindert, dass Angreifer über die Fehlermeldung herausfinden können, welche E-Mail-Adressen als Accounts existieren (Enumeration-Schutz aus der Spec).

### D) Abhängigkeiten (zu installierende Pakete)

Keine neuen Pakete nötig — alles Erforderliche ist bereits vorhanden: Supabase-Clients (PROJ-1), Formular-Validierung (`react-hook-form` + `zod`, bereits im Projekt), passende UI-Bausteine (`src/components/ui/form.tsx`, `input.tsx`, `button.tsx` aus dem shadcn-Katalog).

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
