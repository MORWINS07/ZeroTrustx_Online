import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { mfaService, deviceService, sessionService } from '../services';
import DashboardLayout from '../components/DashboardLayout';
import Button from '../components/Button';
import Badge from '../components/Badge';
import ConfirmDialog from '../components/ConfirmDialog';

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mfaStatus, setMfaStatus] = useState(null);
  const [deviceCount, setDeviceCount] = useState(0);
  const [sessionCount, setSessionCount] = useState(0);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
    mfaService.getStatus()
      .then((r) => setMfaStatus(r.data))
      .catch(() => {});

    deviceService.getMine()
      .then((r) => setDeviceCount(r.data.devices?.length || 0))
      .catch(() => {});

    sessionService.getAll()
      .then((r) => setSessionCount(r.data.sessions?.length || 0))
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'U';

  return (
    <DashboardLayout
      title="Identity & Security Settings"
      subtitle="Manage your personal enterprise credentials, hardware devices, and authenticators."
    >
      <div style={{ maxWidth: '720px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* User Card */}
        <div className="card" style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: 'var(--apple-blue)',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
                fontWeight: 600,
                letterSpacing: '-0.02em',
                boxShadow: '0 4px 12px rgba(0, 113, 227, 0.25)',
              }}
            >
              {initials}
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                  {user?.name}
                </h2>
                <Badge variant={user?.accountStatus === 'ACTIVE' ? 'success' : 'warning'}>
                  {user?.accountStatus || 'ACTIVE'}
                </Badge>
              </div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                {user?.email}
              </p>
              <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                {(user?.roles || []).map((r) => (
                  <Badge key={r._id || r} variant="neutral">
                    {r.name || r}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Security Controls */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1.25rem' }}>
            Zero Trust Access Factors
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {/* MFA */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '1rem 0',
                borderBottom: '1px solid var(--border-color)',
              }}
            >
              <div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9375rem' }}>
                  Two-Factor Authentication (TOTP)
                </div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  {mfaStatus?.enabled
                    ? 'Active and enforced via Google Authenticator'
                    : 'Unprotected — your account does not satisfy critical Zero Trust policies'}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Badge variant={mfaStatus?.enabled ? 'success' : 'danger'} dot>
                  {mfaStatus?.enabled ? 'Enrolled' : 'Not Configured'}
                </Badge>
                <Link to="/mfa-setup">
                  <Button variant="secondary" size="sm">
                    {mfaStatus?.enabled ? 'Manage MFA' : 'Setup MFA'}
                  </Button>
                </Link>
              </div>
            </div>

            {/* Devices */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '1rem 0',
                borderBottom: '1px solid var(--border-color)',
              }}
            >
              <div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9375rem' }}>
                  Hardware Devices
                </div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  {deviceCount} registered device{deviceCount === 1 ? '' : 's'} linked to your identity
                </div>
              </div>

              <Link to="/devices">
                <Button variant="secondary" size="sm">
                  View Devices →
                </Button>
              </Link>
            </div>

            {/* Sessions */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '1rem 0',
              }}
            >
              <div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9375rem' }}>
                  Active Sessions
                </div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  {sessionCount} concurrent login token{sessionCount === 1 ? '' : 's'} across all browsers
                </div>
              </div>

              <Link to="/sessions">
                <Button variant="secondary" size="sm">
                  Manage Sessions →
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div
          className="card"
          style={{
            padding: '1.5rem',
            border: '1px solid rgba(255, 59, 48, 0.25)',
          }}
        >
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--apple-red)', marginBottom: '0.5rem' }}>
            Account Session Termination
          </h3>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
            Terminate this session and revoke the current client refresh token. You will be redirected to the secure login gateway.
          </p>
          <Button
            variant="danger"
            size="sm"
            onClick={() => setShowLogoutConfirm(true)}
            data-testid="logout"
          >
            Sign Out of ZeroTrustX
          </Button>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={handleLogout}
        title="Sign Out"
        message="Are you sure you want to end your session? You will need your credentials, trusted device, and MFA code to sign back in."
        confirmText="Sign Out"
        variant="danger"
      />
    </DashboardLayout>
  );
}
