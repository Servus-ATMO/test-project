export type NodeStatus = 'found' | 'gap'

export interface ThemenblockNode {
  type: 'themenblock'
  id: string
  sectionName: string
  frageIds: string[]
}

export interface FrageNode {
  type: 'frage'
  id: string
  themenblockId: string
  label: string
  frageText: string
  frageStatus: NodeStatus
  antwortText: string
  antwortStatus: NodeStatus
  // Feld-ID der Antwort - das ist es, worauf informs-Kanten (sourceFieldId)
  // tatsaechlich zeigen, siehe EnrichmentEdge.
  antwortFieldId: string | null
  hasConflict: boolean
}

export interface DimensionNode {
  type: 'dimension'
  id: string
  dimensionName: string
  // null = projektweite Instanz (ausschliesslich "Umsetzungsrahmen").
  personaName: string | null
  value: string
  status: NodeStatus
  hasConflict: boolean
}

export interface ContentBlockField {
  name: string
  value: string
  status: NodeStatus
}

export interface ContentBlockNode {
  type: 'contentblock'
  id: string
  label: string
  fields: ContentBlockField[]
  hasConflict: boolean
}

export type GraphNodeData = ThemenblockNode | FrageNode | DimensionNode | ContentBlockNode

// Themenblock-Knoten oeffnen nie das Dossier (nur Auf-/Zuklappen) - siehe
// GraphView.handleNodeClick. Eigener Typ, damit der Compiler das erzwingt.
export type DossierNodeData = FrageNode | DimensionNode | ContentBlockNode

export type GraphEdgeType = 'informs' | 'shapes' | 'compressed'

export interface GraphEdge {
  id: string
  source: string
  target: string
  edgeType: GraphEdgeType
  impactText: string
  weight: number
}

export interface ConflictNote {
  description: string
}

export interface GraphModel {
  themenbloecke: ThemenblockNode[]
  fragen: FrageNode[]
  dimensionen: DimensionNode[]
  contentBlocks: ContentBlockNode[]
  // Kanten fuer die eingeblendete Ebene 2 (informs: Frage -> Dimension,
  // shapes: Dimension -> Content-Block).
  edges: GraphEdge[]
  // Direkte Frage -> Content-Block-Kanten fuer die ausgeblendete Ebene 2
  // (siehe PROJ-5 Tech Design: vorab berechnet, nicht erst beim Umschalten).
  compressedEdges: GraphEdge[]
  // Klartext-Beschreibungen je Knoten-ID, der an mindestens einem Konflikt
  // beteiligt ist (fuer Dossier-Panel und Konflikt-Badge).
  conflictsByNodeId: Record<string, ConflictNote[]>
}
