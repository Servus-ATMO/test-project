import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import type { ParsedDocument } from '@/lib/imports/types'

interface ParsedDocumentViewProps {
  document: ParsedDocument
}

// Gemeinsame Anzeige fuer Vorschau (vor dem Speichern) und Lese-Uebersicht
// (nach dem Speichern) - beide zeigen dieselbe Section/Eintrag/Feld-Struktur.
export function ParsedDocumentView({ document }: ParsedDocumentViewProps) {
  if (document.sections.length === 0) {
    return <p className="text-sm text-muted-foreground">Keine Struktur erkannt.</p>
  }

  return (
    <Accordion type="multiple" className="w-full">
      {document.sections.map((section) => (
        <AccordionItem key={section.id} value={section.id}>
          <AccordionTrigger className="text-sm font-medium">{section.name}</AccordionTrigger>
          <AccordionContent className="space-y-4">
            {section.entries.map((entry) => (
              <div key={entry.id} className="space-y-1 border-l-2 pl-3">
                {entry.label && <p className="text-sm font-medium">{entry.label}</p>}
                <dl className="space-y-1">
                  {entry.fields.map((field) => (
                    <div key={field.id} className="text-sm">
                      <dt className="inline font-medium text-muted-foreground">{field.name}: </dt>
                      {field.status === 'gap' ? (
                        <Badge variant="outline" className="align-middle text-xs">
                          Lücke — nicht angegeben
                        </Badge>
                      ) : (
                        <dd className="inline whitespace-pre-line">{field.value}</dd>
                      )}
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  )
}
