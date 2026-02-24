import { signIn } from '../lib/auth'
import { Button } from '../components/ui/button'

export function Login() {
  function handleGoogleSignIn() {
    signIn.social({ provider: 'google', callbackURL: `${window.location.origin}/` })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-6 rounded-xl border bg-card p-10 shadow-sm">
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight">VibeFolio</h1>
          <p className="text-sm text-muted-foreground">
            Track your dividend portfolio
          </p>
        </div>
        <Button onClick={handleGoogleSignIn} className="w-full gap-2">
          Continue with Google
        </Button>
      </div>
    </div>
  )
}
