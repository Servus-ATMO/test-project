'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { UploadZone } from '@/components/imports/upload-zone'
import { PromptDisplay } from './prompt-display'
import { EnrichmentView } from './enrichment-view'
import { generateEnrichmentPrompt, checkEnrichmentResult, saveEnrichment } from '@/lib/enrichment/actions'
import { validateFile } from '@/lib/imports/format-detect'
import type { Enrichment, ParsedEnrichment } from '@/lib/enrichment/types'

interface EnrichmentPanelProps {
  clientId: string
  projectId: string
  projectName: string
  hasImport: boolean
  initialEnrichment: Enrichment | null
}

export function EnrichmentPanel({
  clientId,
  projectId,
  projectName,
  hasImport,
  initialEnrichment,
}: EnrichmentPanelProps) {
  const router = useRouter()

  const [showFlow, setShowFlow] = useState(false)
  const [generatingPrompt, setGeneratingPrompt] = useState(false)
  const [prompt, setPrompt] = useState<string | null>(null)
  const [promptError, setPromptError] = useState<string | null>(null)

  const [resultFile, setResultFile] = useState<File | null>(null)
  const [resultError, setResultError] = useState<string | null>(null)
  const [resultText, setResultText] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)
  const [preview, setPreview] = useState<ParsedEnrichment | null>(null)

  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [replaceWarning, setReplaceWarning] = useState<string | null>(null)

  const resetFlow = () => {
    setShowFlow(false)
    setPrompt(null)
    setPromptError(null)
    setResultFile(null)
    setResultError(null)
    setResultText(null)
    setPreview(null)
    setSaveError(null)
    setReplaceWarning(null)
  }

  const handleGeneratePrompt = async () => {
    setGeneratingPrompt(true)
    setPromptError(null)
    try {
      const result = await generateEnrichmentPrompt(projectId, projectName)
      if (result.status === 'error') {
        setPromptError(result.message)
        return
      }
      setPrompt(result.prompt)
    } finally {
      setGeneratingPrompt(false)
    }
  }

  const handleResultFileSelected = (file: File | null) => {
    setResultFile(file)
    setResultError(file ? validateFile(file) : null)
  }

  const handleCheck = async () => {
    if (!resultFile) return
    setChecking(true)
    try {
      const text = await resultFile.text()
      const result = await checkEnrichmentResult(projectId, text)
      if (result.status === 'error') {
        setResultError(result.message)
        return
      }
      setResultText(text)
      setPreview(result.preview)
    } finally {
      setChecking(false)
    }
  }

  // Existiert bereits eine gespeicherte Anreicherung, soll "Abbrechen" den
  // Nutzer zur Lese-Uebersicht zurueckbringen (nicht auf dem Prompt-/Upload-
  // Bildschirm haengen lassen) - Bug gefunden bei /qa: ohne den vollen
  // resetFlow() blieben `prompt`/`showFlow` gesetzt, wodurch nach dem
  // Abbrechen weiterhin der Prompt-Bildschirm gerendert wurde. Gibt es noch
  // keine bestehende Anreicherung, bleibt der Nutzer sinnvollerweise auf dem
  // Prompt-/Upload-Bildschirm, um es mit einer anderen Datei erneut zu versuchen.
  const handleCancelPreview = () => {
    if (initialEnrichment) {
      resetFlow()
      return
    }
    setPreview(null)
    setResultText(null)
    setSaveError(null)
    setReplaceWarning(null)
  }

  const handleConfirm = async (acknowledgeReplace = false) => {
    if (!resultText) return
    setSaving(true)
    setSaveError(null)
    try {
      const result = await saveEnrichment(clientId, projectId, resultText, acknowledgeReplace)
      if (result.status === 'replace-warning') {
        setReplaceWarning(result.message)
        return
      }
      if (result.status === 'error') {
        setSaveError(result.message)
        return
      }
      resetFlow()
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  // --- Zustand "Vorschau" ---
  if (preview) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Vorschau</h2>

        {preview.unresolvedReferences.length > 0 && (
          <Alert>
            <AlertTitle>Nicht alle Referenzen konnten zugeordnet werden</AlertTitle>
            <AlertDescription>
              <ul className="list-disc pl-4">
                {preview.unresolvedReferences.map((msg, i) => (
                  <li key={i}>{msg}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {saveError && (
          <Alert variant="destructive">
            <AlertDescription>{saveError}</AlertDescription>
          </Alert>
        )}

        {replaceWarning ? (
          <>
            <Alert variant="destructive">
              <AlertTitle>Bestehende Anreicherung ersetzen</AlertTitle>
              <AlertDescription>{replaceWarning}</AlertDescription>
            </Alert>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleCancelPreview} disabled={saving}>
                Abbrechen
              </Button>
              <Button onClick={() => handleConfirm(true)} disabled={saving}>
                {saving ? 'Wird übernommen…' : 'Trotzdem übernehmen'}
              </Button>
            </div>
          </>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Erkannte Anreicherung</CardTitle>
              </CardHeader>
              <CardContent>
                <EnrichmentView
                  personas={preview.personas}
                  dimensions={preview.dimensions}
                  edges={preview.edges}
                  conflicts={preview.conflicts}
                />
              </CardContent>
            </Card>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleCancelPreview} disabled={saving}>
                Abbrechen
              </Button>
              <Button onClick={() => handleConfirm(false)} disabled={saving}>
                {saving ? 'Wird übernommen…' : 'Anreicherung übernehmen'}
              </Button>
            </div>
          </>
        )}
      </div>
    )
  }

  // --- Zustand "Lese-Uebersicht" (Anreicherung vorhanden, kein neuer Lauf gestartet) ---
  if (initialEnrichment && !showFlow) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">KI-Anreicherung</h2>
          <Button variant="outline" onClick={() => setShowFlow(true)}>
            Neuen Prompt erzeugen
          </Button>
        </div>
        <Card>
          <CardContent className="pt-6">
            <EnrichmentView
              personas={initialEnrichment.personas}
              dimensions={initialEnrichment.dimensions}
              edges={initialEnrichment.edges}
              conflicts={initialEnrichment.conflicts}
            />
          </CardContent>
        </Card>
      </div>
    )
  }

  // --- Zustand "Prompt erzeugt, Ergebnis hochladen" ---
  if (prompt) {
    const canCheck = resultFile && !resultError

    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">KI-Anreicherung</h2>
        <PromptDisplay prompt={prompt} />
        <UploadZone
          label="Anreicherungs-Ergebnis"
          file={resultFile}
          error={resultError}
          onFileSelected={handleResultFileSelected}
        />
        <div className="flex gap-2">
          <Button onClick={handleCheck} disabled={!canCheck || checking}>
            {checking ? 'Datei wird geprüft…' : 'Datei prüfen'}
          </Button>
          <Button variant="outline" onClick={resetFlow}>
            Abbrechen
          </Button>
        </div>
      </div>
    )
  }

  // --- Zustand "Kein Import" / "Prompt noch nicht erzeugt" ---
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">KI-Anreicherung</h2>
      {!hasImport && (
        <p className="text-sm text-muted-foreground">
          Bitte zuerst einen Interview-Import abschließen, bevor die KI-Anreicherung gestartet werden kann.
        </p>
      )}
      {promptError && (
        <Alert variant="destructive">
          <AlertDescription>{promptError}</AlertDescription>
        </Alert>
      )}
      <div className="flex gap-2">
        <Button onClick={handleGeneratePrompt} disabled={!hasImport || generatingPrompt}>
          {generatingPrompt ? 'Prompt wird erzeugt…' : 'Anreicherungs-Prompt erzeugen'}
        </Button>
        {initialEnrichment && showFlow && (
          <Button variant="outline" onClick={resetFlow}>
            Abbrechen
          </Button>
        )}
      </div>
    </div>
  )
}
