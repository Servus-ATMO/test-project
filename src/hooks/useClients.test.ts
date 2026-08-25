import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useClients } from './useClients'

describe('useClients', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('starts empty when nothing is stored', async () => {
    const { result } = renderHook(() => useClients())
    await waitFor(() => expect(result.current.loaded).toBe(true))
    expect(result.current.clients).toEqual([])
    expect(result.current.projects).toEqual([])
  })

  it('createClient also creates a first project named after the company', async () => {
    const { result } = renderHook(() => useClients())
    await waitFor(() => expect(result.current.loaded).toBe(true))

    act(() => {
      result.current.createClient({
        companyName: 'Acme GmbH',
        contactName: 'Max Mustermann',
        contactEmail: 'max@acme.example',
        notes: '',
      })
    })

    expect(result.current.clients).toHaveLength(1)
    expect(result.current.clients[0].companyName).toBe('Acme GmbH')
    expect(result.current.projects).toHaveLength(1)
    expect(result.current.projects[0].name).toBe('Acme GmbH')
    expect(result.current.projects[0].clientId).toBe(result.current.clients[0].id)
  })

  it('checkDuplicateEmail is case-insensitive and finds an existing client', async () => {
    const { result } = renderHook(() => useClients())
    await waitFor(() => expect(result.current.loaded).toBe(true))

    act(() => {
      result.current.createClient({
        companyName: 'Acme GmbH',
        contactName: '',
        contactEmail: 'kontakt@acme.example',
        notes: '',
      })
    })

    const duplicate = result.current.checkDuplicateEmail('KONTAKT@acme.example')
    expect(duplicate?.companyName).toBe('Acme GmbH')
    expect(result.current.checkDuplicateEmail('nobody@example.com')).toBeUndefined()
  })

  it('blocks hard delete of a client that still has projects', async () => {
    const { result } = renderHook(() => useClients())
    await waitFor(() => expect(result.current.loaded).toBe(true))

    act(() => {
      result.current.createClient({
        companyName: 'Acme GmbH',
        contactName: '',
        contactEmail: 'a@acme.example',
        notes: '',
      })
    })
    const clientId = result.current.clients[0].id

    expect(result.current.canDeleteClient(clientId)).toBe(false)

    let deleteResult: { ok: boolean; reason?: string } | undefined
    act(() => {
      deleteResult = result.current.deleteClient(clientId)
    })
    expect(deleteResult?.ok).toBe(false)
    expect(result.current.clients).toHaveLength(1)
  })

  it('allows hard delete of a client once it has no projects left', async () => {
    const { result } = renderHook(() => useClients())
    await waitFor(() => expect(result.current.loaded).toBe(true))

    act(() => {
      result.current.createClient({
        companyName: 'Acme GmbH',
        contactName: '',
        contactEmail: 'a@acme.example',
        notes: '',
      })
    })
    const clientId = result.current.clients[0].id
    const projectId = result.current.projects[0].id

    act(() => {
      result.current.deleteProject(projectId)
    })
    expect(result.current.canDeleteClient(clientId)).toBe(true)

    let deleteResult: { ok: boolean; reason?: string } | undefined
    act(() => {
      deleteResult = result.current.deleteClient(clientId)
    })
    expect(deleteResult?.ok).toBe(true)
    expect(result.current.clients).toHaveLength(0)
  })

  it('archiving a client leaves its projects untouched', async () => {
    const { result } = renderHook(() => useClients())
    await waitFor(() => expect(result.current.loaded).toBe(true))

    act(() => {
      result.current.createClient({
        companyName: 'Acme GmbH',
        contactName: '',
        contactEmail: 'a@acme.example',
        notes: '',
      })
    })
    const clientId = result.current.clients[0].id

    act(() => {
      result.current.setClientStatus(clientId, 'archived')
    })

    expect(result.current.clients[0].status).toBe('archived')
    expect(result.current.projects[0].status).toBe('active')
  })

  it('persists state across remounts via localStorage', async () => {
    const { result, unmount } = renderHook(() => useClients())
    await waitFor(() => expect(result.current.loaded).toBe(true))

    act(() => {
      result.current.createClient({
        companyName: 'Acme GmbH',
        contactName: '',
        contactEmail: 'a@acme.example',
        notes: '',
      })
    })
    unmount()

    const second = renderHook(() => useClients())
    await waitFor(() => expect(second.result.current.loaded).toBe(true))
    expect(second.result.current.clients).toHaveLength(1)
    expect(second.result.current.clients[0].companyName).toBe('Acme GmbH')
  })

  it('recentActivity returns clients and projects sorted by most recently updated', async () => {
    const { result } = renderHook(() => useClients())
    await waitFor(() => expect(result.current.loaded).toBe(true))

    act(() => {
      result.current.createClient({
        companyName: 'Erste Firma',
        contactName: '',
        contactEmail: 'a@example.com',
        notes: '',
      })
    })
    // Kurze echte Wartezeit, damit sich die ISO-Zeitstempel unterscheiden -
    // sonst waere die Sortierreihenfolge bei Gleichstand vom stabilen Sort
    // abhaengig statt vom tatsaechlichen "zuletzt bearbeitet".
    await new Promise((r) => setTimeout(r, 5))
    act(() => {
      result.current.createClient({
        companyName: 'Zweite Firma',
        contactName: '',
        contactEmail: 'b@example.com',
        notes: '',
      })
    })

    const recent = result.current.recentActivity(5)
    // Jede createClient() erzeugt Kunde + Projekt -> 4 Eintraege insgesamt,
    // die zuletzt angelegte ("Zweite Firma") muss zuerst kommen.
    expect(recent).toHaveLength(4)
    expect(recent[0].label).toBe('Zweite Firma')
  })
})
