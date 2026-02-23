import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom'
import { AuthGuard } from './components/AuthGuard'
import { ErrorBoundary } from './components/ErrorBoundary'
import { NavBar } from './components/NavBar'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { Portfolios } from './pages/Portfolios'
import { PortfolioDetail } from './pages/PortfolioDetail'
import { AccountDetail } from './pages/AccountDetail'
import { Calendar } from './pages/Calendar'
import { Dividends } from './pages/Dividends'

function AppShell() {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-background">
        <NavBar />
        <main className="mx-auto max-w-7xl">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </AuthGuard>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<AppShell />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/portfolios" element={<Portfolios />} />
          <Route path="/portfolios/:id" element={<PortfolioDetail />} />
          <Route path="/accounts/:id" element={<AccountDetail />} />
          <Route path="/dividends" element={<Dividends />} />
          <Route path="/calendar" element={<Calendar />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
