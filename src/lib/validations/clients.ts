import { z } from 'zod'

export const clientSchema = z.object({
  companyName: z.string().trim().min(1, 'Firmenname ist erforderlich'),
  contactName: z.string().trim(),
  contactEmail: z.email('Ungültige E-Mail-Adresse'),
  notes: z.string().trim(),
})

export type ClientFormValues = z.infer<typeof clientSchema>

export const projectSchema = z.object({
  name: z.string().trim().min(1, 'Projektname ist erforderlich'),
  notes: z.string().trim(),
})

export type ProjectFormValues = z.infer<typeof projectSchema>
