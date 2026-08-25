'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ProjectFormDialog } from './project-form-dialog'
import type { Client, Project } from '@/lib/clients/types'

interface ProjectDetailViewProps {
  client: Client
  project: Project
}

export function ProjectDetailView({ client, project }: ProjectDetailViewProps) {
  return (
    <div className="space-y-6">
      <Link
        href={`/kunden/${client.id}`}
        className="text-sm text-muted-foreground hover:underline"
      >
        ← {client.companyName}
      </Link>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              {project.name}
              <Badge variant={project.status === 'active' ? 'default' : 'secondary'}>
                {project.status === 'active' ? 'Aktiv' : 'Archiviert'}
              </Badge>
            </CardTitle>
          </div>
          <ProjectFormDialog
            mode="edit"
            clientId={client.id}
            project={project}
            trigger={<Button variant="outline">Bearbeiten</Button>}
          />
        </CardHeader>
        {project.notes && (
          <CardContent>
            <p className="text-sm text-muted-foreground">{project.notes}</p>
          </CardContent>
        )}
      </Card>

      <Alert>
        <AlertDescription>
          Interview-Import, Konzept-Graph und Wireframe folgen mit PROJ-3 ff. Diese Seite ist
          bereits der spätere Einstiegspunkt dafür.
        </AlertDescription>
      </Alert>
    </div>
  )
}
