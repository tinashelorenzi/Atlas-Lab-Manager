import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { LoginPage } from './pages/LoginPage'
import { PasswordResetPage } from './pages/PasswordResetPage'
import { Dashboard } from './pages/Dashboard'
import { TestSamples } from './pages/TestSamples'
import { Customers } from './pages/Customers'
import { Projects } from './pages/Projects'
import { ResultEntries } from './pages/ResultEntries'
import { Reports } from './pages/Reports'
import { Settings } from './pages/Settings'
import { SuperAdminPanel } from './pages/SuperAdminPanel'
import { ErrorPage } from './pages/ErrorPage'
import { ProtectedRoute } from './components/ProtectedRoute'
import './App.css'

function App() {
  return (
    <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route
          path="/password-reset"
          element={
            <ProtectedRoute>
              <PasswordResetPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
          errorElement={<ErrorPage />}
        />
        <Route
          path="/dashboard/test-samples"
          element={
            <ProtectedRoute>
              <TestSamples />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/customers"
          element={
            <ProtectedRoute>
              <Customers />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/projects"
          element={
            <ProtectedRoute>
              <Projects />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/result-entries"
          element={
            <ProtectedRoute>
              <ResultEntries />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/reports"
          element={
            <ProtectedRoute>
              <Reports />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/settings"
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/super-admin"
          element={
            <ProtectedRoute>
              <SuperAdminPanel />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
  )
}

export default App
