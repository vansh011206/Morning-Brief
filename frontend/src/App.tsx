import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AppShell } from './layouts/AppShell'
import { TodayPage } from './pages/TodayPage'
import { ArchivePage } from './pages/ArchivePage'
import { ConnectionsPage } from './pages/ConnectionsPage'
import { SettingsPage } from './pages/SettingsPage'
import { OnboardingPage } from './pages/OnboardingPage'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { LandingPage } from './pages/LandingPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { ProtectedRoute } from './components/ProtectedRoute'
import { useAuthStore } from './store/useAuthStore'

export const App: React.FC = () => {
  const { isAuthenticated } = useAuthStore()

  return (
    <Routes>
      {/* Public Landing Page at root */}
      <Route
        path="/"
        element={
          isAuthenticated ? <Navigate to="/today" replace /> : <LandingPage />
        }
      />

      {/* Public Auth Pages */}
      <Route
        path="/login"
        element={
          isAuthenticated ? <Navigate to="/today" replace /> : <LoginPage />
        }
      />
      <Route
        path="/register"
        element={
          isAuthenticated ? <Navigate to="/onboarding" replace /> : <RegisterPage />
        }
      />

      {/* Protected Onboarding / Connect Screen (Immediately after Login/Register) */}
      <Route
        path="/onboarding"
        element={
          <ProtectedRoute>
            <OnboardingPage />
          </ProtectedRoute>
        }
      />

      {/* Protected Dashboard Routes inside AppShell */}
      <Route
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route path="/today" element={<TodayPage />} />
        <Route path="/archive" element={<ArchivePage />} />
        <Route path="/connections" element={<ConnectionsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>

      {/* Fallback 404 */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

