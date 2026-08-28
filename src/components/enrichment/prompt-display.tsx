'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

interface PromptDisplayProps {
  prompt: string
}

export function PromptDisplay({ prompt }: PromptDisplayProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(prompt)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-3">
      <Alert>
        <AlertTitle>So geht&apos;s weiter</AlertTitle>
        <AlertDescription>
          Prompt kopieren, in einem neuen Chat mit deinem eigenen Claude-Account ausführen, das
          Ergebnis als <code>.md</code>-Datei speichern und unten wieder hochladen.
        </AlertDescription>
      </Alert>
      <textarea
        readOnly
        value={prompt}
        rows={10}
        className="w-full rounded-md border bg-muted p-3 font-mono text-xs"
        onFocus={(e) => e.target.select()}
      />
      <Button type="button" variant="outline" onClick={handleCopy}>
        {copied ? 'Kopiert!' : 'Prompt kopieren'}
      </Button>
    </div>
  )
}
