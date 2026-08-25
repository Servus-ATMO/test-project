import { notFound } from 'next/navigation'
import { ClientDetailView } from '@/components/clients/client-detail-view'
import { getClientById, getProjectsForClient } from '@/lib/clients/queries'

export default async function KundeDetailPage({
  params,
}: {
  params: Promise<{ kundeId: string }>
}) {
  const { kundeId } = await params
  const client = await getClientById(kundeId)
  if (!client) notFound()

  const projects = await getProjectsForClient(kundeId)

  return <ClientDetailView client={client} projects={projects} />
}
