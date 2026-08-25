import { ClientDetailView } from '@/components/clients/client-detail-view'

export default async function KundeDetailPage({
  params,
}: {
  params: Promise<{ kundeId: string }>
}) {
  const { kundeId } = await params
  return <ClientDetailView clientId={kundeId} />
}
