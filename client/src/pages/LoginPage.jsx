import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services';
import Button from '../components/Button';

function getDeviceId() {
  let id = localStorage.getItem('deviceId');
  if (!id) {
    id = 'dev-' + crypto.randomUUID();
    localStorage.setItem('deviceId', id);
  }
  return id;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [deviceNotTrusted, setDeviceNotTrusted] = useState(false);
  const [loading, setLoading] = useState(false);
  const deviceId = getDeviceId();

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
    setDeviceNotTrusted(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setDeviceNotTrusted(false);

    try {
      const resp = await authService.login(form.email, form.password, deviceId);
      const data = resp.data;

      if (data.mfaRequired) {
        sessionStorage.setItem('mfaChallengeToken', data.mfaChallengeToken);
        sessionStorage.setItem('pendingUser', JSON.stringify(data.user));
        navigate('/mfa-verify');
        return;
      }

      login(data.user, {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        session: data.session
      });

      navigate('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.message || 'Authentication failed. Please verify your credentials.';
      if (msg.toLowerCase().includes('device') && msg.toLowerCase().includes('not trusted')) {
        setDeviceNotTrusted(true);
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-layout" data-testid="login-page">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">🛡</div>
          <h1 className="auth-title">ZeroTrustX</h1>
          <p className="auth-subtitle">Enterprise Access Management System</p>
        </div>

        {error && (
          <div className="alert alert-error" data-testid="login-error">
            <span>⚠</span>
            <span>{error}</span>
          </div>
        )}

        {deviceNotTrusted && (
          <div className="alert alert-warning" data-testid="login-device-error" style={{
            borderLeft: '3px solid var(--color-warning, #f59e0b)',
            background: 'rgba(245,158,11,0.08)'
          }}>
            <span>🔒</span>
            <div style={{ fontSize: '13px' }}>
              <strong>Device Not Enrolled</strong><br />
              This browser is not registered as a trusted device. You must enroll it before you can sign in.
              <br />
              <Link to="/device-enroll" style={{ fontWeight: 600, marginTop: '6px', display: 'inline-block' }}>
                → Enroll This Device
              </Link>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} id="login-form">
          <div className="form-group">
            <label className="form-label" htmlFor="email">Email Address</label>
            <input
              id="email"
              name="email"
              type="email"
              className="form-input"
              placeholder="operator@company.com"
              value={form.email}
              onChange={handleChange}
              required
              autoComplete="email"
              data-testid="login-email"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              className="form-input"
              placeholder="••••••••••••"
              value={form.password}
              onChange={handleChange}
              required
              autoComplete="current-password"
              data-testid="login-password"
            />
          </div>

          <div className="alert alert-info" style={{ marginTop: '4px', marginBottom: '16px' }}>
            <span>ℹ</span>
            <div style={{ fontSize: '12px' }}>
              Zero Trust device verification is active (<code>{deviceId.slice(0, 10)}...</code>).
              New user? <Link to="/register">Register</Link> · Need to enroll this device? <Link to="/device-enroll">Enroll Device</Link>
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            loading={loading}
            data-testid="login-submit"
          >
            Sign In
          </Button>
        </form>

        <div className="auth-footer">
          Don't have an enterprise account?{' '}
          <Link to="/register" style={{ fontWeight: 600 }}>
            Register new user
          </Link>
        </div>
      </div>
    </div>
  );
}

