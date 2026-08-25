import { describe, it, expect } from 'vitest'
import { getRecentActivity } from './recent-activity'
import type { Client, Project } from './types'

function makeClient(overrides: Partial<Client>): Client {
  return {
    id: 'client-1',
    companyName: 'Acme GmbH',
    contactName: '',
    contactEmail: 'a@example.com',
    notes: '',
    status: 'active',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function makeProject(overrides: Partial<Project>): Project {
  return {
    id: 'project-1',
    clientId: 'client-1',
    name: 'Projekt 1',
    status: 'active',
    notes: '',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('getRecentActivity', () => {
  it('returns an empty list when there is no data', () => {
    expect(getRecentActivity([], [])).toEqual([])
  })

  it('sorts clients and projects together by most recently updated first', () => {
    const clients = [
      makeClient({ id: 'c1', companyName: 'Erste Firma', updatedAt: '2026-01-01T00:00:00.000Z' }),
      makeClient({ id: 'c2', companyName: 'Zweite Firma', updatedAt: '2026-01-03T00:00:00.000Z' }),
    ]
    const projects = [
      makeProject({
        id: 'p1',
        clientId: 'c1',
        name: 'Projekt A',
        updatedAt: '2026-01-02T00:00:00.000Z',
      }),
    ]

    const result = getRecentActivity(clients, projects, 5)
    expect(result.map((r) => r.label)).toEqual(['Zweite Firma', 'Projekt A', 'Erste Firma'])
    expect(result[0].href).toBe('/kunden/c2')
    expect(result[1].href).toBe('/kunden/c1/p1')
  })

  it('respects the limit', () => {
    const clients = [
      makeClient({ id: 'c1', updatedAt: '2026-01-01T00:00:00.000Z' }),
      makeClient({ id: 'c2', updatedAt: '2026-01-02T00:00:00.000Z' }),
      makeClient({ id: 'c3', updatedAt: '2026-01-03T00:00:00.000Z' }),
    ]
    expect(getRecentActivity(clients, [], 2)).toHaveLength(2)
  })
})
