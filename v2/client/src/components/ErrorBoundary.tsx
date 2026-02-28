import { Component, type ErrorInfo, type ReactNode } from 'react'
import i18n from '@/i18n'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info)
  }

  override render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="p-6 text-center">
            <p className="text-destructive font-medium">{i18n.t('common.somethingWentWrong')}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {this.state.error?.message ?? 'Unknown error'}
            </p>
            <button
              className="mt-4 text-sm underline text-muted-foreground hover:text-foreground"
              onClick={() => this.setState({ hasError: false, error: null })}
            >
              {i18n.t('common.tryAgain')}
            </button>
          </div>
        )
      )
    }
    return this.props.children
  }
}
