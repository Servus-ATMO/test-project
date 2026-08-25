import { ClientList } from '@/components/clients/client-list'
import { getClients, getAllProjects } from '@/lib/clients/queries'

export default async function KundenPage() {
  const [clients, projects] = await Promise.all([getClients(), getAllProjects()])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Kunden</h1>
      <ClientList clients={clients} projects={projects} />
    </div>
  )
}
