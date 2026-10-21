import React, { useState, useEffect } from 'react';
import { resourceService, policyService, accessService, deviceService, sessionService } from '../services';
import DashboardLayout from '../components/DashboardLayout';
import Button from '../components/Button';
import Badge from '../components/Badge';
import DataTable from '../components/DataTable';
import EmptyState from '../components/EmptyState';

export default function AccessRequestsPage() {
  const [resources, setResources] = useState([]);
  const [myDevices, setMyDevices] = useState([]);
  const [mySessions, setMySessions] = useState([]);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const [form, setForm] = useState({
    resourceId: '',
    deviceId: '',
    sessionId: '',
    requestedAction: 'read'
  });

  const [result, setResult] = useState(null);
  const [evaluating, setEvaluating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Load resources
    resourceService.getAll()
      .then((r) => setResources(r.data.resources || []))
      .catch(() => {});

    // Load user devices for dropdown
    deviceService.getMine()
      .then((r) => {
        const devs = r.data.devices || [];
        setMyDevices(devs);
        if (devs.length > 0 && !form.deviceId) {
          const trusted = devs.find((d) => d.status === 'TRUSTED');
          setForm((f) => ({ ...f, deviceId: (trusted || devs[0])._id }));
        }
      })
      .catch(() => {});

    // Load active sessions for dropdown
    sessionService.getAll()
      .then((r) => {
        const sess = r.data.sessions || [];
        setMySessions(sess);
        const active = sess.filter((s) => s.status === 'ACTIVE');
        const currentSessId = localStorage.getItem('sessionId');
        const matched = active.find((s) => s._id === currentSessId) || sess.find((s) => s._id === currentSessId);
        if (matched) {
          setForm((f) => ({ ...f, sessionId: matched._id }));
        } else if (active.length > 0) {
          setForm((f) => ({ ...f, sessionId: active[0]._id }));
        } else if (sess.length > 0) {
          setForm((f) => ({ ...f, sessionId: sess[0]._id }));
        }
      })
      .catch(() => {});

    // Load access history
    loadHistory();
  }, []);

  const loadHistory = () => {
    setLoadingHistory(true);
    accessService.getHistory()
      .then((r) => setHistory(r.data.accessRequests || []))
      .catch(() => {})
      .finally(() => setLoadingHistory(false));
  };

  const handleEvaluate = async (e) => {
    e.preventDefault();
    if (!form.resourceId || !form.deviceId || !form.sessionId) {
      setError('Please select a Resource, Device, and Session to evaluate.');
      return;
    }

    setEvaluating(true);
    setError('');
    setResult(null);

    try {
      const resp = await accessService.evaluate({
        resourceId: form.resourceId,
        deviceId: form.deviceId,
        sessionId: form.sessionId,
        requestedAction: form.requestedAction,
      });
      setResult(resp.data);
      loadHistory();
    } catch (err) {
      setError(err.response?.data?.message || 'Access evaluation failed.');
    } finally {
      setEvaluating(false);
    }
  };

  const historyColumns = [
    {
      key: 'decision',
      label: 'Decision',
      sortable: true,
      render: (dec) => (
        <Badge variant={dec === 'ALLOW' ? 'success' : 'danger'} dot>
          {dec}
        </Badge>
      )
    },
    {
      key: 'resourceId',
      label: 'Resource',
      render: (res) => (
        <span style={{ fontWeight: 500 }}>
          {res?.name || (typeof res === 'string' ? res : 'Unknown')}
        </span>
      )
    },
    {
      key: 'requestedAction',
      label: 'Action',
      render: (act) => (
        <span className="mono" style={{ textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 600 }}>
          {act}
        </span>
      )
    },
    {
      key: 'decisionReason',
      label: 'Evaluation Rationale',
      render: (reason) => (
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', maxWidth: 280, display: 'inline-block' }}>
          {reason}
        </span>
      )
    },
    {
      key: 'createdAt',
      label: 'Timestamp',
      sortable: true,
      render: (date) => (
        <span style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
          {new Date(date).toLocaleString(undefined, {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </span>
      )
    }
  ];

  return (
    <DashboardLayout
      title="Access Control Engine"
      subtitle="Deterministic Zero Trust policy and contextual access verification."
    >
      {error && (
        <div className="alert alert-error" style={{ marginBottom: '1.5rem' }}>
          <span>⚠</span> {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(350px, 1.2fr) minmax(350px, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* Request Form */}
        <div className="card" style={{ padding: '1.75rem' }}>
          <div style={{ marginBottom: '1.25rem' }}>
            <h2 style={{ fontSize: '1.0625rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Evaluate Access Request
            </h2>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
              Submit a contextual request for dynamic policy evaluation.
            </p>
          </div>

          <form onSubmit={handleEvaluate} id="access-eval-form">
            <div className="form-group">
              <label className="form-label">Target Resource *</label>
              <select
                className="form-select"
                value={form.resourceId}
                onChange={(e) => setForm((f) => ({ ...f, resourceId: e.target.value }))}
                required
                data-testid="access-resource-select"
              >
                <option value="">Select a protected resource...</option>
                {resources.map((r) => (
                  <option key={r._id} value={r._id}>
                    {r.name} ({r.sensitivity}) — {r.type}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Requested Action *</label>
              <select
                className="form-select"
                value={form.requestedAction}
                onChange={(e) => setForm((f) => ({ ...f, requestedAction: e.target.value }))}
                data-testid="access-action-select"
              >
                <option value="read">read</option>
                <option value="write">write</option>
                <option value="delete">delete</option>
                <option value="admin">admin</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Client Device *</label>
              <select
                className="form-select font-mono"
                value={form.deviceId}
                onChange={(e) => setForm((f) => ({ ...f, deviceId: e.target.value }))}
                required
                data-testid="access-device-select"
              >
                <option value="">Select enrolled device...</option>
                {myDevices.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.deviceName || d.deviceIdentifier} [{d.status}] ({d._id})
                  </option>
                ))}
              </select>
              <span className="form-hint">
                Must be an enrolled, TRUSTED device to satisfy Zero Trust perimeter criteria.
              </span>
            </div>

            <div className="form-group">
              <label className="form-label">Authenticated Session *</label>
              <select
                className="form-select font-mono"
                value={form.sessionId}
                onChange={(e) => setForm((f) => ({ ...f, sessionId: e.target.value }))}
                required
                data-testid="access-session-select"
              >
                <option value="">Select active session context...</option>
                {mySessions.map((s) => (
                  <option key={s._id} value={s._id}>
                    Session {s._id} ({s.isActive ? 'Active' : 'Expired/Revoked'})
                  </option>
                ))}
              </select>
              <span className="form-hint">
                Verified against valid, non-revoked session records.
              </span>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={evaluating}
              style={{ width: '100%', marginTop: '1rem' }}
              id="evaluate-access-btn"
              data-testid="evaluate-access-btn"
            >
              Evaluate Zero Trust Decision
            </Button>
          </form>
        </div>

        {/* Evaluation Verdict & Signal Breakdown */}
        <div>
          {result ? (
            <div
              className="card"
              style={{
                padding: '1.75rem',
                borderTop: `4px solid ${result.decision === 'ALLOW' ? 'var(--apple-green)' : 'var(--apple-red)'}`
              }}
              data-testid="access-decision-result"
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
                    Policy Verdict
                  </span>
                  <h3 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '2px 0 0 0', color: result.decision === 'ALLOW' ? 'var(--apple-green)' : 'var(--apple-red)' }}>
                    {result.decision === 'ALLOW' ? '✓ ACCESS GRANTED' : '✗ ACCESS DENIED'}
                  </h3>
                </div>
                <Badge variant={result.decision === 'ALLOW' ? 'success' : 'danger'} size="lg">
                  {result.decision}
                </Badge>
              </div>

              <div
                style={{
                  padding: '0.875rem 1rem',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--bg-secondary)',
                  fontSize: '0.875rem',
                  color: 'var(--text-primary)',
                  marginBottom: '1.5rem',
                  lineHeight: 1.5
                }}
              >
                <strong>Evaluation Rationale:</strong> {result.decisionReason}
              </div>

              <div>
                <h4 style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.75rem' }}>
                  Zero Trust Signal Matrix
                </h4>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {result.checks &&
                    Object.entries(result.checks).map(([key, val]) => (
                      <div
                        key={key}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '0.5rem 0.75rem',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border-color)',
                          backgroundColor: 'var(--bg-card)'
                        }}
                      >
                        <span style={{ fontSize: '0.875rem', fontWeight: 500, textTransform: 'capitalize' }}>
                          {key.replace(/([A-Z])/g, ' $1')}
                        </span>
                        <Badge variant={val.status === 'PASS' ? 'success' : 'danger'} dot>
                          {val.status}
                        </Badge>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="card" style={{ padding: '3rem 2rem', textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <EmptyState
                icon="🛡️"
                title="Awaiting Evaluation"
                description="Select target resources and client signals to initiate real-time Zero Trust multi-signal policy calculation."
              />
            </div>
          )}
        </div>
      </div>

      {/* Historical Access Requests */}
      <div>
        <div className="section-header">
          <h2 className="section-title">Access Request Audit Log</h2>
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            Immutable historical record of access evaluations
          </span>
        </div>

        <DataTable
          columns={historyColumns}
          data={history}
          loading={loadingHistory}
          searchPlaceholder="Search access evaluations by reason, action..."
          pageSize={8}
          emptyTitle="No access requests recorded"
          emptyDesc="Perform an access evaluation above to populate the ledger."
          data-testid="access-history-table"
        />
      </div>
    </DashboardLayout>
  );
}
