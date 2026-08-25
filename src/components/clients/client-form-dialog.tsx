'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { createClientAndFirstProject, updateClient } from '@/lib/clients/actions'
import { isRedirectError } from '@/lib/auth/is-redirect-error'
import { clientSchema, type ClientFormValues } from '@/lib/validations/clients'
import type { Client } from '@/lib/clients/types'

interface ClientFormDialogProps {
  mode: 'create' | 'edit'
  client?: Client
  trigger: React.ReactNode
}

export function ClientFormDialog({ mode, client, trigger }: ClientFormDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [duplicateName, setDuplicateName] = useState<string | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      companyName: client?.companyName ?? '',
      contactName: client?.contactName ?? '',
      contactEmail: client?.contactEmail ?? '',
      notes: client?.notes ?? '',
    },
  })

  useEffect(() => {
    if (open) {
      form.reset({
        companyName: client?.companyName ?? '',
        contactName: client?.contactName ?? '',
        contactEmail: client?.contactEmail ?? '',
        notes: client?.notes ?? '',
      })
      setDuplicateName(null)
      setServerError(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const handleSubmit = async (values: ClientFormValues) => {
    setServerError(null)
    try {
      if (mode === 'create') {
        // Weiche Warnung nur beim Neuanlegen relevant (siehe PROJ-17 Acceptance
        // Criteria). duplicateName gesetzt heisst: zweiter Submit, Nutzer hat
        // "Trotzdem anlegen" geklickt -> Server ueberspringt die Pruefung.
        const result = await createClientAndFirstProject(values, duplicateName !== null)
        if (result?.status === 'duplicate') {
          setDuplicateName(result.existingCompanyName)
          return
        }
        if (result?.status === 'error') {
          setServerError(result.error)
          return
        }
        // Erfolgsfall: die Action wirft redirect() (siehe catch unten), hier
        // wird also nie weitergemacht.
      } else if (client) {
        const result = await updateClient(client.id, values)
        if (result?.error) {
          setServerError(result.error)
          return
        }
        router.refresh()
      }
      setOpen(false)
    } catch (err) {
      if (isRedirectError(err)) throw err
      setServerError('Der Server ist gerade nicht erreichbar. Bitte versuche es erneut.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Neuer Kunde' : 'Kunde bearbeiten'}</DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Beim Anlegen wird automatisch das erste Projekt für diesen Kunden erstellt.'
              : 'Stammdaten dieses Kunden aktualisieren.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4" noValidate>
            {serverError && (
              <Alert variant="destructive">
                <AlertDescription>{serverError}</AlertDescription>
              </Alert>
            )}

            {duplicateName && (
              <Alert variant="destructive">
                <AlertTitle>Ein Kunde mit dieser E-Mail existiert bereits</AlertTitle>
                <AlertDescription>
                  „{duplicateName}&quot; nutzt bereits diese E-Mail-Adresse. Trotzdem anlegen?
                </AlertDescription>
              </Alert>
            )}

            <FormField
              control={form.control}
              name="companyName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Firmenname</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contactName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ansprechpartner</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contactEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ansprechpartner-E-Mail</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notizen</FormLabel>
                  <FormControl>
                    <Textarea rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {duplicateName
                  ? 'Trotzdem anlegen'
                  : mode === 'create'
                    ? 'Kunde anlegen'
                    : 'Speichern'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
