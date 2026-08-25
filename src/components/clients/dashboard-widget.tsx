import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getRecentActivity } from '@/lib/clients/recent-activity'
import type { Client, Project } from '@/lib/clients/types'

interface DashboardWidgetProps {
  clients: Client[]
  projects: Project[]
}

export function DashboardWidget({ clients, projects }: DashboardWidgetProps) {
  if (clients.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Kunden</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Noch keine Kunden angelegt.</p>
          <Button asChild size="sm">
            <Link href="/kunden">Kunden anlegen</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  const activeProjectCount = projects.filter((p) => p.status === 'active').length
  const recent = getRecentActivity(clients, projects, 5)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Kunden</CardTitle>
        <Link href="/kunden" className="text-sm text-muted-foreground hover:underline">
          Alle Kunden ansehen →
        </Link>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {clients.length} {clients.length === 1 ? 'Kunde' : 'Kunden'}, {activeProjectCount}{' '}
          {activeProjectCount === 1 ? 'aktives Projekt' : 'aktive Projekte'}
        </p>
        <ul className="space-y-1">
          {recent.map((entry) => (
            <li key={entry.key} className="text-sm">
              <Link href={entry.href} className="hover:underline">
                {entry.label}
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
