import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { LoadingSpinner } from '../components/LoadingSpinner';

// Pages
import { Login } from '../pages/Login';
import { Register } from '../pages/Register';
import { Dashboard } from '../pages/Dashboard';
import { Projects } from '../pages/Projects';
import { ProjectWorkspace } from '../pages/ProjectWorkspace';
import { ActivityLogs } from '../pages/ActivityLogs';
import { Patents } from '../pages/Patents';
import { Disclosures } from '../pages/Disclosures';
import { Agreements } from '../pages/Agreements';
import { RegulatoryFilings } from '../pages/RegulatoryFilings';
import { Compliance } from '../pages/Compliance';
import { Collaborations } from '../pages/Collaborations';
import { Documents } from '../pages/Documents';
import { Deadlines } from '../pages/Deadlines';
import { Reports } from '../pages/Reports';
import { Users } from '../pages/Users';
import { Profile } from '../pages/Profile';

const ProtectedRoute: React.FC<{ children: React.ReactNode; requiredRole?: string }> = ({
  children,
  requiredRole,
}) => {
  const { user, token, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner message="Authenticating session..." />;
  }

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export const AppRoutes: React.FC = () => {
  const { token, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner message="Initializing BioVault Platform..." />;
  }

  return (
    <Routes>
      {/* Public Authentication Routes */}
      <Route
        path="/login"
        element={token ? <Navigate to="/dashboard" replace /> : <Login />}
      />
      <Route
        path="/register"
        element={token ? <Navigate to="/dashboard" replace /> : <Register />}
      />

      {/* Protected Enterprise Portal */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        
        {/* Project-Centric Core Workspaces */}
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="projects" element={<Projects />} />
        <Route path="projects/:projectId" element={<ProjectWorkspace />} />
        <Route path="activity-logs" element={<ActivityLogs />} />

        {/* Existing modules preserved for backwards-compatibility & deep-links */}
        <Route path="patents" element={<Patents />} />
        <Route path="disclosures" element={<Disclosures />} />
        <Route path="agreements" element={<Agreements />} />
        <Route path="filings" element={<RegulatoryFilings />} />
        <Route path="compliance" element={<Compliance />} />
        <Route path="collaborations" element={<Collaborations />} />
        <Route path="documents" element={<Documents />} />
        <Route path="deadlines" element={<Deadlines />} />
        <Route path="reports" element={<Reports />} />
        <Route path="profile" element={<Profile />} />

        {/* Admin Protected Route */}
        <Route
          path="users"
          element={
            <ProtectedRoute requiredRole="ADMIN">
              <Users />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
