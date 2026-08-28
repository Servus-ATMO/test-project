'use client'

import { useMemo, useState } from 'react'
import { ReactFlow, Background, Controls, type Edge, type Node } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { buildGraphModel } from '@/lib/graph/build-graph-model'
import { GraphNode, type GraphFlowNodeData } from './graph-node'
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

  const { nodes, edges } = useMemo(() => {
    const nodes: Node<GraphFlowNodeData>[] = []
    const visibleFrageIds = new Set<string>()

    let y = 0
    for (const themenblock of model.themenbloecke) {
      const expanded = expandedThemenbloecke.has(themenblock.id)
      nodes.push({
        id: themenblock.id,
        type: 'themenblock',
        position: { x: COLUMN_X.ebene1, y },
        data: { node: themenblock, expanded },
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
            data: { node: frage },
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
          data: { node: dimension },
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
        data: { node: block },
        draggable: false,
      })
      y3 += ROW_HEIGHT
    }

    const dimensionIds = new Set(model.dimensionen.map((d) => d.id))
    const contentBlockIds = new Set(model.contentBlocks.map((b) => b.id))

    const edges: Edge[] = ebene2Visible
      ? model.edges
          .filter((e) => {
            if (e.edgeType === 'informs') return visibleFrageIds.has(e.source) && dimensionIds.has(e.target)
            return dimensionIds.has(e.source) && contentBlockIds.has(e.target)
          })
          .map((e) => ({
            id: e.id,
            source: e.source,
            target: e.target,
            animated: false,
          }))
      : model.compressedEdges
          .filter((e) => visibleFrageIds.has(e.source) && contentBlockIds.has(e.target))
          .map((e) => ({
            id: e.id,
            source: e.source,
            target: e.target,
            animated: false,
            style: { strokeDasharray: '4 4' },
          }))

    return { nodes, edges, visibleFrageIds }
  }, [model, ebene2Visible, expandedThemenbloecke])

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
        <Switch id="ebene2-toggle" checked={ebene2Visible} onCheckedChange={setEbene2Visible} />
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
