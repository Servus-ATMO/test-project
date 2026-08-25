'use client'

import { useRouter } from 'next/navigation'
import { MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { ProjectFormDialog } from './project-form-dialog'
import { DeleteAlertDialog } from './delete-alert-dialog'
import { useClients } from '@/hooks/useClients'

export function ClientDetailView({ clientId }: { clientId: string }) {
  const router = useRouter()
  const {
    loaded,
    getClientById,
    getProjectsForClient,
    updateClient,
    setClientStatus,
    checkDuplicateEmail,
    createProject,
    updateProject,
    setProjectStatus,
    deleteProject,
    canDeleteProject,
  } = useClients()

  if (!loaded) return null

  const client = getClientById(clientId)

  if (!client) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">Dieser Kunde wurde nicht gefunden.</p>
        <Button variant="outline" onClick={() => router.push('/kunden')}>
          Zurück zur Kunden-Übersicht
        </Button>
      </div>
    )
  }

  const clientProjects = getProjectsForClient(clientId).sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt)
  )

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              {client.companyName}
              <Badge variant={client.status === 'active' ? 'default' : 'secondary'}>
                {client.status === 'active' ? 'Aktiv' : 'Archiviert'}
              </Badge>
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {client.contactName ? `${client.contactName} · ` : ''}
              {client.contactEmail}
            </p>
          </div>
          <ClientFormDialog
            mode="edit"
            client={client}
            checkDuplicateEmail={checkDuplicateEmail}
            onSubmit={(values) => updateClient(client.id, values)}
            trigger={<Button variant="outline">Bearbeiten</Button>}
          />
        </CardHeader>
        {client.notes && (
          <CardContent>
            <p className="text-sm text-muted-foreground">{client.notes}</p>
          </CardContent>
        )}
      </Card>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Projekte</h2>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              setClientStatus(client.id, client.status === 'active' ? 'archived' : 'active')
            }
          >
            Kunde {client.status === 'active' ? 'archivieren' : 'reaktivieren'}
          </Button>
          <ProjectFormDialog
            mode="create"
            onSubmit={(values) => {
              const project = createProject(clientId, values)
              router.push(`/kunden/${clientId}/${project.id}`)
            }}
            trigger={<Button>Neues Projekt</Button>}
          />
        </div>
      </div>

      {clientProjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
          <p className="text-muted-foreground">Noch keine Projekte für diesen Kunden.</p>
          <ProjectFormDialog
            mode="create"
            onSubmit={(values) => {
              const project = createProject(clientId, values)
              router.push(`/kunden/${clientId}/${project.id}`)
            }}
            trigger={<Button className="mt-4">Erstes Projekt anlegen</Button>}
          />
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Projektname</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {clientProjects.map((project) => (
              <TableRow
                key={project.id}
                className="cursor-pointer"
                onClick={() => router.push(`/kunden/${clientId}/${project.id}`)}
              >
                <TableCell className="font-medium">{project.name}</TableCell>
                <TableCell>
                  <Badge variant={project.status === 'active' ? 'default' : 'secondary'}>
                    {project.status === 'active' ? 'Aktiv' : 'Archiviert'}
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
                      <ProjectFormDialog
                        mode="edit"
                        project={project}
                        onSubmit={(values) => updateProject(project.id, values)}
                        trigger={
                          <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                            Bearbeiten
                          </DropdownMenuItem>
                        }
                      />
                      <DropdownMenuItem
                        onClick={() =>
                          setProjectStatus(
                            project.id,
                            project.status === 'active' ? 'archived' : 'active'
                          )
                        }
                      >
                        {project.status === 'active' ? 'Archivieren' : 'Reaktivieren'}
                      </DropdownMenuItem>
                      {canDeleteProject(project.id) ? (
                        <DeleteAlertDialog
                          entityLabel={project.name}
                          onConfirm={() => deleteProject(project.id)}
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
                        <DropdownMenuItem disabled>Endgültig löschen</DropdownMenuItem>
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
