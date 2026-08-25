import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ResetPasswordForm } from '@/components/auth/reset-password-form'
import { createClient } from '@/lib/supabase/server'

export default async function ResetPasswordPage() {
  // Diese Seite ist nur ueber den Link aus /auth/confirm erreichbar, der eine
  // Recovery-Session herstellt. Ohne aktive Session (z. B. Direktaufruf, oder
  // Link bereits verwendet/abgelaufen) zurueck zu "Passwort vergessen".
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  if (!data?.claims) {
    redirect('/passwort-vergessen?error=expired_link')
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Neues Passwort festlegen</CardTitle>
        </CardHeader>
        <CardContent>
          <ResetPasswordForm />
        </CardContent>
      </Card>
    </div>
  )
}
