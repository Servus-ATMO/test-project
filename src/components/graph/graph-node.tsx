'use client'

import { Handle, Position, type NodeProps } from '@xyflow/react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { GraphNodeData } from '@/lib/graph/types'

export type HighlightState = 'selected' | 'active' | 'dim' | 'none'

export interface GraphFlowNodeData extends Record<string, unknown> {
  node: GraphNodeData
  expanded?: boolean
  highlight?: HighlightState
}

// Ein gemeinsamer Knoten-Renderer fuer alle vier Knotentypen (Themenblock,
// Frage, Dimension, Content-Block) - der eigentliche Inhalt unterscheidet
// sich je Typ, aber Rahmen/Badges/Handles folgen demselben Muster.
export function GraphNode({ data }: NodeProps & { data: GraphFlowNodeData }) {
  const { node, highlight = 'none' } = data

  const hasGapBadge =
    (node.type === 'frage' && (node.frageStatus === 'gap' || node.antwortStatus === 'gap')) ||
    (node.type === 'dimension' && node.status === 'gap')

  return (
    <div
      className={cn(
        'w-56 rounded-lg border bg-card px-3 py-2 text-card-foreground shadow-sm transition-opacity',
        node.type !== 'themenblock' && node.hasConflict && 'border-destructive',
        highlight === 'selected' && 'border-orange-500 ring-2 ring-orange-500',
        highlight === 'active' && 'border-orange-400',
        highlight === 'dim' && 'opacity-30'
      )}
    >
      {node.type !== 'themenblock' && <Handle type="target" position={Position.Left} />}
      {node.type !== 'contentblock' && <Handle type="source" position={Position.Right} />}

      {node.type === 'themenblock' && (
        <div className="flex items-center gap-1 text-sm font-medium">
          {data.expanded ? (
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
}

export interface DimensionGroupFlowNodeData extends Record<string, unknown> {
  dimensionName: string
  count: number
  expanded: boolean
  highlight?: HighlightState
}

// Sammel-Knoten fuer wiederkehrende Ebene-2-Dimensionen (dieselbe
// Dimension, mehrere Personas) - Nutzer-Feedback 2026-08-28: "Ebene-2
// wiederkehrende Elemente kompakter machen, kollabierbar wie Ebene 1".
// Bewusst als eigener React-Flow-Knotentyp statt eines fuenften
// GraphNodeData-Mitglieds - der Gruppen-Knoten ist eine reine UI-
// Zusammenfassung existierender DimensionNode-Instanzen, kein eigenes
// Domain-Konzept (anders als Themenblock, der einen echten Abschnitt aus
// den Importdaten abbildet). Klick auf einen Gruppen-Knoten klappt nur
// auf/zu, oeffnet nie das Dossier (analog zu Themenblock).
export function DimensionGroupNode({ data }: NodeProps & { data: DimensionGroupFlowNodeData }) {
  const { dimensionName, count, expanded, highlight = 'none' } = data

  return (
    <div
      className={cn(
        'w-56 rounded-lg border bg-card px-3 py-2 text-card-foreground shadow-sm transition-opacity',
        highlight === 'active' && 'border-orange-400',
        highlight === 'dim' && 'opacity-30'
      )}
    >
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
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
}
