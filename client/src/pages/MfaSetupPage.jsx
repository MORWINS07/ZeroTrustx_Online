import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { mfaService } from '../services';
import DashboardLayout from '../components/DashboardLayout';
import Button from '../components/Button';
import Badge from '../components/Badge';
import { QRCodeSVG } from 'qrcode.react';

export default function MfaSetupPage() {
  const { user } = useAuth();
  const [mfaStatus, setMfaStatus] = useState(null);
  const [setupData, setSetupData] = useState(null);
  const [verifyToken, setVerifyToken] = useState('');
  const [disableToken, setDisableToken] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(true);

  const loadStatus = async () => {
    try {
      const r = await mfaService.getStatus();
      setMfaStatus(r.data);
    } catch (_) {
      setError('Unable to load current MFA configuration status.');
    } finally {
      setLoadingStatus(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const handleSetup = async () => {
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const r = await mfaService.setup();
      setSetupData(r.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to initialize MFA setup.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!verifyToken || verifyToken.length !== 6) {
      setError('Please enter the 6-digit code shown in your authenticator app.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await mfaService.verify(verifyToken);
      setMessage('Two-Factor Authentication has been successfully enabled for your account.');
      setSetupData(null);
      setVerifyToken('');
      await loadStatus();
    } catch (err) {
      setError(err.response?.data?.message || 'Verification failed. Please check the code and ensure your device clock is synchronized.');
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async (e) => {
    e.preventDefault();
    if (!disableToken || disableToken.length !== 6) {
      setError('Please enter the current 6-digit code to authorize disabling MFA.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await mfaService.disable(disableToken);
      setMessage('Two-Factor Authentication has been disabled.');
      setDisableToken('');
      await loadStatus();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to disable MFA. Code was invalid.');
    } finally {
      setLoading(false);
    }
  };

  const isEnabled = mfaStatus?.enabled;

  return (
    <DashboardLayout
      title="Multi-Factor Authentication"
      subtitle="Protect your enterprise credentials using RFC 6238 Time-based One-Time Passwords (TOTP)."
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '800px' }} data-testid="mfa-setup-page">
        {/* Status Banner / Card */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">MFA Protection Status</div>
              <div className="card-subtitle">Zero Trust policy requires active MFA on high-sensitivity resources</div>
            </div>
            {loadingStatus ? (
              <span className="spinner" />
            ) : isEnabled ? (
              <Badge variant="success" dot data-testid="mfa-status-badge">
                Active & Enforced
              </Badge>
            ) : (
              <Badge variant="warning" dot data-testid="mfa-status-badge">
                Not Configured
              </Badge>
            )}
          </div>

          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '16px' }}>
            {isEnabled
              ? `TOTP verification is enabled. Authenticator codes are checked during logins and privilege escalations. Last verified: ${mfaStatus?.verifiedAt ? new Date(mfaStatus.verifiedAt).toLocaleDateString() : 'Active'}.`
              : 'Your account is currently using single-factor password authentication. Access to sensitive enterprise resources will be blocked until MFA is enabled.'}
          </p>

          {message && (
            <div className="alert alert-success">
              <span>✓</span>
              <span>{message}</span>
            </div>
          )}

          {error && (
            <div className="alert alert-error">
              <span>⚠</span>
              <span>{error}</span>
            </div>
          )}

          {!isEnabled && !setupData && (
            <Button
              variant="primary"
              onClick={handleSetup}
              loading={loading}
              data-testid="mfa-setup-button"
            >
              Configure Google Authenticator
            </Button>
          )}
        </div>

        {/* Step-by-Step Enrollment Card */}
        {setupData && (
          <div className="card" data-testid="mfa-enrollment-card">
            <div className="card-header">
              <div className="card-title">Step 1: Scan QR Code with Authenticator App</div>
            </div>

            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{
                background: '#FFFFFF',
                padding: '16px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                boxShadow: 'var(--shadow-sm)'
              }}>
                <QRCodeSVG
                  value={setupData.otpauthUrl}
                  size={180}
                  level="M"
                  includeMargin={false}
                />
              </div>

              <div style={{ flex: 1, minWidth: '260px' }}>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                  Open <strong>Google Authenticator</strong>, <strong>Authy</strong>, or <strong>1Password</strong> on your mobile device and scan this QR code.
                </p>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Or enter secret key manually</label>
                  <input
                    className="form-input font-mono"
                    value={setupData.secret}
                    readOnly
                    style={{
                      fontSize: '12px',
                      backgroundColor: 'var(--bg-secondary)',
                      letterSpacing: '0.05em'
                    }}
                    data-testid="mfa-secret-display"
                  />
                </div>
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '20px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>
                Step 2: Enter the 6-Digit Code to Confirm
              </h4>
              <form onSubmit={handleVerify} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <div style={{ width: '180px' }}>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    className="form-input"
                    placeholder="000000"
                    value={verifyToken}
                    onChange={e => setVerifyToken(e.target.value.replace(/\D/g, ''))}
                    style={{
                      textAlign: 'center',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '18px',
                      letterSpacing: '0.25em',
                      fontWeight: 600
                    }}
                    required
                    data-testid="mfa-verify-input"
                  />
                </div>
                <Button
                  type="submit"
                  variant="primary"
                  loading={loading}
                  disabled={verifyToken.length !== 6}
                  data-testid="mfa-enable-submit"
                >
                  Verify & Activate MFA
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setSetupData(null)}
                >
                  Cancel
                </Button>
              </form>
            </div>
          </div>
        )}

        {/* Disable MFA Card (only when active) */}
        {isEnabled && (
          <div className="card" style={{ borderLeft: '3px solid var(--border-strong)' }}>
            <div className="card-header">
              <div className="card-title">Disable Two-Factor Authentication</div>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              To deactivate TOTP protection, enter your current 6-digit code. Disabling MFA will reduce your account security posture.
            </p>
            <form onSubmit={handleDisable} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div style={{ width: '160px' }}>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  className="form-input"
                  placeholder="000000"
                  value={disableToken}
                  onChange={e => setDisableToken(e.target.value.replace(/\D/g, ''))}
                  style={{
                    textAlign: 'center',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '16px',
                    letterSpacing: '0.2em'
                  }}
                  required
                  data-testid="mfa-disable-input"
                />
              </div>
              <Button
                type="submit"
                variant="destructive"
                loading={loading}
                disabled={disableToken.length !== 6}
                data-testid="mfa-disable-submit"
              >
                Disable MFA
              </Button>
            </form>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
