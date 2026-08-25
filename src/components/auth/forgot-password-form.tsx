'use client'

import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { requestPasswordReset } from '@/lib/auth/actions'
import { forgotPasswordSchema, type ForgotPasswordInput } from '@/lib/validations/auth'

export function ForgotPasswordForm() {
  const [serverError, setServerError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  })

  const onSubmit = async (values: ForgotPasswordInput) => {
    setServerError(null)
    try {
      const result = await requestPasswordReset(values)
      if (result?.error) {
        setServerError(result.error)
        return
      }
      // Bewusst immer dieselbe Bestaetigung, unabhaengig davon ob der Account
      // existiert (Enumeration-Schutz, siehe PROJ-2 Spec).
      setSubmitted(true)
    } catch {
      setServerError('Der Server ist gerade nicht erreichbar. Bitte versuche es erneut.')
    }
  }

  if (submitted) {
    return (
      <Alert>
        <AlertDescription>
          Falls ein Konto mit dieser E-Mail-Adresse existiert, wurde eine E-Mail mit einem
          Link zum Zurücksetzen des Passworts verschickt.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {serverError && (
          <Alert variant="destructive">
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>E-Mail</FormLabel>
              <FormControl>
                <Input type="email" autoComplete="email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Wird gesendet…' : 'Reset-Link anfordern'}
        </Button>
      </form>
    </Form>
  )
}
