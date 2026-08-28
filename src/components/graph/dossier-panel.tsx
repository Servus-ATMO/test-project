'use client'

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import type { DossierNodeData, GraphModel } from '@/lib/graph/types'

interface DossierPanelProps {
  model: GraphModel
  node: DossierNodeData | null
  onOpenChange: (open: boolean) => void
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
export function DossierPanel({ model, node, onOpenChange }: DossierPanelProps) {
  return (
    <Sheet open={node !== null} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        {node && (
          <>
            {node.type === 'frage' && (
              <>
                <SheetHeader>
                  <SheetTitle>{node.label}</SheetTitle>
                  <SheetDescription>Themenblock-Frage</SheetDescription>
                </SheetHeader>
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
                <SheetHeader>
                  <SheetTitle>{node.dimensionName}</SheetTitle>
                  <SheetDescription>
                    {node.personaName ? `Persona: ${node.personaName}` : 'Projektweit'}
                  </SheetDescription>
                </SheetHeader>
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
                        return (
                          <ImpactRow key={e.id} title={block.label} impactText={e.impactText} weight={e.weight} />
                        )
                      })}
                  </div>
                  <ConflictNotes model={model} nodeId={node.id} />
                </div>
              </>
            )}

            {node.type === 'contentblock' && (
              <>
                <SheetHeader>
                  <SheetTitle>{node.label}</SheetTitle>
                  <SheetDescription>Content-Block</SheetDescription>
                </SheetHeader>
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
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
