import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import Button from '../components/Button';

function getOrCreateDeviceId() {
  let id = localStorage.getItem('deviceId');
  if (!id) {
    id = 'dev-' + crypto.randomUUID();
    localStorage.setItem('deviceId', id);
  }
  return id;
}

function getBrowserLabel() {
  const ua = navigator.userAgent;
  if (/iPhone|iPad/i.test(ua)) return 'Apple Mobile Device';
  if (/Android/i.test(ua)) return 'Android Device';
  if (/Mac/i.test(ua)) return 'Apple Mac Workstation';
  if (/Windows/i.test(ua)) return 'Windows Enterprise PC';
  if (/Linux/i.test(ua)) return 'Linux Workstation';
  return 'Primary Device';
}

export default function DeviceEnrollPage() {
  const navigate = useNavigate();
  const [deviceName, setDeviceName] = useState('');
  const [deviceType, setDeviceType] = useState('LAPTOP');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [bootstrapToken, setBootstrapToken] = useState('');

  // For existing-user credential flow
  const [needsCredentials, setNeedsCredentials] = useState(false);
  const [credForm, setCredForm] = useState({ email: '', password: '' });
  const [credLoading, setCredLoading] = useState(false);
  const [credError, setCredError] = useState('');

  useEffect(() => {
    const token = sessionStorage.getItem('bootstrapToken');
    if (token) {
      setBootstrapToken(token);
    } else {
      // No bootstrap token from registration — ask for credentials
      setNeedsCredentials(true);
    }
    setDeviceName(getBrowserLabel());
  }, []);

  const handleCredSubmit = async (e) => {
    e.preventDefault();
    setCredLoading(true);
    setCredError('');
    try {
      const resp = await axios.post('/api/v1/auth/request-device-token', credForm);
      const token = resp.data?.bootstrapToken;
      if (!token) throw new Error('No token received from server');
      sessionStorage.setItem('bootstrapToken', token);
      setBootstrapToken(token);
      setNeedsCredentials(false);
    } catch (err) {
      setCredError(err.response?.data?.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setCredLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!bootstrapToken) {
      setError('Bootstrap token missing. Please authenticate first.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const deviceId = getOrCreateDeviceId();

      await axios.post('/api/v1/devices/bootstrap',
        { deviceIdentifier: deviceId, name: deviceName, type: deviceType },
        { headers: { Authorization: `Bearer ${bootstrapToken}`, 'X-Device-Id': deviceId } }
      );

      sessionStorage.removeItem('bootstrapToken');
      setSuccess('Device enrolled and trusted successfully! Redirecting to sign in...');

      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      const msg = err.response?.data?.message || '';
      // If token expired or already have trusted device, handle gracefully
      if (msg.includes('already have a trusted device')) {
        setError('You already have a trusted device. If your browser changed, clear your localStorage and try again, or contact your administrator.');
      } else if (err.response?.status === 401) {
        setError('Your enrollment session expired. Please re-authenticate below.');
        setBootstrapToken('');
        setNeedsCredentials(true);
      } else {
        setError(msg || 'Device enrollment failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-layout" data-testid="device-enroll-page">
      <div className="auth-card" style={{ maxWidth: 480 }}>
        <div className="auth-header">
          <div className="auth-logo">💻</div>
          <h1 className="auth-title">Device Enrollment</h1>
          <p className="auth-subtitle">
            Zero Trust verifies device identity and security posture before granting enterprise access.
          </p>
        </div>

        {error && (
          <div className="alert alert-error" data-testid="enroll-error">
            <span>⚠</span>
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="alert alert-success" data-testid="enroll-success">
            <span>✓</span>
            <span>{success}</span>
          </div>
        )}

        {/* Step 1: Credential collection for existing users */}
        {needsCredentials && !success && (
          <div>
            <div className="alert alert-info" style={{ marginBottom: '20px' }}>
              <span>ℹ</span>
              <div style={{ fontSize: '13px' }}>
                Authenticate with your enterprise credentials to authorize device enrollment.
              </div>
            </div>

            {credError && (
              <div className="alert alert-error">
                <span>⚠</span>
                <span>{credError}</span>
              </div>
            )}

            <form onSubmit={handleCredSubmit} id="credential-form">
              <div className="form-group">
                <label className="form-label" htmlFor="enroll-email">Enterprise Email</label>
                <input
                  id="enroll-email"
                  type="email"
                  className="form-input"
                  placeholder="operator@company.com"
                  value={credForm.email}
                  onChange={e => setCredForm(p => ({ ...p, email: e.target.value }))}
                  required
                  autoComplete="email"
                  data-testid="enroll-email"
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="enroll-password">Password</label>
                <input
                  id="enroll-password"
                  type="password"
                  className="form-input"
                  placeholder="••••••••••••"
                  value={credForm.password}
                  onChange={e => setCredForm(p => ({ ...p, password: e.target.value }))}
                  required
                  autoComplete="current-password"
                  data-testid="enroll-password"
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                loading={credLoading}
                data-testid="enroll-auth-submit"
              >
                Authenticate & Continue
              </Button>
            </form>
          </div>
        )}

        {/* Step 2: Device details form */}
        {!needsCredentials && !success && (
          <form onSubmit={handleSubmit} id="device-enroll-form">
            <div className="alert alert-success" style={{ marginBottom: '16px' }}>
              <span>✓</span>
              <div style={{ fontSize: '13px' }}>Identity verified. Complete the device details below.</div>
            </div>

            <div className="form-group">
              <label className="form-label">Device Identifier (Hardware UUID)</label>
              <input
                className="form-input"
                value={getOrCreateDeviceId()}
                readOnly
                style={{
                  backgroundColor: 'var(--bg-surface-secondary)',
                  cursor: 'default',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '12px',
                  color: 'var(--text-secondary)'
                }}
                data-testid="device-identifier"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="device-name">Device Name</label>
              <input
                id="device-name"
                className="form-input"
                placeholder="e.g. MacBook Pro - Security Ops"
                value={deviceName}
                onChange={e => setDeviceName(e.target.value)}
                required
                data-testid="device-name"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="device-type">Device Category</label>
              <select
                id="device-type"
                className="form-select"
                value={deviceType}
                onChange={e => setDeviceType(e.target.value)}
                data-testid="device-type"
              >
                <option value="LAPTOP">Laptop Workstation</option>
                <option value="DESKTOP">Desktop Workstation</option>
                <option value="MOBILE">Mobile Phone</option>
                <option value="TABLET">Tablet Device</option>
                <option value="OTHER">Other Enterprise Endpoint</option>
              </select>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={loading}
              data-testid="device-bootstrap"
            >
              Enroll &amp; Trust This Device
            </Button>
          </form>
        )}

        <div className="auth-footer">
          <Link to="/login" style={{ fontWeight: 500 }}>
            ← Return to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
