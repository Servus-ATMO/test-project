'use client'

import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { ReactFlow, Background, Controls, useReactFlow, type Edge, type Node } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { buildGraphModel } from '@/lib/graph/build-graph-model'
import { computeHighlight, computeHighlightForPersona, type HighlightResult } from '@/lib/graph/highlight'
import { buildEffectiveEdges } from '@/lib/graph/effective-edges'
import { GraphNode, DimensionGroupNode, type GraphFlowNodeData, type DimensionGroupFlowNodeData, type HighlightState } from './graph-node'
import { DossierPanel } from './dossier-panel'
import type { DimensionNode, DossierNodeData } from '@/lib/graph/types'
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
  dimensiongroup: DimensionGroupNode,
}

const COLUMN_WIDTH = 420
const ROW_HEIGHT = 90
const CHILD_INDENT_X = 32
// Akzentfarbe fuer aktive Kanten, entspricht der Orange-Markierung im
// Referenz-Sketch (siehe PROJ-5-Implementierungsnotizen, Nutzer-Feedback
// 2026-08-28) - Tailwind orange-500.
const ACTIVE_EDGE_COLOR = '#f97316'

type FlowNode = Node<GraphFlowNodeData> | Node<DimensionGroupFlowNodeData>

function dimensionGroupId(dimensionName: string): string {
  return `dimgroup:${dimensionName}`
}

// React Flows "fitView"-Prop passt die Ansicht nur beim allerersten Mount
// an, nicht wenn danach mehr Knoten dazukommen (Themenblock/Dimensionsgruppe
// aufgeklappt, Spalte eingeblendet). Ohne Nachfuehren koennen neu
// hinzukommende Knoten ausserhalb des sichtbaren, gezoomten Bereichs landen
// und sind dann nicht mehr anklickbar (eigene Verifikation, 2026-08-28:
// Content-Block auf schmalem Viewport nach mehrfachem Aufklappen nicht mehr
// erreichbar). Fittet erneut, sobald sich die MENGE der sichtbaren Knoten
// aendert - bewusst nicht bei jeder Highlight-Aenderung (reines Anklicken
// zum Hervorheben soll die Ansicht nicht wegspringen lassen).
function AutoFitView({ nodeIdsKey }: { nodeIdsKey: string }) {
  const { fitView } = useReactFlow()
  useEffect(() => {
    fitView({ duration: 200 })
  }, [nodeIdsKey, fitView])
  return null
}

