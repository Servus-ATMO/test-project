# Feature Index

> Central tracking for all features. Updated by skills automatically.

## Status Legend
- **Roadmap** - `/init` done, feature identified in feature map, no spec file yet
- **Planned** - `/write-spec` done, full spec written, architecture not yet designed
- **Architected** - `/architecture` done, tech design approved, ready to build
- **In Progress** - `/frontend` or `/backend` active or completed, not yet in QA
- **In Review** - `/qa` active, testing in progress
- **Approved** - `/qa` passed, no critical/high bugs, ready to deploy
- **Deployed** - `/deploy` done, live in production

## Recommended Build Order (P0 / MVP)

PROJ-1 → PROJ-2 → PROJ-17 → PROJ-3 → PROJ-4 → PROJ-5 → PROJ-6 → PROJ-7 → PROJ-8 → PROJ-9 → PROJ-10

## Features

| ID | Feature | Priority | Dependencies | Status | Spec | Created |
|----|---------|----------|---------------|--------|------|---------|
| PROJ-1 | Supabase Infrastructure Setup | P0 | None | Deployed | [PROJ-1](PROJ-1-supabase-infrastructure-setup.md) | 2026-08-24 |
| PROJ-2 | Agentur-Login | P0 | PROJ-1 | Deployed | [PROJ-2](PROJ-2-agentur-login.md) | 2026-08-24 |
| PROJ-3 | Import-Werkstatt (Journey-Transkript + Konzept vollständig parsen) | P0 | PROJ-1, PROJ-17 | Planned | [PROJ-3](PROJ-3-import-werkstatt.md) | 2026-08-24 |
| PROJ-4 | KI-Anreicherung (Ebene 2 Profildimensionen, Kanten, Konflikterkennung, Impact-Texte) | P0 | PROJ-3 | Roadmap | — | 2026-08-24 |
| PROJ-5 | DAG/Sankey-Graph-Visualisierung (4 Ebenen, Dossier-Panel) | P0 | PROJ-4 | Roadmap | — | 2026-08-24 |
| PROJ-6 | Branch-Datenmodell (Antworten ändern, Original/Branch-Vergleich) | P0 | PROJ-3 | Roadmap | — | 2026-08-24 |
| PROJ-7 | Konflikterkennung & -auflösung (Katalog-Varianten + strukturelle Eingriffe) | P0 | PROJ-4, PROJ-5 | Roadmap | — | 2026-08-24 |
| PROJ-8 | Wireframe-Engine (nativer Baustein-Katalog, generiert aus Ebene 3, Drag&Drop, Varianten) | P0 | PROJ-4 | Roadmap | — | 2026-08-24 |
| PROJ-9 | Wireframe-Export (self-contained HTML/CSS/JS) | P0 | PROJ-8 | Roadmap | — | 2026-08-24 |
| PROJ-10 | Kunden-Zugriffslink (Ansicht/Mitarbeit) | P0 | PROJ-17 | Roadmap | — | 2026-08-24 |
| PROJ-11 | Mehrseiten-Struktur / Ebene 4 (Hub + Unterseiten, Cross-Page-Links) | P1 | PROJ-5 | Roadmap | — | 2026-08-24 |
| PROJ-12 | Konfliktlösungen an reale Wireframe-Varianten koppeln (Grounding) | P1 | PROJ-7, PROJ-8 | Roadmap | — | 2026-08-24 |
| PROJ-13 | Live-Kopplung Ebene 2 ↔ Wireframe (Fernziel "Phase 2") | P1 | PROJ-8 | Roadmap | — | 2026-08-24 |
| PROJ-14 | Interview-Frontend ins Tool integrieren | P2 | None | Roadmap | — | 2026-08-24 |
| PROJ-15 | Fragenkatalog-Editor (Themenblöcke/Fragen verwaltbar) | P2 | PROJ-14 | Roadmap | — | 2026-08-24 |
| PROJ-16 | Weitere Projekttypen (nicht nur Landingpage) | P2 | None | Roadmap | — | 2026-08-24 |
| PROJ-17 | Kunden-/Projekt-Verwaltung (CRUD) | P0 | PROJ-2 | Approved | [PROJ-17](PROJ-17-kunden-projekt-verwaltung.md) | 2026-08-25 |

<!-- Add features above this line -->

## Next Available ID: PROJ-18
