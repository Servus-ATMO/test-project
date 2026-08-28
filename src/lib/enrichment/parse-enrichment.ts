import {
  makeId,
  extractLabeledFields,
  isPlaceholder,
  splitByHeadingLevel,
} from '@/lib/imports/parse-utils'
import { normalizeMarkdown } from '@/lib/imports/normalize-markdown'
import { GLOBAL_ONLY_DIMENSION, isValidDimensionName } from './constants'
import type { ParsedImport } from '@/lib/imports/types'
import type {
  EnrichmentConflict,
  EnrichmentDimension,
  EnrichmentEdge,
  EnrichmentPersona,
  ParsedEnrichment,
} from './types'

const ARROW = /→|->/
const TRAILING_PAREN = /\s*\([^)]*\)\s*$/

// "[Eintrag-Label] -> [Feldname]" bzw. mit "→" - Trennzeichen fuer alle
// Quell-/Ziel-Referenzen im Anreicherungsergebnis (siehe Ausgabe-Vorlage).
// Toleriert zwei haeufige Abweichungen der KI vom strikten Format (Bug-Report
// PROJ-4, 2026-08-28: bei einem echten Import loesten sich dadurch 0 von 38
// "Quelle:"-Referenzen auf): (1) mehrere Referenzen mit Semikolon in einer
// Zeile statt je einer eigenen "Quelle:"-Zeile, (2) ein an den Feldnamen
// angehaengter Klammerzusatz (z. B. "Antwort (Option D)" statt "Antwort") -
// dafuer wird zuerst exakt, bei Fehlschlag zusaetzlich ohne den Klammerzusatz
// gegen die importierten Felder abgeglichen.
function splitReferences(text: string): { entryLabel: string; fieldName: string }[] {
  return text
    .split(';')
    .map((part) => {
      const arrowParts = part.split(ARROW)
      if (arrowParts.length !== 2) return null
      const entryLabel = arrowParts[0].trim()
      const fieldName = arrowParts[1].trim()
      if (!entryLabel || !fieldName) return null
      return { entryLabel, fieldName }
    })
    .filter((ref): ref is { entryLabel: string; fieldName: string } => ref !== null)
}

// Loest eine "Quelle:"/"Feld A:"/"Feld B:"-Zeile in null, eine oder mehrere
// Feld-IDs auf (leeres Array = nichts davon konnte zugeordnet werden).
function resolveFieldIds(text: string, fieldLookup: Map<string, string>): string[] {
  const ids: string[] = []
  for (const { entryLabel, fieldName } of splitReferences(text)) {
    const exact = fieldLookup.get(`${entryLabel}|||${fieldName}`)
    const stripped = fieldName.replace(TRAILING_PAREN, '').trim()
    const withoutSuffix =
      stripped !== fieldName ? fieldLookup.get(`${entryLabel}|||${stripped}`) : undefined
    const id = exact ?? withoutSuffix
    if (id) ids.push(id)
  }
  return ids
}

function parseWeight(raw: string | undefined): number {
  const n = parseInt(raw ?? '', 10)
  if (Number.isNaN(n)) return 2
  return Math.min(3, Math.max(1, n))
}

// Eintrag-Label + Feldname -> Feld-ID, ueber BEIDE Dokumente hinweg (eine
// "Quelle:"-Referenz kann grundsaetzlich auf jedes importierte Feld zeigen,
// nicht nur auf Journey-Fragen).
function buildFieldLookup(parsedImport: ParsedImport): Map<string, string> {
  const lookup = new Map<string, string>()
  for (const section of [...parsedImport.journey.sections, ...parsedImport.konzept.sections]) {
    for (const entry of section.entries) {
      // Bei Sections mit genau einem, unbenannten Eintrag (z. B. "Einstieg",
      // "Notizen zur Aufnahme", mehrere Konzept-Abschnitte) zeigt renderSection()
      // in prompt-template.ts KEINE "#### [Eintrag-Label]"-Zeile - die KI sieht
      // dort nur die Section-Ueberschrift und zitiert folgerichtig genau die als
      // "Eintrag-Label" (Bug-Report PROJ-4, 2026-08-28: "Notizen zur Aufnahme →
      // ..." blieb unaufloesbar, weil hier bisher der leere entry.label als Key
      // diente). Section-Name als Fallback deckt sich exakt mit dem, was die KI
      // tatsaechlich zu sehen bekommt.
      const effectiveLabel = entry.label || section.name
      for (const field of entry.fields) {
        lookup.set(`${effectiveLabel}|||${field.name}`, field.id)
      }
    }
  }
  return lookup
}

// Eintrag-Label -> Eintrag-ID, ausschliesslich aus Konzept-Abschnitt 4
// "Seitenstruktur" (das sind die Ebene-3-Content-Bloecke).
function buildContentBlockLookup(parsedImport: ParsedImport): Map<string, string> {
  const lookup = new Map<string, string>()
  const seitenstruktur = parsedImport.konzept.sections.find((s) => s.name === '4. Seitenstruktur')
  if (!seitenstruktur) return lookup
  for (const entry of seitenstruktur.entries) {
    if (entry.label) lookup.set(entry.label, entry.id)
  }
  return lookup
}

