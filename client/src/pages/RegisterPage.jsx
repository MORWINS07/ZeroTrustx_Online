import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import Button from '../components/Button';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const resp = await axios.post('/api/v1/auth/register', {
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password
      });

      const token = resp.data?.bootstrapToken || resp.data?.data?.bootstrapToken;
      if (token) {
        sessionStorage.setItem('bootstrapToken', token);
      }

      navigate('/device-enroll');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-layout" data-testid="register-page">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">🛡</div>
          <h1 className="auth-title">Create Account</h1>
          <p className="auth-subtitle">Register for ZeroTrustX Enterprise Access</p>
        </div>

        {error && (
          <div className="alert alert-error" data-testid="register-error">
            <span>⚠</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} id="register-form">
          <div className="form-group">
            <label className="form-label" htmlFor="name">Full Name</label>
            <input
              id="name"
              name="name"
              type="text"
              className="form-input"
              placeholder="Alex Morgan"
              value={form.name}
              onChange={handleChange}
              required
              data-testid="register-name"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="email">Work Email</label>
            <input
              id="email"
              name="email"
              type="email"
              className="form-input"
              placeholder="alex@company.com"
              value={form.email}
              onChange={handleChange}
              required
              autoComplete="email"
              data-testid="register-email"
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
              autoComplete="new-password"
              data-testid="register-password"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="confirmPassword">Confirm Password</label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              className="form-input"
              placeholder="••••••••••••"
              value={form.confirmPassword}
              onChange={handleChange}
              required
              autoComplete="new-password"
              data-testid="register-confirm-password"
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            loading={loading}
            data-testid="register-submit"
          >
            Continue to Device Enrollment
          </Button>
        </form>

        <div className="auth-footer">
          Already enrolled?{' '}
          <Link to="/login" style={{ fontWeight: 600 }}>
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
