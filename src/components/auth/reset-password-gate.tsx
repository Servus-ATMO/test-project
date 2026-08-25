'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ResetPasswordForm } from './reset-password-form'

type GateState = 'checking' | 'ready' | 'invalid'

// Ohne Custom-SMTP laesst sich das Supabase-E-Mail-Template nicht anpassen,
// der Reset-Link bleibt beim Standard-{{ .ConfirmationURL }}. Der liefert die
// Session als URL-FRAGMENT (#access_token=...&refresh_token=...), nicht als
// Query-Param - Fragmente erreichen den Server nie, deshalb hier clientseitig
// verarbeiten und per setSession() als Cookie-Session etablieren (die
// @supabase/ssr-Browser-Client-Instanz nutzt Cookies statt localStorage,
// dieselbe Session ist danach auch serverseitig sichtbar).
export function ResetPasswordGate() {
  const [state, setState] = useState<GateState>('checking')
  const router = useRouter()

  useEffect(() => {
    let cancelled = false

    async function establishSession() {
      const supabase = createClient()

      const hash = window.location.hash.startsWith('#')
        ? window.location.hash.slice(1)
        : ''
      const params = new URLSearchParams(hash)
      const accessToken = params.get('access_token')
      const refreshToken = params.get('refresh_token')

      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })
        // Tokens nicht in URL/Browser-Verlauf stehen lassen.
        window.history.replaceState(null, '', window.location.pathname)
        if (!cancelled) setState(error ? 'invalid' : 'ready')
        return
      }

      // Kein Fragment: entweder bereits per /auth/confirm eingeloggt (falls
      // spaeter Custom-SMTP + angepasstes Template aktiv ist), oder Direktaufruf
      // ohne gueltigen Link.
      const { data } = await supabase.auth.getSession()
      if (!cancelled) setState(data.session ? 'ready' : 'invalid')
    }

    establishSession()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (state === 'invalid') {
      router.replace('/passwort-vergessen?error=expired_link')
    }
  }, [state, router])

  if (state === 'checking') {
    return <p className="text-sm text-muted-foreground">Lade…</p>
  }

  if (state === 'invalid') {
    return null
  }

  return <ResetPasswordForm />
}
