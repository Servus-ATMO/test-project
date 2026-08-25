'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { clientSchema, projectSchema } from '@/lib/validations/clients'
import type { EntityStatus } from './types'

export type ActionResult = { error: string } | undefined

export interface DeleteResult {
  ok: boolean
  reason?: string
}

export type CreateClientResult =
  | { status: 'duplicate'; existingCompanyName: string }
  | { status: 'error'; error: string }

// Server Actions laufen zwar bereits hinter dem geschuetzten Layout
// (src/app/(protected)/layout.tsx redirect't bei fehlender Session), Server
// Actions sind aber eigene Endpunkte und werden hier zusaetzlich abgesichert
// (Defense in Depth, siehe .claude/rules/backend.md "Always check
// authentication"). RLS (siehe Migration) ist die dritte, unabhaengige Ebene.
async function requireAuth() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  if (!data?.claims) {
    redirect('/login')
  }
  return supabase
}

export async function createClientAndFirstProject(
  values: unknown,
  confirmDuplicate = false
): Promise<CreateClientResult | undefined> {
  const parsed = clientSchema.safeParse(values)
  if (!parsed.success) {
    return { status: 'error', error: parsed.error.issues[0]?.message ?? 'Ungültige Eingabe.' }
  }
  const supabase = await requireAuth()

  if (!confirmDuplicate) {
    const { data: existing } = await supabase
      .from('clients')
      .select('company_name')
      .ilike('contact_email', parsed.data.contactEmail)
      .maybeSingle()
    if (existing) {
      return { status: 'duplicate', existingCompanyName: existing.company_name }
    }
  }

  const { data: client, error: clientError } = await supabase
    .from('clients')
    .insert({
      company_name: parsed.data.companyName,
      contact_name: parsed.data.contactName,
      contact_email: parsed.data.contactEmail,
      notes: parsed.data.notes,
    })
    .select('id')
    .single()

  if (clientError || !client) {
    return { status: 'error', error: 'Der Kunde konnte nicht angelegt werden.' }
  }

  // Automatisches erstes Projekt (Default-Name = Firmenname), siehe Tech Design.
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .insert({ client_id: client.id, name: parsed.data.companyName })
    .select('id')
    .single()

  if (projectError || !project) {
    return {
      status: 'error',
      error: 'Kunde wurde angelegt, das erste Projekt konnte aber nicht erstellt werden.',
    }
  }

  revalidatePath('/kunden')
  revalidatePath('/dashboard')
  redirect(`/kunden/${client.id}/${project.id}`)
}

export async function updateClient(id: string, values: unknown): Promise<ActionResult> {
  const parsed = clientSchema.safeParse(values)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Ungültige Eingabe.' }
  }
  const supabase = await requireAuth()

  const { error } = await supabase
    .from('clients')
    .update({
      company_name: parsed.data.companyName,
      contact_name: parsed.data.contactName,
      contact_email: parsed.data.contactEmail,
      notes: parsed.data.notes,
    })
    .eq('id', id)

  if (error) {
    return { error: 'Der Kunde konnte nicht gespeichert werden.' }
  }
  revalidatePath('/kunden')
  revalidatePath(`/kunden/${id}`)
  revalidatePath('/dashboard')
}

export async function setClientStatus(id: string, status: EntityStatus): Promise<void> {
  const supabase = await requireAuth()
  await supabase.from('clients').update({ status }).eq('id', id)
  revalidatePath('/kunden')
  revalidatePath(`/kunden/${id}`)
  revalidatePath('/dashboard')
}

export async function deleteClient(id: string): Promise<DeleteResult> {
  const supabase = await requireAuth()

  const { count } = await supabase
    .from('projects')
    .select('id', { count: 'exact', head: true })
    .eq('client_id', id)

  if ((count ?? 0) > 0) {
    return {
      ok: false,
      reason: `Dieser Kunde hat noch ${count} Projekt(e) — endgültiges Löschen ist erst möglich, wenn keine Projekte mehr vorhanden sind. Alternativ kann der Kunde archiviert werden.`,
    }
  }

  // ON DELETE RESTRICT auf projects.client_id greift ohnehin als zweite
  // Absicherung, falls die Zaehlung oben durch eine parallele Aenderung
  // veraltet ist (last-write-wins, kein Konfliktschutz - siehe Spec).
  const { error } = await supabase.from('clients').delete().eq('id', id)
  if (error) {
    return { ok: false, reason: 'Der Kunde konnte nicht gelöscht werden.' }
  }
  revalidatePath('/kunden')
  revalidatePath('/dashboard')
  return { ok: true }
}

export async function createProject(
  clientId: string,
  values: unknown
): Promise<{ id: string } | { error: string }> {
  const parsed = projectSchema.safeParse(values)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Ungültige Eingabe.' }
  }
  const supabase = await requireAuth()

  const { data: project, error } = await supabase
    .from('projects')
    .insert({ client_id: clientId, name: parsed.data.name, notes: parsed.data.notes })
    .select('id')
    .single()

  if (error || !project) {
    return { error: 'Das Projekt konnte nicht angelegt werden.' }
  }
  revalidatePath(`/kunden/${clientId}`)
  revalidatePath('/dashboard')
  return { id: project.id }
}

export async function updateProject(
  id: string,
  clientId: string,
  values: unknown
): Promise<ActionResult> {
  const parsed = projectSchema.safeParse(values)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Ungültige Eingabe.' }
  }
  const supabase = await requireAuth()

  const { error } = await supabase
    .from('projects')
    .update({ name: parsed.data.name, notes: parsed.data.notes })
    .eq('id', id)

  if (error) {
    return { error: 'Das Projekt konnte nicht gespeichert werden.' }
  }
  revalidatePath(`/kunden/${clientId}`)
  revalidatePath(`/kunden/${clientId}/${id}`)
  revalidatePath('/dashboard')
}

export async function setProjectStatus(
  id: string,
  clientId: string,
  status: EntityStatus
): Promise<void> {
  const supabase = await requireAuth()
  await supabase.from('projects').update({ status }).eq('id', id)
  revalidatePath(`/kunden/${clientId}`)
  revalidatePath(`/kunden/${clientId}/${id}`)
  revalidatePath('/dashboard')
}

// Aktuell nie blockiert - siehe PROJ-17 Tech Design "Lösch-Schutzprüfung":
// es gibt noch keine abhaengigen Tabellen (Interview-Importe -> PROJ-3,
// Zugriffslinks -> PROJ-10). Eigene Funktion, damit spaetere Features hier
// einfach eine Bedingung ergaenzen koennen.
export async function deleteProject(id: string, clientId: string): Promise<DeleteResult> {
  const supabase = await requireAuth()
  const { error } = await supabase.from('projects').delete().eq('id', id)
  if (error) {
    return { ok: false, reason: 'Das Projekt konnte nicht gelöscht werden.' }
  }
  revalidatePath(`/kunden/${clientId}`)
  revalidatePath('/kunden')
  revalidatePath('/dashboard')
  return { ok: true }
}
