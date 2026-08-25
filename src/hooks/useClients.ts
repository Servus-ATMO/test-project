'use client'

import { useCallback, useEffect, useState } from 'react'
import type { Client, ClientInput, EntityStatus, Project, ProjectInput } from '@/lib/clients/types'

// Uebergangsweise localStorage statt Supabase: clients/projects-Tabellen aus dem
// PROJ-17-Tech-Design existieren erst nach /backend. Struktur (Felder, IDs,
// Zeitstempel) ist bereits 1:1 an das dortige Datenmodell angelehnt, damit das
// Ersetzen durch echte Supabase-Queries in /backend keine UI-Aenderung braucht.
const STORAGE_KEY = 'konzeptfaeden:kunden-projekte:v1'

interface StoredState {
  clients: Client[]
  projects: Project[]
}

function loadFromStorage(): StoredState {
  if (typeof window === 'undefined') return { clients: [], projects: [] }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return { clients: [], projects: [] }
    const parsed = JSON.parse(raw)
    return {
      clients: Array.isArray(parsed.clients) ? parsed.clients : [],
      projects: Array.isArray(parsed.projects) ? parsed.projects : [],
    }
  } catch {
    // Korrupte/fremde Daten im Storage -> sauber mit leerem Zustand starten,
    // statt die Seite mit einem Parse-Fehler abstuerzen zu lassen.
    return { clients: [], projects: [] }
  }
}

function generateId(): string {
  return crypto.randomUUID()
}

export interface DeleteResult {
  ok: boolean
  reason?: string
}

export interface RecentActivityEntry {
  key: string
  label: string
  href: string
  updatedAt: string
}

export function useClients() {
  const [clients, setClients] = useState<Client[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    // Absichtlich ein Effect, kein Lazy-Initializer: localStorage existiert
    // serverseitig nicht (SSR-Rendering wuerde mit leerem Zustand starten,
    // Hydration muesste sonst mit den echten Daten mismatchen). loaded steuert,
    // dass erst nach diesem Sync gerendert wird.
    const stored = loadFromStorage()
    /* eslint-disable react-hooks/set-state-in-effect */
    setClients(stored.clients)
    setProjects(stored.projects)
    setLoaded(true)
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [])

  useEffect(() => {
    if (!loaded) return
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ clients, projects }))
  }, [clients, projects, loaded])

  const checkDuplicateEmail = useCallback(
    (email: string, excludeClientId?: string): Client | undefined => {
      const normalized = email.trim().toLowerCase()
      return clients.find(
        (c) => c.id !== excludeClientId && c.contactEmail.toLowerCase() === normalized
      )
    },
    [clients]
  )

  const createClient = useCallback((input: ClientInput): { client: Client; project: Project } => {
    const now = new Date().toISOString()
    const client: Client = {
      id: generateId(),
      companyName: input.companyName,
      contactName: input.contactName,
      contactEmail: input.contactEmail,
      notes: input.notes,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    }
    // Automatisches erstes Projekt, Default-Name = Firmenname (siehe Tech Design) -
    // Nutzer landet direkt darin und kann es sofort umbenennen.
    const project: Project = {
      id: generateId(),
      clientId: client.id,
      name: input.companyName,
      status: 'active',
      notes: '',
      createdAt: now,
      updatedAt: now,
    }
    setClients((prev) => [...prev, client])
    setProjects((prev) => [...prev, project])
    return { client, project }
  }, [])

  const updateClient = useCallback((id: string, input: ClientInput) => {
    setClients((prev) =>
      prev.map((c) =>
        c.id === id
          ? { ...c, ...input, updatedAt: new Date().toISOString() }
          : c
      )
    )
  }, [])

  const setClientStatus = useCallback((id: string, status: EntityStatus) => {
    setClients((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status, updatedAt: new Date().toISOString() } : c))
    )
  }, [])

  const getProjectsForClient = useCallback(
    (clientId: string): Project[] => projects.filter((p) => p.clientId === clientId),
    [projects]
  )

  const canDeleteClient = useCallback(
    (id: string): boolean => projects.filter((p) => p.clientId === id).length === 0,
    [projects]
  )

  const deleteClient = useCallback(
    (id: string): DeleteResult => {
      const projectCount = projects.filter((p) => p.clientId === id).length
      if (projectCount > 0) {
        return {
          ok: false,
          reason: `Dieser Kunde hat noch ${projectCount} Projekt(e) — endgültiges Löschen ist erst möglich, wenn keine Projekte mehr vorhanden sind. Alternativ kann der Kunde archiviert werden.`,
        }
      }
      setClients((prev) => prev.filter((c) => c.id !== id))
      return { ok: true }
    },
    [projects]
  )

  const createProject = useCallback((clientId: string, input: ProjectInput): Project => {
    const now = new Date().toISOString()
    const project: Project = {
      id: generateId(),
      clientId,
      name: input.name,
      status: 'active',
      notes: input.notes,
      createdAt: now,
      updatedAt: now,
    }
    setProjects((prev) => [...prev, project])
    return project
  }, [])

  const updateProject = useCallback((id: string, input: ProjectInput) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...input, updatedAt: new Date().toISOString() } : p))
    )
  }, [])

  const setProjectStatus = useCallback((id: string, status: EntityStatus) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status, updatedAt: new Date().toISOString() } : p))
    )
  }, [])

  // Aktuell nie blockiert: es gibt noch keine abhaengigen Tabellen
  // (Interview-Importe -> PROJ-3, Zugriffslinks -> PROJ-10). Eigenstaendige
  // Funktion bewusst so angelegt, damit spaetere Features hier einfach eine
  // Bedingung ergaenzen koennen, ohne den Loeschablauf neu zu entwerfen
  // (siehe PROJ-17 Tech Design "Lösch-Schutzprüfung").
  const canDeleteProject = useCallback((_id: string): boolean => true, [])

  const deleteProject = useCallback((id: string): DeleteResult => {
    setProjects((prev) => prev.filter((p) => p.id !== id))
    return { ok: true }
  }, [])

  const getClientById = useCallback(
    (id: string): Client | undefined => clients.find((c) => c.id === id),
    [clients]
  )

  const getProjectById = useCallback(
    (id: string): Project | undefined => projects.find((p) => p.id === id),
    [projects]
  )

  const recentActivity = useCallback(
    (limit = 5): RecentActivityEntry[] => {
      const clientEntries: RecentActivityEntry[] = clients.map((c) => ({
        key: `client-${c.id}`,
        label: c.companyName,
        href: `/kunden/${c.id}`,
        updatedAt: c.updatedAt,
      }))
      const projectEntries: RecentActivityEntry[] = projects.map((p) => ({
        key: `project-${p.id}`,
        label: p.name,
        href: `/kunden/${p.clientId}/${p.id}`,
        updatedAt: p.updatedAt,
      }))
      return [...clientEntries, ...projectEntries]
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .slice(0, limit)
    },
    [clients, projects]
  )

  return {
    clients,
    projects,
    loaded,
    checkDuplicateEmail,
    createClient,
    updateClient,
    setClientStatus,
    deleteClient,
    canDeleteClient,
    getProjectsForClient,
    createProject,
    updateProject,
    setProjectStatus,
    deleteProject,
    canDeleteProject,
    getClientById,
    getProjectById,
    recentActivity,
  }
}
