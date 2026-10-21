import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Button from './Button';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isAdmin = user?.roles?.some?.(r => (typeof r === 'string' ? r : r?.name) === 'Admin');

  const initials = user?.name
    ? user.name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'U';

  const roleLabel = Array.isArray(user?.roles) && user.roles.length > 0
    ? typeof user.roles[0] === 'string' ? user.roles[0] : user.roles[0]?.name
    : 'Standard User';

  return (
    <aside className="sidebar" data-testid="sidebar-navigation">
      {/* Brand Header */}
      <div className="sidebar-header">
        <div className="sidebar-logo-icon">🛡</div>
        <div className="sidebar-brand">
          <span className="sidebar-brand-name">ZeroTrustX</span>
          <span className="sidebar-brand-subtitle">Enterprise Access</span>
        </div>
      </div>

      {/* Navigation Sections */}
      <nav className="sidebar-nav">
        {/* Overview */}
        <div className="sidebar-section">
          <div className="sidebar-section-title">Overview</div>
          <NavLink
            to="/dashboard"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            data-testid="nav-dashboard"
          >
            <span className="nav-icon">⬡</span>
            <span>Dashboard</span>
          </NavLink>
        </div>

        {/* Security */}
        <div className="sidebar-section">
          <div className="sidebar-section-title">Security</div>
          <NavLink
            to="/access-requests"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            data-testid="nav-access-requests"
          >
            <span className="nav-icon">⚡</span>
            <span>Access Requests</span>
          </NavLink>
          <NavLink
            to="/policies"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            data-testid="nav-policies"
          >
            <span className="nav-icon">📜</span>
            <span>Policies</span>
          </NavLink>
          <NavLink
            to="/resources"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            data-testid="nav-resources"
          >
            <span className="nav-icon">📦</span>
            <span>Resources</span>
          </NavLink>
        </div>

        {/* Identity */}
        <div className="sidebar-section">
          <div className="sidebar-section-title">Identity</div>
          {isAdmin && (
            <>
              <NavLink
                to="/admin/users"
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                data-testid="nav-admin-users"
              >
                <span className="nav-icon">👥</span>
                <span>Users</span>
              </NavLink>
              <NavLink
                to="/admin/roles"
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                data-testid="nav-admin-roles"
              >
                <span className="nav-icon">🔑</span>
                <span>Roles & RBAC</span>
              </NavLink>
            </>
          )}
          <NavLink
            to="/mfa-setup"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            data-testid="nav-mfa"
          >
            <span className="nav-icon">🔐</span>
            <span>MFA (TOTP)</span>
          </NavLink>
        </div>

        {/* Devices */}
        <div className="sidebar-section">
          <div className="sidebar-section-title">Devices</div>
          <NavLink
            to="/devices"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            data-testid="nav-devices"
          >
            <span className="nav-icon">💻</span>
            <span>Devices</span>
          </NavLink>
          <NavLink
            to="/sessions"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            data-testid="nav-sessions"
          >
            <span className="nav-icon">⏱</span>
            <span>Active Sessions</span>
          </NavLink>
        </div>

        {/* Monitoring */}
        <div className="sidebar-section">
          <div className="sidebar-section-title">Monitoring</div>
          <NavLink
            to="/audit-logs"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            data-testid="nav-audit-logs"
          >
            <span className="nav-icon">📊</span>
            <span>Audit Logs</span>
          </NavLink>
        </div>
      </nav>

      {/* Footer / User Profile Card */}
      <div className="sidebar-footer">
        <div className="user-card">
          <div className="user-avatar">{initials}</div>
          <div className="user-details">
            <div className="user-display-name">{user?.name || 'Operator'}</div>
            <div className="user-display-role">{roleLabel}</div>
          </div>
        </div>
        <Button
          variant="secondary"
          size="sm"
          fullWidth
          onClick={handleLogout}
          data-testid="logout-button"
        >
          Sign Out
        </Button>
      </div>
    </aside>
  );
}
