'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
} from '@/lib/validations/auth'
import { getSafeRedirectPath } from './redirect'

export type ActionResult = { error: string } | undefined

async function getOrigin() {
  const headersList = await headers()
  const origin = headersList.get('origin')
  if (origin) return origin
  const host = headersList.get('host') ?? 'localhost:3000'
  const protocol = host.startsWith('localhost') || host.startsWith('127.0.0.1') ? 'http' : 'https'
  return `${protocol}://${host}`
}

export async function login(
  values: unknown,
  redirectTo?: string | null
): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(values)
  if (!parsed.success) {
    return { error: 'Bitte E-Mail und Passwort ausfüllen.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword(parsed.data)

  if (error) {
    // Generisch aus Sicherheitsgruenden: kein Hinweis, ob die E-Mail existiert
    // oder nur das Passwort falsch war (siehe PROJ-2 Spec).
    return { error: 'E-Mail oder Passwort falsch.' }
  }

  redirect(getSafeRedirectPath(redirectTo))
}

export async function logout(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export async function requestPasswordReset(values: unknown): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse(values)
  if (!parsed.success) {
    return { error: 'Bitte eine gültige E-Mail-Adresse eingeben.' }
  }

  const supabase = await createClient()
  const origin = await getOrigin()

  // Rueckgabewert von resetPasswordForEmail bewusst ignoriert: Die Bestaetigung
  // muss unabhaengig davon, ob der Account existiert, identisch bleiben
  // (Enumeration-Schutz, siehe PROJ-2 Spec).
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${origin}/auth/confirm?next=/passwort-zuruecksetzen`,
  })
}

export async function resetPassword(values: unknown): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse(values)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Ungültige Eingabe.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password })

  if (error) {
    return {
      error: 'Der Link ist abgelaufen oder ungültig. Bitte fordere einen neuen Reset-Link an.',
    }
  }

  await supabase.auth.signOut()
  redirect('/login?reset=success')
}
