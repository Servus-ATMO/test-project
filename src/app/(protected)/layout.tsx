import { redirect } from 'next/navigation'
import { LogoutButton } from '@/components/auth/logout-button'
import { createClient } from '@/lib/supabase/server'

// Zusaetzliche serverseitige Absicherung neben dem Proxy (Defense in Depth,
// siehe Next.js Data-Security-Guide: Seiten-Redirects gelten nicht automatisch
// fuer Server Actions/andere Einstiegspunkte, daher hier erneut pruefen).
export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()

  if (!data?.claims) {
    redirect('/login')
  }

  const email = typeof data.claims.email === 'string' ? data.claims.email : undefined

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <span className="text-sm font-medium">Konzeptfäden</span>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            {email && <span>{email}</span>}
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  )
}