function parsePersonas(body: string): EnrichmentPersona[] {
  return splitByHeadingLevel(body, 3).map(({ title, body: entryBody }, index) => {
    const name = title.replace(/^Persona:\s*/i, '').trim()
    const fields = extractLabeledFields(entryBody)
    return {
      id: makeId(),
      name: name || `Persona ${index + 1}`,
      description: fields.get('Beschreibung') ?? '',
      sourceReference: fields.get('Bezug') ?? '',
      position: index,
    }
  })
}

interface DimensionParseResult {
  dimensions: EnrichmentDimension[]
  informsEdges: EnrichmentEdge[]
  unresolvedReferences: string[]
}

function parseDimensions(
  body: string,
  personas: EnrichmentPersona[],
  fieldLookup: Map<string, string>
): DimensionParseResult {
  const dimensions: EnrichmentDimension[] = []
  const informsEdges: EnrichmentEdge[] = []
  const unresolvedReferences: string[] = []
  let position = 0

  for (const { title, body: dimensionBody } of splitByHeadingLevel(body, 3)) {
    const dimensionName = title.trim()
    if (!isValidDimensionName(dimensionName)) continue

    // "Umsetzungsrahmen" ist immer genau eine projektweite Instanz (kein
    // "#### Persona:"-Unterblock) - alle anderen Dimensionen haben einen
    // Unterblock je Persona, in der sich der Wert tatsaechlich unterscheidet.
    const instanceBlocks: { personaId: string | null; body: string }[] =
      dimensionName === GLOBAL_ONLY_DIMENSION
        ? [{ personaId: null, body: dimensionBody }]
        : splitByHeadingLevel(dimensionBody, 4).map(({ title: personaTitle, body: subBody }) => {
            const personaName = personaTitle.replace(/^Persona:\s*/i, '').trim()
            const persona = personas.find((p) => p.name === personaName)
            return { personaId: persona?.id ?? null, body: subBody }
          })

    for (const { personaId, body: instanceBody } of instanceBlocks) {
      const fields = extractLabeledFields(instanceBody)
      const rawValue = fields.get('Wert') ?? ''
      const isGap = isPlaceholder(rawValue) || /nicht ableitbar/i.test(rawValue)
      const dimensionId = makeId()

      dimensions.push({
        id: dimensionId,
        dimensionName,
        personaId,
        value: isGap ? '' : rawValue.trim(),
        status: isGap ? 'gap' : 'found',
        position: position++,
      })

      const quelle = fields.get('Quelle')
      if (!quelle) continue
      const fieldIds = resolveFieldIds(quelle, fieldLookup)
      if (fieldIds.length > 0) {
        for (const fieldId of fieldIds) {
          informsEdges.push({
            id: makeId(),
            edgeType: 'informs',
            sourceFieldId: fieldId,
            targetDimensionId: dimensionId,
            sourceDimensionId: null,
            targetEntryId: null,
            impactText: fields.get('Impact-Text') ?? '',
            weight: parseWeight(fields.get('Gewichtung')),
          })
        }
      } else {
        unresolvedReferences.push(
          `Dimension „${dimensionName}“: Quelle „${quelle}“ konnte keinem importierten Feld zugeordnet werden.`
        )
      }
    }
  }

  return { dimensions, informsEdges, unresolvedReferences }
}

const KANTE_HEADING = /^Kante:\s*(.+?)(?:\s*\(Persona:\s*(.+?)\))?\s*(?:→|->)\s*(.+)$/

function parseShapesEdges(
  body: string,
  dimensions: EnrichmentDimension[],
  personas: EnrichmentPersona[],
  contentBlockLookup: Map<string, string>
): { edges: EnrichmentEdge[]; unresolvedReferences: string[] } {
  const edges: EnrichmentEdge[] = []
  const unresolvedReferences: string[] = []

  for (const { title, body: edgeBody } of splitByHeadingLevel(body, 3)) {
    const match = title.trim().match(KANTE_HEADING)
    if (!match) continue
    const dimensionName = match[1].trim()
    const personaName = match[2]?.trim()
    const targetLabel = match[3].trim()

    const personaId = personaName ? (personas.find((p) => p.name === personaName)?.id ?? null) : null
    const sourceDimension = dimensions.find(
      (d) => d.dimensionName === dimensionName && d.personaId === personaId
    )
    const targetEntryId = contentBlockLookup.get(targetLabel)

    if (!sourceDimension || !targetEntryId) {
      unresolvedReferences.push(`Kante „${title.trim()}“ konnte nicht vollständig zugeordnet werden.`)
      continue
    }

    const fields = extractLabeledFields(edgeBody)
    edges.push({
      id: makeId(),
      edgeType: 'shapes',
      sourceFieldId: null,
      targetDimensionId: null,
      sourceDimensionId: sourceDimension.id,
      targetEntryId,
      impactText: fields.get('Impact-Text') ?? '',
      weight: parseWeight(fields.get('Gewichtung')),
    })
  }

  return { edges, unresolvedReferences }
}

