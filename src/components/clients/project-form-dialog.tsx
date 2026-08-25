'use client'

import { useEffect, useState } from 'react'
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
import { projectSchema, type ProjectFormValues } from '@/lib/validations/clients'
import type { Project } from '@/lib/clients/types'

interface ProjectFormDialogProps {
  mode: 'create' | 'edit'
  project?: Project
  trigger: React.ReactNode
  onSubmit: (values: ProjectFormValues) => void
}

export function ProjectFormDialog({ mode, project, trigger, onSubmit }: ProjectFormDialogProps) {
  const [open, setOpen] = useState(false)

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
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const handleSubmit = (values: ProjectFormValues) => {
    onSubmit(values)
    setOpen(false)
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
              <Button type="submit">
                {mode === 'create' ? 'Projekt anlegen' : 'Speichern'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
