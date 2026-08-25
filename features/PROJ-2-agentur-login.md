# PROJ-2: Agentur-Login

## Status: In Progress
**Created:** 2026-08-25
**Last Updated:** 2026-08-25

## Implementierungsnotizen
- Frontend umgesetzt: `/login`, `/passwort-vergessen`, `/passwort-zuruecksetzen`, `/auth/confirm`-Route (E-Mail-Bestätigungslink), geschütztes Layout `src/app/(protected)/layout.tsx` mit Header (E-Mail + Logout) und Platzhalter-`/dashboard`. Root `/` leitet neu auf `/dashboard` weiter (ersetzt die Next.js-Standard-Startseite — war zuvor ungenutzter Scaffold-Inhalt).
- Server Actions in `src/lib/auth/actions.ts` (`login`, `logout`, `requestPasswordReset`, `resetPassword`), Formulare mit `react-hook-form` + `zod` (`src/lib/validations/auth.ts`).
- Proxy (`src/lib/supabase/proxy.ts`) um Redirect-Logik erweitert: nicht eingeloggte Nutzer auf geschützten Routen → `/login?redirect=<ursprünglicher Pfad>`. Öffentliche Routen fest in `PUBLIC_PATHS` gelistet.
- Open-Redirect-Schutz zentral in `src/lib/auth/redirect.ts` (`getSafeRedirectPath`), von Proxy, Login-Seite und `/auth/confirm`-Route gemeinsam genutzt.
- Live im Browser getestet (Playwright-Skript, da `chromium-cli` nicht verfügbar war): `/` und `/dashboard` leiten bei fehlendem Login korrekt zu `/login?redirect=...` weiter, `/passwort-vergessen` rendert öffentlich, leeres Login-Formular zeigt Client-seitige Validierungsfehler ohne Server-Request, falsche Zugangsdaten zeigen die generische Fehlermeldung "E-Mail oder Passwort falsch." — keine Konsolenfehler.
- Beim Testen aufgefallen und behoben: Passwort-Feld wurde bei einem Server-/Netzwerkfehler nicht geleert (AC dazu explizit gefordert) — `form.resetField('password')` im Catch-Block von `LoginForm` ergänzt.
- `zod` v4: `z.email()` statt des veralteten `.string().email()` verwendet (in `node_modules/zod` verifiziert).
- **Nicht von mir umsetzbar:** Das Supabase-Dashboard-E-Mail-Template "Reset Password" muss manuell auf `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/passwort-zuruecksetzen` umgestellt werden (Supabase Dashboard → Authentication → Email Templates) — kein MCP-Tool dafür verfügbar. Ohne diese Änderung landet der Link im Standard-Format, das nicht zur eigenen `/auth/confirm`-Route passt.

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
- [ ] Supabase-Dashboard-E-Mail-Template "Reset Password" muss manuell umgestellt werden (siehe Implementierungsnotizen) — ohne diesen manuellen Schritt funktioniert der Passwort-Reset-Link aus der echten E-Mail nicht, obwohl `/auth/confirm` und die Reset-Seite selbst fertig implementiert sind

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
| Eigene `/auth/confirm`-Route statt Supabase-Standard-Bestätigungslink | Für Cookie-basierte SSR-Sessions (`@supabase/ssr`) muss `verifyOtp` im eigenen Server-Kontext laufen, nicht auf Supabases gehostetem Verify-Endpunkt (offizielles Next.js-Beispiel aus den Supabase-Docs übernommen) | 2026-08-25 |
| `z.email()` statt `.string().email()` | Letzteres ist in der installierten Zod-Version (4.3.5) deprecated (verifiziert in `node_modules/zod`) | 2026-08-25 |
| `form.resetField('password')` bei Server-/Netzwerkfehler | Beim Browser-Test aufgefallen: Passwort blieb entgegen der Spec-AC im Feld stehen | 2026-08-25 |

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

**Tested:** 2026-08-25
**App URL:** http://localhost:3000
**Tester:** QA Engineer (AI)

**Methodik:** Manuell live im Browser getestet (Playwright-Skript für Chromium, da `chromium-cli` nicht verfügbar war), plus die permanente Regressions-Suite unter `tests/PROJ-2-agentur-login.spec.ts` (Chromium + Mobile Safari, 14/14 grün). Ein echter Testnutzer wurde direkt in `auth.users` angelegt (bcrypt-Hash via `pgcrypto`), nach dem Test wieder gelöscht.

### Acceptance Criteria Status

#### AC-1: Erfolgreicher Login mit gültigem Account → Redirect + E-Mail im Header
- [ ] **BUG-1 (Critical):** Login schlägt sichtbar fehl — siehe unten. Kein Redirect, keine Session, keine Fehlermeldung.

