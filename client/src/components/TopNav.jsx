import React, { useState, useEffect } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Badge from './Badge';
import Button from './Button';

export default function TopNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  const [deviceId] = useState(() => localStorage.getItem('deviceId') || 'Unknown');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  const getBreadcrumbs = () => {
    const path = location.pathname;
    if (path === '/dashboard') return ['Overview', 'Dashboard'];
    if (path === '/access-requests') return ['Security', 'Access Requests'];
    if (path === '/policies') return ['Security', 'Policies'];
    if (path === '/resources') return ['Security', 'Resources'];
    if (path === '/admin/users') return ['Identity', 'Users'];
    if (path === '/admin/roles') return ['Identity', 'Roles & Permissions'];
    if (path === '/mfa-setup') return ['Identity', 'MFA Management'];
    if (path === '/devices') return ['Devices', 'Device Inventory'];
    if (path === '/sessions') return ['Devices', 'Active Sessions'];
    if (path === '/audit-logs') return ['Monitoring', 'Audit Events'];
    if (path === '/profile') return ['Account', 'Security Profile'];
    return ['Platform', 'Control Center'];
  };

  const [section, page] = getBreadcrumbs();

  return (
    <header className="top-nav" data-testid="top-navigation">
      <div className="top-nav-left">
        <div className="top-nav-breadcrumbs">
          <span>{section}</span>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-current">{page}</span>
        </div>
      </div>

      <div className="top-nav-right">
        {/* Device ID pill */}
        <Badge variant="neutral" title={`Current Browser Device: ${deviceId}`}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px' }}>
            ID: {deviceId.slice(0, 10)}...
          </span>
        </Badge>

        {/* Security Model Badge */}
        <Badge variant="info">
          Zero Trust Active
        </Badge>

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="btn btn-ghost btn-sm"
          title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
          aria-label="Toggle Theme"
          style={{ fontSize: '13px', padding: '6px 10px' }}
        >
          {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
        </button>
      </div>
    </header>
  );
}
