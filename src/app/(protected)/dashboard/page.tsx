import { DashboardWidget } from '@/components/clients/dashboard-widget'

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Willkommen</h1>
      <DashboardWidget />
    </div>
  )
}
