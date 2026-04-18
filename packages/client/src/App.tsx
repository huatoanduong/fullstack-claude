import { useEffect } from 'react'
import axios from 'axios'
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import LoginPage from '@/pages/LoginPage'
import CampaignListPage from '@/pages/CampaignListPage'
import CampaignNewPage from '@/pages/CampaignNewPage'
import CampaignDetailPage from '@/pages/CampaignDetailPage'

function PrivateRoute() {
  const initialized = useAuthStore((s) => s.initialized)
  const accessToken = useAuthStore((s) => s.accessToken)
  const location = useLocation()

  if (!initialized) return null

  if (!accessToken) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <Outlet />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<PrivateRoute />}>
        <Route path="/campaigns" element={<CampaignListPage />} />
        <Route path="/campaigns/new" element={<CampaignNewPage />} />
        <Route path="/campaigns/:id" element={<CampaignDetailPage />} />
      </Route>
      <Route path="/" element={<Navigate to="/campaigns" replace />} />
      <Route path="*" element={<Navigate to="/campaigns" replace />} />
    </Routes>
  )
}

export default function App() {
  const accessToken = useAuthStore((s) => s.accessToken)
  const setInitialized = useAuthStore((s) => s.setInitialized)
  const clearAuth = useAuthStore((s) => s.clearAuth)

  useEffect(() => {
    let cancelled = false

    async function init() {
      if (accessToken) {
        if (!cancelled) setInitialized(true)
        return
      }

      try {
        const { data } = await axios.post<{ accessToken: string }>(
          '/api/auth/refresh',
          {},
          { withCredentials: true }
        )
        if (!cancelled) {
          useAuthStore.setState({ accessToken: data.accessToken })
        }
      } catch {
        if (!cancelled) {
          clearAuth()
        }
      } finally {
        if (!cancelled) setInitialized(true)
      }
    }

    void init()
    return () => {
      cancelled = true
    }
  }, [accessToken, clearAuth, setInitialized])

  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}
