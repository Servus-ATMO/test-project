import { DashboardWidget } from '@/components/clients/dashboard-widget'
import { getClients, getAllProjects } from '@/lib/clients/queries'

export default async function DashboardPage() {
  const [clients, projects] = await Promise.all([getClients(), getAllProjects()])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Willkommen</h1>
      <DashboardWidget clients={clients} projects={projects} />
    </div>
  )
}
