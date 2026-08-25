'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
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
import { Alert, AlertDescription } from '@/components/ui/alert'
import { createProject, updateProject } from '@/lib/clients/actions'
import { projectSchema, type ProjectFormValues } from '@/lib/validations/clients'
import type { Project } from '@/lib/clients/types'

interface ProjectFormDialogProps {
  mode: 'create' | 'edit'
  clientId: string
  project?: Project
  trigger: React.ReactNode
  onCreated?: (projectId: string) => void
}

export function ProjectFormDialog({
  mode,
  clientId,
  project,
  trigger,
  onCreated,
}: ProjectFormDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: project?.name ?? '',
      notes: project?.notes ?? '',
    },
  })

  useEffect(() => {
    if (open) {
      form.reset({ name: project?.name ?? '', notes: project?.notes ?? '' })
      setServerError(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const handleSubmit = async (values: ProjectFormValues) => {
    setServerError(null)
    if (mode === 'create') {
      const result = await createProject(clientId, values)
      if ('error' in result) {
        setServerError(result.error)
        return
      }
      setOpen(false)
      onCreated?.(result.id)
    } else if (project) {
      const result = await updateProject(project.id, clientId, values)
      if (result?.error) {
        setServerError(result.error)
        return
      }
      setOpen(false)
      router.refresh()
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Neues Projekt' : 'Projekt bearbeiten'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4" noValidate>
            {serverError && (
              <Alert variant="destructive">
                <AlertDescription>{serverError}</AlertDescription>
              </Alert>
            )}

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Projektname</FormLabel>
                  <FormControl>
                    <Input {...field} />
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
                {mode === 'create' ? 'Projekt anlegen' : 'Speichern'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
