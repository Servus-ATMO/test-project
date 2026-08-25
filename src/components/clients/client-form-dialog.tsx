'use client'

import { useEffect, useState } from 'react'
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
import { clientSchema, type ClientFormValues } from '@/lib/validations/clients'
import type { Client } from '@/lib/clients/types'

interface ClientFormDialogProps {
  mode: 'create' | 'edit'
  client?: Client
  trigger: React.ReactNode
  checkDuplicateEmail: (email: string, excludeClientId?: string) => Client | undefined
  onSubmit: (values: ClientFormValues) => void
}

export function ClientFormDialog({
  mode,
  client,
  trigger,
  checkDuplicateEmail,
  onSubmit,
}: ClientFormDialogProps) {
  const [open, setOpen] = useState(false)
  const [duplicate, setDuplicate] = useState<Client | null>(null)

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
      setDuplicate(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const handleSubmit = (values: ClientFormValues) => {
    // Weiche Warnung nur beim Neuanlegen relevant (siehe PROJ-17 Acceptance
    // Criteria) - beim Bearbeiten kollidiert ein Kunde nicht mit sich selbst.
    if (mode === 'create' && !duplicate) {
      const found = checkDuplicateEmail(values.contactEmail)
      if (found) {
        setDuplicate(found)
        return
      }
    }
    onSubmit(values)
    setOpen(false)
    setDuplicate(null)
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
            {duplicate && (
              <Alert variant="destructive">
                <AlertTitle>Ein Kunde mit dieser E-Mail existiert bereits</AlertTitle>
                <AlertDescription>
                  „{duplicate.companyName}&quot; nutzt bereits {duplicate.contactEmail}. Trotzdem
                  anlegen?
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
              <Button type="submit">
                {duplicate
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
