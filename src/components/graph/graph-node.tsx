'use client'

import { forwardRef } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { GraphNodeData } from '@/lib/graph/types'

export type HighlightState = 'selected' | 'active' | 'dim' | 'none'

interface GraphNodeProps {
  node: GraphNodeData
  expanded?: boolean
  highlight?: HighlightState
  onClick: () => void
}

// Ein gemeinsamer Knoten-Renderer fuer alle vier Knotentypen (Themenblock,
// Frage, Dimension, Content-Block) - der eigentliche Inhalt unterscheidet
// sich je Typ, aber Rahmen/Badges folgen demselben Muster. Bewusst ein
// einfacher Div-Knoten in normalem Dokumentfluss (kein React-Flow-Node
// mehr, siehe Implementierungsnotizen PROJ-5 2026-08-28: die Spalten sind
// jetzt statische, vertikal gestapelte Listen nach dem Referenz-Sketch,
// keine pan-/zoombare Canvas) - `ref` wird von GraphView genutzt, um die
// tatsaechliche Position fuer die SVG-Kanten-Overlay zu messen.
export const GraphNode = forwardRef<HTMLDivElement, GraphNodeProps>(function GraphNode(
  { node, expanded, highlight = 'none', onClick },
  ref
) {
  const hasGapBadge =
    (node.type === 'frage' && (node.frageStatus === 'gap' || node.antwortStatus === 'gap')) ||
    (node.type === 'dimension' && node.status === 'gap')

  return (
    <div
      ref={ref}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
      className={cn(
        'w-full cursor-pointer rounded-lg border bg-card px-3 py-2 text-card-foreground shadow-sm outline-none transition-opacity',
        node.type !== 'themenblock' && node.hasConflict && 'border-destructive',
        highlight === 'selected' && 'border-orange-500 ring-2 ring-orange-500',
        highlight === 'active' && 'border-orange-400',
        highlight === 'dim' && 'opacity-30'
      )}
    >
      {node.type === 'themenblock' && (
        <div className="flex items-center gap-1 text-sm font-medium">
          {expanded ? (
            <ChevronDown className="h-4 w-4 shrink-0" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0" />
          )}
          {node.sectionName}
        </div>
      )}

      {node.type === 'frage' && (
        <div className="space-y-1">
          <div className="text-sm font-medium">{node.label}</div>
          <p className="line-clamp-2 text-xs text-muted-foreground">{node.frageText || 'Lücke'}</p>
          {node.hasConflict && (
            <Badge variant="destructive" className="text-xs">
              Konflikt
            </Badge>
          )}
        </div>
      )}

      {node.type === 'dimension' && (
        <div className="space-y-1">
          <div className="text-sm font-medium">{node.dimensionName}</div>
          {node.personaName && <div className="text-xs text-muted-foreground">{node.personaName}</div>}
          <div className="flex flex-wrap gap-1">
            {hasGapBadge && (
              <Badge variant="outline" className="text-xs">
                Lücke
              </Badge>
            )}
            {node.hasConflict && (
              <Badge variant="destructive" className="text-xs">
                Konflikt
              </Badge>
            )}
          </div>
        </div>
      )}

      {node.type === 'contentblock' && (
        <div className="space-y-1">
          <div className="text-sm font-medium">{node.label}</div>
          {node.hasConflict && (
            <Badge variant="destructive" className="text-xs">
              Konflikt
            </Badge>
          )}
        </div>
      )}
    </div>
  )
})

export interface DimensionGroupNodeProps {
  dimensionName: string
  count: number
  expanded: boolean
  highlight?: HighlightState
  onClick: () => void
}

// Sammel-Knoten fuer wiederkehrende Ebene-2-Dimensionen (dieselbe
// Dimension, mehrere Personas) - Nutzer-Feedback 2026-08-28: "Ebene-2
// wiederkehrende Elemente kompakter machen, kollabierbar wie Ebene 1".
// Klick auf einen Gruppen-Knoten klappt nur auf/zu, oeffnet nie das
// Dossier (analog zu Themenblock).
export const DimensionGroupNode = forwardRef<HTMLDivElement, DimensionGroupNodeProps>(function DimensionGroupNode(
  { dimensionName, count, expanded, highlight = 'none', onClick },
  ref
) {
  return (
    <div
      ref={ref}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
      className={cn(
        'w-full cursor-pointer rounded-lg border bg-card px-3 py-2 text-card-foreground shadow-sm outline-none transition-opacity',
        highlight === 'active' && 'border-orange-400',
        highlight === 'dim' && 'opacity-30'
      )}
    >
      <div className="flex items-center gap-1 text-sm font-medium">
        {expanded ? (
          <ChevronDown className="h-4 w-4 shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0" />
        )}
        <span className="truncate">{dimensionName}</span>
        <span className="ml-auto shrink-0 text-xs text-muted-foreground">{count}</span>
      </div>
    </div>
  )
})
