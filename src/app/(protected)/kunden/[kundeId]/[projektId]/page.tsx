import { notFound } from 'next/navigation'
import { ProjectDetailView } from '@/components/clients/project-detail-view'
import { getClientById, getProjectById } from '@/lib/clients/queries'
import { getImportForProject } from '@/lib/imports/queries'

export default async function ProjektDetailPage({
  params,
}: {
  params: Promise<{ kundeId: string; projektId: string }>
}) {
  const { kundeId, projektId } = await params
  const client = await getClientById(kundeId)
  const project = await getProjectById(projektId)
  if (!client || !project || project.clientId !== kundeId) notFound()

  const parsedImport = await getImportForProject(projektId)

  return <ProjectDetailView client={client} project={project} parsedImport={parsedImport} />
}
