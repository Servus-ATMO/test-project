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
import { setClientStatus, setProjectStatus, deleteProject } from '@/lib/clients/actions'
import type { Client, Project } from '@/lib/clients/types'

interface ClientDetailViewProps {
  client: Client
  projects: Project[]
}

export function ClientDetailView({ client, projects }: ClientDetailViewProps) {
  const router = useRouter()

  // Spiegelt die serverseitige Pruefung in deleteProject() - erst
  // archivieren, dann loeschen (PROJ-17-Refine 2026-08-25).
  const getProjectDeleteBlockReason = (project: Project): string | null => {
    if (project.status !== 'archived') {
      return 'Muss zuerst archiviert werden, bevor es endgültig gelöscht werden kann.'
    }
    return null
  }

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
            onClick={async () => {
              await setClientStatus(client.id, client.status === 'active' ? 'archived' : 'active')
              router.refresh()
            }}
          >
            Kunde {client.status === 'active' ? 'archivieren' : 'reaktivieren'}
          </Button>
          <ProjectFormDialog
            mode="create"
            clientId={client.id}
            onCreated={(projectId) => router.push(`/kunden/${client.id}/${projectId}`)}
            trigger={<Button>Neues Projekt</Button>}
          />
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
          <p className="text-muted-foreground">Noch keine Projekte für diesen Kunden.</p>
          <ProjectFormDialog
            mode="create"
            clientId={client.id}
            onCreated={(projectId) => router.push(`/kunden/${client.id}/${projectId}`)}
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
            {projects.map((project) => (
              <TableRow
                key={project.id}
                className="cursor-pointer"
                onClick={() => router.push(`/kunden/${client.id}/${project.id}`)}
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
                        clientId={client.id}
                        project={project}
                        trigger={
                          <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                            Bearbeiten
                          </DropdownMenuItem>
                        }
                      />
                      <DropdownMenuItem
                        onClick={async () => {
                          await setProjectStatus(
                            project.id,
                            client.id,
                            project.status === 'active' ? 'archived' : 'active'
                          )
                          router.refresh()
                        }}
                      >
                        {project.status === 'active' ? 'Archivieren' : 'Reaktivieren'}
                      </DropdownMenuItem>
                      {getProjectDeleteBlockReason(project) === null ? (
                        <DeleteAlertDialog
                          entityLabel={project.name}
                          onConfirm={async () => {
                            await deleteProject(project.id, client.id)
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
                        <DropdownMenuItem
                          disabled
                          title={getProjectDeleteBlockReason(project) ?? undefined}
                        >
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
