import { type EmailOtpType } from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSafeRedirectPath } from '@/lib/auth/redirect'

// Ziel des Links aus der Supabase-Reset-E-Mail (siehe requestPasswordReset in
// src/lib/auth/actions.ts). Tauscht token_hash gegen eine aktive Session und
// leitet danach zur eigentlichen Passwort-zuruecksetzen-Seite weiter.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = getSafeRedirectPath(searchParams.get('next'), '/passwort-zuruecksetzen')

  if (token_hash && type) {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({ type, token_hash })

    if (!error) {
      const redirectTo = request.nextUrl.clone()
      redirectTo.pathname = next
      redirectTo.search = ''
      return NextResponse.redirect(redirectTo)
    }
  }

  // Abgelaufener/ungueltiger/bereits benutzter Link (siehe PROJ-2 Edge Cases)
  const errorRedirect = request.nextUrl.clone()
  errorRedirect.pathname = '/passwort-vergessen'
  errorRedirect.search = '?error=expired_link'
  return NextResponse.redirect(errorRedirect)
}
