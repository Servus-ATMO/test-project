'use client'

import { useEffect } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { DossierNodeData, GraphModel } from '@/lib/graph/types'

interface DossierPanelProps {
  model: GraphModel
  node: DossierNodeData | null
  onOpenChange: (open: boolean) => void
}

function DossierHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex flex-col space-y-1">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <p className="text-sm text-muted-foreground">{subtitle}</p>
    </div>
  )
}

function ImpactRow({
  title,
  subtitle,
  impactText,
  weight,
}: {
  title: string
  subtitle?: string
  impactText: string
  weight: number
}) {
  return (
    <div className="space-y-1 border-l-2 pl-3">
      <p className="text-sm font-medium">{title}</p>
      {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      {impactText && <p className="text-sm text-muted-foreground">{impactText}</p>}
      <p className="text-xs italic text-muted-foreground">Gewichtung: {weight}</p>
    </div>
  )
}

function ConflictNotes({ model, nodeId }: { model: GraphModel; nodeId: string }) {
  const notes = model.conflictsByNodeId[nodeId]
  if (!notes || notes.length === 0) return null
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold">Konflikte</h3>
      {notes.map((note, i) => (
        <div key={i} className="space-y-1 border-l-2 border-destructive pl-3">
          <Badge variant="destructive" className="text-xs">
            Konflikt
          </Badge>
          <p className="text-sm">{note.description}</p>
        </div>
      ))}
    </div>
  )
}

function FrageAntwort({
  frageText,
  frageStatus,
  antwortText,
  antwortStatus,
}: {
  frageText: string
  frageStatus: 'found' | 'gap'
  antwortText: string
  antwortStatus: 'found' | 'gap'
}) {
  return (
    <div className="space-y-2 border-l-2 pl-3">
      <div>
        <p className="text-xs font-medium text-muted-foreground">Gestellt</p>
        {frageStatus === 'gap' ? (
          <Badge variant="outline" className="text-xs">
            Lücke — nicht angegeben
          </Badge>
        ) : (
          <p className="text-sm">{frageText}</p>
        )}
      </div>
      <div>
        <p className="text-xs font-medium text-muted-foreground">Antwort</p>
        {antwortStatus === 'gap' ? (
          <Badge variant="outline" className="text-xs">
            Lücke — nicht angegeben
          </Badge>
        ) : (
          <p className="text-sm">{antwortText}</p>
        )}
      </div>
    </div>
  )
}

