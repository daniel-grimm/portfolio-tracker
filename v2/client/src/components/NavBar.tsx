import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useSession, signOut } from '../lib/auth'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'
import { ThemeToggle } from './ThemeToggle'

const NAV_LINKS = [
  { to: '/dividends', label: 'Dividends' },
  { to: '/projections', label: 'Projections' },
]

export function NavBar() {
  const { data: session } = useSession()
  const navigate = useNavigate()
  const location = useLocation()
  const user = session?.user

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
            VibeFolio
          </Link>
          {NAV_LINKS.map(({ to, label }) => {
            const active = location.pathname.startsWith(to)
            return (
              <Link
                key={to}
                to={to}
                className={`relative shrink-0 px-3 py-1.5 text-sm rounded-md transition-colors ${
                  active
                    ? 'text-primary font-medium bg-accent'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                {label}
                {active && (
                  <span className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-primary" />
                )}
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
                <DropdownMenuItem onClick={handleLogout}>Log out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  )
}
