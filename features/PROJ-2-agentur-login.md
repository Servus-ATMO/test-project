# PROJ-2: Agentur-Login

## Status: Approved
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

**Methodik:** Manuell live im Browser getestet (Playwright-Skript für Chromium, da `chromium-cli` nicht verfügbar war), plus die permanente Regressions-Suite unter `tests/PROJ-2-agentur-login.spec.ts` (Chromium + Mobile Safari, 14/14 grün). Echte Testnutzer wurden direkt in `auth.users` angelegt (bcrypt-Hash via `pgcrypto`), nach dem Test wieder gelöscht.

**⚠️ Korrektur nach initialem Befund:** Die erste Testrunde ergab scheinbar einen kritischen Login-Bug ("BUG-1", siehe Historie unten). Bei der Fehlerursachensuche (Supabase-Auth-Logs via `query_logs`) stellte sich heraus: Der allererste SQL-angelegte Testnutzer hatte `NULL` in mehreren von GoTrue (Supabase Auth) zwingend als Leerstring erwarteten Spalten (`confirmation_token`, `recovery_token` u. a.), was serverseitig einen 500er ("converting NULL to string is unsupported") auslöste — durch die generische Fehlermeldung im UI nicht von "falsches Passwort" unterscheidbar. Das war ein Fehler in den eigenen QA-Testdaten, **kein Bug im Produktcode**. Mit korrekt angelegtem Testnutzer (alle Token-Spalten als `''` statt `NULL`) funktioniert der ursprüngliche, unveränderte Anwendungscode einwandfrei — inklusive des zwischenzeitlich probeweise vorgenommenen und wieder verworfenen Fixes (`startTransition`/`window.location.href` war unnötig, da `redirect()` innerhalb der Server Action nachweislich auch aus `handleSubmit` heraus zuverlässig funktioniert, bestätigt über den `x-action-redirect`-Response-Header).

**Test-Infrastruktur-Fixes (Anwendungscode unverändert):**
- `tests/PROJ-2-agentur-login.spec.ts` legt jetzt einen echten Testnutzer über die Supabase-Admin-API (`auth.admin.createUser`, Service-Role) in `beforeAll` an statt über rohes SQL — vermeidet genau das oben beschriebene NULL-Spalten-Problem dauerhaft, auch für künftige Testläufe.
- `playwright.config.ts`: `.env.local` wird jetzt über `@next/env` geladen (Playwright läuft als eigener Prozess, nicht über die Next.js-CLI, sonst fehlten `SUPABASE_SECRET_KEY` etc. im Testprozess); `workers: 1` gesetzt, weil parallele Worker gleichzeitig `auth.admin.createUser` für denselben Lauf aufriefen und sich mit "Database error creating new user" gegenseitig blockierten.
- `vitest.config.ts`: `tests/` (Playwright-Verzeichnis) von Vitest ausgeschlossen — Vitest versuchte sonst, `.spec.ts`-Dateien aus Playwrights eigenem Verzeichnis mitzulaufen.
- Alle `page.goto(...)` vor einem `page.fill(...)` nutzen jetzt `waitUntil: 'networkidle'` — ohne das leerte WebKit reproduzierbar das gerade befüllte E-Mail-Feld beim Abschluss der React-Hydration (Chromium tolerant genug, um das zu verschleiern). War als zweiter, unabhängiger Fehlalarm in der E2E-Suite sichtbar, ebenfalls kein Anwendungsbug.

Es wurde **kein Anwendungscode geändert** — nur Testdaten-Erzeugung und Testtiming. Dieser Abschnitt beschreibt den finalen, korrigierten Befund.

### Acceptance Criteria Status

#### AC-1: Erfolgreicher Login mit gültigem Account → Redirect + E-Mail im Header
- [x] Live bestätigt (nach Korrektur der Testdaten, siehe oben): Redirect zu `/dashboard`, Session-Cookie gesetzt, E-Mail-Adresse im Header sichtbar, keine Konsolenfehler.

#### AC-2: Falsches Passwort / nicht existierender Account → generische Fehlermeldung
- [x] Live bestätigt: Beide Fälle zeigen identisch "E-Mail oder Passwort falsch." — kein Enumeration-Leak. Auch als E2E-Test abgesichert.

