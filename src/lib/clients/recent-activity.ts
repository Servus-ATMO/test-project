import type { Client, Project } from './types'

export interface RecentActivityEntry {
  key: string
  label: string
  href: string
  updatedAt: string
}

export function getRecentActivity(
  clients: Client[],
  projects: Project[],
  limit = 5
): RecentActivityEntry[] {
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
}
