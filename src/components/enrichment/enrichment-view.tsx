import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { GLOBAL_ONLY_DIMENSION } from '@/lib/enrichment/constants'
import type {
  EnrichmentConflict,
  EnrichmentDimension,
  EnrichmentEdge,
  EnrichmentPersona,
} from '@/lib/enrichment/types'

interface EnrichmentViewProps {
  personas: EnrichmentPersona[]
  dimensions: EnrichmentDimension[]
  edges: EnrichmentEdge[]
  conflicts: EnrichmentConflict[]
}

function DimensionRow({ dimension, edges }: { dimension: EnrichmentDimension; edges: EnrichmentEdge[] }) {
  const informsEdge = edges.find((e) => e.edgeType === 'informs' && e.targetDimensionId === dimension.id)
  return (
    <div className="space-y-1 border-l-2 pl-3">
      <p className="text-sm font-medium">{dimension.dimensionName}</p>
      {dimension.status === 'gap' ? (
        <Badge variant="outline" className="text-xs">
          nicht ableitbar
        </Badge>
      ) : (
        <p className="text-sm whitespace-pre-line">{dimension.value}</p>
      )}
      {informsEdge && (informsEdge.impactText || informsEdge.weight) && (
        <p className="text-xs text-muted-foreground">
          {informsEdge.impactText}
          {informsEdge.impactText && ' '}
          <span className="italic">(Gewichtung: {informsEdge.weight})</span>
        </p>
      )}
    </div>
  )
}

// Gemeinsame Anzeige fuer Vorschau (vor dem Speichern) und Lese-Uebersicht
// (nach dem Speichern) - analog zu ParsedDocumentView in PROJ-3.
export function EnrichmentView({ personas, dimensions, edges, conflicts }: EnrichmentViewProps) {
  const globalDimensions = dimensions.filter((d) => d.dimensionName === GLOBAL_ONLY_DIMENSION)
  const explicitConflicts = conflicts.filter((c) => c.conflictType === 'explicit')
  const emergentConflicts = conflicts.filter((c) => c.conflictType === 'emergent')

  if (personas.length === 0 && dimensions.length === 0) {
    return <p className="text-sm text-muted-foreground">Keine Struktur erkannt.</p>
  }

  return (
    <div className="space-y-6">
      {globalDimensions.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Projektweit</h3>
          {globalDimensions.map((d) => (
            <DimensionRow key={d.id} dimension={d} edges={edges} />
          ))}
        </div>
      )}

      <Accordion type="multiple" className="w-full">
        {personas.map((persona) => {
          const personaDimensions = dimensions.filter((d) => d.personaId === persona.id)
          return (
            <AccordionItem key={persona.id} value={persona.id}>
              <AccordionTrigger className="text-sm font-medium">{persona.name}</AccordionTrigger>
              <AccordionContent className="space-y-4">
                {persona.description && <p className="text-sm">{persona.description}</p>}
                {persona.sourceReference && (
                  <p className="text-xs text-muted-foreground">Bezug: {persona.sourceReference}</p>
                )}
                <div className="space-y-3">
                  {personaDimensions.map((d) => (
                    <DimensionRow key={d.id} dimension={d} edges={edges} />
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          )
        })}
      </Accordion>

      {conflicts.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Konflikte</h3>
          {explicitConflicts.map((c) => (
            <div key={c.id} className="space-y-1 border-l-2 border-destructive pl-3">
              <Badge variant="destructive" className="text-xs">
                explizit
              </Badge>
              <p className="text-sm">{c.description}</p>
            </div>
          ))}
          {emergentConflicts.map((c) => (
            <div key={c.id} className="space-y-1 border-l-2 border-destructive pl-3">
              <Badge variant="destructive" className="text-xs">
                emergent
              </Badge>
              <p className="text-sm">{c.description}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
