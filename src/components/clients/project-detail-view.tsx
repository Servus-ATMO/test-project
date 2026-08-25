'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ProjectFormDialog } from './project-form-dialog'
import { useClients } from '@/hooks/useClients'

export function ProjectDetailView({
  clientId,
  projectId,
}: {
  clientId: string
  projectId: string
}) {
  const router = useRouter()
  const { loaded, getClientById, getProjectById, updateProject } = useClients()

  if (!loaded) return null

  const client = getClientById(clientId)
  const project = getProjectById(projectId)

  if (!client || !project || project.clientId !== clientId) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">Dieses Projekt wurde nicht gefunden.</p>
        <Button variant="outline" onClick={() => router.push('/kunden')}>
          Zurück zur Kunden-Übersicht
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Link href={`/kunden/${clientId}`} className="text-sm text-muted-foreground hover:underline">
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
            project={project}
            onSubmit={(values) => updateProject(project.id, values)}
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
