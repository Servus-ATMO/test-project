import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseEnv } from './env'

// Aktualisiert die Supabase-Session bei jedem Request. Enthaelt bewusst noch
// KEINE Weiterleitung fuer nicht eingeloggte Nutzer - welche Routen ueberhaupt
// eine Anmeldung erfordern, entscheidet PROJ-2 (Agentur-Login), sobald es eine
// /login-Seite gibt. Siehe PROJ-1 Edge Cases.
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })
  const { url, publishableKey } = getSupabaseEnv()

  // Nicht in einer globalen Variable halten - bei jedem Request neu erzeugen.
  const supabase = createServerClient(
    url,
    publishableKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
          Object.entries(headers).forEach(([key, value]) =>
            supabaseResponse.headers.set(key, value)
          )
        },
      },
    }
  )

  // Nichts zwischen createServerClient und getClaims() ausfuehren - ein einfacher
  // Fehler hier macht "Nutzer werden zufaellig ausgeloggt"-Bugs sehr schwer zu debuggen.
  // getClaims() validiert das JWT serverseitig; getSession() waere dafuer nicht sicher.
  await supabase.auth.getClaims()

  // WICHTIG: supabaseResponse unveraendert zurueckgeben (oder Cookies wie hier
  // beschrieben uebernehmen), sonst laufen Browser- und Server-Session auseinander:
  // https://supabase.com/docs/guides/auth/server-side/nextjs
  return supabaseResponse
}
