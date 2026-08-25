import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { LoginForm } from '@/components/auth/login-form'
import { createClient } from '@/lib/supabase/server'
import { getSafeRedirectPath } from '@/lib/auth/redirect'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; reset?: string }>
}) {
  const params = await searchParams

  // Bereits eingeloggte Nutzer sehen das Formular nicht erneut (siehe Edge Cases)
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  if (data?.claims) {
    redirect(getSafeRedirectPath(params.redirect))
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Anmelden</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {params.reset === 'success' && (
            <Alert>
              <AlertDescription>
                Passwort erfolgreich geändert. Bitte melde dich mit dem neuen Passwort an.
              </AlertDescription>
            </Alert>
          )}
          <LoginForm redirectTo={params.redirect} />
        </CardContent>
      </Card>
    </div>
  )
}
