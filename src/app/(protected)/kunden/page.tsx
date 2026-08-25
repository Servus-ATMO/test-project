import { ClientList } from '@/components/clients/client-list'

export default function KundenPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Kunden</h1>
      <ClientList />
    </div>
  )
}
