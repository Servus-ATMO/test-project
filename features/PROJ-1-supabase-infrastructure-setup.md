# PROJ-1: Supabase Infrastructure Setup

## Status: Planned
**Created:** 2026-08-25
**Last Updated:** 2026-08-25

## Dependencies
- None

## User Stories
- Als Agentur-Mitarbeiter möchte ich mich mit E-Mail/Passwort einloggen können, damit nur autorisierte Personen Zugriff auf Kunden-Interviews und Konzepte haben.
- Als Entwickler möchte ich eine funktionierende Supabase-Verbindung (ENV-Variablen, Client-Setup) haben, damit alle nachfolgenden Features (PROJ-2 bis PROJ-10) darauf aufbauen können.
- Als Entwickler möchte ich einen dokumentierten Schema-Entwurf für alle Haupttabellen haben, damit spätere Features (`/architecture`) konsistent auf dasselbe Datenmodell aufbauen statt es je Feature neu zu erfinden.
- Als Agentur-Mitarbeiter möchte ich, dass importierte Rohdateien und exportierte Wireframes sicher und getrennt abgelegt werden, damit keine Verwechslungsgefahr zwischen Kundendaten besteht.

## Out of Scope
- `clients`/`projects`-Tabellen und deren CRUD-UI — gehört zu PROJ-2
- Login-UI (Formular, Passwort-vergessen-Flow) — gehört zu PROJ-2
- Kunden-Zugriffslinks/Tokens — gehört zu PROJ-10
- Öffentliches Sign-up für Agentur-Mitarbeiter — bewusst nicht vorgesehen (siehe Decision Log)
- Mandantenfähigkeit (mehrere Agenturen/Organisationen) — nicht Teil dieser Version (siehe PRD Non-Goals)
- Tabellen für Ebene 1–4 (Themenblöcke, Profildimensionen, Content-Blöcke, Seitenhierarchie), Branch-Modell, Konflikte, Wireframe-Bausteine — werden erst bei PROJ-3/4/6/7/8 tatsächlich angelegt, hier nur im Schema-Entwurf skizziert

## Acceptance Criteria

**Format:** Angenommen [Vorbedingung] / Wenn [Aktion] / Dann [Ergebnis]

- [ ] Angenommen das Supabase-Projekt ist erreichbar, wenn die Next.js-App startet, dann verbindet sich `src/lib/supabase.ts` erfolgreich über `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` aus `.env.local`
- [ ] Angenommen ein gültiger Agentur-Account existiert, wenn sich ein Mitarbeiter mit E-Mail/Passwort anmeldet, dann erhält er eine gültige Session
- [ ] Angenommen kein Agentur-Account mit dieser E-Mail existiert, wenn ein Login-Versuch stattfindet, dann schlägt die Anmeldung mit einer generischen Fehlermeldung fehl (kein Hinweis, ob die E-Mail existiert)
- [ ] Angenommen ein neuer Supabase-Auth-User wird angelegt, wenn dieser zum ersten Mal authentifiziert wird, dann existiert automatisch ein zugehöriger Eintrag in `profiles` (z. B. per DB-Trigger)
- [ ] Angenommen die `profiles`-Tabelle existiert, wenn RLS geprüft wird, dann kann ein Mitarbeiter nur seinen eigenen Profil-Datensatz bearbeiten, aber alle Profile lesen (für spätere Zuordnungs-/Autoren-Anzeigen)
- [ ] Angenommen die Storage-Buckets `imports` und `exports` existieren, wenn ein nicht authentifizierter Request auf `imports` zugreift, dann wird der Zugriff verweigert
- [ ] Angenommen `.env.local.example` ist im Repo vorhanden, wenn ein neuer Entwickler das Projekt aufsetzt, dann findet er dort alle benötigten Variablennamen (inkl. Hinweis, dass der Service-Role-Key niemals clientseitig verwendet werden darf)