#### AC-2: Falsches Passwort / nicht existierender Account → generische Fehlermeldung
- [x] Live bestätigt: Beide Fälle zeigen identisch "E-Mail oder Passwort falsch." — kein Enumeration-Leak. Auch als E2E-Test abgesichert.

#### AC-3: Leeres Formular → Validierungsfehler ohne Server-Request
- [x] Live bestätigt: Client-seitige Validierung greift, Nutzer bleibt auf `/login`. E2E-Test vorhanden.

#### AC-4: Nicht eingeloggt + geschützte Seite → Redirect mit Rücksprung-Parameter
- [x] Live bestätigt: `/dashboard` → `/login?redirect=%2Fdashboard`. Auch `/` (via Redirect zu `/dashboard`) korrekt geschützt. E2E-Test vorhanden.

#### AC-5: Eingeloggt + Logout → Session beendet, zurück zu `/login`
- [ ] **Blockiert durch BUG-1** — nicht testbar, da über die UI nie eine Session zustande kommt. Logout-Server-Action selbst (`supabase.auth.signOut()` + `redirect('/login')`) ist per Code-Review unauffällig, aber ungetestet.

#### AC-6: Passwort-vergessen → identische Bestätigung unabhängig von Account-Existenz
- [x] Live bestätigt für beide Fälle (existierender Test-Account vs. frei erfundene E-Mail). E2E-Test vorhanden. Tatsächlicher E-Mail-Versand/-Inhalt nicht prüfbar (kein Postfach-Zugriff in dieser Umgebung) — siehe auch offene Dashboard-Template-Frage in den Implementierungsnotizen.

#### AC-7: Reset-Link → neues Passwort setzen (≥ 8 Zeichen) → Redirect zu Login
- [ ] **Nicht end-to-end testbar in dieser Umgebung** (kein E-Mail-Postfach-Zugriff, und das Supabase-Dashboard-Template ist noch nicht auf `/auth/confirm` umgestellt — siehe Open Questions). Teilweise abgesichert: `/auth/confirm` mit ungültigem Token leitet korrekt zu `/passwort-vergessen?error=expired_link` weiter (live bestätigt, E2E-Test vorhanden); `/passwort-zuruecksetzen` ohne aktive Recovery-Session leitet ebenfalls korrekt weg (live bestätigt, E2E-Test vorhanden). Die eigentliche `updateUser`-Logik ist nur per Code-Review geprüft.

#### AC-8: Supabase-API nicht erreichbar → Fehlermeldung, E-Mail bleibt, Passwort wird geleert
- [ ] **Nicht live simuliert** (würde einen absichtlichen Verbindungsabbruch zu Supabase erfordern). Der `form.resetField('password')`-Fix wurde während der Frontend-Implementierung eingebaut und per Code-Review verifiziert, aber nicht in dieser QA-Runde unter echtem Netzwerkfehler nachgestellt.

### Edge Cases Status

#### EC-1: Doppelter schneller Klick auf "Anmelden"
- [ ] Nicht isoliert getestet — durch BUG-1 ohnehin nicht sinnvoll prüfbar (jeder Klick "verpufft" gleich).

#### EC-2: Session läuft während Nutzung ab
- [x] Code-Review: Proxy aktualisiert Session bei jedem Request (aus PROJ-1), Redirect-Gate bei fehlendem Claim vorhanden. Nicht live mit einer echten ablaufenden Session getestet.

#### EC-3: Abgelaufener/bereits benutzter Reset-Link
- [x] Live bestätigt (siehe AC-7): `/auth/confirm` mit ungültigem `token_hash` → `/passwort-vergessen?error=expired_link` mit sichtbarem Hinweistext.

#### EC-4: Manipulierter `?redirect=`-Parameter (Open-Redirect)
- [x] `getSafeRedirectPath` per Unit-Test abgesichert (absolute URLs, `//`-Protocol-relative, `javascript:` — alle korrekt auf Fallback reduziert). Live-Bestätigung des tatsächlichen Post-Login-Verhaltens blockiert durch BUG-1, aber die Schutzfunktion selbst greift bereits vor dem Login (Parameter wird nie ungeprüft in ein `<a href>`/Redirect übernommen).

#### EC-5: Bereits eingeloggter Nutzer ruft `/login` auf
- [ ] **Nicht testbar** — durch BUG-1 kommt nie eine Session zustande, die diesen Fall auslösen könnte.

