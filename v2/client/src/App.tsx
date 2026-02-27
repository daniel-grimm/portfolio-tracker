import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { AuthGuard } from './components/AuthGuard'
import { ErrorBoundary } from './components/ErrorBoundary'
import { NavBar } from './components/NavBar'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { PortfolioDetail } from './pages/PortfolioDetail'
import { AccountDetail } from './pages/AccountDetail'
import { Dividends } from './pages/Dividends'
import { Projections } from './pages/Projections'

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
          <Route path="/portfolios" element={<Navigate to="/" replace />} />
          <Route path="/portfolios/:id" element={<PortfolioDetail />} />
          <Route path="/accounts/:id" element={<AccountDetail />} />
          <Route path="/dividends" element={<Dividends />} />
          <Route path="/projections" element={<Projections />} />
          <Route path="/calendar" element={<Navigate to="/dividends" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
