import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// Pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DeviceEnrollPage from './pages/DeviceEnrollPage';
import MfaVerifyPage from './pages/MfaVerifyPage';
import DashboardPage from './pages/DashboardPage';
import ProfilePage from './pages/ProfilePage';
import MfaSetupPage from './pages/MfaSetupPage';
import DevicesPage from './pages/DevicesPage';
import SessionsPage from './pages/SessionsPage';
import AccessRequestsPage from './pages/AccessRequestsPage';
import ResourcesPage from './pages/ResourcesPage';
import PoliciesPage from './pages/PoliciesPage';
import AuditLogsPage from './pages/AuditLogsPage';
import UsersAdminPage from './pages/admin/UsersAdminPage';
import RolesPage from './pages/admin/RolesPage';

import './index.css';

// Protected route wrapper
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <div className="loading-center"><div className="spinner spinner-lg" /></div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
};

// Public-only route (redirect authenticated users)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <div className="loading-center"><div className="spinner spinner-lg" /></div>;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return children;
};

// Admin-only route (requires Admin role)
const AdminRoute = ({ children }) => {
  const { isAuthenticated, loading, user } = useAuth();
  if (loading) return <div className="loading-center"><div className="spinner spinner-lg" /></div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  const isAdmin = user?.roles?.some?.(r => (typeof r === 'string' ? r : r?.name) === 'Admin');
  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  return children;
};

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
      <Route path="/device-enroll" element={<DeviceEnrollPage />} />
      <Route path="/mfa-verify" element={<MfaVerifyPage />} />

      {/* Protected */}
      <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
      <Route path="/mfa-setup" element={<ProtectedRoute><MfaSetupPage /></ProtectedRoute>} />
      <Route path="/devices" element={<ProtectedRoute><DevicesPage /></ProtectedRoute>} />
      <Route path="/sessions" element={<ProtectedRoute><SessionsPage /></ProtectedRoute>} />
      <Route path="/access-requests" element={<ProtectedRoute><AccessRequestsPage /></ProtectedRoute>} />
      <Route path="/resources" element={<ProtectedRoute><ResourcesPage /></ProtectedRoute>} />
      <Route path="/policies" element={<ProtectedRoute><PoliciesPage /></ProtectedRoute>} />
      <Route path="/audit-logs" element={<ProtectedRoute><AuditLogsPage /></ProtectedRoute>} />
      <Route path="/admin/users" element={<AdminRoute><UsersAdminPage /></AdminRoute>} />
      <Route path="/admin/roles" element={<AdminRoute><RolesPage /></AdminRoute>} />

      {/* Default */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
