import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminService } from '../services';
import DashboardLayout from '../components/DashboardLayout';
import StatCard from '../components/StatCard';
import Badge from '../components/Badge';
import Button from '../components/Button';
import DataTable from '../components/DataTable';

export default function DashboardPage() {
  const [dash, setDash] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    adminService.getDashboard()
      .then((r) => setDash(r.data.dashboard))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load security dashboard metrics'))
      .finally(() => setLoading(false));
  }, []);

  const mfaPercent = dash?.users?.total
    ? Math.round((dash.users.mfaEnabled / dash.users.total) * 100)
    : 0;

  const totalAccessDecisions =
    (dash?.activity?.accessAllowedLast24h || 0) + (dash?.activity?.accessDeniedLast24h || 0);

  const eventColumns = [
    {
      key: 'eventType',
      label: 'Security Event',
      sortable: true,
      render: (type) => {
        let variant = 'info';
        if (type.includes('SUCCESS') || type.includes('ALLOWED') || type.includes('TRUSTED')) variant = 'success';
        if (type.includes('FAILED') || type.includes('DENIED') || type.includes('BLOCKED')) variant = 'danger';
        if (type.includes('REVOKED') || type.includes('PENDING')) variant = 'warning';
        return <Badge variant={variant} dot>{type}</Badge>;
      }
    },
    {
      key: 'actorUserId',
      label: 'Actor Identity',
      render: (actor) => (
        <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
          {actor ? actor.name || actor.email : 'System / Background Engine'}
        </span>
      )
    },
    {
      key: 'result',
      label: 'Outcome',
      sortable: true,
      render: (res) => (
        <Badge variant={res === 'SUCCESS' ? 'success' : 'danger'}>
          {res}
        </Badge>
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
            minute: '2-digit',
            second: '2-digit'
          })}
        </span>
      )
    }
  ];

  return (
    <DashboardLayout
      title="Security Overview"
      subtitle="Continuous identity, device health, and Zero Trust policy enforcement."
      actions={
        <div style={{ display: 'flex', gap: '8px' }}>
          <Link to="/access-requests">
            <Button variant="secondary" size="sm">Evaluate Access</Button>
          </Link>
          <Link to="/audit-logs">
            <Button variant="primary" size="sm">View Audit Trail</Button>
          </Link>
        </div>
      }
    >
      {error && (
        <div className="alert alert-error" style={{ marginBottom: '1.5rem' }}>
          <span>⚠</span> {error}
        </div>
      )}

      {/* Primary Apple-style Posture Cards */}
      <div style={{ marginBottom: '2rem' }}>
        <div className="section-header">
          <h2 className="section-title">Security Posture</h2>
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Real-time telemetry</span>
        </div>
        <div className="stats-grid">
          <StatCard
            label="MFA Coverage"
            value={dash ? `${mfaPercent}%` : '—'}
            subtext={`${dash?.users?.mfaEnabled || 0} of ${dash?.users?.total || 0} users enrolled`}
            icon="🔐"
            data-testid="stat-mfa-coverage"
          />
          <StatCard
            label="Trusted Devices"
            value={dash?.devices?.trusted ?? '—'}
            subtext={`${dash?.devices?.pending || 0} pending review`}
            icon="💻"
            data-testid="stat-trusted-devices"
          />
          <StatCard
            label="Active Sessions"
            value={dash?.sessions?.active ?? '—'}
            subtext="Live authenticated contexts"
            icon="⏱"
            data-testid="stat-active-sessions"
          />
          <StatCard
            label="Access Decisions (24h)"
            value={totalAccessDecisions}
            subtext={`${dash?.activity?.accessDeniedLast24h || 0} denials blocked`}
            icon="🛡️"
            data-testid="stat-access-decisions"
          />
        </div>
      </div>

      {/* Secondary Metrics: Identity & Access Health */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        {/* Identity Status Card */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 600 }}>Identity Health</h3>
            <Badge variant="neutral">{dash?.users?.total || 0} Users</Badge>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Active Accounts</span>
              <span style={{ fontWeight: 600 }}>{dash?.users?.active || 0}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Locked / Suspended</span>
              <span style={{ fontWeight: 600, color: dash?.users?.locked ? 'var(--apple-red)' : 'var(--text-primary)' }}>
                {dash?.users?.locked || 0}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Logins Last 24h</span>
              <span style={{ fontWeight: 600, color: 'var(--apple-green)' }}>
                {dash?.activity?.loginSuccessLast24h || 0}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Failed Auth Attempts (24h)</span>
              <span style={{ fontWeight: 600, color: dash?.activity?.loginFailedLast24h ? 'var(--apple-red)' : 'var(--text-muted)' }}>
                {dash?.activity?.loginFailedLast24h || 0}
              </span>
            </div>
          </div>
        </div>

        {/* Device Perimeter Card */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 600 }}>Device Perimeter</h3>
            <Badge variant="neutral">
              {(dash?.devices?.trusted || 0) + (dash?.devices?.pending || 0) + (dash?.devices?.blocked || 0)} Enrolled
            </Badge>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Verified Trusted</span>
              <span style={{ fontWeight: 600, color: 'var(--apple-green)' }}>{dash?.devices?.trusted || 0}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Pending Authorization</span>
              <span style={{ fontWeight: 600, color: 'var(--apple-amber)' }}>{dash?.devices?.pending || 0}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Blocked / Blacklisted</span>
              <span style={{ fontWeight: 600, color: dash?.devices?.blocked ? 'var(--apple-red)' : 'var(--text-muted)' }}>
                {dash?.devices?.blocked || 0}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Revoked / Quarantined</span>
              <span style={{ fontWeight: 600 }}>{dash?.devices?.revoked || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Security Activity DataTable */}
      <div>
        <div className="section-header">
          <h2 className="section-title">Recent Security Events</h2>
          <Link to="/audit-logs" style={{ fontSize: '0.8125rem', color: 'var(--accent-primary)', fontWeight: 500 }}>
            View Full Audit Trail →
          </Link>
        </div>

        <DataTable
          columns={eventColumns}
          data={dash?.recentEvents || []}
          loading={loading}
          searchPlaceholder="Filter recent security events..."
          pageSize={5}
          emptyTitle="No recent security events"
          emptyDesc="Audit events will appear here as authentication and access requests are evaluated."
          data-testid="dashboard-events-table"
        />
      </div>
    </DashboardLayout>
  );
}
