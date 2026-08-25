import type { Client, EntityStatus, Project } from './types'

// Gemeinsames Mapping DB-Zeile (snake_case) -> App-Typ (camelCase), von
// queries.ts (Lesen) und actions.ts (Schreiben/Rueckgabewerte) genutzt.

export interface ClientRow {
  id: string
  company_name: string
  contact_name: string
  contact_email: string
  notes: string
  status: EntityStatus
  created_at: string
  updated_at: string
}

export interface ProjectRow {
  id: string
  client_id: string
  name: string
  status: EntityStatus
  notes: string
  created_at: string
  updated_at: string
}

export function mapClientRow(row: ClientRow): Client {
  return {
    id: row.id,
    companyName: row.company_name,
    contactName: row.contact_name,
    contactEmail: row.contact_email,
    notes: row.notes,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function mapProjectRow(row: ProjectRow): Project {
  return {
    id: row.id,
    clientId: row.client_id,
    name: row.name,
    status: row.status,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}
