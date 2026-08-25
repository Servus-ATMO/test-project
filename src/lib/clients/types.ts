export type EntityStatus = 'active' | 'archived'

export interface Client {
  id: string
  companyName: string
  contactName: string
  contactEmail: string
  notes: string
  status: EntityStatus
  createdAt: string
  updatedAt: string
}

export interface Project {
  id: string
  clientId: string
  name: string
  status: EntityStatus
  notes: string
  createdAt: string
  updatedAt: string
}

export interface ClientInput {
  companyName: string
  contactName: string
  contactEmail: string
  notes: string
}

export interface ProjectInput {
  name: string
  notes: string
}
