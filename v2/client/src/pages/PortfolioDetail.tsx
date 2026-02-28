import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import type { Account } from 'shared'
import { getPortfolio, getAccounts, createAccount, updateAccount, deleteAccount } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { PortfolioValueChart } from '@/components/charts/PortfolioValueChart'
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

type AccountFormValues = { name: string; description: string }

function AccountForm({
  defaultValues,
  onSubmit,
  isSubmitting,
}: {
  defaultValues?: AccountFormValues
  onSubmit: (values: AccountFormValues) => void
  isSubmitting: boolean
}) {
  const { t } = useTranslation()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AccountFormValues>({
    defaultValues: defaultValues ?? { name: '', description: '' },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="acc-name">{t('common.name')}</Label>
        <Input
          id="acc-name"
          placeholder={t('account.namePlaceholder')}
          {...register('name', { required: t('common.nameRequired') })}
        />
        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
      </div>
      <div className="space-y-1">
        <Label htmlFor="acc-description">{t('common.description')}</Label>
        <Input id="acc-description" placeholder={t('common.optional')} {...register('description')} />
      </div>
      <DialogFooter>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? t('common.saving') : t('common.save')}
        </Button>
      </DialogFooter>
    </form>
  )
}

export function PortfolioDetail() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data: portfolio, isPending: portfolioPending, isError } = useQuery({
    queryKey: ['portfolios', id],
    queryFn: () => getPortfolio(id!),
    enabled: Boolean(id),
  })

  const { data: accounts, isPending: accountsPending } = useQuery({
    queryKey: ['accounts', id],
    queryFn: () => getAccounts(id!),
    enabled: Boolean(id),
  })

  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Account | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Account | null>(null)

  const createMutation = useMutation({
    mutationFn: (values: AccountFormValues) => createAccount(id!, values),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['accounts', id] })
      setCreateOpen(false)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ acctId, input }: { acctId: string; input: AccountFormValues }) =>
      updateAccount(acctId, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['accounts', id] })
      setEditTarget(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteAccount,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['accounts', id] })
      setDeleteTarget(null)
    },
  })

  if (portfolioPending) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
    )
  }

  if (isError || !portfolio) {
    return (
      <div className="p-6">
        <p className="text-destructive">{t('portfolio.notFound')}</p>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{portfolio.name}</h1>
        {portfolio.description && (
          <p className="text-muted-foreground mt-1">{portfolio.description}</p>
        )}
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{t('portfolio.portfolioValue')}</h2>
        <PortfolioValueChart portfolioId={portfolio.id} />
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t('account.accounts')}</h2>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            {t('account.newAccount')}
          </Button>
        </div>

        {accountsPending ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        ) : accounts?.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            {t('account.noAccounts')}
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {accounts?.map((a) => (
              <Card
                key={a.id}
                className="cursor-pointer hover:border-primary transition-colors"
                onClick={() => navigate(`/accounts/${a.id}`)}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-start justify-between gap-2 text-base">
                    <span className="truncate">{a.name}</span>
                    <span
                      className="flex gap-1 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button variant="ghost" size="sm" onClick={() => setEditTarget(a)}>
                        {t('common.edit')}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(a)}>
                        {t('common.delete')}
                      </Button>
                    </span>
                  </CardTitle>
                </CardHeader>
                {a.description && (
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{a.description}</p>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('account.newAccount')}</DialogTitle>
          </DialogHeader>
          <AccountForm
            onSubmit={(values) => createMutation.mutate(values)}
            isSubmitting={createMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={editTarget !== null} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('account.editAccount')}</DialogTitle>
          </DialogHeader>
          {editTarget && (
            <AccountForm
              defaultValues={{
                name: editTarget.name,
                description: editTarget.description ?? '',
              }}
              onSubmit={(values) => updateMutation.mutate({ acctId: editTarget.id, input: values })}
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
            <AlertDialogTitle>{t('account.deleteAccount')}</AlertDialogTitle>
            <AlertDialogDescription
              dangerouslySetInnerHTML={{
                __html: t('account.deleteConfirm', { name: deleteTarget?.name ?? '' }),
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
