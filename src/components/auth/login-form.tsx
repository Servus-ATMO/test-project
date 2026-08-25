'use client'

import { useState } from 'react'
import Link from 'next/link'
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
import { login } from '@/lib/auth/actions'
import { isRedirectError } from '@/lib/auth/is-redirect-error'
import { loginSchema, type LoginInput } from '@/lib/validations/auth'

export function LoginForm({ redirectTo }: { redirectTo?: string }) {
  const [serverError, setServerError] = useState<string | null>(null)

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  const onSubmit = async (values: LoginInput) => {
    setServerError(null)
    try {
      const result = await login(values, redirectTo)
      if (result?.error) {
        setServerError(result.error)
      }
    } catch (err) {
      if (isRedirectError(err)) throw err
      // E-Mail bleibt erhalten, Passwort wird aus Sicherheitsgruenden geleert
      // (siehe PROJ-2 Acceptance Criteria "Supabase-API nicht erreichbar").
      form.resetField('password')
      setServerError('Der Server ist gerade nicht erreichbar. Bitte versuche es erneut.')
    }
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

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between">
                <FormLabel>Passwort</FormLabel>
                <Link
                  href="/passwort-vergessen"
                  className="text-sm text-muted-foreground hover:underline"
                >
                  Passwort vergessen?
                </Link>
              </div>
              <FormControl>
                <Input type="password" autoComplete="current-password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Anmelden…' : 'Anmelden'}
        </Button>
      </form>
    </Form>
  )
}
