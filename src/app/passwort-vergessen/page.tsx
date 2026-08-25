import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form'

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const params = await searchParams

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Passwort vergessen?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {params.error === 'expired_link' && (
            <Alert variant="destructive">
              <AlertDescription>
                Der Link ist abgelaufen oder wurde bereits verwendet. Fordere unten einen
                neuen an.
              </AlertDescription>
            </Alert>
          )}
          <ForgotPasswordForm />
          <p className="text-center text-sm text-muted-foreground">
            <Link href="/login" className="hover:underline">
              Zurück zum Login
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
