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
import type { MissingBlock, ParsedImport } from '@/lib/imports/types'

interface ImportPanelProps {
  clientId: string
  projectId: string
  initialImport: ParsedImport | null
}

const MISSING_BLOCK_MESSAGE: Record<Exclude<MissingBlock, null>, string> = {
  journey: 'In dieser Datei wurde kein Journey-Transkript-Block gefunden.',
  konzept: 'In dieser Datei wurde kein Landingpage-Konzept-Block gefunden.',
}

export function ImportPanel({ clientId, projectId, initialImport }: ImportPanelProps) {
  const router = useRouter()

  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [rawText, setRawText] = useState<string | null>(null)
  const [preview, setPreview] = useState<ParsedImport | null>(null)
  const [missingBlock, setMissingBlock] = useState<MissingBlock>(null)
  const [missingBlockAcknowledged, setMissingBlockAcknowledged] = useState(false)
  const [checking, setChecking] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [dependentDataWarning, setDependentDataWarning] = useState<string | null>(null)
  const [showUpload, setShowUpload] = useState(false)
  const [storageWarning, setStorageWarning] = useState<string | null>(null)

  const handleFileSelected = (selected: File | null) => {
    setFile(selected)
    setFileError(selected ? validateFile(selected) : null)
  }

  const handleCheck = async () => {
    if (!file) return
    setChecking(true)
    try {
      const text = await file.text()
      const result = await checkImportFiles(text)

      if (result.status === 'error') {
        setFileError(result.message)
        return
      }

      setRawText(text)
      setMissingBlock(result.missingBlock)
      setMissingBlockAcknowledged(false)
      setPreview(result.preview)
    } finally {
      setChecking(false)
    }
  }

  const handleCancel = () => {
    setPreview(null)
    setRawText(null)
    setMissingBlock(null)
    setMissingBlockAcknowledged(false)
    setSaveError(null)
    setDependentDataWarning(null)
  }

  const handleConfirm = async (acknowledgeDependentData = false) => {
    if (!rawText) return
    setSaving(true)
    setSaveError(null)
    try {
      const result = await saveImport(clientId, projectId, rawText, acknowledgeDependentData)
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
      setRawText(null)
      setFile(null)
      setMissingBlock(null)
      setMissingBlockAcknowledged(false)
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
    const hasUnacknowledgedMissingBlock = missingBlock !== null && !missingBlockAcknowledged

    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Vorschau</h2>

        {missingBlock && (
          <Alert variant="destructive">
            <AlertTitle>Block fehlt</AlertTitle>
            <AlertDescription>{MISSING_BLOCK_MESSAGE[missingBlock]}</AlertDescription>
          </Alert>
        )}

        {hasUnacknowledgedMissingBlock ? (
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCancel}>
              Abbrechen
            </Button>
            <Button onClick={() => setMissingBlockAcknowledged(true)}>Trotzdem fortfahren</Button>
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
  const canCheck = file !== null && !fileError

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Interview-Import</h2>
      <UploadZone
        label="Interview-Import"
        file={file}
        error={fileError}
        onFileSelected={handleFileSelected}
      />
      <div className="flex gap-2">
        <Button onClick={handleCheck} disabled={!canCheck || checking}>
          {checking ? 'Datei wird geprüft…' : 'Datei prüfen'}
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
