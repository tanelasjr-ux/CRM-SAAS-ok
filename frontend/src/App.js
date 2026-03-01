import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from './components/ui/sonner';

import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';

import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import PipelinePage from './pages/PipelinePage';
import LeadsPage from './pages/LeadsPage';
import WhatsAppPage from './pages/WhatsAppPage';
import CalendarPage from './pages/CalendarPage';
import FinancialPage from './pages/FinancialPage';
import ReportsPage from './pages/ReportsPage';
import ServerTenantsPage from './pages/ServerTenantsPage';
import ServerUsersPage from './pages/ServerUsersPage';
import ServerConfigPage from './pages/ServerConfigPage';

import './App.css';

const LoadingSpinner = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="text-center">
      <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
      <p className="text-muted-foreground">Carregando...</p>
    </div>
  </div>
);

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" replace />;

  return <Layout>{children}</Layout>;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return <LoadingSpinner />;
  if (user) {
    // Redirect based on role
    return <Navigate to={user.role === 'server_admin' ? '/server/tenants' : '/dashboard'} replace />;
  }

  return children;
};

const ServerAdminRoute = ({ children }) => {
  const { user, loading, isServerAdmin } = useAuth();

  if (loading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (!isServerAdmin()) return <Navigate to="/dashboard" replace />;

  return <Layout>{children}</Layout>;
};

const ClientRoute = ({ children }) => {
  const { user, loading, isServerAdmin } = useAuth();

  if (loading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (isServerAdmin()) return <Navigate to="/server/tenants" replace />;

  return <Layout>{children}</Layout>;
};

function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />

      {/* Client Routes */}
      <Route
        path="/dashboard"
        element={
          <ClientRoute>
            <DashboardPage />
          </ClientRoute>
        }
      />
      <Route
        path="/pipeline"
        element={
          <ClientRoute>
            <PipelinePage />
          </ClientRoute>
        }
      />
      <Route
        path="/leads"
        element={
          <ClientRoute>
            <LeadsPage />
          </ClientRoute>
        }
      />
      <Route
        path="/whatsapp"
        element={
          <ClientRoute>
            <WhatsAppPage />
          </ClientRoute>
        }
      />
      <Route
        path="/calendar"
        element={
          <ClientRoute>
            <CalendarPage />
          </ClientRoute>
        }
      />
      <Route
        path="/financial"
        element={
          <ClientRoute>
            <FinancialPage />
          </ClientRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ClientRoute>
            <ReportsPage />
          </ClientRoute>
        }
      />

      {/* Server Admin Routes */}
      <Route
        path="/server/tenants"
        element={
          <ServerAdminRoute>
            <ServerTenantsPage />
          </ServerAdminRoute>
        }
      />
      <Route
        path="/server/users"
        element={
          <ServerAdminRoute>
            <ServerUsersPage />
          </ServerAdminRoute>
        }
      />
      <Route
        path="/server/config"
        element={
          <ServerAdminRoute>
            <ServerConfigPage />
          </ServerAdminRoute>
        }
      />

      {/* Default Redirects */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
          <Toaster position="top-right" richColors closeButton />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
