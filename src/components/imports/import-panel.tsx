'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { UploadZone } from './upload-zone'
import { ParsedDocumentView } from './parsed-document-view'
import { useImport } from '@/hooks/useImport'
import { checkCrossFormat, validateFile } from '@/lib/imports/format-detect'
import type { FormatWarning, ParsedImport } from '@/lib/imports/types'

export function ImportPanel({ projectId }: { projectId: string }) {
  const { parsedImport, loaded, parsePreview, saveImport, hasDependentData } = useImport(projectId)

  const [journeyFile, setJourneyFile] = useState<File | null>(null)
  const [konzeptFile, setKonzeptFile] = useState<File | null>(null)
  const [journeyError, setJourneyError] = useState<string | null>(null)
  const [konzeptError, setKonzeptError] = useState<string | null>(null)
  const [preview, setPreview] = useState<ParsedImport | null>(null)
  const [formatWarnings, setFormatWarnings] = useState<FormatWarning[]>([])
  const [warningsAcknowledged, setWarningsAcknowledged] = useState(false)
  const [checking, setChecking] = useState(false)
  const [showUpload, setShowUpload] = useState(false)

  if (!loaded) return null

  const handleFileSelected = (slot: 'journey' | 'konzept', file: File | null) => {
    if (slot === 'journey') {
      setJourneyFile(file)
      setJourneyError(file ? validateFile(file) : null)
    } else {
      setKonzeptFile(file)
      setKonzeptError(file ? validateFile(file) : null)
    }
  }

  const handleCheck = async () => {
    if (!journeyFile || !konzeptFile) return
    setChecking(true)
    try {
      const [journeyText, konzeptText] = await Promise.all([
        journeyFile.text(),
        konzeptFile.text(),
      ])

      const result = parsePreview(journeyText, konzeptText)
      const journeyWarning = checkCrossFormat('journey', journeyText)
      const konzeptWarning = checkCrossFormat('konzept', konzeptText)

      // Ein Hard-Fail ("keine erkennbare Struktur") gilt nur, wenn eine Datei
      // WEDER zu ihrem eigenen Slot noch zum jeweils anderen Format passt -
      // sieht sie eher wie das andere Dokument aus, hat sie durchaus eine
      // erkennbare Struktur (nur fuer den falschen Slot) und bekommt
      // stattdessen die Format-Warnung mit "Trotzdem fortfahren"-Option.
      if (!result.journey.hasRecognizableStructure && !journeyWarning) {
        setJourneyError('In dieser Datei wurde praktisch keine erkennbare Struktur gefunden.')
        return
      }
      if (!result.konzept.hasRecognizableStructure && !konzeptWarning) {
        setKonzeptError('In dieser Datei wurde praktisch keine erkennbare Struktur gefunden.')
        return
      }

      const warnings: FormatWarning[] = []
      if (journeyWarning) warnings.push(journeyWarning)
      if (konzeptWarning) warnings.push(konzeptWarning)
      setFormatWarnings(warnings)
      setWarningsAcknowledged(false)
      setPreview(result)
    } finally {
      setChecking(false)
    }
  }

  const handleCancel = () => {
    setPreview(null)
    setFormatWarnings([])
    setWarningsAcknowledged(false)
  }

  const handleConfirm = () => {
    if (!preview) return
    saveImport(preview)
    setPreview(null)
    setJourneyFile(null)
    setKonzeptFile(null)
    setFormatWarnings([])
    setWarningsAcknowledged(false)
    setShowUpload(false)
  }

  // --- Zustand "Vorschau" ---
  if (preview) {
    const isReImport = parsedImport !== null
    const dependentDataAtRisk = isReImport && hasDependentData(projectId)
    const hasUnacknowledgedFormatWarnings = formatWarnings.length > 0 && !warningsAcknowledged

    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Vorschau</h2>

        {formatWarnings.map((w) => (
          <Alert key={w.slot} variant="destructive">
            <AlertTitle>Format-Hinweis</AlertTitle>
            <AlertDescription>{w.message}</AlertDescription>
          </Alert>
        ))}

        {hasUnacknowledgedFormatWarnings ? (
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCancel}>
              Abbrechen
            </Button>
            <Button onClick={() => setWarningsAcknowledged(true)}>Trotzdem fortfahren</Button>
          </div>
        ) : (
          <>
            {isReImport && (
              <Alert variant={dependentDataAtRisk ? 'destructive' : 'default'}>
                <AlertTitle>Erneuter Import</AlertTitle>
                <AlertDescription>
                  {dependentDataAtRisk
                    ? 'Für dieses Projekt existieren bereits abhängige Daten (z. B. Ebene-2-Anreicherung). Diese werden beim Übernehmen ungültig bzw. überschrieben.'
                    : 'Der bestehende Import dieses Projekts wird durch diese Version ersetzt.'}
                </AlertDescription>
              </Alert>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Journey-Transkript</CardTitle>
              </CardHeader>
              <CardContent>
                <ParsedDocumentView document={preview.journey} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Konzept</CardTitle>
              </CardHeader>
              <CardContent>
                <ParsedDocumentView document={preview.konzept} />
              </CardContent>
            </Card>

            <div className="flex gap-2">
              <Button variant="outline" onClick={handleCancel}>
                Abbrechen
              </Button>
              <Button onClick={handleConfirm}>Import übernehmen</Button>
            </div>
          </>
        )}
      </div>
    )
  }

  // --- Zustand "Lese-Uebersicht" (Import vorhanden, kein Re-Import gestartet) ---
  if (parsedImport && !showUpload) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Import</h2>
          <Button variant="outline" onClick={() => setShowUpload(true)}>
            Erneut importieren
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Journey-Transkript</CardTitle>
          </CardHeader>
          <CardContent>
            <ParsedDocumentView document={parsedImport.journey} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Konzept</CardTitle>
          </CardHeader>
          <CardContent>
            <ParsedDocumentView document={parsedImport.konzept} />
          </CardContent>
        </Card>
      </div>
    )
  }

  // --- Zustand "Upload" ---
  const bothSelected = journeyFile && konzeptFile
  const canCheck = bothSelected && !journeyError && !konzeptError

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Interview-Import</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <UploadZone
          label="Journey-Transkript"
          file={journeyFile}
          error={journeyError}
          onFileSelected={(f) => handleFileSelected('journey', f)}
        />
        <UploadZone
          label="Konzept"
          file={konzeptFile}
          error={konzeptError}
          onFileSelected={(f) => handleFileSelected('konzept', f)}
        />
      </div>
      {journeyFile && !konzeptFile && (
        <p className="text-sm text-muted-foreground">
          Bitte auch die Konzept-Datei auswählen — beide Dateien werden zusammen benötigt.
        </p>
      )}
      {konzeptFile && !journeyFile && (
        <p className="text-sm text-muted-foreground">
          Bitte auch das Journey-Transkript auswählen — beide Dateien werden zusammen benötigt.
        </p>
      )}
      <div className="flex gap-2">
        <Button onClick={handleCheck} disabled={!canCheck || checking}>
          {checking ? 'Dateien werden geprüft…' : 'Dateien prüfen'}
        </Button>
        {parsedImport && showUpload && (
          <Button variant="outline" onClick={() => setShowUpload(false)}>
            Abbrechen
          </Button>
        )}
      </div>
    </div>
  )
}