export function GraphView({ parsedImport, enrichment }: GraphViewProps) {
  const model = useMemo(() => buildGraphModel(parsedImport, enrichment), [parsedImport, enrichment])

  // Ebene 2 ist laut Spec standardmaessig ausgeblendet (die einzige
  // "verdeckte" Ebene der Konzeptfaeden-Spezifikation). Ebene 1/3 sind
  // standardmaessig sichtbar - jede Spalte ist einzeln ein-/ausblendbar
  // (Nutzer-Feedback 2026-08-28), nicht nur Ebene 2 wie urspruenglich.
  const [ebene1Visible, setEbene1Visible] = useState(true)
  const [ebene2Visible, setEbene2Visible] = useState(false)
  const [ebene3Visible, setEbene3Visible] = useState(true)
  const [expandedThemenbloecke, setExpandedThemenbloecke] = useState<Set<string>>(new Set())
  const [expandedDimensionGroups, setExpandedDimensionGroups] = useState<Set<string>>(new Set())
  const [selectedNode, setSelectedNode] = useState<DossierNodeData | null>(null)
  const [selectedPersona, setSelectedPersona] = useState<string | null>(null)

  const visibleColumnCount = [ebene1Visible, ebene2Visible, ebene3Visible].filter(Boolean).length

  const toggleExpanded = (themenblockId: string) => {
    setExpandedThemenbloecke((prev) => {
      const next = new Set(prev)
      if (next.has(themenblockId)) next.delete(themenblockId)
      else next.add(themenblockId)
      return next
    })
  }

  const toggleDimensionGroupExpanded = (groupId: string) => {
    setExpandedDimensionGroups((prev) => {
      const next = new Set(prev)
      if (next.has(groupId)) next.delete(groupId)
      else next.add(groupId)
      return next
    })
  }

  // Ausgeblendete Spalten leeren die davon betroffene Auswahl/den Filter -
  // sonst bliebe z. B. ein Dimension-Dossier mit veralteten Inhalten offen,
  // oder der Persona-Filter zeigt auf eine gerade unsichtbare Ebene.
  const handleEbene1Toggle = (visible: boolean) => {
    setEbene1Visible(visible)
    if (!visible && selectedNode?.type === 'frage') setSelectedNode(null)
  }
  const handleEbene2Toggle = (visible: boolean) => {
    setEbene2Visible(visible)
    if (!visible) {
      if (selectedNode?.type === 'dimension') setSelectedNode(null)
      setSelectedPersona(null)
    }
  }
  const handleEbene3Toggle = (visible: boolean) => {
    setEbene3Visible(visible)
    if (!visible && selectedNode?.type === 'contentblock') setSelectedNode(null)
  }

  // Personas fuer den globalen Filter (Nutzer-Feedback 2026-08-28) - ersetzt
  // an dieser Stelle den frueheren alleinstehenden Ebene-2-Schalter, der
  // jetzt zu den per-Spalten-Schaltern unten gewandert ist.
  const personas = useMemo(
    () =>
      Array.from(
        new Set(model.dimensionen.map((d) => d.personaName).filter((name): name is string => name !== null))
      ).sort((a, b) => a.localeCompare(b, 'de')),
    [model]
  )

  const handlePersonaChange = (value: string) => {
    if (value === 'all') {
      setSelectedPersona(null)
      return
    }
    setSelectedPersona(value)
    setSelectedNode(null)
    // Der Persona-Filter ist ein Ebene-2-Konzept - ohne sichtbare Ebene 2
    // gaebe es nichts zu highlighten.
    if (!ebene2Visible) setEbene2Visible(true)
  }

  // Wiederkehrende Dimensionen (gleicher Name, mehrere Personas-Instanzen)
  // werden gruppiert/kollabierbar dargestellt - Einzelinstanzen (z. B.
  // "Umsetzungsrahmen", projektweit) nie, da Gruppierung dort keinen
  // Kompaktheits-Gewinn braechte (Nutzer-Feedback 2026-08-28).
  const dimensionsByName = useMemo(() => {
    const byName = new Map<string, DimensionNode[]>()
    for (const d of model.dimensionen) {
      const list = byName.get(d.dimensionName) ?? []
      list.push(d)
      byName.set(d.dimensionName, list)
    }
    return byName
  }, [model])

  const columnX = useMemo(() => {
    const order: Array<{ key: 'ebene1' | 'ebene2' | 'ebene3'; visible: boolean }> = [
      { key: 'ebene1', visible: ebene1Visible },
      { key: 'ebene2', visible: ebene2Visible },
      { key: 'ebene3', visible: ebene3Visible },
    ]
    const visibleColumns = order.filter((c) => c.visible).map((c) => c.key)
    return Object.fromEntries(visibleColumns.map((key, i) => [key, i * COLUMN_WIDTH])) as Record<string, number>
  }, [ebene1Visible, ebene2Visible, ebene3Visible])

  const { nodes, edges } = useMemo(() => {
    const highlight: HighlightResult | null = selectedNode
      ? computeHighlight(selectedNode.id, model, ebene2Visible)
      : selectedPersona
        ? computeHighlightForPersona(selectedPersona, model, ebene2Visible)
        : null

    // Themenblock-/Dimensionsgruppen-Knoten sind selbst nie Teil einer
    // Herkunft/Wirkung-Spur (computeHighlight() traversiert nur Frage/
    // Dimension/Content-Block) - ist aber eines ihrer (eingeklappten)
    // Kinder aktiv, soll der Sammel-Knoten das sichtbar mit anzeigen, da
    // die Sammel-Kante (siehe buildEffectiveEdges) dann von ihm ausgeht.
    const themenblockHasActiveChild = new Set(
      model.themenbloecke
        .filter((tb) => highlight && tb.frageIds.some((id) => highlight.activeNodeIds.has(id)))
        .map((tb) => tb.id)
    )
    const dimensionGroupHasActiveChild = new Set(
      Array.from(dimensionsByName.entries())
        .filter(([, instances]) => instances.length > 1 && highlight && instances.some((d) => highlight.activeNodeIds.has(d.id)))
        .map(([name]) => dimensionGroupId(name))
    )

    const highlightFor = (
      nodeId: string,
      kind: 'normal' | 'themenblock' | 'dimensiongroup' = 'normal'
    ): HighlightState => {
      if (!highlight) return 'none'
      if (kind === 'themenblock') return themenblockHasActiveChild.has(nodeId) ? 'active' : 'dim'
      if (kind === 'dimensiongroup') return dimensionGroupHasActiveChild.has(nodeId) ? 'active' : 'dim'
      if (selectedNode && nodeId === selectedNode.id) return 'selected'
      return highlight.activeNodeIds.has(nodeId) ? 'active' : 'dim'
    }

    const nodes: FlowNode[] = []
    const visibleFrageIds = new Set<string>()
    const visibleDimensionIds = new Set<string>()

    if (ebene1Visible) {
      let y = 0
      for (const themenblock of model.themenbloecke) {
        const expanded = expandedThemenbloecke.has(themenblock.id)
        nodes.push({
          id: themenblock.id,
          type: 'themenblock',
          position: { x: columnX.ebene1, y },
          data: { node: themenblock, expanded, highlight: highlightFor(themenblock.id, 'themenblock') },
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
              position: { x: columnX.ebene1 + CHILD_INDENT_X, y },
              data: { node: frage, highlight: highlightFor(frage.id) },
              draggable: false,
            })
            visibleFrageIds.add(frage.id)
            y += ROW_HEIGHT
          }
        }
      }
    }

    if (ebene2Visible) {
      let y2 = 0
      for (const [dimensionName, instances] of dimensionsByName) {
        if (instances.length === 1) {
          const dimension = instances[0]
          nodes.push({
            id: dimension.id,
            type: 'dimension',
            position: { x: columnX.ebene2, y: y2 },
            data: { node: dimension, highlight: highlightFor(dimension.id) },
            draggable: false,
          })
          visibleDimensionIds.add(dimension.id)
          y2 += ROW_HEIGHT
          continue
        }

        const groupId = dimensionGroupId(dimensionName)
        const expanded = expandedDimensionGroups.has(groupId)
        nodes.push({
          id: groupId,
          type: 'dimensiongroup',
          position: { x: columnX.ebene2, y: y2 },
          data: { dimensionName, count: instances.length, expanded, highlight: highlightFor(groupId, 'dimensiongroup') },
          draggable: false,
        })
        y2 += ROW_HEIGHT
        if (expanded) {
          for (const dimension of instances) {
            nodes.push({
              id: dimension.id,
              type: 'dimension',
              position: { x: columnX.ebene2 + CHILD_INDENT_X, y: y2 },
              data: { node: dimension, highlight: highlightFor(dimension.id) },
              draggable: false,
            })
            visibleDimensionIds.add(dimension.id)
            y2 += ROW_HEIGHT
          }
        }
      }
    }

    if (ebene3Visible) {
      let y3 = 0
      for (const block of model.contentBlocks) {
        nodes.push({
          id: block.id,
          type: 'contentblock',
          position: { x: columnX.ebene3, y: y3 },
          data: { node: block, highlight: highlightFor(block.id) },
          draggable: false,
        })
        y3 += ROW_HEIGHT
      }
    }

    // Aktive Kanten (Teil der Herkunft/Wirkung des ausgewaehlten Knotens
    // oder des Persona-Filters) werden orange hervorgehoben, alle anderen
    // stark abgedunkelt - analog zum Referenz-Sketch (siehe PROJ-5-
    // Implementierungsnotizen). Eine (ggf. zusammengefasste) Kante gilt als
    // aktiv, wenn mindestens eine ihrer urspruenglichen Kanten aktiv ist.
    const edgeStyle = (originalEdgeIds: string[], base: CSSProperties = {}): CSSProperties => {
      if (!highlight) return base
      if (originalEdgeIds.some((id) => highlight.activeEdgeIds.has(id))) {
        return { ...base, stroke: ACTIVE_EDGE_COLOR, opacity: 1, strokeWidth: 2 }
      }
      return { ...base, opacity: 0.06 }
    }

    const edges: Edge[] = buildEffectiveEdges(model, {
      ebene1Visible,
      ebene2Visible,
      ebene3Visible,
      visibleFrageIds,
      visibleDimensionIds,
    }).map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      animated: false,
      style: edgeStyle(e.originalEdgeIds, ebene2Visible ? {} : { strokeDasharray: '4 4' }),
    }))

    return { nodes, edges }
  }, [
    model,
    ebene1Visible,
    ebene2Visible,
    ebene3Visible,
    columnX,
    expandedThemenbloecke,
    expandedDimensionGroups,
    dimensionsByName,
    selectedNode,
    selectedPersona,
  ])

  // Themenblock-/Dimensionsgruppen-Knoten klappen nur auf/zu (Navigation) -
  // das Dossier oeffnet sich nur bei den eigentlichen Detail-Knoten. Getrennt
  // gehalten, weil das Dossier ein nicht-blockierendes Seitenpanel ist, ein
  // Klick sollte trotzdem nie beides gleichzeitig ausloesen.
  const handleNodeClick = (_: unknown, node: FlowNode) => {
    if (node.type === 'dimensiongroup') {
      toggleDimensionGroupExpanded(node.id)
      return
    }
    const data = node.data as GraphFlowNodeData
    if (data.node.type === 'themenblock') {
      toggleExpanded(node.id)
      return
    }
    setSelectedNode(data.node)
    setSelectedPersona(null)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Label htmlFor="persona-filter" className="text-sm">
          Persona-Filter
        </Label>
        <Select value={selectedPersona ?? 'all'} onValueChange={handlePersonaChange}>
          <SelectTrigger id="persona-filter" className="w-64">
            <SelectValue placeholder="Alle Personas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Personas</SelectItem>
            {personas.map((persona) => (
              <SelectItem key={persona} value={persona}>
                {persona}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* flex-wrap statt starrem 3-Spalten-Grid: auf schmalen Viewports
          wuerde jede Grid-Zelle nur ~1/3 der Breite bekommen und den
          laengsten Label-Text ("Content-Blöcke (Ebene 3) anzeigen") auf
          mehrere Zeilen umbrechen (eigene Verifikation, 2026-08-28, 375px) -
          flex-wrap laesst jeden Schalter stattdessen in seiner natuerlichen
          Breite umbrechen. */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex items-center gap-2">
          <Switch
            id="ebene1-toggle"
            checked={ebene1Visible}
            disabled={ebene1Visible && visibleColumnCount === 1}
            onCheckedChange={handleEbene1Toggle}
          />
          <Label htmlFor="ebene1-toggle" className="text-sm">
            Themenblöcke (Ebene 1) anzeigen
          </Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            id="ebene2-toggle"
            checked={ebene2Visible}
            disabled={ebene2Visible && visibleColumnCount === 1}
            onCheckedChange={handleEbene2Toggle}
          />
          <Label htmlFor="ebene2-toggle" className="text-sm">
            Profildimensionen (Ebene 2) anzeigen
          </Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            id="ebene3-toggle"
            checked={ebene3Visible}
            disabled={ebene3Visible && visibleColumnCount === 1}
            onCheckedChange={handleEbene3Toggle}
          />
          <Label htmlFor="ebene3-toggle" className="text-sm">
            Content-Blöcke (Ebene 3) anzeigen
          </Label>
        </div>
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
          <AutoFitView nodeIdsKey={nodes.map((n) => n.id).sort().join(',')} />
        </ReactFlow>
      </div>

      <DossierPanel model={model} node={selectedNode} onOpenChange={(open) => !open && setSelectedNode(null)} />
    </div>
  )
}