#### AC-3: Leeres Formular → Validierungsfehler ohne Server-Request
- [x] Live bestätigt: Client-seitige Validierung greift, Nutzer bleibt auf `/login`. E2E-Test vorhanden.

#### AC-4: Nicht eingeloggt + geschützte Seite → Redirect mit Rücksprung-Parameter
- [x] Live bestätigt: `/dashboard` → `/login?redirect=%2Fdashboard`. Auch `/` (via Redirect zu `/dashboard`) korrekt geschützt. E2E-Test vorhanden.

#### AC-5: Eingeloggt + Logout → Session beendet, zurück zu `/login`
- [x] Live bestätigt: Logout beendet die Session, Redirect zu `/login`, `/dashboard` danach wieder geschützt.

#### AC-6: Passwort-vergessen → identische Bestätigung unabhängig von Account-Existenz
- [x] Live bestätigt für beide Fälle (existierender Test-Account vs. frei erfundene E-Mail). E2E-Test vorhanden. Tatsächlicher E-Mail-Versand/-Inhalt nicht prüfbar (kein Postfach-Zugriff in dieser Umgebung) — siehe auch offene Dashboard-Template-Frage in den Implementierungsnotizen.

#### AC-7: Reset-Link → neues Passwort setzen (≥ 8 Zeichen) → Redirect zu Login
- [ ] **Nicht end-to-end testbar in dieser Umgebung** (kein E-Mail-Postfach-Zugriff, und das Supabase-Dashboard-Template ist noch nicht auf `/auth/confirm` umgestellt — siehe Open Questions). Teilweise abgesichert: `/auth/confirm` mit ungültigem Token leitet korrekt zu `/passwort-vergessen?error=expired_link` weiter (live bestätigt, E2E-Test vorhanden); `/passwort-zuruecksetzen` ohne aktive Recovery-Session leitet ebenfalls korrekt weg (live bestätigt, E2E-Test vorhanden). Die eigentliche `updateUser`-Logik ist nur per Code-Review geprüft.

#### AC-8: Supabase-API nicht erreichbar → Fehlermeldung, E-Mail bleibt, Passwort wird geleert
- [ ] **Nicht live simuliert** (würde einen absichtlichen Verbindungsabbruch zu Supabase erfordern). Der `form.resetField('password')`-Fix wurde während der Frontend-Implementierung eingebaut und per Code-Review verifiziert, aber nicht in dieser QA-Runde unter echtem Netzwerkfehler nachgestellt.

### Edge Cases Status

#### EC-1: Doppelter schneller Klick auf "Anmelden"
- [x] Code-Review: `disabled={form.formState.isSubmitting}` verhindert Doppel-Submit. Nicht isoliert per Timing-Test nachgestellt, aber Mechanismus greift nachweislich (Button war während des realen, erfolgreichen Login-Requests kurzzeitig deaktiviert).

#### EC-2: Session läuft während Nutzung ab
- [x] Code-Review: Proxy aktualisiert Session bei jedem Request (aus PROJ-1), Redirect-Gate bei fehlendem Claim vorhanden. Nicht live mit einer echten ablaufenden Session getestet.

#### EC-3: Abgelaufener/bereits benutzter Reset-Link
- [x] Live bestätigt (siehe AC-7): `/auth/confirm` mit ungültigem `token_hash` → `/passwort-vergessen?error=expired_link` mit sichtbarem Hinweistext.

#### EC-4: Manipulierter `?redirect=`-Parameter (Open-Redirect)
- [x] `getSafeRedirectPath` per Unit-Test abgesichert (absolute URLs, `//`-Protocol-relative, `javascript:` — alle korrekt auf Fallback reduziert). Zusätzlich live mit echtem, erfolgreichem Login bestätigt: `?redirect=https://evil.example.com` und `?redirect=//evil.example.com` landen beide auf derselben Origin, nie auf der fremden Domain.

#### EC-5: Bereits eingeloggter Nutzer ruft `/login` auf
- [x] Live bestätigt: Wird automatisch zu `/dashboard` weitergeleitet, sieht das Formular nicht erneut.

### Security Audit Results
- [x] Authorization/Enumeration: Falsches Passwort und nicht existierender Account nicht unterscheidbar (Login UND Passwort-vergessen)
- [x] Open-Redirect: `getSafeRedirectPath` blockt externe/`//`-Ziele zuverlässig (Unit-getestet und live mit echtem Login bestätigt)
- [x] Input-Validierung: E-Mail-Format serverseitig via `zod` erneut geprüft (nicht nur Client-seitig)
- [x] Keine Secrets im Client-Bundle oder in Konsolen-Logs gefunden
- [x] IDOR/Session: Login setzt korrekt ein Session-Cookie, Logout beendet sie zuverlässig, geschützte Routen danach wieder gesperrt

