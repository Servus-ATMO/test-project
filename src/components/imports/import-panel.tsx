'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { UploadZone } from './upload-zone'
import { ParsedDocumentView } from './parsed-document-view'
import { checkImportFiles, saveImport } from '@/lib/imports/actions'
import { validateFile } from '@/lib/imports/format-detect'
import type { FormatWarning, ParsedImport } from '@/lib/imports/types'

interface ImportPanelProps {
  clientId: string
  projectId: string
  initialImport: ParsedImport | null
}

export function ImportPanel({ clientId, projectId, initialImport }: ImportPanelProps) {
  const router = useRouter()

  const [journeyFile, setJourneyFile] = useState<File | null>(null)
  const [konzeptFile, setKonzeptFile] = useState<File | null>(null)
  const [journeyError, setJourneyError] = useState<string | null>(null)
  const [konzeptError, setKonzeptError] = useState<string | null>(null)
  const [fileTexts, setFileTexts] = useState<{ journey: string; konzept: string } | null>(null)
  const [preview, setPreview] = useState<ParsedImport | null>(null)
  const [formatWarnings, setFormatWarnings] = useState<FormatWarning[]>([])
  const [warningsAcknowledged, setWarningsAcknowledged] = useState(false)
  const [checking, setChecking] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [dependentDataWarning, setDependentDataWarning] = useState<string | null>(null)
  const [showUpload, setShowUpload] = useState(false)
  const [storageWarning, setStorageWarning] = useState<string | null>(null)

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
      const result = await checkImportFiles(journeyText, konzeptText)

      if (result.status === 'error') {
        if (result.slot === 'journey') setJourneyError(result.message)
        else setKonzeptError(result.message)
        return
      }

      setFileTexts({ journey: journeyText, konzept: konzeptText })
      setFormatWarnings(result.warnings)
      setWarningsAcknowledged(false)
      setPreview(result.preview)
    } finally {
      setChecking(false)
    }
  }

  const handleCancel = () => {
    setPreview(null)
    setFileTexts(null)
    setFormatWarnings([])
    setWarningsAcknowledged(false)
    setSaveError(null)
    setDependentDataWarning(null)
  }

  const handleConfirm = async (acknowledgeDependentData = false) => {
    if (!fileTexts) return
    setSaving(true)
    setSaveError(null)
    try {
      const result = await saveImport(
        clientId,
        projectId,
        fileTexts.journey,
        fileTexts.konzept,
        acknowledgeDependentData
      )
      if (result.status === 'dependent-data') {
        setDependentDataWarning(result.message)
        return
      }
      if (result.status === 'error') {
        setSaveError(result.message)
        return
      }
      setStorageWarning(result.status === 'storage-warning' ? result.message : null)
      setPreview(null)
      setFileTexts(null)
      setJourneyFile(null)
      setKonzeptFile(null)
      setFormatWarnings([])
      setWarningsAcknowledged(false)
      setDependentDataWarning(null)
      setShowUpload(false)
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  // --- Zustand "Vorschau" ---
  if (preview) {
    const isReImport = initialImport !== null
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
            {saveError && (
              <Alert variant="destructive">
                <AlertDescription>{saveError}</AlertDescription>
              </Alert>
            )}

            {dependentDataWarning ? (
              <>
                <Alert variant="destructive">
                  <AlertTitle>Erneuter Import</AlertTitle>
                  <AlertDescription>{dependentDataWarning}</AlertDescription>
                </Alert>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleCancel} disabled={saving}>
                    Abbrechen
                  </Button>
                  <Button onClick={() => handleConfirm(true)} disabled={saving}>
                    {saving ? 'Wird übernommen…' : 'Trotzdem übernehmen'}
                  </Button>
                </div>
              </>
            ) : (
              <>
                {isReImport && (
                  <Alert>
                    <AlertTitle>Erneuter Import</AlertTitle>
                    <AlertDescription>
                      Der bestehende Import dieses Projekts wird durch diese Version ersetzt.
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
                  <Button variant="outline" onClick={handleCancel} disabled={saving}>
                    Abbrechen
                  </Button>
                  <Button onClick={() => handleConfirm(false)} disabled={saving}>
                    {saving ? 'Wird übernommen…' : 'Import übernehmen'}
                  </Button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    )
  }

  // --- Zustand "Lese-Uebersicht" (Import vorhanden, kein Re-Import gestartet) ---
  if (initialImport && !showUpload) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Import</h2>
          <Button
            variant="outline"
            onClick={() => {
              setStorageWarning(null)
              setShowUpload(true)
            }}
          >
            Erneut importieren
          </Button>
        </div>

        {storageWarning && (
          <Alert>
            <AlertTitle>Hinweis</AlertTitle>
            <AlertDescription>{storageWarning}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Journey-Transkript</CardTitle>
          </CardHeader>
          <CardContent>
            <ParsedDocumentView document={initialImport.journey} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Konzept</CardTitle>
          </CardHeader>
          <CardContent>
            <ParsedDocumentView document={initialImport.konzept} />
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
        {initialImport && showUpload && (
          <Button variant="outline" onClick={() => setShowUpload(false)}>
            Abbrechen
          </Button>
        )}
      </div>
    </div>
  )
}
