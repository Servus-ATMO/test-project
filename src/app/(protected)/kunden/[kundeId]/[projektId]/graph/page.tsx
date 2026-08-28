import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { GraphView } from '@/components/graph/graph-view'
import { getClientById, getProjectById } from '@/lib/clients/queries'
import { getImportForProject } from '@/lib/imports/queries'
import { getEnrichmentForProject } from '@/lib/enrichment/queries'

export default async function GraphPage({
  params,
}: {
  params: Promise<{ kundeId: string; projektId: string }>
}) {
  const { kundeId, projektId } = await params
  const client = await getClientById(kundeId)
  const project = await getProjectById(projektId)
  if (!client || !project || project.clientId !== kundeId) notFound()

  const [parsedImport, enrichment] = await Promise.all([
    getImportForProject(projektId),
    getEnrichmentForProject(projektId),
  ])

  return (
    <div className="space-y-6">
      <Link
        href={`/kunden/${kundeId}/${projektId}`}
        className="text-sm text-muted-foreground hover:underline"
      >
        ← {project.name}
      </Link>

      <div>
        <h1 className="text-lg font-semibold">Konzept-Graph</h1>
        <p className="text-sm text-muted-foreground">
          {client.companyName} — {project.name}
        </p>
      </div>

      {!parsedImport && (
        <div className="space-y-3 rounded-lg border p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Für dieses Projekt liegt noch kein Interview-Import vor. Der Graph braucht die
            importierten Journey- und Konzeptdaten als Grundlage.
          </p>
          <Button asChild>
            <Link href={`/kunden/${kundeId}/${projektId}`}>Zur Import-Werkstatt</Link>
          </Button>
        </div>
      )}

      {parsedImport && !enrichment && (
        <div className="space-y-3 rounded-lg border p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Der Import liegt vor, aber es wurde noch keine KI-Anreicherung durchgeführt.
            Themenblöcke und Content-Blöcke lassen sich ohne die Anreicherung noch nicht
            miteinander verbinden.
          </p>
          <Button asChild>
            <Link href={`/kunden/${kundeId}/${projektId}`}>Zur KI-Anreicherung</Link>
          </Button>
        </div>
      )}

      {parsedImport && enrichment && <GraphView parsedImport={parsedImport} enrichment={enrichment} />}
    </div>
  )
}
