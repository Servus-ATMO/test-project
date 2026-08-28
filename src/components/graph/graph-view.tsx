'use client'

import { useMemo, useState, type CSSProperties } from 'react'
import { ReactFlow, Background, Controls, type Edge, type Node } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { buildGraphModel } from '@/lib/graph/build-graph-model'
import { computeHighlight } from '@/lib/graph/highlight'
import { buildEffectiveEdges } from '@/lib/graph/effective-edges'
import { GraphNode, type GraphFlowNodeData, type HighlightState } from './graph-node'
import { DossierPanel } from './dossier-panel'
import type { DossierNodeData } from '@/lib/graph/types'
import type { ParsedImport } from '@/lib/imports/types'
import type { Enrichment } from '@/lib/enrichment/types'

interface GraphViewProps {
  parsedImport: ParsedImport
  enrichment: Enrichment
}

const NODE_TYPES = {
  themenblock: GraphNode,
  frage: GraphNode,
  dimension: GraphNode,
  contentblock: GraphNode,
}

const COLUMN_X = { ebene1: 0, ebene2: 420, ebene3: 840 }
const ROW_HEIGHT = 90
const CHILD_INDENT_X = 32
// Akzentfarbe fuer aktive Kanten, entspricht der Orange-Markierung im
// Referenz-Sketch (siehe PROJ-5-Implementierungsnotizen, Nutzer-Feedback
// 2026-08-28) - Tailwind orange-500.
const ACTIVE_EDGE_COLOR = '#f97316'

