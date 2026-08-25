import { ProjectDetailView } from '@/components/clients/project-detail-view'

export default async function ProjektDetailPage({
  params,
}: {
  params: Promise<{ kundeId: string; projektId: string }>
}) {
  const { kundeId, projektId } = await params
  return <ProjectDetailView clientId={kundeId} projectId={projektId} />
}
