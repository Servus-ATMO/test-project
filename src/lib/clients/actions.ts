'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth/require-auth'
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

  // Sicherheitsbremse aus dem PROJ-17-Refine (2026-08-25): endgueltiges
  // Loeschen setzt voraus, dass der Kunde bereits archiviert ist - erzwingt
  // einen bewussten Zwischenschritt statt direktem Loeschen aus dem aktiven
  // Zustand. Serverseitig geprueft, auch wenn die UI die Option bereits
  // deaktiviert (Defense in Depth, gleiches Muster wie die Projekt-Zaehlung
  // unten).
  const { data: client } = await supabase
    .from('clients')
    .select('status')
    .eq('id', id)
    .maybeSingle()

  if (client?.status !== 'archived') {
    return {
      ok: false,
      reason: 'Der Kunde muss zuerst archiviert werden, bevor er endgültig gelöscht werden kann.',
    }
  }

  const { count } = await supabase
    .from('projects')
    .select('id', { count: 'exact', head: true })
    .eq('client_id', id)

  if ((count ?? 0) > 0) {
    return {
      ok: false,
      reason: `Dieser Kunde hat noch ${count} Projekt(e) — endgültiges Löschen ist erst möglich, wenn keine Projekte mehr vorhanden sind.`,
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

// Abhaengige-Daten-Pruefung aktuell nie blockierend - siehe PROJ-17 Tech
// Design "Lösch-Schutzprüfung": es gibt noch keine abhaengigen Tabellen
// (Interview-Importe -> PROJ-3, Zugriffslinks -> PROJ-10). Eigene Funktion,
// damit spaetere Features hier einfach eine weitere Bedingung ergaenzen
// koennen. Die Archiviert-Bedingung aus dem PROJ-17-Refine (2026-08-25) gilt
// unabhaengig davon bereits jetzt.
export async function deleteProject(id: string, clientId: string): Promise<DeleteResult> {
  const supabase = await requireAuth()

  const { data: project } = await supabase
    .from('projects')
    .select('status')
    .eq('id', id)
    .maybeSingle()

  if (project?.status !== 'archived') {
    return {
      ok: false,
      reason: 'Das Projekt muss zuerst archiviert werden, bevor es endgültig gelöscht werden kann.',
    }
  }

  // Erweiterung aus PROJ-3 (Import-Werkstatt): ein Projekt mit abgeschlossenem
  // Interview-Import gilt als "hat abhängige Daten" - siehe PROJ-17 Tech
  // Design "Lösch-Schutzprüfung" (bewusst als erweiterbarer Baustein angelegt).
  const { count: importCount } = await supabase
    .from('interview_imports')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', id)
  if ((importCount ?? 0) > 0) {
    return {
      ok: false,
      reason: 'Dieses Projekt hat einen Interview-Import — endgültiges Löschen ist nicht möglich.',
    }
  }

  const { error } = await supabase.from('projects').delete().eq('id', id)
  if (error) {
    return { ok: false, reason: 'Das Projekt konnte nicht gelöscht werden.' }
  }
  revalidatePath(`/kunden/${clientId}`)
  revalidatePath('/kunden')
  revalidatePath('/dashboard')
  return { ok: true }
}