export function GraphView({ parsedImport, enrichment }: GraphViewProps) {
  const model = useMemo(() => buildGraphModel(parsedImport, enrichment), [parsedImport, enrichment])

  // Ebene 2 ist laut Spec standardmaessig ausgeblendet (die einzige
  // "verdeckte" Ebene der Konzeptfaeden-Spezifikation).
  const [ebene2Visible, setEbene2Visible] = useState(false)
  const [expandedThemenbloecke, setExpandedThemenbloecke] = useState<Set<string>>(new Set())
  const [selectedNode, setSelectedNode] = useState<DossierNodeData | null>(null)

  const toggleExpanded = (themenblockId: string) => {
    setExpandedThemenbloecke((prev) => {
      const next = new Set(prev)
      if (next.has(themenblockId)) next.delete(themenblockId)
      else next.add(themenblockId)
      return next
    })
  }

  // Dimension-Knoten existieren nur, wenn Ebene 2 eingeblendet ist - beim
  // Ausblenden waehrend ein Dimension-Dossier offen ist, bliebe es sonst mit
  // veralteten Inhalten offen (eigene Verifikation, 2026-08-28).
  const handleEbene2Toggle = (visible: boolean) => {
    setEbene2Visible(visible)
    if (selectedNode?.type === 'dimension') setSelectedNode(null)
  }

  const { nodes, edges } = useMemo(() => {
    const highlight = selectedNode ? computeHighlight(selectedNode.id, model, ebene2Visible) : null

    // Themenblock-Knoten sind selbst nie Teil einer Herkunft/Wirkung-Spur
    // (computeHighlight() traversiert nur Frage/Dimension/Content-Block) -
    // ist aber eine seiner (ggf. eingeklappten) Fragen aktiv, soll der
    // Themenblock-Knoten das sichtbar mit anzeigen, da die Sammel-Kante
    // (siehe buildEffectiveEdges) dann von ihm ausgeht.
    const themenblockHasActiveChild = new Set(
      model.themenbloecke
        .filter((tb) => highlight && tb.frageIds.some((id) => highlight.activeNodeIds.has(id)))
        .map((tb) => tb.id)
    )

    const highlightFor = (nodeId: string, isThemenblock = false): HighlightState => {
      if (!highlight) return 'none'
      if (isThemenblock) return themenblockHasActiveChild.has(nodeId) ? 'active' : 'dim'
      if (nodeId === selectedNode!.id) return 'selected'
      return highlight.activeNodeIds.has(nodeId) ? 'active' : 'dim'
    }

    const nodes: Node<GraphFlowNodeData>[] = []
    const visibleFrageIds = new Set<string>()

    let y = 0
    for (const themenblock of model.themenbloecke) {
      const expanded = expandedThemenbloecke.has(themenblock.id)
      nodes.push({
        id: themenblock.id,
        type: 'themenblock',
        position: { x: COLUMN_X.ebene1, y },
        data: { node: themenblock, expanded, highlight: highlightFor(themenblock.id, true) },
        draggable: false,
      })
      y += ROW_HEIGHT
      if (expanded) {
        for (const frageId of themenblock.frageIds) {
          const frage = model.fragen.find((f) => f.id === frageId)
          if (!frage) continue
          nodes.push({
            id: frage.id,
            type: 'frage',
            position: { x: COLUMN_X.ebene1 + CHILD_INDENT_X, y },
            data: { node: frage, highlight: highlightFor(frage.id) },
            draggable: false,
          })
          visibleFrageIds.add(frage.id)
          y += ROW_HEIGHT
        }
      }
    }

    if (ebene2Visible) {
      let y2 = 0
      for (const dimension of model.dimensionen) {
        nodes.push({
          id: dimension.id,
          type: 'dimension',
          position: { x: COLUMN_X.ebene2, y: y2 },
          data: { node: dimension, highlight: highlightFor(dimension.id) },
          draggable: false,
        })
        y2 += ROW_HEIGHT
      }
    }

    let y3 = 0
    for (const block of model.contentBlocks) {
      nodes.push({
        id: block.id,
        type: 'contentblock',
        position: { x: COLUMN_X.ebene3, y: y3 },
        data: { node: block, highlight: highlightFor(block.id) },
        draggable: false,
      })
      y3 += ROW_HEIGHT
    }

    // Aktive Kanten (Teil der Herkunft/Wirkung des ausgewaehlten Knotens)
    // werden orange hervorgehoben, alle anderen stark abgedunkelt - analog
    // zum Referenz-Sketch (siehe PROJ-5-Implementierungsnotizen). Eine
    // (ggf. zusammengefasste) Kante gilt als aktiv, wenn mindestens eine
    // ihrer urspruenglichen Kanten aktiv ist.
    const edgeStyle = (originalEdgeIds: string[], base: CSSProperties = {}): CSSProperties => {
      if (!highlight) return base
      if (originalEdgeIds.some((id) => highlight.activeEdgeIds.has(id))) {
        return { ...base, stroke: ACTIVE_EDGE_COLOR, opacity: 1, strokeWidth: 2 }
      }
      return { ...base, opacity: 0.06 }
    }

    const edges: Edge[] = buildEffectiveEdges(model, visibleFrageIds, ebene2Visible).map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      animated: false,
      style: edgeStyle(e.originalEdgeIds, ebene2Visible ? {} : { strokeDasharray: '4 4' }),
    }))

    return { nodes, edges }
  }, [model, ebene2Visible, expandedThemenbloecke, selectedNode])

  // Themenblock-Knoten klappen nur auf/zu (Navigation) - das Dossier oeffnet
  // sich nur bei den eigentlichen Detail-Knoten. Getrennt gehalten, weil das
  // Dossier ein modales Sheet ist (blockiert die Seite dahinter, inkl. des
  // Ebene-2-Schalters) - ein Klick sollte deshalb nie beides gleichzeitig
  // auslösen (siehe Regressionstest: Themenblock-Klick + Schalter-Klick).
  const handleNodeClick = (_: unknown, node: Node<GraphFlowNodeData>) => {
    if (node.data.node.type === 'themenblock') {
      toggleExpanded(node.id)
      return
    }
    setSelectedNode(node.data.node)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Switch id="ebene2-toggle" checked={ebene2Visible} onCheckedChange={handleEbene2Toggle} />
        <Label htmlFor="ebene2-toggle" className="text-sm">
          Profildimensionen (Ebene 2) anzeigen
        </Label>
      </div>

      <div className="h-[70vh] w-full rounded-lg border">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={NODE_TYPES}
          onNodeClick={handleNodeClick}
          nodesDraggable={false}
          nodesConnectable={false}
          fitView
        >
          <Background />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>

      <DossierPanel model={model} node={selectedNode} onOpenChange={(open) => !open && setSelectedNode(null)} />
    </div>
  )
}
