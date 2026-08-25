import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseEnv } from './env'

// Routen ohne Login erreichbar (siehe PROJ-2 Spec). Alles andere gilt als
// geschuetzt. /auth/confirm verifiziert selbst einen Einmal-Token und
// braucht daher keine bestehende Session.
const PUBLIC_PATHS = ['/login', '/passwort-vergessen', '/passwort-zuruecksetzen', '/auth/confirm']

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))
}

// Aktualisiert die Supabase-Session bei jedem Request und leitet nicht
// eingeloggte Nutzer auf geschuetzten Routen zu /login um, mit Ruecksprung-
// Parameter zur urspruenglich gewuenschten Seite (siehe PROJ-2 Spec).
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
  const { data } = await supabase.auth.getClaims()

  if (!data?.claims && !isPublicPath(request.nextUrl.pathname)) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.search = ''
    loginUrl.searchParams.set('redirect', request.nextUrl.pathname + request.nextUrl.search)
    return NextResponse.redirect(loginUrl)
  }

  // WICHTIG: supabaseResponse unveraendert zurueckgeben (oder Cookies wie hier
  // beschrieben uebernehmen), sonst laufen Browser- und Server-Session auseinander:
  // https://supabase.com/docs/guides/auth/server-side/nextjs
  return supabaseResponse
}
