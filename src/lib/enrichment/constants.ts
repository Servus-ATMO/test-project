// Fester Katalog der 23 Profildimensionen aus dem Original-Interview-Prompt
// ("Interne Bewertung") - siehe PROJ-4 Spec und docs/reference/Adaptiver-
// Landingpage-Konzeptions-Prompt-v2.md. Muss mit dem CHECK-Constraint auf
// enrichment_dimensions.dimension_name uebereinstimmen.
export const DIMENSION_NAMES = [
  'Business Goal',
  'Conversion Goal',
  'Target Audience',
  'Traffic Source',
  'Awareness Level',
  'User Intent',
  'Problem',
  'Desire',
  'Value Proposition',
  'Differentiation',
  'Emotional Drivers',
  'Rational Drivers',
  'Objections',
  'Trust Requirements',
  'Verfügbare Beweise',
  'Content Depth',
  'Information Hierarchy',
  'UX Complexity',
  'CTA Strategy',
  'Sprachliche Tonalität',
  'Storytelling Potential',
  'Conversion Pressure',
  'Umsetzungsrahmen',
] as const

export type DimensionName = (typeof DIMENSION_NAMES)[number]

// Einzige Dimension, die laut Spec IMMER genau eine projektweite Instanz
// hat (nie pro Persona instanziiert) - Zeit/Budget/System/Pflege sind
// eindeutig projektweite Rahmenbedingungen, keine Zielgruppen-Eigenschaft.
export const GLOBAL_ONLY_DIMENSION: DimensionName = 'Umsetzungsrahmen'

export function isValidDimensionName(name: string): name is DimensionName {
  return (DIMENSION_NAMES as readonly string[]).includes(name)
}
