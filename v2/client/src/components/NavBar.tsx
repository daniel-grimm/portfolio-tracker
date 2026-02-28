import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useSession, signOut } from '../lib/auth'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'
import { ThemeToggle } from './ThemeToggle'

export function NavBar() {
  const { t } = useTranslation()
  const { data: session } = useSession()
  const navigate = useNavigate()
  const location = useLocation()
  const user = session?.user

  const NAV_LINKS = [
    { to: '/dividends', label: t('nav.dividends') },
    { to: '/projections', label: t('nav.projections') },
  ]

  function handleLogout() {
    signOut().then(() => navigate('/login'))
  }

  function initials(name?: string) {
    if (!name) return '?'
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <header className="border-b bg-card">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        <nav className="flex items-center gap-1 sm:gap-2 overflow-x-auto">
          <Link
            to="/"
            className="mr-4 shrink-0 font-display italic text-lg font-bold text-primary tracking-tight"
          >
            {t('auth.appName')}
          </Link>
          {NAV_LINKS.map(({ to, label }) => {
            const active = location.pathname.startsWith(to)
            return (
              <Link
                key={to}
                to={to}
                className={`shrink-0 px-4 py-1.5 text-sm rounded-full transition-colors ${
                  active
                    ? 'bg-primary text-primary-foreground font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                {label}
              </Link>
            )
          })}
        </nav>

        <div className="flex items-center gap-1">
          <ThemeToggle />
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring ml-1">
                  <Avatar className="h-8 w-8 ring-2 ring-border">
                    <AvatarImage src={user.image ?? undefined} alt={user.name} />
                    <AvatarFallback className="bg-accent text-accent-foreground font-semibold text-xs">
                      {initials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden text-sm sm:block">{user.name}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleLogout}>{t('auth.logOut')}</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  )
}
