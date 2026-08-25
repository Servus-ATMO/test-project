# Product Requirements Document

## Vision
Ein internes Agentur-Tool, das importierte Kunden-Interviews (Journey-Transkript + Konzept-Analyse aus einem bestehenden, externen KI-Interview-Prompt) automatisch in ein nachvollziehbares Zusammenhangsmodell überführt (Themenblöcke → Profildimensionen → Content-Blöcke, optional Seitenhierarchie), als DAG/Sankey-Hybrid-Graph visualisiert und parallel dazu ein bearbeitbares, exportierbares Wireframe erzeugt — damit die Agentur aus einem Self-Service-Kundeninterview schneller zu einem fundierten, nachvollziehbaren Landingpage-Konzept kommt.

## Target Users
Agentur-Mitarbeiter (Konzeption/Strategie), die Kunden-Interviews auswerten und daraus Konzept + Wireframe für Feedback-Runden mit dem Kunden erstellen. Perspektivisch: Kunden selbst über einen individuellen Link (Ansicht/Mitarbeit).

## Core Features (Roadmap)

| Priority | Feature | Status |
|----------|---------|--------|
| P0 (MVP) | Supabase Infrastructure Setup | Deployed ([PROJ-1](../features/PROJ-1-supabase-infrastructure-setup.md)) |
| P0 (MVP) | Agentur-Login | Deployed ([PROJ-2](../features/PROJ-2-agentur-login.md)) |
| P0 (MVP) | Import-Werkstatt (Journey-Transkript.md + Konzept.md, Ebene 1+3 parsen) | Planned |
| P0 (MVP) | KI-Anreicherung (Ebene 2 Profildimensionen, Kanten, Konflikterkennung, Impact-Texte) | Planned |
| P0 (MVP) | DAG/Sankey-Graph-Visualisierung (4 Ebenen, Dossier-Panel) | Planned |
| P0 (MVP) | Branch-Datenmodell (Antworten ändern, Original/Branch-Vergleich) | Planned |
| P0 (MVP) | Konflikterkennung & -auflösung (Katalog-Varianten + strukturelle Eingriffe) | Planned |
| P0 (MVP) | Wireframe-Engine (nativer Baustein-Katalog, generiert aus Ebene 3, Drag&Drop, Varianten) | Planned |
| P0 (MVP) | Wireframe-Export (self-contained HTML/CSS/JS) | Planned |
| P0 (MVP) | Kunden-Zugriffslink (Ansicht/Mitarbeit) | Planned |
| P0 (MVP) | Kunden-/Projekt-Verwaltung (CRUD) | Planned |
| P1 | Mehrseiten-Struktur / Ebene 4 (Hub + Unterseiten, Cross-Page-Links) | Planned |
| P1 | Konfliktlösungen an reale Wireframe-Varianten koppeln (Grounding) | Planned |
| P1 | Live-Kopplung Ebene 2 ↔ Wireframe (Fernziel "Phase 2") | Planned |
| P2 | Interview-Frontend ins Tool integrieren (statt externem Prompt-Prozess) | Planned |
| P2 | Fragenkatalog-Editor (Themenblöcke/Fragen verwaltbar) | Planned |
| P2 | Weitere Projekttypen (nicht nur Landingpage) | Planned |

## Success Metrics
Jedes importierte Kunden-Interview lässt sich vollständig zu einem Konzept-Graph + exportierbarem Wireframe verarbeiten. Das validierte Konzept/Wireframe verkürzt die Zeit bis zur Projekt-Kalkulation spürbar; die Kalkulation selbst wird durch die standardisierte Content-Block-Struktur zunehmend standardisierbar — insgesamt schnellere, effizientere und bessere Projektumsetzung.

## Constraints
Solo-/Kleinteam-Projekt, kein hartes Deadline-Datum, iterativer Aufbau. Backend: Supabase (PostgreSQL + Auth). Design: Tailwind + shadcn/ui Defaults (hell), kein eigenes Design-System. Das Interview selbst läuft extern (bestehender Prompt-Prozess) — das Tool startet beim Import der resultierenden `.md`-Dateien.

## Non-Goals
Kein Self-Service-Interview-Frontend im Tool (bleibt extern). Keine Live-Kopplung Wireframe↔Ebene-2-Gewichtung (Fernziel, spätere Phase). Kein Fragenkatalog-Editor, keine anderen Projekttypen als Landingpage (diese Version). Kein Zurückschreiben von Anpassungen in echte Wireframe-Dateien — nur Simulation/eigenständiger Export. Kein Reuse des alten Prototyp-/Engine-Codes — Neuaufbau, alte Stände dienen nur als inhaltliche Referenz.

---

Use `/write-spec` to create detailed feature specifications for each item in the roadmap above.
