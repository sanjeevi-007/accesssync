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

import {
  DashboardPlaceholder,
  CardsPlaceholder,
  LibraryPlaceholder,
  InstructionsPlaceholder,
  AssessmentsPlaceholder,
  ScansPlaceholder,
  ReportsPlaceholder,
  SettingsPlaceholder,
} from './pages/StaffPlaceholders';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
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
            <Route path="dashboard" element={<DashboardPlaceholder />} />
            <Route path="cards" element={<CardsPlaceholder />} />
            <Route path="library" element={<LibraryPlaceholder />} />
            <Route path="instructions" element={<InstructionsPlaceholder />} />
            <Route path="assessments" element={<AssessmentsPlaceholder />} />
            <Route path="scans" element={<ScansPlaceholder />} />
            <Route path="reports" element={<ReportsPlaceholder />} />
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
