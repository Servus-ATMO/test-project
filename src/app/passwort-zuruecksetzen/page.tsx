import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ResetPasswordGate } from '@/components/auth/reset-password-gate'

// Kein serverseitiger Session-Check hier: Ohne Custom-SMTP liefert der
// Supabase-Standard-Reset-Link die Session als URL-Fragment, das der Server
// nie zu sehen bekommt. ResetPasswordGate uebernimmt die Pruefung/Herstellung
// der Session clientseitig (siehe dort).
export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Neues Passwort festlegen</CardTitle>
        </CardHeader>
        <CardContent>
          <ResetPasswordGate />
        </CardContent>
      </Card>
    </div>
  )
}
