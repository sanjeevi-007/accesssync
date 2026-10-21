import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { ProtectedRoute } from './components/ProtectedRoute';
import { StaffLayout } from './components/StaffLayout';

import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { VisitorPage } from './pages/VisitorPage';
import { AccessibilityInfoPage } from './pages/AccessibilityInfoPage';
import { ChangePasswordPage } from './pages/ChangePasswordPage';
import { NotFoundPage } from './pages/NotFoundPage';

import { DashboardPage } from './pages/DashboardPage';
import { CardsPage } from './pages/CardsPage';
import { LibraryPage } from './pages/LibraryPage';
import { InstructionsPage } from './pages/InstructionsPage';
import { AssessmentsPage } from './pages/AssessmentsPage';

import { LiveScansPage } from './pages/LiveScansPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPlaceholder } from './pages/StaffPlaceholders';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        {/* First focusable element for keyboard accessibility */}
        <a
          href="#main-content"
          className="skip-link"
        >
          Skip to main content
        </a>

        <Routes>
          {/* Public routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/visitor" element={<VisitorPage />} />
          <Route path="/accessibility" element={<AccessibilityInfoPage />} />

          {/* Forced password update route */}
          <Route
            path="/change-password"
            element={
              <ProtectedRoute>
                <ChangePasswordPage />
              </ProtectedRoute>
            }
          />

          {/* Protected staff portal routes */}
          <Route
            path="/app"
            element={
              <ProtectedRoute>
                <StaffLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/app/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="cards" element={<CardsPage />} />
            <Route path="library" element={<LibraryPage />} />
            <Route path="instructions" element={<InstructionsPage />} />
            <Route path="assessments" element={<AssessmentsPage />} />
            <Route path="scans" element={<LiveScansPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="settings" element={<SettingsPlaceholder />} />
          </Route>

          {/* Catch-all 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