### Bugs Found

Keine offenen Bugs. Ein zunächst als Critical eingestufter Befund ("Login schlägt lautlos fehl") stellte sich bei der Root-Cause-Analyse als fehlerhaft angelegter QA-Testnutzer heraus (siehe Methodik-Hinweis oben), nicht als Fehler im Produktcode. Mit korrekten Testdaten bestehen alle Login-/Logout-/Redirect-Acceptance-Criteria.

### Summary
- **Acceptance Criteria:** 6/8 zweifelsfrei bestanden (AC-1 bis AC-6), 2 nicht end-to-end testbar in dieser Umgebung (AC-7: kein E-Mail-Postfach-Zugriff + Dashboard-Template noch nicht umgestellt; AC-8: würde einen absichtlichen Verbindungsabbruch zu Supabase erfordern) — beide jedoch per Code-Review plausibel und teilweise (Negativpfade) live bestätigt
- **Bugs Found:** 0 (1 initialer Fehlalarm durch fehlerhafte QA-Testdaten, aufgeklärt und korrigiert — siehe oben)
- **Security:** Pass
- **Production Ready:** YES — für den Scope von PROJ-2. AC-7 (echter E-Mail-Reset-Flow) sollte manuell nachgeprüft werden, sobald das Supabase-Dashboard-Template umgestellt ist (siehe Open Questions)
- **Recommendation:** Deploy-fähig. Vor dem ersten echten Kunden-/Mitarbeiter-Einsatz: Supabase-Dashboard-E-Mail-Template für Passwort-Reset umstellen (siehe Open Questions) und den Reset-Flow einmal manuell mit einer echten Mailbox durchspielen

## Deployment

**Deployed:** 2026-08-25
**Production URL:** https://test-project-woad-theta.vercel.app
**Vercel Project:** atmodesign/test-project

Live verifiziert nach Deploy: `/` und `/dashboard` leiten unautorisiert korrekt zu `/login?redirect=...` weiter (307, kein 500 → ENV-Variablen korrekt gesetzt), `/login` und `/passwort-vergessen` rendern fehlerfrei (keine Konsolenfehler), Sicherheits-Header (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Strict-Transport-Security`) aktiv. Kein echter Login-Testlauf gegen Produktion (um keine Testnutzer im Produktions-Supabase-Projekt zu hinterlassen) — Login-Flow bereits in `/qa` ausführlich gegen dieselbe Supabase-Instanz verifiziert.

**Nachträglich erledigt (nach initialem Deploy):**
- GitHub-Repo mit Vercel verbunden (`vercel git connect`) — Auto-Deploy bei jedem Push zu `main` aktiv
- Lighthouse-Check gegen `/login` in Produktion: Performance 99, Accessibility 98, Best Practices 96, SEO 91→**100** nach Fix
- **Bug gefunden + behoben:** `robots.txt`/`sitemap.xml` wurden vom Proxy fälschlich zu `/login` umgeleitet (Matcher schloss nur `favicon.ico` aus) — SEO-Audit deckte das auf. Fix + Regressionstest in `tests/PROJ-2-agentur-login.spec.ts`, erneut deployt und verifiziert (404 statt Redirect)
- Rate-Limiting bewusst nicht ergänzt (Upstash Redis wäre neue externe Abhängigkeit) — widerspräche der bereits getroffenen Entscheidung "Supabase-Auth-Standard reicht" (siehe Decision Log)

**Weiterhin offen:**
- Supabase-Dashboard-E-Mail-Template für Passwort-Reset noch nicht auf `/auth/confirm` umgestellt (siehe Open Questions) — Reset-Link aus echter E-Mail funktioniert dadurch noch nicht; ebenso Site-URL in Supabase Auth-Settings noch nicht auf die Produktions-Domain umgestellt
- Error-Tracking (Sentry) — braucht externe Kontoerstellung, siehe `docs/production/error-tracking.md`
- Fehlendes `favicon.ico` (kosmetisch, kostet 4 Punkte bei Best Practices)
