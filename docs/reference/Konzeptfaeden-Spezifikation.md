# Konzeptfäden – Konzeptdokument

**Status:** Konzeptphase, nicht umgesetzt · **Datum:** 2026-08-20 (Prototyp-Daten am 2026-08-20 ein zweites Mal ersetzt; Import-Werkstatt am 2026-08-24 ergänzt)
**Grundlage:** `Adaptiver Landingpage-Konzeptions-Prompt v2.md`. Zwei Beispiele, unterschiedliche Rolle: `STABAU_Landingpage-Konzept_v2-Analyse.md` (rekonstruiert, Hub+3-Pfade-Struktur – belegt Cross-Page-Links, Multi-Persona-Komplikation und emergente Konflikte, siehe Abschnitt 4–6) und die real durchgespielte Sammelkartenspiel-Off-Season-Journey (`20260820_demo_Sammelkartenspiel-OffSeason_Journey-Transkript.md`, `20260820_demo_Sammelkartenspiel-OffSeason_Konzept.md` in `Kunden/demo/`, `wireframes/20260820_demo_Sammelkartenspiel-OffSeason_Wireframe.html` – echte Drei-Wege-Segmentierung, aber als Ankerabschnitte auf einer einzigen Hub-Seite statt eigener Unterseiten, siehe Abschnitt 6; aktuell live im Prototyp).
**Prototyp:** [Konzeptfäden – interaktiver Sketch](https://claude.ai/code/artifact/9697a114-2513-4303-afd3-ed659c295e90) (zeigt aktuell die Sammelkartenspiel-Off-Season-Daten)

**Hinweis zum Vorgänger-Beispiel:** Bis 2026-08-20 zeigte dieses Dokument und der Sketch ein anderes Sammelkarten-Beispiel (B2C, eine einzige Persona, keine Segmentierung – Frage 8 dort). Dieses Beispiel wurde vollständig ersetzt, nicht ergänzt; die alten Dateien liegen archiviert unter `Kunden/old/`. Wo dieses Dokument frühere Annahmen ausdrücklich widerlegt (z. B. „0 Konflikte wegen fehlender Segmentierung"), ist das unten benannt statt stillschweigend überschrieben.

---

## 1. Ausgangsidee

Das Konzeptergebnis der Konzept-Engine (bevor es in die Wireframe-Engine fließt) soll nicht nur als Text vorliegen, sondern als visuelle, explorierbare Darstellung – in der Optik an Obsidians Graph-Ansicht bzw. an ein "Minority Report"-artiges Investigations-Board angelehnt. Ziel ist, Zusammenhänge und Abhängigkeiten zwischen dem Input des Nutzers (den Journey-Fragen) und dem Output des Konzepts (der Seitenstruktur) sichtbar zu machen.

Fernziel (Phase 2, nicht Teil dieses Dokuments): Konzept- und Wireframe-Engine sollen zusammenarbeiten, sodass sich in der Board-Ansicht visuell Gewichtungen verändern lassen und die Auswirkung sofort im Wireframe sichtbar wird.

Dieses Dokument beschreibt ausschließlich das **Konzept**, nicht die Umsetzung.

---

## 2. Grundarchitektur: dreischichtiger Graph

Die zentrale Erkenntnis aus der Analyse des Prompts: Zwischen Frage und Content-Block liegt keine direkte Verbindung, sondern eine dritte, verdeckte Schicht.

```
Ebene 1                    Ebene 2                       Ebene 3
Themenblöcke        →      Profil-Dimensionen      →     Content-Blöcke
(Input, beantwortet)       (verdeckt, 22 Stück)          (Output, Seitenstruktur)
```

- **Ebene 1** entspricht den vier Frage-Phasen des Prompts (Fragen 1–3, 4–6, 7–9, 10).
- **Ebene 2** entspricht dem "internen Landingpage-Profil", das der Prompt selbst führt und explizit *nicht* während der Journey ausgibt (Business Goal, Awareness Level, CTA Strategy, Trust Requirements, Content Depth, Umsetzungsrahmen, u. a., insgesamt 22 Dimensionen).
- **Ebene 3** entspricht den Content-Blöcken aus Abschnitt 4 der finalen Analyse (Feldschema mit Baustein-Key, Ziel, Headline, CTA, Medien, …).

Kein Content-Block lässt sich direkt aus einer Frage ableiten – der Weg führt immer über mindestens eine Profil-Dimension. Das ist der Grund, warum eine reine Zwei-Spalten-Darstellung (Frage → Block) irreführend wäre.

**Layout-Entscheidung:** Ein spaltenbasiertes, gerichtetes Diagramm (DAG/Sankey-Hybrid) statt eines freien Obsidian-Graphen. Die drei Spalten geben die Fluss-Richtung vor; ein reiner kraftbasierter Graph würde diese Richtung verschleifen.

**Erweiterung um Seitenhierarchie:** Hinter Ebene 3 kommt bei einer Hub+Unterseiten-Struktur eine vierte Spalte hinzu (siehe Abschnitt 6). Bei noch tieferen Hierarchien (z. B. Unter-Unterseiten) würde nach demselben Muster für jede weitere Hierarchiestufe eine weitere Spalte ergänzt.

---

## 3. Ebene 1 – Themenblöcke & Einzelfragen

**Granularität:** Der Themenblock ist die sichtbare Standardeinheit (4 Knoten: Phase 1–3, 4–6, 7–9, 10). Die zugrunde liegenden Einzelfragen (bis zu 10) sitzen darunter und sind ein-/ausblendbar – analog zum Verhalten von Ebene 2.

**Datenlücke – geschlossen:** Die STABAU-Analyse enthält nur das *synthetisierte Endergebnis*, nicht den rohen Frage-Antwort-Verlauf, und bleibt dafür auch rückwirkend ungeeignet (aus der docx-Ausgangslage synthetisiert, ohne protokollierte Einzelfragen). Für ein echtes Beispiel wurde die Journey deshalb neu, real durchgespielt (`20260820_demo_Sammelkartenspiel-OffSeason_Journey-Transkript.md`, nach dem Muster `Journey-Transkript-Vorlage.md`) – Ebene 1 zeigt jetzt echte, keine beispielhaft rekonstruierten Antworten:

- jede gestellte Frage (inkl. der sechs Optionen A–F, siehe Prompt-Format)
- die tatsächlich gewählte oder frei formulierte Antwort
- die Zuordnung zur jeweiligen Phase

Beobachtung aus dem realen Durchlauf: bei 6 von 10 Fragen wurden Buchstaben-*Kombinationen* (z. B. „C, D, E") statt Einzelbuchstabe oder Freitext gewählt – im Prompt-Format nicht als dritte Antwortform vorgesehen, siehe `Prompt-Engineering-Backlog.md`.

**Ziel der Einzelfragen-Ansicht:**
1. Nachvollziehbarkeit: Der Nutzer sieht genau, welche konkrete Frage/Antwort Grundlage für einen Themenblock war – und darüber die Verbindung zu Ebene 2 und Ebene 3.
2. Editierbarkeit: Antworten sollen sich nachträglich ändern lassen.

**Branching statt Überschreiben:** Da der Prompt adaptiv ist – jede Folgefrage entsteht aus dem bisherigen Antwortmuster (Prompt, Zeile 33–44, 206–214) –, kann eine geänderte Antwort andere Folgefragen nach sich ziehen als ursprünglich gestellt. Der ursprüngliche Verlauf darf dabei nicht verloren gehen: Eine geänderte Antwort erzeugt einen **Branch** (wie bei Versionierung), zwischen dem und dem Original-Zweig sich umschalten lässt. Das heißt: das spätere Datenmodell braucht eine Baumstruktur der Journey-Historie, keine lineare Liste.

*Im Prototyp bereits simuliert:* Echte Baumstruktur statt linearem Vergleich – jede Frage hat mehrere Branches (die tatsächlich angebotenen, nicht gewählten Optionen A–F aus dem echten Transkript, nicht erfunden), und mehrere Fragen im selben Themenblock lassen sich gleichzeitig, unabhängig voneinander branchen, jeweils inklusive kurzer Auswirkungs-Einschätzung (eigene Analyse). *Bewusst nicht simuliert:* die tatsächliche adaptive Neugenerierung der Folgefragen – das bleibt vorerst Text/Annahme, keine Live-Logik.

**Import-Werkstatt – automatische Ableitung geprüft (2026-08-24):** Das Journey-Transkript folgt einem festen Muster (`Journey-Transkript-Vorlage.md`: `## Phase X–Y: …`, `### Frage N`, Optionen `A) … F)`, `**Gewählte Antwort:** …`) und lässt sich dadurch tatsächlich mechanisch parsen, ganz ohne redaktionellen Zwischenschritt. Ein im Sketch eingebauter Parser wurde gegen die echte Datei `20260820_demo_Sammelkartenspiel-OffSeason_Journey-Transkript.md` getestet: 4/4 Themenblöcke und 10/10 Fragen korrekt erkannt, inklusive Mehrfachauswahl-Buchstaben und der jeweils real angebotenen, nicht gewählten Alternativen. Nicht mechanisch ableitbar bleiben die kurzen Themenblock-Beschreibungen (`desc`) und die Impact-Texte je Alternative – beides redaktionelle Verdichtung, nicht wörtlich im Transkript enthalten.

---

## 4. Ebene 2 – Profil-Dimensionen (verdeckt)

Die 22 Dimensionen aus dem internen Profil des Prompts. Zwei Rollen, je nach Phase:

- **Phase 1 (diese Konzeptstufe):** Nachvollziehbarkeit. Klickt man einen Content-Block an, zeigt Ebene 2, *warum* er so aussieht, nicht nur *dass* ein Zusammenhang besteht.
- **Phase 2 (Fernziel, Wireframe-Kopplung):** Bedienoberfläche. Ebene 2 eignet sich besser als Regler-Ebene als Ebene 1 (abgeschlossene Fragen lassen sich schlecht "gewichten") oder Ebene 3 (arbeitet gegen das Wireframe statt gegen die Strategie).

**Sichtbarkeit:** Standardmäßig ausgeblendet, per Schalter einblendbar. Ausgeblendet bleiben Abhängigkeiten trotzdem sichtbar – nur indirekt (Frage → Content-Block direkt, ohne die dazwischenliegende Dimension zu zeigen).

**Multi-Persona-Komplikation:** Der Prompt ist für eine einzelne Persona/Journey ausgelegt. Setzt ein Konzept – wie bei STABAU – mehrere parallele Nutzerpfade an, wird das Profil de facto mehrfach parallel instanziiert (je Pfad eigene Werte für Awareness Level, CTA Strategy usw.). Ebene 2 muss das abbilden können, nicht nur eine globale Instanz pro Dimension.

*Korrektur gegenüber dem Vorgänger-Beispiel:* Die aktuelle Sammelkartenspiel-Off-Season-Journey ist **kein** Gegenfall mehr – sie hat mit Vereinen & Ligen, Investoren und Presse drei parallele Zielgruppen (Frage 1, 2, 9), löst die Multi-Persona-Komplikation also real aus. Der Sketch modelliert Ebene 2 trotzdem weiterhin nur als eine globale Instanz pro Dimension – die Mehrfach-Instanziierung bleibt unverändert offen (siehe Abschnitt 8), jetzt aber mit einem zweiten, echten Beispiel, an dem sie fehlt, nicht nur mit STABAU. Was diese Journey stattdessen zeigt (siehe Abschnitt 5): drei parallele Zielgruppen führen nicht zwangsläufig zu erkannten Konflikten, wenn die Journey selbst gemeinsame Blöcke bewusst profil-neutral hält.

---

## 5. Ebene 3 – Content-Blöcke & Konflikterkennung

**Granularität:** Content-Block-Ebene (Abschnitt 4 der finalen Analyse), nicht Feld-Ebene.

**Automatische Konflikterkennung**, aus zwei unterschiedlichen Quellen:

1. **Explizite Antwort-Widersprüche** (Frage ↔ Frage): z. B. "hohe Conversion-Priorität" vs. "erklärungsbedürftiges Angebot, viel Content nötig".
2. **Emergente Output-Konflikte:** Ein Content-Block muss mehrere Profile gleichzeitig bedienen. Bei STABAU der Normalfall: Hero, Trust-Leiste und Header werden von allen drei Pfaden gleichzeitig genutzt, obwohl deren CTA-Strategien sich widersprechen (direkt/Telefon vs. Mail/Referenzen vs. Formular/Beratung).

Bei der Sammelkartenspiel-Off-Season-Journey erkennt derselbe Mechanismus ebenfalls **0 Konflikte** – diesmal aber *nicht*, weil eine Multi-Persona-Komplikation fehlt (sie liegt vor, siehe Abschnitt 4), sondern weil die Journey selbst sie vermeidet: Frage 10 legt explizit fest, dass die gemeinsamen Blöcke vor dem Gateway (Navigation, Einstieg, Produkt-Teaser, Drei Nutzenbereiche) für kalte und warme Besucher identisch bleiben und bewusst ohne harten CTA auskommen (Nutzerführung, Analyse Abschnitt 7) – es gibt also gar keine widersprüchlichen CTA-Strategien, die an einem gemeinsamen Block aufeinandertreffen. Zusammen mit dem STABAU-Fall (Konflikt vorhanden) und dem alten Sammelkarten-Beispiel (keine Konflikt-*Voraussetzung* vorhanden) ergibt sich ein dritter, bisher unbelegter Fall: Voraussetzung vorhanden, aber durch eine explizite Entscheidung in der Journey selbst aufgelöst, bevor die Konflikterkennung überhaupt greift. Die Konflikterkennung bleibt dadurch weiterhin ein generischer Mechanismus, kein STABAU-Sonderfall – aber „0 Konflikte" heißt jetzt nachweislich nicht automatisch „keine Mehrfach-Zielgruppen".

**Konfliktauflösung – zwei Kategorien, beide vorgesehen:**

- **Varianten (Katalog):** bereits im Engine-Katalog vorhandene Baustein-Modi, z. B. `hero-default` mit den Modi Standard / Produkt-Fokus / Bedarf.
- **Strukturelle Eingriffe:** Reihenfolge ändern, Abschnitt aufteilen, neuen `frei:`-Baustein vorschlagen. *Entscheidung:* beide Kategorien werden künftig angeboten, nicht nur Varianten.

*Im Prototyp bisher simuliert (am STABAU-Hero-Konflikt, nicht mehr live im aktuellen Sketch):* vier Lösungsoptionen – zwei Katalog-Varianten (Bedarf-Modus, Bedarfsauswahl-Modus) und zwei strukturelle Eingriffe (Hero+Gateway trennen, PopOver-Vorschaltung), inklusive echter Graph-Veränderung (neuer Knoten, umverdrahtete Kanten). Diese konkrete Simulation ist mit dem Wechsel auf die Sammelkarten-Daten aus dem Sketch gewichen, weil sie zu einem Konflikt gehörte, den es dort nicht gibt – als Beleg, dass die Mechanik bei Bedarf strukturelle Eingriffe live abbilden kann, bleibt sie hier dokumentiert.

**Aktuell stattdessen live simuliert:** Der reale, vergleichbare Entscheidungspunkt der Sammelkartenspiel-Off-Season-Journey – der Should-Have-Status der Vertrauens-Leiste (`trust-default`; Priorisierung, Analyse Abschnitt 8, „Weglassen"; Testhypothese 3, Abschnitt 10) – lässt sich im Content-Block-Dossier mit/ohne durchspielen. Kein automatisch *erkannter* Konflikt (es ist keiner), sondern eine bewusst *markierte*, testbare Priorisierungs-Entscheidung, visuell über eine eigene Badge-Farbe (Akzent statt Konflikt-Rot) von echten Konflikten unterschieden. Anders als beim Vorgänger-Beispiel läuft die Umschaltung hier in der Bibliotheks-*Zurichtung* (Baustein aktuell nicht platziert, testweise per Drag-and-Drop hinzufügbar) statt in der Entfernen-Richtung (Baustein platziert, per Ⓧ-Button entfernbar) – beides sind reale, im Wireframe (`20260820_demo_Sammelkartenspiel-OffSeason_Wireframe.html`) tatsächlich ausführbare Bibliotheks-Bewegungen, nur mit umgekehrter Ausgangslage. Der Knoten selbst bleibt im Graph dabei immer sichtbar (er ist ein dokumentierter Kandidat unabhängig vom Platzierungs-Stand); nur Badge-Text und Mini-Wireframe-Vorschau reagieren auf den Toggle – sonst wäre der Knoten im Default-Zustand („ohne") gar nicht auffindbar gewesen.

Zusätzlich enthält diese Journey drei Should-Have- bzw. Nice-to-Have-Blöcke ohne eigenen Toggle (Produktimpressionen, Investoren-Bereich als Should-Have; Presse-Bereich als Nice-to-Have, Priorisierung Analyse Abschnitt 8) – im Sketch über dieselbe Should-Have-Badge-Farbe bzw. eine eigene, noch zurückhaltendere Nice-to-Have-Badge sichtbar gemacht, aber ohne Mit/Ohne-Simulation, weil dafür kein realer, isolierter Testfall aus der Analyse vorliegt wie bei der Vertrauens-Leiste.

**Content-Block-Vorschau – umgesetzt:** Beim Vertrauens-Leiste-Knoten zeigt eine Mini-Wireframe-Vorschau zusätzlich zur Badge-Änderung den echten Katalog-Inhalt (die drei generischen Platzhalterzahlen aus `trust-default`, ausdrücklich als Platzhalter markiert, da keine echten Zahlen freigegeben sind – Priorisierung, Analyse Abschnitt 8), bewusst im hellen Wireframe-Look statt im dunklen Sketch-Chrome gehalten, damit sofort erkennbar ist: das ist eine Vorschau des echten Outputs. Reagiert live auf den Testhypothese-3-Toggle (generische Zahlen sichtbar / als entfernte, gestrichelte Box „nicht platziert").

**Import-Werkstatt – automatische Ableitung geprüft (2026-08-24):** Auch Abschnitt 4 „Seitenstruktur" der Konzept-Analyse folgt einem festen, im Prompt selbst vorgeschriebenen Feldschema (`### Abschnitt N: Titel`, dann `**Baustein:**`/`**Ziel:**`/`**Headline:**`/… als feste Bullet-Liste) und ist dadurch ebenfalls mechanisch parsbar. Am echten `20260820_demo_Sammelkartenspiel-OffSeason_Konzept.md` getestet: 11/11 Content-Blöcke aus Abschnitt 4 korrekt erkannt. Sogar der zwölfte, in Abschnitt 4 gar nicht auftauchende Block (`trust-default`) ließ sich automatisch ergänzen, weil auch Abschnitt 8 „Priorisierung" einem festen Schema folgt (`1. **Must Have:** …` bis `4. **Weglassen:** … (Baustein-Key in Klammern)`) – macht 12/12, exakt wie im kuratierten Sketch. Einschränkung dabei: der automatische Abgleich der Should-/Nice-to-Have-Einträge aus Abschnitt 8 mit den Abschnitt-4-Titeln ist unzuverlässig, weil Abschnitt 8 Bausteine teils mit anderen Worten benennt als deren eigener Abschnitt-4-Titel (z. B. „Produktimpressionen" vs. „Spiel in Aktion") – 5 von 12 Fragmenten blieben im Test ohne sichere Zuordnung, siehe `Prompt-Engineering-Backlog.md` Punkt 2. Nicht mechanisch ableitbar bleiben die freien `desc`-Texte, die redaktionell mehrere Analyse-Abschnitte verdichten.

---

## 6. Mehrseiten-Struktur: Hub & Unterseiten

**Hinweis:** Dieser Abschnitt beschreibt den generellen Mechanismus, belegt am STABAU-Beispiel (Hub + 3 Pfade + Über-Stabau). Das aktuell im Sketch live gezeigte Sammelkartenspiel-Off-Season-Beispiel hat laut Journey (Frage 1, 2, 9) eine echte Drei-Wege-Segmentierung (Vereine & Ligen, Investoren, Presse) – anders als noch beim Vorgänger-Beispiel bleibt Ebene 4 hier also *nicht* leer, weil Segmentierung fehlt, sondern weil diese Segmentierung als Ankerabschnitte auf einer einzigen Hub-Seite umgesetzt ist (Frage 9, Analyse Abschnitt 4), nicht als eigene Unterseiten-Dateien. Erst wenn z. B. „Für Investoren" eine eigene URL/Datei bekäme, entstünde dort ein Ebene-4-Knoten. Der Mechanismus selbst ist unverändert gültig, weiterhin nur mit STABAU als Live-Testdaten belegt.

Zielstellung des Tools: nicht nur den Konzept-Text abbilden, sondern das gesamte Arbeitsergebnis – Konzept **plus** die bereits gebauten Wireframes (Hub-Seite + alle Unterseiten, siehe `STABAU_Uebersicht.md`). Die Seitenhierarchie bekommt dafür eine eigene, vierte Ebene statt in Ebene 3 mitzulaufen:

- **Ebene 3 (Content-Blöcke)** bleibt auf die Hub-Seite beschränkt (Header, Hero, Trust-Leiste, Pfade/Gateway, …).
- **Ebene 4 (Seitenhierarchie)** enthält je einen Cluster-Knoten pro Unterseite (Pfad 1/2/3, Über Stabau), standardmäßig eingeklappt, mit eigener interner Block-Abfolge beim Aufklappen.

**Weitere Hierarchietiefen:** Hat eine Unterseite selbst wieder Unterseiten, bekäme diese dritte Hierarchiestufe eine eigene Ebene 5 – für jede zusätzliche Tiefe eine weitere Spalte nach demselben Muster. Für STABAU ist das nicht relevant (nur eine Hierarchiestufe unter dem Hub), das Prinzip ist im Prototyp aber so angelegt.

**Neue Kantenart – Cross-Page-Link:** Strukturelle/navigatorische Verknüpfungen, keine Ableitungskante wie bei Ebene 2–3, optisch unterscheidbar dargestellt (gepunktete statt gestrichelte Linie). Gegen `STABAU_Landingpage-Konzept_v2-Analyse.md` geprüft ergeben sich drei belegte Varianten, nicht nur eine:

1. **Hub → Unterseite („öffnet"):** Die Pfad-Teaser und der Über-Stabau-Teaser in Ebene 3 verlinken auf den jeweiligen Unterseiten-Cluster in Ebene 4 (Analyse, Abschnitt 08: „Link zur Unterseite").
2. **Unterseite ↔ Unterseite („Querlink"):** Jede der drei Pfad-Unterseiten verlinkt im Footer auf die jeweils anderen beiden Pfad-Unterseiten (Analyse, Abschnitt „Footer mit Seiten-Querlinks": „Das könnte auch relevant sein"). *Abgrenzung:* Über Stabau ist im Quelldokument nicht explizit als Teil dieser Pfad-Querlinks benannt („verwandte Pfade") und wurde deshalb bewusst nicht in dieses Querlink-Netz aufgenommen – eine Annahme, kein Beleg.
3. **Unterseite → Hub („Rücklink"):** Derselbe Footer enthält „Zurück zum Hub" – bei allen vier Unterseiten, auch Über Stabau. Im Prototyp zeigt dieser Rücklink auf den Header-Block, da es keinen einzelnen „Hub-Seiten"-Knoten gibt (Ebene 3 ist eine flache Blockliste, kein Cluster wie Ebene 4).

**Offen, nicht aus dem Quelldokument belegbar:** Ob die Unterseiten zusätzlich im Hauptmenü (`menu-default`/Header) verlinkt sind, lässt sich aus der Analyse nicht ablesen – dort steht nur „Logo + horizontale Navigation … + Telefonnummer", ohne die einzelnen Navigationspunkte aufzulisten. Diese mögliche vierte Verlinkungsart ist deshalb *nicht* simuliert.

**Grounding-Prinzip (Zielbild):** Anpassungen im Tool (z. B. Konfliktlösung) schreiben nicht live in die echten Wireframe-`.html`-Dateien zurück – es bleibt bei einer Darstellung/Simulation im Graph/Board. Die Datengrundlage dafür soll aber so weit wie möglich aus dem realen Steuerungspanel der bereits gebauten Wireframes stammen (z. B. Hero-Varianten „Einstiegssatz"/„Bedarfsauswahl", Produkt-Fokus, Pfade-Layout horizontal/vertikal – siehe `STABAU_Uebersicht.md`, Abschnitt „Steuerungspanel"), statt frei erfunden zu sein.

*Ausnahme für die aktuelle Prototyp-Phase:* Solange sich das Tool im reinen Simulationsmodus befindet (wie der aktuelle interaktive Sketch), dürfen Konfliktlösungsoptionen weiterhin frei erfunden werden, auch ohne Entsprechung in einer echten Wireframe-Variante. Das Grounding-Prinzip gilt als Zielbild für eine spätere, an echte Engine-Daten angebundene Version des Tools – nicht als Einschränkung der aktuellen Simulation. **Realer Beleg (zuletzt aktualisiert 2026-08-20):** Die Should-Have/Testhypothese-3-Simulation an der Vertrauens-Leiste (siehe Abschnitt 5) erfindet nichts – sie bildet exakt die Platzieren/Entfernen-Mechanik der Bibliothek ab, die im zugehörigen Wireframe real existiert (hier: ein aktuell nicht platzierter Katalog-Baustein, testweise hinzufügbar – im Vorgänger-Beispiel umgekehrt: ein platzierter Baustein, entfernbar). Für Fälle, in denen so ein reales Pendant fehlt, bleibt die Ausnahme in Kraft.

**Export-Anforderung:** Auch ohne Live-Schreiben in die echten Wireframe-Dateien muss sich das im Tool angepasste Arbeitsergebnis als eigenständiges HTML-Paket exportieren/verschicken lassen – analog zu den von der Wireframe-Engine erzeugten, vollständig eigenständigen `.html`-Dateien (CSS/JS eingebettet, einzeln versendbar). Noch nicht ausgearbeitet, siehe Offene Punkte.

---

## 7. Interaktionsmodell

Einheitliches Bedienmuster für alle drei Ebenen – das Detail-Panel (Dossier) rechts:

- **Klick auf Content-Block:** Herkunft rückwärts nachverfolgen (welche Profil-Dimensionen/Fragen haben ihn geprägt).
- **Klick auf Themenblock:** Wirkung vorwärts zeigen (welche Dimensionen/Blöcke er beeinflusst) *und* im selben Panel die zugehörigen Fragen & Antworten inkl. Branch-Vergleich.
- **Klick auf Profil-Dimension:** beide Richtungen (ein Eltern-Hop, alle Kind-Blöcke).
- **Klick auf Hero (Konfliktfall):** zusätzlich die Lösungsoptionen im selben Panel.

Die Entscheidung, Fragen/Antworten und Konfliktlösung im selben rechten Panel statt inline in der Karte unterzubringen, wurde bewusst getroffen – ein Bedienmuster für alle explorierbaren Details, statt zwei unterschiedliche.

**Ebenen-Schalter (alle vier Ebenen):** Jede Ebene lässt sich einzeln über einen Schalter im Spaltenkopf ein-/ausblenden. Bei Ebene 2 gehen die Abhängigkeiten dabei nicht verloren, sondern werden auf direkte Frage↔Block-Verbindungen komprimiert (indirekte Sichtbarkeit) – eine bewusste Sonderrolle, weil Ebene 2 die einzige "verdeckte" Ebene ist, deren Nachvollziehbarkeit auch beim Ausblenden erhalten bleiben soll. Bei Ebene 1, 3 und 4 verschwinden beim Ausblenden dagegen nur die direkt daran hängenden Kanten, ohne Umleitung – einfacher, aber für die reine Board-Übersichtlichkeit ausreichend.

---

## 8. Offene Punkte für die weitere Ausarbeitung

| Punkt | Stand |
|---|---|
| Rohes Journey-Transkript mitschneiden (Frage, Optionen, gewählte/freie Antwort) | ✅ Erledigt: Aufnahmeweg geklärt (normaler Chat, manueller Export in `Journey-Transkript-Vorlage.md`), inzwischen zwei reale Beispiel-Transkripte live erzeugt – zuletzt `20260820_demo_Sammelkartenspiel-OffSeason_Journey-Transkript.md` (Kunden/demo, Demo-Produkt „digitales Sammelkartenspiel für die Sport-Off-Season", B2B-Partnerschaften mit Vereinen & Ligen; ersetzt das vorherige B2C-Sammelkarten-Beispiel vollständig, archiviert unter `Kunden/old/`). Bei beiden Durchläufen wiederholt sich dieselbe Beobachtung: in der Mehrheit der Fragen wurden Buchstaben-**Kombinationen** statt Einzelbuchstabe oder Freitext gewählt – im Prompt nicht als dritte Antwortform vorgesehen, siehe `Prompt-Engineering-Backlog.md`. Automatisierung des Mitschnitts bleibt Perspektive für später |
| Branch-Datenmodell (Baumstruktur statt linearer Verlauf) | ✅ Erledigt: Jede Frage hat jetzt mehrere echte Alternativen (die real angebotenen, nicht gewählten Optionen A–F), und mehrere Fragen im selben Themenblock lassen sich gleichzeitig, unabhängig voneinander branchen (`branchState[phaseId][questionIndex]` statt ein Slot pro Themenblock). Weiterhin *nicht* simuliert: adaptive Neugenerierung der Folgefragen bei geänderter Antwort – bleibt eigener Punkt |
| Adaptive Neugenerierung von Folgefragen bei geänderter Antwort | Bewusst *nicht* simuliert – Umfang für später vorgemerkt. Explizit zurückgestellt (2026-08-20): erfordert Live-Regenerierung, die ein statisches Artefakt architektonisch nicht leisten kann |
| Content-Block-Vorschau bei Konfliktauflösung (statt nur Graph-Änderung) | ✅ Erledigt: Am Vertrauens-Leiste-Knoten zeigt eine Mini-Wireframe-Vorschau (heller Wireframe-Look statt dunklem Board-Chrome, bewusst kontrastierend) den echten Katalog-Inhalt aus `20260820_demo_Sammelkartenspiel-OffSeason_Wireframe.html`, Bibliothek → Trust → Default – reagiert live auf den Testhypothese-3-Toggle (Platzhalterzahlen sichtbar / nicht platziert) |
| Ebene-2-Instanziierung bei mehreren parallelen Personas/Pfaden | Als Komplikation erkannt, Darstellung noch offen. Jetzt mit zwei echten Belegen statt einem: STABAU (Konflikt entsteht) und die Sammelkartenspiel-Off-Season-Journey (Konflikt durch bewusste Journey-Entscheidung vermieden, siehe Abschnitt 5) – beide modellieren Ebene 2 im Sketch weiterhin nur als eine globale Instanz |
| Grounding der Konfliktlösungsoptionen in echten Wireframe-Steuerungspanel-Varianten | ✅ Realer Beleg (aktualisiert 2026-08-20): Vertrauens-Leiste-Toggle (Testhypothese 3) bildet exakt die reale Bibo-Platzieren/Entfernen-Mechanik aus `20260820_demo_Sammelkartenspiel-OffSeason_Wireframe.html` ab (Abschnitt 5/6). Für Fälle ohne echtes Pendant gilt die Ausnahme weiter – noch nicht auf STABAU-Konfliktoptionen übertragen |
| Export des angepassten Arbeitsergebnisses als eigenständiges HTML-Paket (wie Wireframe-Engine-Output) | Anforderung festgehalten, nicht ausgearbeitet |
| Weitere Hierarchietiefen (Ebene 5+) bei Unter-Unterseiten | Prinzip dokumentiert (Abschnitt 6), weder für STABAU noch für die Sammelkartenspiel-Off-Season-Journey relevant – letztere hat mangels eigener Unterseiten-Dateien nicht einmal Ebene 4 (siehe Abschnitt 6), keine Testdaten vorhanden |
| Verlinkung der Unterseiten im Hauptmenü (Header/`menu-default`) | Im Quelldokument nicht spezifiziert (nur „horizontale Navigation" ohne Einzelpunkte) – nicht simuliert, keine Annahme getroffen |
| Phase 2 – Kopplung an die Wireframe-Engine (Gewichtung → Live-Wireframe) | Fernziel, außerhalb dieses Dokuments |
| Optische Trennung ab Ebene 3 (Output), weil ab hier das Wireframing beginnt | Notiert, noch nicht umgesetzt |
| Automatischer Import von Ebene 1 + 3 aus Transkript/Konzept (Import-Werkstatt) | ✅ Erledigt für Ebene 1 (10/10 Fragen) und Ebene 3 (12/12 Blöcke inkl. „Weglassen"-Fund), am echten Sammelkartenspiel-Off-Season-Beispiel getestet (2026-08-24). Ebene 2, die Kanten `informs`/`shapes`, Konflikterkennung und die Impact-Texte bleiben bewusst außerhalb – sie stehen in keiner der beiden Dateien, weil der Prompt das interne Profil nie ausgibt. Direktes MD-Parsing statt Zwischenformat gewählt, weil beide Quelldokumente einem festen, im Prompt selbst vorgeschriebenen Schema folgen |
| Priorisierungs-Wortlaut (Abschnitt 8) nicht immer deckungsgleich mit Abschnitt-4-Titeln | Neu entdeckt beim Bau der Import-Werkstatt (2026-08-24) – erschwert automatischen Abgleich, siehe `Prompt-Engineering-Backlog.md` Punkt 2 |

---

## 9. Referenzen

- Prompt-Grundlage: `Adaptiver Landingpage-Konzeptions-Prompt v2.md`
- **Sammelkartenspiel-Off-Season-Beispiel (aktuell live im Sketch), unter `Kunden/demo/`:**
  - Reales Journey-Transkript: `20260820_demo_Sammelkartenspiel-OffSeason_Journey-Transkript.md`
  - Finale Konzept-Analyse: `20260820_demo_Sammelkartenspiel-OffSeason_Konzept.md`
  - Gebautes, interaktives Wireframe: `wireframes/20260820_demo_Sammelkartenspiel-OffSeason_Wireframe.html` (mit Bibliothek/Steuerungspanel, echte Wireframe-Engine + geteilter Katalog; zehn von elf Sections sind unveränderte Katalog-Bausteine, nur „Für Presse" läuft unter dem projekt-lokalen Key `content-presse`, siehe Wireframe-Hinweis; Quelldateien dazu in `wireframes/assets/`)
- **STABAU-Beispiel (rekonstruiert, belegt Mehrseiten-/Konflikt-Mechanik, siehe Abschnitt 5–6):**
  - Konzept: `STABAU_Landingpage-Konzept_v2-Analyse.md`
  - Wireframes (bestätigen Teile der simulierten Konfliktlösungen real): `STABAU_Wireframe-Hub.html` (enthält Gateway-Bereich und zwei Hero-Varianten)
- **Archiviertes Vorgänger-Beispiel (B2C-Sammelkarten, bis 2026-08-20 live im Sketch, seither ersetzt):** `Kunden/old/` – als Referenz erhalten, nicht mehr im Sketch verdrahtet
- Prompt-Engineering-Beobachtungen aus dem realen Durchlauf: `Prompt-Engineering-Backlog.md`
- Interaktiver Sketch dieses Konzepts (inkl. Import-Werkstatt, Ebene 1 + 3 automatisch aus den beiden Rohdateien ableitbar): [Konzeptfäden](https://claude.ai/code/artifact/9697a114-2513-4303-afd3-ed659c295e90)
- Zugehöriges Wireframe als Artifact: [Demo Wireframe – Sammelkartenspiel Off-Season](https://claude.ai/code/artifact/f93adf35-35f4-4354-a6de-4a76d84a5a9a)

---

## Nachtrag (PROJ-4-Spec-Interview, 2026-08-28)

Dieses Dokument war zwischenzeitlich durch Kontext-Komprimierung aus dem Repo verloren gegangen (beide Vorlagen unter `docs/reference/` verwiesen weiterhin darauf, ohne dass es existierte) und wurde vom Nutzer während des `/write-spec PROJ-4`-Interviews erneut bereitgestellt. Eine Korrektur gegenüber diesem Dokument: Die tatsächliche Anzahl der Profil-Dimensionen aus dem Original-Prompt (Abschnitt „Interne Bewertung") ist **23**, nicht 22 wie hier überschlagen — siehe `PROJ-4-ki-anreicherung.md` für die vollständige, aus dem Prompt zitierte Liste. Ebenfalls in PROJ-4 entschieden (abweichend vom offenen Punkt in Abschnitt 8/4 dieses Dokuments): Die Multi-Persona-Instanziierung wird nicht länger aufgeschoben, sondern bereits im MVP umgesetzt.
