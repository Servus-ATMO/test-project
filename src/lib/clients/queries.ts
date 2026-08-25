import { createClient } from '@/lib/supabase/server'
import { mapClientRow, mapProjectRow, type ClientRow, type ProjectRow } from './db'
import type { Client, Project } from './types'

// Nur fuer Server Components gedacht (liest per Server-seitigem Supabase-
// Client). Mutationen laufen ueber actions.ts.

export async function getClients(): Promise<Client[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .order('updated_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data as ClientRow[]).map(mapClientRow)
}

export async function getClientById(id: string): Promise<Client | undefined> {
  const supabase = await createClient()
  const { data, error } = await supabase.from('clients').select('*').eq('id', id).maybeSingle()
  if (error) throw new Error(error.message)
  return data ? mapClientRow(data as ClientRow) : undefined
}

export async function getAllProjects(): Promise<Project[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('updated_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data as ProjectRow[]).map(mapProjectRow)
}

export async function getProjectsForClient(clientId: string): Promise<Project[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('client_id', clientId)
    .order('updated_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data as ProjectRow[]).map(mapProjectRow)
}

export async function getProjectById(id: string): Promise<Project | undefined> {
  const supabase = await createClient()
  const { data, error } = await supabase.from('projects').select('*').eq('id', id).maybeSingle()
  if (error) throw new Error(error.message)
  return data ? mapProjectRow(data as ProjectRow) : undefined
}