## Edge Cases
- Was passiert, wenn `NEXT_PUBLIC_SUPABASE_URL`/`ANON_KEY` fehlen oder ungültig sind? → App darf nicht mit unklarem Fehler abstürzen, sondern soll eine verständliche Fehlermeldung beim Start/Verbindungsversuch zeigen.
- Was passiert bei einem abgelaufenen Session-Token? → Nutzer wird zur Login-Seite umgeleitet (Redirect-Verhalten wird von PROJ-2 tatsächlich gebaut, PROJ-1 stellt nur sicher, dass Supabase Auth das technisch unterstützt).
- Was passiert, wenn zwei Migrationen gleichzeitig auf dieselbe Tabelle angewendet werden (Team-Konflikt)? → Migrationen laufen sequenziell über die Supabase-CLI/MCP, keine parallelen Schema-Änderungen ohne Absprache.
- Was passiert, wenn der Service-Role-Key versehentlich im Frontend-Bundle landet? → Muss durch Code-Review/Lint verhindert werden; Service-Role-Key wird ausschließlich in serverseitigem Code (API-Routes/Server Actions) verwendet.

## Technical Requirements (optional)
- Security: Row Level Security auf allen Tabellen von Anfang an aktiv (siehe `.claude/rules/backend.md`)
- Security: Service-Role-Key nur serverseitig, niemals im Client-Bundle
- Auth: E-Mail/Passwort via Supabase Auth, kein öffentliches Sign-up

## Open Questions
- [ ] Sollen abgelaufene/inaktive Agentur-Accounts deaktiviert statt gelöscht werden können? (relevant, sobald das Team wächst — aktuell nicht entscheidungsrelevant bei kleinem Team)
- [ ] Passwort-Reset-Flow: eigenes UI oder Supabase-Standard-E-Mail-Flow? (wird konkret bei PROJ-2 entschieden)

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Single-Tenant (eine Agentur, kein Organisations-Isolationslayer) | Internes Tool für die eigene Agentur, keine Multi-Tenant-SaaS geplant (siehe PRD Non-Goals) | 2026-08-25 |
| E-Mail/Passwort statt Magic-Link/OAuth | Einfachste Umsetzung ohne Abhängigkeit von Mail-Provider- oder OAuth-Konfiguration, ausreichend für kleines internes Team | 2026-08-25 |
| Kein öffentliches Sign-up, Accounts manuell angelegt | Kleines, festes Team; offene Registrierung wäre unnötiges Sicherheitsrisiko für ein internes Tool | 2026-08-25 |
| Zwei getrennte Storage-Buckets (`imports`, `exports`) statt einem gemischten Bucket | Klarere Zugriffsrechte/Policies je nach Vertraulichkeit und Zielgruppe (intern vs. ggf. Kunden-Versand) | 2026-08-25 |
| PROJ-1 legt nur Infrastruktur-Tabellen (`profiles`) an, dokumentiert aber den groben Schema-Entwurf für alle Features | Hält PROJ-1 schlank, verhindert aber, dass spätere Features das Datenmodell gegeneinander entwerfen | 2026-08-25 |

### Technical Decisions
<!-- Added by /architecture -->
| Decision | Rationale | Date |
|----------|-----------|------|
| `@supabase/ssr` statt reinem `@supabase/supabase-js` | Next.js App Router braucht korrektes Cookie-basiertes Session-Handling über Server/Client/Middleware hinweg — offiziell empfohlener Weg für dieses Setup | 2026-08-25 |
| Getrennte Server- und Browser-Client-Instanzen | Verhindert versehentliches Leaken des Service-Role-Keys in den Client-Bundle | 2026-08-25 |
| Middleware zur Session-Aktualisierung auf jedem Request | Ohne sie bleiben abgelaufene Sessions inkonsistent gültig, bis der Nutzer manuell neu lädt | 2026-08-25 |
| DB-Trigger statt Anwendungscode für automatische `profiles`-Anlage | Trigger kann nicht vergessen/umgangen werden, unabhängig vom Anmeldeweg | 2026-08-25 |
| Schema-Änderungen als versionierte Migrationen (Supabase CLI/MCP) statt manueller Dashboard-Änderungen | Nachvollziehbarkeit im Git-Verlauf, kein Drift zwischen Umgebungen | 2026-08-25 |

## Grober Schema-Entwurf (Orientierung für spätere Features)
*Nicht Teil der Implementierung von PROJ-1 — dient `/architecture` als Ausgangspunkt bei PROJ-2 ff.*

