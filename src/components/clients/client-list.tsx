'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MoreHorizontal, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ClientFormDialog } from './client-form-dialog'
import { DeleteAlertDialog } from './delete-alert-dialog'
import { deleteClient, setClientStatus } from '@/lib/clients/actions'
import type { Client, Project } from '@/lib/clients/types'

interface ClientListProps {
  clients: Client[]
  projects: Project[]
}

export function ClientList({ clients, projects }: ClientListProps) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [showArchived, setShowArchived] = useState(false)

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return clients
      .filter((c) => (showArchived ? true : c.status === 'active'))
      .filter(
        (c) =>
          term === '' ||
          c.companyName.toLowerCase().includes(term) ||
          c.contactName.toLowerCase().includes(term)
      )
  }, [clients, search, showArchived])

  const projectCount = (clientId: string) => projects.filter((p) => p.clientId === clientId).length

  // Spiegelt die serverseitige Pruefung in deleteClient() - erst archivieren,
  // dann loeschen (PROJ-17-Refine 2026-08-25), danach erst die Projekt-Anzahl.
  const getDeleteBlockReason = (client: Client): string | null => {
    if (client.status !== 'archived') {
      return 'Muss zuerst archiviert werden, bevor er endgültig gelöscht werden kann.'
    }
    if (projectCount(client.id) > 0) {
      return 'Kann nicht gelöscht werden, solange der Kunde noch Projekte hat.'
    }
    return null
  }

  if (clients.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
        <p className="text-muted-foreground">Noch keine Kunden angelegt.</p>
        <ClientFormDialog
          mode="create"
          trigger={<Button className="mt-4">Ersten Kunden anlegen</Button>}
        />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Kunden suchen…"
              className="w-64 pl-8"
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch id="show-archived" checked={showArchived} onCheckedChange={setShowArchived} />
            <Label htmlFor="show-archived" className="text-sm font-normal">
              Archiviert anzeigen
            </Label>
          </div>
        </div>
        <ClientFormDialog mode="create" trigger={<Button>Neuer Kunde</Button>} />
      </div>

      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Keine Kunden gefunden für „{search}&quot;.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Firmenname</TableHead>
              <TableHead>Ansprechpartner</TableHead>
              <TableHead>Projekte</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((client) => (
              <TableRow
                key={client.id}
                className="cursor-pointer"
                onClick={() => router.push(`/kunden/${client.id}`)}
              >
                <TableCell className="font-medium">{client.companyName}</TableCell>
                <TableCell className="text-muted-foreground">
                  {client.contactName || client.contactEmail}
                </TableCell>
                <TableCell>{projectCount(client.id)}</TableCell>
                <TableCell>
                  <Badge variant={client.status === 'active' ? 'default' : 'secondary'}>
                    {client.status === 'active' ? 'Aktiv' : 'Archiviert'}
                  </Badge>
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Aktionen</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <ClientFormDialog
                        mode="edit"
                        client={client}
                        trigger={
                          <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                            Bearbeiten
                          </DropdownMenuItem>
                        }
                      />
                      <DropdownMenuItem
                        onClick={async () => {
                          await setClientStatus(
                            client.id,
                            client.status === 'active' ? 'archived' : 'active'
                          )
                          router.refresh()
                        }}
                      >
                        {client.status === 'active' ? 'Archivieren' : 'Reaktivieren'}
                      </DropdownMenuItem>
                      {getDeleteBlockReason(client) === null ? (
                        <DeleteAlertDialog
                          entityLabel={client.companyName}
                          onConfirm={async () => {
                            await deleteClient(client.id)
                            router.refresh()
                          }}
                          trigger={
                            <DropdownMenuItem
                              onSelect={(e) => e.preventDefault()}
                              className="text-destructive focus:text-destructive"
                            >
                              Endgültig löschen
                            </DropdownMenuItem>
                          }
                        />
                      ) : (
                        <DropdownMenuItem disabled title={getDeleteBlockReason(client) ?? undefined}>
                          Endgültig löschen
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
