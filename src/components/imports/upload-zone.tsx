'use client'

import { useRef, useState } from 'react'
import { FileText, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface UploadZoneProps {
  label: string
  file: File | null
  error: string | null
  onFileSelected: (file: File | null) => void
}

export function UploadZone({ label, file, error, onFileSelected }: UploadZoneProps) {
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div>
      <p className="mb-2 text-sm font-medium">{label}</p>
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          const dropped = e.dataTransfer.files[0]
          if (dropped) onFileSelected(dropped)
        }}
        onClick={() => inputRef.current?.click()}
        className={`flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-4 text-center transition-colors ${
          dragOver ? 'border-primary bg-accent' : 'border-muted-foreground/25'
        } ${error ? 'border-destructive' : ''}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".md"
          className="hidden"
          onChange={(e) => onFileSelected(e.target.files?.[0] ?? null)}
        />
        {file ? (
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{file.name}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={(e) => {
                e.stopPropagation()
                onFileSelected(null)
                if (inputRef.current) inputRef.current.value = ''
              }}
            >
              <X className="h-3 w-3" />
              <span className="sr-only">Entfernen</span>
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Datei hierher ziehen oder klicken zum Auswählen (.md)
          </p>
        )}
      </div>
      {error && <p className="mt-1 text-sm text-destructive">{error}</p>}
    </div>
  )
}