### Security Audit Results
- [x] Authorization/Enumeration: Falsches Passwort und nicht existierender Account nicht unterscheidbar (Login UND Passwort-vergessen)
- [x] Open-Redirect: `getSafeRedirectPath` blockt externe/`//`-Ziele zuverlässig (Unit-getestet)
- [x] Input-Validierung: E-Mail-Format serverseitig via `zod` erneut geprüft (nicht nur Client-seitig)
- [x] Keine Secrets im Client-Bundle oder in Konsolen-Logs gefunden
- [ ] **BUG-1 (Critical):** Login-Funktion selbst ist nicht nutzbar — schwerwiegendster denkbarer Auth-Bug (niemand kann sich einloggen)

### Bugs Found

#### BUG-1: Login mit korrekten Zugangsdaten schlägt lautlos fehl (keine Session, kein Redirect, keine Fehlermeldung)
- **Severity:** Critical
- **Steps to Reproduce:**
  1. Gültigen Test-Account anlegen, `/login` aufrufen
  2. Korrekte E-Mail + Passwort eingeben, "Anmelden" klicken
  3. Server-Log zeigt: `POST /login 200` und die Server Action läuft mit den korrekten Werten durch, ohne Fehler
  4. Erwartet: Redirect zu `/dashboard` (oder Rücksprungziel), Session-Cookie gesetzt, E-Mail im Header sichtbar
  5. Tatsächlich: Browser bleibt auf `/login?redirect=...`, **keine Cookies gesetzt** (verifiziert: `page.context().cookies()` liefert `[]`), keine Fehlermeldung angezeigt, Submit-Button wird wieder aktiv (nicht dauerhaft blockiert) — für den Nutzer sieht es aus, als würde der Klick einfach nichts tun
- **Root Cause:** `LoginForm` ruft die Server Action `login()` direkt aus `react-hook-form`s `handleSubmit`-Callback auf (`await login(values, redirectTo)`), **nicht** aus einer nativen `<form action={...}>` und **nicht** in `startTransition` gewrappt. Laut offizieller Next.js-Doku (`node_modules/next/dist/docs/01-app/02-guides/server-actions.md`, Zeile 22): *"You create one by adding the 'use server' directive, then invoke it from a form, or from an event handler or useEffect wrapped in startTransition."* Wird eine Server Action außerhalb dieser beiden Mechanismen aufgerufen, verarbeitet Next.js den internen `redirect()`-Steuerfluss-Fehler (`NEXT_REDIRECT`-Digest) nicht automatisch über den Router — der `LoginForm`-Code fängt ihn zwar ab (`isRedirectError`) und wirft ihn erneut, aber ohne eine aktive Transition greift dort kein Redirect-Boundary, der die Navigation tatsächlich ausführt. Betrifft identisch `ResetPasswordForm` (nutzt dasselbe Muster mit `resetPassword()` + internem `redirect()`).
- **Empfohlener Fix:** Aufruf in `startTransition` wrappen (z. B. `const [, startTransition] = useTransition()`, dann `startTransition(() => { onSubmitLogic() })`), **oder** `redirect()` aus der Server Action entfernen und stattdessen den Zielpfad im Rückgabewert zurückgeben, den die Client-Komponente per `router.push()`/`window.location.href` verarbeitet (letzteres deckt sich mit der Projekt-Regel `.claude/rules/frontend.md`, die genau dafür `window.location.href` vorschreibt). Fix muss in `LoginForm` **und** `ResetPasswordForm` angewendet werden (identisches Muster). Nach dem Fix: AC-1, AC-5, EC-1, EC-5 und die Redirect-Rücksprung-Bestätigung aus AC-4/EC-4 erneut testen.
- **Priority:** Fix before deployment — das Feature ist in seiner Kernfunktion (Login) unbenutzbar

### Summary
- **Acceptance Criteria:** 3/8 zweifelsfrei bestanden (AC-2, AC-3, AC-4, AC-6 teilweise), 1 kritisch fehlgeschlagen (AC-1), 4 blockiert/nicht vollständig testbar als direkte Folge von BUG-1 oder fehlendem E-Mail-Zugriff (AC-5, AC-7, AC-8 teilweise)
- **Bugs Found:** 1 total (1 Critical, 0 High, 0 Medium, 0 Low)
- **Security:** Issues found (BUG-1 — kein Datenleck, aber Kernfunktion nicht nutzbar)
- **Production Ready:** NO
- **Recommendation:** BUG-1 vor jeder weiteren Arbeit beheben (Frontend, betrifft `LoginForm` + `ResetPasswordForm`), danach erneut `/qa PROJ-2` — insbesondere AC-1, AC-5, EC-1, EC-5 und den echten Redirect-Rücksprung nach Login

## Deployment
_To be added by /deploy_
