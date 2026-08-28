# Interview-Import – Vorlage (kombinierte Datei)

**Zweck:** Ab `/refine PROJ-3` (2026-08-28) lädt der Nutzer nicht mehr zwei getrennte Dateien hoch, sondern **eine** kombinierte Interview-Import-Datei, die beide Blöcke enthält. Diese Vorlage dokumentiert **nur die Zusammenlegung** — der Inhalt jedes Blocks bleibt exakt so, wie er in den beiden bestehenden Vorlagen bereits definiert ist:

- Block 1: `Journey-Transkript-Vorlage.md`
- Block 2: `Landingpage-Konzept-Vorlage.md`

**Warum keine Inhalts-Duplizierung:** Die beiden bestehenden Vorlagen bleiben die alleinige Quelle für ihr jeweiliges Format. Diese Datei hier beschreibt ausschließlich, wie beide zu einer Datei zusammengefügt werden — würde der Inhalt hier dupliziert, könnten beide Kopien mit der Zeit auseinanderlaufen.

**Aufbau der kombinierten Datei:**

```markdown
# Journey-Transkript – [Kunde/Demo-Name]

... vollständiger Inhalt exakt nach Journey-Transkript-Vorlage.md ...

---

# Landingpage-Konzept: [Kunde/Demo-Name]

... vollständiger Inhalt exakt nach Landingpage-Konzept-Vorlage.md ...
```

**Erkennung beim Import:** Die beiden Block-Überschriften (`# Journey-Transkript – …` und `# Landingpage-Konzept: …`) sind bereits die jeweils eigene erste Zeile der beiden bestehenden Vorlagen — es wird **kein neues Trennzeichen** eingeführt. Der Import sucht in der hochgeladenen Datei nach diesen beiden bekannten Überschriften (unabhängig von ihrer Reihenfolge) und teilt den Rohtext dort in zwei Abschnitte auf, bevor jeder Abschnitt an die jeweils zuständige, unveränderte Parsing-Logik übergeben wird.

**Fehlt einer der beiden Blöcke** (z. B. weil versehentlich nur die alte, einzelne Journey-Transkript.md hochgeladen wurde): Das Tool erkennt das explizit und meldet klar, welcher Block fehlt, statt eine irreführend halb leere Vorschau anzuzeigen.

**Ablageort im Ablauf:** Wird nicht manuell ausgefüllt — entsteht als eine einzelne Ausgabe am Ende einer Interview-Chat-Session mit dem externen `Adaptiver-Landingpage-Konzeptions-Prompt-v2.md` (siehe dort, Abschnitt „AUSGABE NACH FRAGE 10"). Empfohlener Dateiname: `demo_Interview-Import_[Projekt-Name]_[Datum].md`.

**Breaking Change gegenüber dem alten Zwei-Datei-Format:** Das alte Format (zwei separate Dateien/Upload-Slots) wird nicht mehr unterstützt, es gibt keinen Parallelbetrieb. Bereits importierte Daten im alten Format bleiben in der Datenbank unverändert bestehen — nur ein erneuter Import verlangt die neue kombinierte Datei. Siehe `features/PROJ-3-import-werkstatt.md`, Decision Log, für die vollständige Begründung.
