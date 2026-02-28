import { Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useSession } from '../lib/auth'

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation()
  const { data: session, isPending } = useSession()

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">{t('common.loading')}</div>
      </div>
    )
  }

  if (!session?.user) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
