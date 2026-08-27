'use client'

import { useCallback, useEffect, useState } from 'react'
import { parseJourney } from '@/lib/imports/parse-journey'
import { parseKonzept } from '@/lib/imports/parse-konzept'
import type { ParsedImport } from '@/lib/imports/types'

// Uebergangsweise localStorage statt Supabase: die Import/Abschnitt/Eintrag/
// Feld-Tabellen aus dem PROJ-3-Tech-Design existieren erst nach /backend, und
// das dort vorgesehene serverseitige Parsing (robusterer Markdown-Parser,
// zweimal aufgerufen fuer Vorschau + Speichern) ebenso. Struktur ist bereits
// 1:1 an das dortige Modell angelehnt.
function storageKey(projectId: string): string {
  return `konzeptfaeden:import:${projectId}:v1`
}

function loadFromStorage(projectId: string): ParsedImport | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(storageKey(projectId))
    if (!raw) return null
    return JSON.parse(raw) as ParsedImport
  } catch {
    return null
  }
}

export function useImport(projectId: string) {
  const [parsedImport, setParsedImport] = useState<ParsedImport | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const stored = loadFromStorage(projectId)
    /* eslint-disable react-hooks/set-state-in-effect */
    setParsedImport(stored)
    setLoaded(true)
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [projectId])

  const parsePreview = useCallback((journeyText: string, konzeptText: string): ParsedImport => {
    return {
      journey: parseJourney(journeyText),
      konzept: parseKonzept(konzeptText),
    }
  }, [])

  const saveImport = useCallback(
    (parsed: ParsedImport) => {
      window.localStorage.setItem(storageKey(projectId), JSON.stringify(parsed))
      setParsedImport(parsed)
    },
    [projectId]
  )

  // Aktuell immer "nein" - es gibt noch keine abhaengigen Tabellen
  // (Ebene-2-Anreicherung -> PROJ-4). Eigenstaendige Funktion, damit PROJ-4
  // hier einfach eine Bedingung ergaenzen kann, ohne den Re-Import-Ablauf
  // neu zu entwerfen (siehe PROJ-3 Tech Design).
  const hasDependentData = useCallback((_projectId: string): boolean => false, [])

  return { parsedImport, loaded, parsePreview, saveImport, hasDependentData }
}
