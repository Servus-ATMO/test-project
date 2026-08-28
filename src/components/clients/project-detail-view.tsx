'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ProjectFormDialog } from './project-form-dialog'
import { ImportPanel } from '@/components/imports/import-panel'
import { EnrichmentPanel } from '@/components/enrichment/enrichment-panel'
import type { Client, Project } from '@/lib/clients/types'
import type { ParsedImport } from '@/lib/imports/types'
import type { Enrichment } from '@/lib/enrichment/types'

interface ProjectDetailViewProps {
  client: Client
  project: Project
  parsedImport: ParsedImport | null
  enrichment: Enrichment | null
}

export function ProjectDetailView({ client, project, parsedImport, enrichment }: ProjectDetailViewProps) {
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
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href={`/kunden/${client.id}/${project.id}/graph`}>Konzept-Graph</Link>
            </Button>
            <ProjectFormDialog
              mode="edit"
              clientId={client.id}
              project={project}
              trigger={<Button variant="outline">Bearbeiten</Button>}
            />
          </div>
        </CardHeader>
        {project.notes && (
          <CardContent>
            <p className="text-sm text-muted-foreground">{project.notes}</p>
          </CardContent>
        )}
      </Card>

      <ImportPanel clientId={client.id} projectId={project.id} initialImport={parsedImport} />

      <EnrichmentPanel
        clientId={client.id}
        projectId={project.id}
        projectName={project.name}
        hasImport={parsedImport !== null}
        initialEnrichment={enrichment}
      />
    </div>
  )
}
