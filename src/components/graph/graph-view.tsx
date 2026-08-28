'use client'

import { useLayoutEffect, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { buildGraphModel } from '@/lib/graph/build-graph-model'
import { computeHighlight, computeHighlightForPersona, type HighlightResult } from '@/lib/graph/highlight'
import { buildEffectiveEdges } from '@/lib/graph/effective-edges'
import { GraphNode, DimensionGroupNode, type HighlightState } from './graph-node'
import { DossierPanel } from './dossier-panel'
import type {
  ContentBlockNode,
  DimensionNode,
  DossierNodeData,
  FrageNode,
  ThemenblockNode,
} from '@/lib/graph/types'
import type { ParsedImport } from '@/lib/imports/types'
import type { Enrichment } from '@/lib/enrichment/types'

interface GraphViewProps {
  parsedImport: ParsedImport
  enrichment: Enrichment
}

// Statische, vertikal gestapelte Spalten statt einer pan-/zoombaren Canvas
// (Nutzer-Feedback 2026-08-28, nach Referenz-Sketch: "keine Canvas in der
// ich hin und herscrollen kann - das ist nicht notwendig"). Kanten werden
// als SVG-Overlay ueber die drei Spalten gezeichnet, deren Pfade aus den
// tatsaechlichen DOM-Positionen der Knoten berechnet werden (analog zur
// drawEdges()-Funktion im Referenz-Sketch) - keine manuelle x/y-Vergabe
// mehr noetig, jede Spalte ist einfach eine normale, vertikale Flex-Liste.
const NEUTRAL_EDGE_COLOR = '#cbd5e1'
const ACTIVE_EDGE_COLOR = '#f97316'

type EdgePath = { id: string; d: string; active: boolean }

function dimensionGroupId(dimensionName: string): string {
  return `dimgroup:${dimensionName}`
}

// Reine Daten, kein JSX/keine Closures - wird in einem useMemo gebaut. Der
// React Compiler kann ein useMemo nicht optimieren, wenn sein Rueckgabewert
// JSX mit ref-Zuweisungen enthaelt (siehe ColumnRowItem weiter unten, das
// die eigentliche ref-Zuweisung uebernimmt) - deshalb strikte Trennung.
type ColumnRow =
  | { kind: 'themenblock'; id: string; indent: false; node: ThemenblockNode; expanded: boolean; highlight: HighlightState }
  | { kind: 'frage'; id: string; indent: boolean; node: FrageNode; highlight: HighlightState }
  | { kind: 'dimension'; id: string; indent: boolean; node: DimensionNode; highlight: HighlightState }
  | {
      kind: 'dimensiongroup'
      id: string
      indent: false
      dimensionName: string
      count: number
      expanded: boolean
      highlight: HighlightState
    }
  | { kind: 'contentblock'; id: string; indent: false; node: ContentBlockNode; highlight: HighlightState }

function ColumnHeader({
  eyebrow,
  title,
  switchId,
  ariaLabel,
  checked,
  disabled,
  onCheckedChange,
}: {
  eyebrow: string
  title: string
  switchId: string
  ariaLabel: string
  checked: boolean
  disabled: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <div className="space-y-1">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{eyebrow}</div>
      <div className="text-sm font-semibold">{title}</div>
      <div className="flex items-center gap-2">
        <Switch id={switchId} aria-label={ariaLabel} checked={checked} disabled={disabled} onCheckedChange={onCheckedChange} />
        <Label htmlFor={switchId} className="text-xs text-muted-foreground">
          ein/ausblenden
        </Label>
      </div>
    </div>
  )
}

// Eigene Komponente fuer die ref-Zuweisung: jede Komponente weist ihre
// eigenen Refs waehrend ihres EIGENEN Renderns zu, das ist der normale,
// vom React Compiler akzeptierte Fall (anders als eine ref-Zuweisung, die
// aus dem useMemo eines Elternteils "importiert" wird).
function ColumnRowItem({
  row,
  nodeRefs,
  onThemenblockClick,
  onDimensionGroupClick,
  onNodeSelect,
}: {
  row: ColumnRow
  nodeRefs: React.RefObject<Map<string, HTMLDivElement>>
  onThemenblockClick: (id: string) => void
  onDimensionGroupClick: (id: string) => void
  onNodeSelect: (node: DossierNodeData) => void
}) {
  if (row.kind === 'themenblock') {
    return (
      <GraphNode
        ref={(el) => {
          if (!el) return
          nodeRefs.current.set(row.id, el)
          return () => {
            nodeRefs.current.delete(row.id)
          }
        }}
        node={row.node}
        expanded={row.expanded}
        highlight={row.highlight}
        onClick={() => onThemenblockClick(row.id)}
      />
    )
  }

  if (row.kind === 'dimensiongroup') {
    return (
      <DimensionGroupNode
        ref={(el) => {
          if (!el) return
          nodeRefs.current.set(row.id, el)
          return () => {
            nodeRefs.current.delete(row.id)
          }
        }}
        dimensionName={row.dimensionName}
        count={row.count}
        expanded={row.expanded}
        highlight={row.highlight}
        onClick={() => onDimensionGroupClick(row.id)}
      />
    )
  }

  return (
    <GraphNode
      ref={(el) => {
        if (!el) return
        nodeRefs.current.set(row.id, el)
        return () => {
          nodeRefs.current.delete(row.id)
        }
      }}
      node={row.node}
      highlight={row.highlight}
      onClick={() => onNodeSelect(row.node)}
    />
  )
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

  // Haelt die tatsaechlichen DOM-Elemente der aktuell sichtbaren Knoten, um
  // ihre Position fuer die SVG-Kanten-Overlay zu messen (siehe unten).
  const nodeRefs = useRef(new Map<string, HTMLDivElement>())

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
    if (!ebene2Visible) setEbene2Visible(true)
  }

  const dimensionsByName = useMemo(() => {
    const byName = new Map<string, DimensionNode[]>()
    for (const d of model.dimensionen) {
      const list = byName.get(d.dimensionName) ?? []
      list.push(d)
      byName.set(d.dimensionName, list)
    }
    return byName
  }, [model])

  // Das Dossier oeffnet sich unabhaengig von einem aktiven Persona-Filter
  // (Nutzer-Feedback 2026-08-29: Filter/Highlight soll beim Anklicken eines
  // Elements bzw. Oeffnen/Schliessen der Sidebar bestehen bleiben) - der
  // Filter wird deshalb hier bewusst NICHT zurueckgesetzt.
  const handleNodeSelect = (node: DossierNodeData) => {
    setSelectedNode(node)
  }

  const renderData = useMemo(() => {
    // Persona-Filter hat Vorrang vor einer Knoten-Auswahl: ist ein Filter
    // aktiv, bestimmt er weiterhin das Highlight, auch wenn nebenbei ein
    // Dossier fuer einen (ggf. anderen) Knoten offen ist.
    const highlight: HighlightResult | null = selectedPersona
      ? computeHighlightForPersona(selectedPersona, model, ebene2Visible)
      : selectedNode
        ? computeHighlight(selectedNode.id, model, ebene2Visible)
        : null

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
      // Der "selected"-Ring (volle Sichtbarkeit fuer den angeklickten Knoten)
      // gilt nur, wenn die Knoten-Auswahl selbst die Highlight-Quelle ist -
      // ist ein Persona-Filter aktiv, bleibt dieser die alleinige Quelle
      // (siehe oben), der geoeffnete Knoten ist dann nur ein unabhaengiges
      // Dossier-Detail und folgt wie jeder andere Knoten der aktiv/ausgegraut-
      // Regel des Filters (Nutzer-Feedback 2026-08-29: ein Knoten ausserhalb
      // der gefilterten Persona soll auch bei geoeffnetem Dossier ausgegraut
      // bleiben, nicht durch den Klick "freigestellt" werden).
      if (!selectedPersona && selectedNode && nodeId === selectedNode.id) return 'selected'
      return highlight.activeNodeIds.has(nodeId) ? 'active' : 'dim'
    }

    const col1Rows: ColumnRow[] = []
    const visibleFrageIds = new Set<string>()
    if (ebene1Visible) {
      for (const themenblock of model.themenbloecke) {
        const expanded = expandedThemenbloecke.has(themenblock.id)
        col1Rows.push({
          kind: 'themenblock',
          id: themenblock.id,
          indent: false,
          node: themenblock,
          expanded,
          highlight: highlightFor(themenblock.id, 'themenblock'),
        })
        if (expanded) {
          for (const frageId of themenblock.frageIds) {
            const frage = model.fragen.find((f) => f.id === frageId)
            if (!frage) continue
            visibleFrageIds.add(frage.id)
            col1Rows.push({ kind: 'frage', id: frage.id, indent: true, node: frage, highlight: highlightFor(frage.id) })
          }
        }
      }
    }

    const col2Rows: ColumnRow[] = []
    const visibleDimensionIds = new Set<string>()
    if (ebene2Visible) {
      for (const [dimensionName, instances] of dimensionsByName) {
        if (instances.length === 1) {
          const dimension = instances[0]
          visibleDimensionIds.add(dimension.id)
          col2Rows.push({
            kind: 'dimension',
            id: dimension.id,
            indent: false,
            node: dimension,
            highlight: highlightFor(dimension.id),
          })
          continue
        }

        const groupId = dimensionGroupId(dimensionName)
        const expanded = expandedDimensionGroups.has(groupId)
        col2Rows.push({
          kind: 'dimensiongroup',
          id: groupId,
          indent: false,
          dimensionName,
          count: instances.length,
          expanded,
          highlight: highlightFor(groupId, 'dimensiongroup'),
        })
        if (expanded) {
          for (const dimension of instances) {
            visibleDimensionIds.add(dimension.id)
            col2Rows.push({
              kind: 'dimension',
              id: dimension.id,
              indent: true,
              node: dimension,
              highlight: highlightFor(dimension.id),
            })
          }
        }
      }
    }

    const col3Rows: ColumnRow[] = []
    if (ebene3Visible) {
      for (const block of model.contentBlocks) {
        col3Rows.push({ kind: 'contentblock', id: block.id, indent: false, node: block, highlight: highlightFor(block.id) })
      }
    }

    const effectiveEdges = buildEffectiveEdges(model, {
      ebene1Visible,
      ebene2Visible,
      ebene3Visible,
      visibleFrageIds,
      visibleDimensionIds,
    })

    return { col1Rows, col2Rows, col3Rows, effectiveEdges, highlight }
  }, [
    model,
    ebene1Visible,
    ebene2Visible,
    ebene3Visible,
    expandedThemenbloecke,
    expandedDimensionGroups,
    dimensionsByName,
    selectedNode,
    selectedPersona,
  ])

  const canvasRef = useRef<HTMLDivElement>(null)
  const [edgePaths, setEdgePaths] = useState<EdgePath[]>([])
  const computeEdgesRef = useRef<() => void>(() => {})

  // Kanten-Pfade aus den tatsaechlichen DOM-Positionen der Knoten berechnen
  // (rechter Rand des Quell-Knotens -> linker Rand des Ziel-Knotens, kubische
  // Bezier-Kurve dazwischen) - exakt die Formel aus dem Referenz-Sketch
  // (drawEdges()), portiert auf React Refs statt direkter DOM-Manipulation.
  useLayoutEffect(() => {
    computeEdgesRef.current = () => {
      const canvas = canvasRef.current
      if (!canvas) return
      const canvasRect = canvas.getBoundingClientRect()
      const paths: EdgePath[] = []
      for (const e of renderData.effectiveEdges) {
        const fromEl = nodeRefs.current.get(e.source)
        const toEl = nodeRefs.current.get(e.target)
        if (!fromEl || !toEl) continue
        const fr = fromEl.getBoundingClientRect()
        const tr = toEl.getBoundingClientRect()
        const x1 = fr.right - canvasRect.left
        const y1 = fr.top - canvasRect.top + fr.height / 2
        const x2 = tr.left - canvasRect.left
        const y2 = tr.top - canvasRect.top + tr.height / 2
        const dx = Math.max(36, (x2 - x1) * 0.5)
        const d = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`
        const active = renderData.highlight ? e.originalEdgeIds.some((id) => renderData.highlight!.activeEdgeIds.has(id)) : false
        paths.push({ id: e.id, d, active })
      }
      setEdgePaths(paths)
    }
    computeEdgesRef.current()
  }, [renderData])

  // Neu berechnen bei Groessenaenderung (Fensterbreite, Spalten-Ein-/
  // Ausblenden veraendert die verfuegbare Breite) - ResizeObserver auf der
  // Canvas selbst, nicht nur `window.resize`, da auch layoutinterne
  // Verschiebungen (z. B. Schriftart-Ladezeitpunkt) die Positionen leicht
  // verschieben koennen.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const handler = () => computeEdgesRef.current()
    const observer = new ResizeObserver(handler)
    observer.observe(canvas)
    window.addEventListener('resize', handler)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', handler)
    }
  }, [])

  const highlightExists = renderData.highlight !== null

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

      {/* Bricht bewusst aus der max-w-5xl-Beschraenkung des umgebenden
          Seitenlayouts aus (Nutzer-Feedback 2026-08-29: "Ebenen-Bereich soll
          die gesamte Browserbreite nutzen koennen") - klassischer "full
          bleed"-Trick unabhaengig von der Breite des Elternelements, siehe
          https://css-tricks.com/full-width-containers-and-standard-content/.
          Nur dieser Bereich, nicht die Seite insgesamt (Breadcrumb/Titel/
          Persona-Filter bleiben im normalen Layout-Raster). */}
      <div className="relative left-1/2 right-1/2 w-screen -mx-[50vw] px-4">
        <div data-testid="graph-canvas" className="overflow-x-auto rounded-lg border bg-muted/20 pb-4">
          <div ref={canvasRef} className="relative flex items-start gap-10 p-6">
            <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
              {edgePaths.map((edge) => {
                const style: CSSProperties = highlightExists
                  ? edge.active
                    ? { stroke: ACTIVE_EDGE_COLOR, opacity: 1, strokeWidth: 2 }
                    : { stroke: NEUTRAL_EDGE_COLOR, opacity: 0.08, strokeWidth: 1.3 }
                  : { stroke: NEUTRAL_EDGE_COLOR, opacity: 0.5, strokeWidth: 1.3 }
                return (
                  <path
                    key={edge.id}
                    data-edge-active={edge.active}
                    d={edge.d}
                    fill="none"
                    strokeDasharray={ebene2Visible ? undefined : '4 4'}
                    style={style}
                  />
                )
              })}
            </svg>

            <div className="relative z-10 flex w-60 shrink-0 flex-col gap-3">
              <ColumnHeader
                eyebrow="Ebene 1 · Input"
                title="Themenblöcke"
                switchId="ebene1-toggle"
                ariaLabel="Themenblöcke (Ebene 1) anzeigen"
                checked={ebene1Visible}
                disabled={ebene1Visible && visibleColumnCount === 1}
                onCheckedChange={handleEbene1Toggle}
              />
              {renderData.col1Rows.map((row) => (
                <div key={row.id} data-node-id={row.id} className={row.indent ? 'pl-4' : undefined}>
                  <ColumnRowItem
                    row={row}
                    nodeRefs={nodeRefs}
                    onThemenblockClick={toggleExpanded}
                    onDimensionGroupClick={toggleDimensionGroupExpanded}
                    onNodeSelect={handleNodeSelect}
                  />
                </div>
              ))}
            </div>

            <div className="relative z-10 flex w-56 shrink-0 flex-col gap-3">
              <ColumnHeader
                eyebrow="Ebene 2 · verdeckt"
                title="Profildimensionen"
                switchId="ebene2-toggle"
                ariaLabel="Profildimensionen (Ebene 2) anzeigen"
                checked={ebene2Visible}
                disabled={ebene2Visible && visibleColumnCount === 1}
                onCheckedChange={handleEbene2Toggle}
              />
              {renderData.col2Rows.map((row) => (
                <div key={row.id} data-node-id={row.id} className={row.indent ? 'pl-4' : undefined}>
                  <ColumnRowItem
                    row={row}
                    nodeRefs={nodeRefs}
                    onThemenblockClick={toggleExpanded}
                    onDimensionGroupClick={toggleDimensionGroupExpanded}
                    onNodeSelect={handleNodeSelect}
                  />
                </div>
              ))}
            </div>

            <div className="relative z-10 flex w-72 shrink-0 flex-col gap-3">
              <ColumnHeader
                eyebrow="Ebene 3 · Output"
                title="Content-Blöcke"
                switchId="ebene3-toggle"
                ariaLabel="Content-Blöcke (Ebene 3) anzeigen"
                checked={ebene3Visible}
                disabled={ebene3Visible && visibleColumnCount === 1}
                onCheckedChange={handleEbene3Toggle}
              />
              {renderData.col3Rows.map((row) => (
                <div key={row.id} data-node-id={row.id} className={row.indent ? 'pl-4' : undefined}>
                  <ColumnRowItem
                    row={row}
                    nodeRefs={nodeRefs}
                    onThemenblockClick={toggleExpanded}
                    onDimensionGroupClick={toggleDimensionGroupExpanded}
                    onNodeSelect={handleNodeSelect}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <DossierPanel model={model} node={selectedNode} onOpenChange={(open) => !open && setSelectedNode(null)} />
    </div>
  )
}
