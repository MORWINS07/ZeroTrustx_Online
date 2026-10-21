import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { sessionService } from '../services';
import DashboardLayout from '../components/DashboardLayout';
import Button from '../components/Button';
import Badge from '../components/Badge';
import DataTable from '../components/DataTable';
import ConfirmDialog from '../components/ConfirmDialog';

export default function SessionsPage() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const [confirmConfig, setConfirmConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    action: null,
    sessionId: null,
  });

  const loadSessions = async () => {
    try {
      setLoading(true);
      const r = await sessionService.getAll();
      setSessions(r.data.sessions || []);
    } catch (err) {
      setError('Failed to fetch active authentication sessions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const handleRevokeSingle = async (sessionId) => {
    setError('');
    setMessage('');
    try {
      await sessionService.revoke(sessionId);
      setMessage('Session successfully terminated and invalidated.');
      loadSessions();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to revoke session.');
    }
  };

  const handleRevokeAll = async () => {
    setError('');
    setMessage('');
    try {
      await sessionService.revokeAll();
      setMessage('All sessions revoked. Logging out now...');
      localStorage.clear();
      setTimeout(() => {
        navigate('/login');
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to revoke all sessions.');
    }
  };

  const currentSessionId = localStorage.getItem('sessionId');

  const columns = [
    {
      key: '_id',
      label: 'Session Context',
      sortable: true,
      render: (id) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="font-mono" style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
            {id?.slice(-10)}
          </span>
          {id === currentSessionId && (
            <Badge variant="info">This Device</Badge>
          )}
        </div>
      ),
    },
    {
      key: 'deviceId',
      label: 'Bound Device',
      render: (device) => (
        <div>
          <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
            {device?.name || 'Unknown Endpoint'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {device?.type || '—'}
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Session State',
      sortable: true,
      render: (status, row) => {
        const isExpired = new Date(row.expiresAt) < new Date();
        if (isExpired && status === 'ACTIVE') {
          return <Badge variant="warning" dot>EXPIRED</Badge>;
        }
        const variant = status === 'ACTIVE' ? 'success' : status === 'REVOKED' ? 'neutral' : 'warning';
        return <Badge variant={variant} dot>{status}</Badge>;
      },
    },
    {
      key: 'ipAddress',
      label: 'IP Address',
      render: (ip) => (
        <span className="font-mono" style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
          {ip || '127.0.0.1'}
        </span>
      ),
    },
    {
      key: 'lastActivityAt',
      label: 'Last Seen',
      sortable: true,
      render: (date) => (
        <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
          {date ? new Date(date).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
        </span>
      ),
    },
    {
      key: 'expiresAt',
      label: 'Expiry',
      sortable: true,
      render: (date) => (
        <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
          {new Date(date).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        row.status === 'ACTIVE' ? (
          <Button
            variant="ghost"
            size="sm"
            style={{ color: 'var(--apple-red)' }}
            onClick={() =>
              setConfirmConfig({
                isOpen: true,
                title: 'Terminate Session',
                message: `Are you sure you want to terminate session ${row._id?.slice(-8)}? The user will be required to re-authenticate.`,
                action: 'single',
                sessionId: row._id,
              })
            }
            data-testid="revoke-session-btn"
          >
            Terminate
          </Button>
        ) : (
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Revoked</span>
        )
      ),
    },
  ];

  return (
    <DashboardLayout
      title="Active Sessions"
      subtitle="Real-time cryptographic session tokens and active client connections."
      actions={
        <Button
          variant="danger"
          size="sm"
          onClick={() =>
            setConfirmConfig({
              isOpen: true,
              title: 'Revoke All Active Sessions',
              message: 'This will terminate ALL active logins across all devices, including this current session. You will be logged out immediately.',
              action: 'all',
              sessionId: null,
            })
          }
          data-testid="revoke-all-sessions-btn"
        >
          Terminate All Sessions
        </Button>
      }
    >
      {error && (
        <div className="alert alert-error" style={{ marginBottom: '1.5rem' }}>
          <span>⚠</span> {error}
        </div>
      )}
      {message && (
        <div className="alert alert-success" style={{ marginBottom: '1.5rem' }}>
          <span>✓</span> {message}
        </div>
      )}

      <DataTable
        columns={columns}
        data={sessions}
        loading={loading}
        searchPlaceholder="Filter sessions by ID, device, IP..."
        pageSize={10}
        emptyTitle="No active sessions found"
        emptyDesc="Session records appear when clients authenticate to ZeroTrustX."
        data-testid="sessions-table"
      />

      <ConfirmDialog
        isOpen={confirmConfig.isOpen}
        onClose={() => setConfirmConfig((c) => ({ ...c, isOpen: false }))}
        onConfirm={() => {
          if (confirmConfig.action === 'all') {
            handleRevokeAll();
          } else {
            handleRevokeSingle(confirmConfig.sessionId);
          }
          setConfirmConfig((c) => ({ ...c, isOpen: false }));
        }}
        title={confirmConfig.title}
        message={confirmConfig.message}
        confirmText="Terminate Session"
        variant="danger"
      />
    </DashboardLayout>
  );
}
