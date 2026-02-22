import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom'
import { AuthGuard } from './components/AuthGuard'
import { NavBar } from './components/NavBar'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { Portfolios } from './pages/Portfolios'
import { PortfolioDetail } from './pages/PortfolioDetail'
import { AccountDetail } from './pages/AccountDetail'
import { Calendar } from './pages/Calendar'

function AppShell() {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-background">
        <NavBar />
        <main className="mx-auto max-w-7xl">
          <Outlet />
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
          <Route path="/calendar" element={<Calendar />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