const KONFLIKT_HEADING = /^Konflikt\s+\d+\s*\((explizit|emergent)\)$/i

function parseConflicts(
  body: string,
  dimensions: EnrichmentDimension[],
  personas: EnrichmentPersona[],
  fieldLookup: Map<string, string>,
  contentBlockLookup: Map<string, string>
): { conflicts: EnrichmentConflict[]; unresolvedReferences: string[] } {
  const conflicts: EnrichmentConflict[] = []
  const unresolvedReferences: string[] = []

  for (const { title, body: conflictBody } of splitByHeadingLevel(body, 3)) {
    const match = title.trim().match(KONFLIKT_HEADING)
    if (!match) continue
    const type = match[1].toLowerCase()
    const fields = extractLabeledFields(conflictBody)
    const description = fields.get('Beschreibung') ?? ''

    if (type === 'explizit') {
      const refA = fields.get('Feld A')
      const refB = fields.get('Feld B')
      const fieldAId = refA ? resolveFieldIds(refA, fieldLookup)[0] : undefined
      const fieldBId = refB ? resolveFieldIds(refB, fieldLookup)[0] : undefined
      if (!fieldAId || !fieldBId) {
        unresolvedReferences.push(
          `Konflikt „${title.trim()}“: Felder konnten nicht vollständig zugeordnet werden.`
        )
        continue
      }
      conflicts.push({
        id: makeId(),
        conflictType: 'explicit',
        description,
        fieldAId,
        fieldBId,
        entryId: null,
        involvedDimensionIds: [],
      })
      continue
    }

    const blockLabel = fields.get('Content-Block') ?? ''
    const entryId = contentBlockLookup.get(blockLabel)
    if (!entryId) {
      unresolvedReferences.push(`Konflikt „${title.trim()}“: Content-Block konnte nicht zugeordnet werden.`)
      continue
    }

    const dimensionName = fields.get('Beteiligte Dimension') ?? ''
    const personaNames = (fields.get('Beteiligte Personas') ?? '')
      .split(',')
      .map((n) => n.trim())
      .filter(Boolean)
    const involvedDimensionIds = personaNames
      .map((name) => {
        const persona = personas.find((p) => p.name === name)
        if (!persona) return null
        return dimensions.find((d) => d.dimensionName === dimensionName && d.personaId === persona.id)?.id ?? null
      })
      .filter((id): id is string => id !== null)

    conflicts.push({
      id: makeId(),
      conflictType: 'emergent',
      description,
      fieldAId: null,
      fieldBId: null,
      entryId,
      involvedDimensionIds,
    })
  }

  return { conflicts, unresolvedReferences }
}

// Mechanisches Parsen der hochgeladenen Anreicherungs-Ergebnis-Datei gegen
// docs/reference/KI-Anreicherungs-Ergebnis-Vorlage.md - kein zweiter
// KI-Aufruf (siehe PROJ-4 Tech Design). Referenzen, die sich nicht gegen
// den aktuellen Import aufloesen lassen, werden als Warnung gesammelt statt
// die betroffene Kante/den Konflikt stillschweigend zu verwerfen
// (Best-Effort-Parsing, analog zu PROJ-3).
export function parseEnrichmentResult(rawText: string, parsedImport: ParsedImport): ParsedEnrichment {
  const text = normalizeMarkdown(rawText)
  const fieldLookup = buildFieldLookup(parsedImport)
  const contentBlockLookup = buildContentBlockLookup(parsedImport)

  const topSections = splitByHeadingLevel(text, 2)
  const personasBody = topSections.find((s) => s.title === 'Personas')?.body ?? ''
  const dimensionenBody = topSections.find((s) => s.title === 'Dimensionen')?.body ?? ''
  const kantenBody = topSections.find((s) => s.title === 'Kanten zu Content-Blöcken')?.body ?? ''
  const konflikteBody = topSections.find((s) => s.title === 'Konflikte')?.body ?? ''

  const personas = parsePersonas(personasBody)
  const {
    dimensions,
    informsEdges,
    unresolvedReferences: dimensionWarnings,
  } = parseDimensions(dimensionenBody, personas, fieldLookup)
  const { edges: shapesEdges, unresolvedReferences: shapesWarnings } = parseShapesEdges(
    kantenBody,
    dimensions,
    personas,
    contentBlockLookup
  )
  const { conflicts, unresolvedReferences: conflictWarnings } = parseConflicts(
    konflikteBody,
    dimensions,
    personas,
    fieldLookup,
    contentBlockLookup
  )

  const hasRecognizableStructure = personas.length > 0 && dimensions.some((d) => d.status === 'found')

  return {
    personas,
    dimensions,
    edges: [...informsEdges, ...shapesEdges],
    conflicts,
    unresolvedReferences: [...dimensionWarnings, ...shapesWarnings, ...conflictWarnings],
    hasRecognizableStructure,
  }
}