| Tabelle | Angelegt in | Zweck |
|---|---|---|
| `profiles` | PROJ-1 | Agentur-Mitarbeiter, 1:1 zu `auth.users` |
| `clients` | PROJ-2 | Kunden der Agentur |
| `projects` | PROJ-2 | Ein Landingpage-Projekt pro Kunde (kann später mehrere je Kunde sein) |
| `client_access_links` | PROJ-10 | Individuelle Zugriffstoken pro Kunde/Projekt |
| `interview_imports` | PROJ-3 | Rohdaten aus Journey-Transkript.md + Konzept.md, Ebene 1 + 3 |
| `journey_branches` | PROJ-6 | Branch-Baumstruktur für geänderte Antworten |
| `profile_dimensions` / `graph_edges` | PROJ-4 | Ebene 2 (KI-generiert) + Kanten informs/shapes |
| `conflicts` | PROJ-4, PROJ-7 | Erkannte Konflikte + Auflösungsoptionen |
| `page_hierarchy` | PROJ-11 | Ebene 4 (P1, Hub+Unterseiten) |
| `wireframe_blocks` | PROJ-8 | Platzierte Bausteine + Varianten je Projekt |

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### A) Struktur (keine sichtbare UI in PROJ-1 — reine Infrastruktur)

```
App-weite Infrastruktur
├── Supabase-Anbindung
│   ├── Server-seitiger Client   (für Server Components/Actions)
│   ├── Browser-Client           (für Client Components)
│   └── Middleware                (hält Session pro Request aktuell,
│                                   leitet bei abgelaufener Session weiter)
├── Datenbank
│   └── Tabelle "profiles"
│       └── Trigger: legt bei erster Anmeldung automatisch einen
│                     profiles-Eintrag an
├── Storage
│   ├── Bucket "imports"   (privat — rohe Interview-Dateien)
│   └── Bucket "exports"   (privat — generierte Wireframe-Pakete)
└── Konfiguration
    ├── .env.local           (echte Werte, nicht versioniert)
    └── .env.local.example   (Vorlage, versioniert, ohne echte Werte)
```

Login-Formular, Passwort-Reset-UI etc. entstehen erst bei PROJ-2 — PROJ-1 liefert nur die Schicht darunter, die PROJ-2 dann verwendet.

### B) Datenmodell (in einfachen Worten)

**Tabelle `profiles`** — ein Eintrag pro Agentur-Mitarbeiter:
- Eindeutige ID (dieselbe wie beim Supabase-Login-Konto)
- E-Mail-Adresse
- Anzeigename
- Erstellt-Zeitstempel

Zugriffsregel: Jeder eingeloggte Mitarbeiter darf alle Profile lesen (später z. B. für "bearbeitet von"-Anzeigen), aber nur sein eigenes bearbeiten. Einträge werden nicht über die App gelöscht.

**Storage-Buckets:**
- `imports`: rohe `.md`-Dateien, die die Agentur importiert — nur für eingeloggte Mitarbeiter sichtbar
- `exports`: fertige Wireframe-HTML-Pakete — vorerst ebenfalls nur intern; ein zeitlich befristeter Kunden-Zugriff kommt erst mit PROJ-10 dazu

### C) Technische Entscheidungen (Begründung)

- **Getrennte Server-/Browser-Clients statt eines einzigen Clients:** Verhindert, dass sensible Zugriffsschlüssel versehentlich im Browser landen.
- **Middleware zur Session-Aktualisierung:** Prüft bei jedem Seitenaufruf im Hintergrund, ob die Sitzung noch gültig ist.
- **Datenbank-Trigger statt Anwendungscode für die Profil-Anlage:** Kann nicht vergessen oder umgangen werden, auch bei künftigen neuen Anmeldewegen.
- **Row Level Security von Anfang an aktiv** (auf `profiles` und beiden Storage-Buckets): Grundprinzip aus den Projekt-Regeln, verhindert Zugriff auf fremde Daten bei falsch konfiguriertem Client.
- **Datenbank-Änderungen als versionierte Migrationen statt manueller Dashboard-Klicks:** Nachvollziehbar im Git-Verlauf, reproduzierbar, kein Drift zwischen Umgebungen.

### D) Abhängigkeiten (zu installierende Pakete)

- **Supabase-Next.js-Anbindung** (`@supabase/ssr`) — offizielles Paket für serverseitige Sitzungsverwaltung im Next.js App Router
- **Supabase-Basis-Client** (`@supabase/supabase-js`) — Grundlage, auf der die Next.js-Anbindung aufbaut

Keine weiteren neuen Abhängigkeiten nötig — Formulare/Validierung für das eigentliche Login-UI kommen erst mit PROJ-2.

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