// Zeigt fuer den angeklickten Knoten Herkunft (rueckwaerts) und Wirkung
// (vorwaerts) - siehe PROJ-5-Spec, Interaktionsmodell. Bewusst nur
// Herkunft/Wirkung + Konflikt-Text, kein Branch-Vergleich (PROJ-6) und
// keine Konfliktloesung (PROJ-7).
//
// Bewusst KEIN shadcn-"Sheet": der Referenz-Sketch (Nutzer-Feedback,
// 2026-08-28) verlangt ein Panel, das die restliche Seite NICHT abdunkelt/
// blockiert - Sheet rendert aber immer einen vollflaechigen, pointer-events-
// blockierenden Overlay (siehe SheetContent in ui/sheet.tsx), unabhaengig
// von etwaigen Props. Eigenes, overlay-loses Slide-in-Panel stattdessen.
export function DossierPanel({ model, node, onOpenChange }: DossierPanelProps) {
  useEffect(() => {
    if (!node) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [node, onOpenChange])

  if (!node) return null

  return (
    <div
      role="complementary"
      aria-label="Dossier"
      className="fixed inset-y-0 right-0 z-40 w-full overflow-y-auto border-l bg-background p-6 shadow-[-24px_0_48px_rgba(0,0,0,0.15)] sm:max-w-md"
    >
      <Button variant="ghost" size="icon" className="absolute right-4 top-4" onClick={() => onOpenChange(false)}>
        <X className="h-4 w-4" />
        <span className="sr-only">Schließen</span>
      </Button>

      {node.type === 'frage' && (
        <>
          <DossierHeader title={node.label} subtitle="Themenblock-Frage" />
          <div className="mt-4 space-y-6">
            <FrageAntwort
              frageText={node.frageText}
              frageStatus={node.frageStatus}
              antwortText={node.antwortText}
              antwortStatus={node.antwortStatus}
            />
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Wirkung (geprägte Profildimensionen)</h3>
              {model.edges
                .filter((e) => e.edgeType === 'informs' && e.source === node.id)
                .map((e) => {
                  const dimension = model.dimensionen.find((d) => d.id === e.target)
                  if (!dimension) return null
                  return (
                    <ImpactRow
                      key={e.id}
                      title={dimension.dimensionName}
                      subtitle={dimension.personaName ?? undefined}
                      impactText={e.impactText}
                      weight={e.weight}
                    />
                  )
                })}
            </div>
            <ConflictNotes model={model} nodeId={node.id} />
          </div>
        </>
      )}

      {node.type === 'dimension' && (
        <>
          <DossierHeader
            title={node.dimensionName}
            subtitle={node.personaName ? `Persona: ${node.personaName}` : 'Projektweit'}
          />
          <div className="mt-4 space-y-6">
            <div className="border-l-2 pl-3">
              <p className="text-xs font-medium text-muted-foreground">Wert</p>
              {node.status === 'gap' ? (
                <Badge variant="outline" className="text-xs">
                  nicht ableitbar
                </Badge>
              ) : (
                <p className="text-sm whitespace-pre-line">{node.value}</p>
              )}
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Herkunft (Journey-Antworten)</h3>
              {model.edges
                .filter((e) => e.edgeType === 'informs' && e.target === node.id)
                .map((e) => {
                  const frage = model.fragen.find((f) => f.id === e.source)
                  if (!frage) return null
                  return (
                    <ImpactRow
                      key={e.id}
                      title={frage.label}
                      subtitle={frage.antwortText}
                      impactText={e.impactText}
                      weight={e.weight}
                    />
                  )
                })}
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Wirkung (geprägte Content-Blöcke)</h3>
              {model.edges
                .filter((e) => e.edgeType === 'shapes' && e.source === node.id)
                .map((e) => {
                  const block = model.contentBlocks.find((b) => b.id === e.target)
                  if (!block) return null
                  return <ImpactRow key={e.id} title={block.label} impactText={e.impactText} weight={e.weight} />
                })}
            </div>
            <ConflictNotes model={model} nodeId={node.id} />
          </div>
        </>
      )}

      {node.type === 'contentblock' && (
        <>
          <DossierHeader title={node.label} subtitle="Content-Block" />
          <div className="mt-4 space-y-6">
            <div className="space-y-1 border-l-2 pl-3">
              {node.fields.map((f) => (
                <div key={f.name}>
                  <span className="text-sm font-medium">{f.name}: </span>
                  {f.status === 'gap' ? (
                    <Badge variant="outline" className="text-xs align-middle">
                      Lücke
                    </Badge>
                  ) : (
                    <span className="text-sm">{f.value}</span>
                  )}
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Herkunft (prägende Profildimensionen)</h3>
              {model.edges
                .filter((e) => e.edgeType === 'shapes' && e.target === node.id)
                .map((e) => {
                  const dimension = model.dimensionen.find((d) => d.id === e.source)
                  if (!dimension) return null
                  return (
                    <ImpactRow
                      key={e.id}
                      title={dimension.dimensionName}
                      subtitle={dimension.personaName ?? undefined}
                      impactText={e.impactText}
                      weight={e.weight}
                    />
                  )
                })}
              {model.edges.every((e) => !(e.edgeType === 'shapes' && e.target === node.id)) && (
                <p className="text-sm text-muted-foreground">
                  Keine Profildimension aus der Anreicherung begründet diesen Block.
                </p>
              )}
            </div>
            <ConflictNotes model={model} nodeId={node.id} />
          </div>
        </>
      )}
    </div>
  )
}
