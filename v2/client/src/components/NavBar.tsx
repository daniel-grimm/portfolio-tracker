import { Link, useNavigate } from 'react-router-dom'
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
  const { data: session } = useSession()
  const navigate = useNavigate()
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
    <header className="border-b bg-background">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        <nav className="flex items-center gap-4 sm:gap-6 overflow-x-auto">
          <Link to="/" className="font-semibold shrink-0">
            VibeFolio
          </Link>
          <Link
            to="/portfolios"
            className="text-sm text-muted-foreground hover:text-foreground shrink-0"
          >
            Portfolios
          </Link>
          <Link
            to="/dividends"
            className="text-sm text-muted-foreground hover:text-foreground shrink-0"
          >
            Dividends
          </Link>
          <Link
            to="/calendar"
            className="text-sm text-muted-foreground hover:text-foreground shrink-0"
          >
            Calendar
          </Link>
        </nav>

        <div className="flex items-center gap-1">
          <ThemeToggle />
          {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.image ?? undefined} alt={user.name} />
                  <AvatarFallback>{initials(user.name)}</AvatarFallback>
                </Avatar>
                <span className="hidden text-sm sm:block">{user.name}</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleLogout}>
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  )
}
