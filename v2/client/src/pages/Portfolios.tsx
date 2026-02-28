import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import type { Portfolio } from 'shared'
import {
  getPortfolios,
  createPortfolio,
  updatePortfolio,
  deletePortfolio,
} from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type PortfolioFormValues = { name: string; description: string }

function PortfolioForm({
  defaultValues,
  onSubmit,
  isSubmitting,
}: {
  defaultValues?: PortfolioFormValues
  onSubmit: (values: PortfolioFormValues) => void
  isSubmitting: boolean
}) {
  const { t } = useTranslation()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PortfolioFormValues>({
    defaultValues: defaultValues ?? { name: '', description: '' },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="name">{t('common.name')}</Label>
        <Input
          id="name"
          placeholder={t('portfolio.namePlaceholder')}
          {...register('name', { required: t('common.nameRequired') })}
        />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name.message}</p>
        )}
      </div>
      <div className="space-y-1">
        <Label htmlFor="description">{t('common.description')}</Label>
        <Input id="description" placeholder={t('common.optional')} {...register('description')} />
      </div>
      <DialogFooter>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? t('common.saving') : t('common.save')}
        </Button>
      </DialogFooter>
    </form>
  )
}

export function Portfolios() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data: portfolios, isPending } = useQuery({
    queryKey: ['portfolios'],
    queryFn: getPortfolios,
  })

  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Portfolio | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Portfolio | null>(null)

  const createMutation = useMutation({
    mutationFn: createPortfolio,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['portfolios'] })
      setCreateOpen(false)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: PortfolioFormValues }) =>
      updatePortfolio(id, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['portfolios'] })
      setEditTarget(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deletePortfolio,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['portfolios'] })
      setDeleteTarget(null)
    },
  })

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('portfolio.portfolios')}</h1>
        <Button onClick={() => setCreateOpen(true)}>{t('portfolio.newPortfolio')}</Button>
      </div>

      {isPending ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : portfolios?.length === 0 ? (
        <p className="text-muted-foreground">
          {t('portfolio.noPortfolios')}
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {portfolios?.map((p) => (
            <Card
              key={p.id}
              className="cursor-pointer hover:border-primary transition-colors"
              onClick={() => navigate(`/portfolios/${p.id}`)}
            >
              <CardHeader className="pb-2">
                <CardTitle className="flex items-start justify-between gap-2">
                  <span className="truncate">{p.name}</span>
                  <span className="flex gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditTarget(p)}
                    >
                      {t('common.edit')}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteTarget(p)}
                    >
                      {t('common.delete')}
                    </Button>
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {p.description && (
                  <p className="text-sm text-muted-foreground">{p.description}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('portfolio.newPortfolio')}</DialogTitle>
          </DialogHeader>
          <PortfolioForm
            onSubmit={(values) => createMutation.mutate(values)}
            isSubmitting={createMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={editTarget !== null} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('portfolio.editPortfolio')}</DialogTitle>
          </DialogHeader>
          {editTarget && (
            <PortfolioForm
              defaultValues={{
                name: editTarget.name,
                description: editTarget.description ?? '',
              }}
              onSubmit={(values) =>
                updateMutation.mutate({ id: editTarget.id, input: values })
              }
              isSubmitting={updateMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirm dialog */}
      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('portfolio.deletePortfolio')}</AlertDialogTitle>
            <AlertDialogDescription
              dangerouslySetInnerHTML={{
                __html: t('portfolio.deleteConfirm', { name: deleteTarget?.name ?? '' }),
              }}
            />
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              {deleteMutation.isPending ? t('common.deleting') : t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
