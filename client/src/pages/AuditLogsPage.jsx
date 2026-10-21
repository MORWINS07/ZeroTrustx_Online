import React, { useState, useEffect } from 'react';
import { auditService } from '../services';
import DashboardLayout from '../components/DashboardLayout';
import Badge from '../components/Badge';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import Button from '../components/Button';

export default function AuditLogsPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [selectedEvent, setSelectedEvent] = useState(null);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = () => {
    setLoading(true);
    auditService.getAll()
      .then((r) => setEvents(r.data.events || []))
      .catch(() => setError('Failed to retrieve immutable audit ledger.'))
      .finally(() => setLoading(false));
  };

  const filteredEvents = categoryFilter
    ? events.filter((e) => {
        if (categoryFilter === 'FAILURE') return e.result === 'FAILURE';
        return e.eventType?.includes(categoryFilter);
      })
    : events;

  const eventBadge = (type, result) => {
    let variant = 'info';
    if (result === 'FAILURE' || type.includes('FAILED') || type.includes('DENIED') || type.includes('BLOCKED')) {
      variant = 'danger';
    } else if (type.includes('SUCCESS') || type.includes('ALLOWED') || type.includes('TRUSTED') || type.includes('ENABLED')) {
      variant = 'success';
    } else if (type.includes('REVOKED') || type.includes('PENDING')) {
      variant = 'warning';
    }
    return <Badge variant={variant} dot>{type}</Badge>;
  };

  const columns = [
    {
      key: 'eventType',
      label: 'Security Event',
      sortable: true,
      render: (type, row) => eventBadge(type, row.result),
    },
    {
      key: 'actorUserId',
      label: 'Principal Actor',
      render: (actor) => (
        <div>
          <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
            {actor?.name || (actor ? 'Unknown Principal' : 'System Engine')}
          </div>
          {actor?.email && (
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {actor.email}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'action',
      label: 'Evaluated Action',
      sortable: true,
      render: (action) => (
        <span className="font-mono" style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
          {action || '—'}
        </span>
      ),
    },
    {
      key: 'result',
      label: 'Ledger Outcome',
      sortable: true,
      render: (res) => (
        <Badge variant={res === 'SUCCESS' ? 'success' : 'danger'}>
          {res}
        </Badge>
      ),
    },
    {
      key: 'ipAddress',
      label: 'Client IP',
      render: (ip) => (
        <span className="font-mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          {ip || '127.0.0.1'}
        </span>
      ),
    },
    {
      key: 'createdAt',
      label: 'Timestamp',
      sortable: true,
      render: (date) => (
        <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
          {new Date(date).toLocaleString(undefined, {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })}
        </span>
      ),
    },
    {
      key: 'inspect',
      label: 'Audit Evidence',
      render: (_, row) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSelectedEvent(row)}
          style={{ fontSize: '0.75rem' }}
        >
          Inspect
        </Button>
      ),
    },
  ];

  return (
    <DashboardLayout
      title="Security Audit Trail"
      subtitle="Cryptographically logged, non-repudiable audit events for compliance and threat analysis."
      actions={
        <div style={{ display: 'flex', gap: '8px' }}>
          <select
            className="form-select"
            style={{ width: 'auto', minWidth: '180px', padding: '6px 12px', fontSize: '0.8125rem' }}
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            data-testid="audit-category-filter"
          >
            <option value="">All Event Domains</option>
            <option value="LOGIN">Authentication Events</option>
            <option value="MFA">MFA / TOTP Operations</option>
            <option value="DEVICE">Device Lifecycle</option>
            <option value="ACCESS">Zero Trust Access Decisions</option>
            <option value="SESSION">Session Invalidation</option>
            <option value="FAILURE">Security Exceptions & Failures</option>
          </select>
          <Button variant="secondary" size="sm" onClick={loadEvents}>
            Refresh
          </Button>
        </div>
      }
    >
      {error && (
        <div className="alert alert-error" style={{ marginBottom: '1.5rem' }}>
          <span>⚠</span> {error}
        </div>
      )}

      <DataTable
        columns={columns}
        data={filteredEvents}
        loading={loading}
        searchPlaceholder="Filter audit records by actor, action, IP..."
        pageSize={12}
        emptyTitle="No audit records available"
        emptyDesc="Security activities will appear here as authentication and access evaluations occur."
        data-testid="audit-table"
      />

      {/* Audit Evidence Modal */}
      <Modal
        isOpen={Boolean(selectedEvent)}
        onClose={() => setSelectedEvent(null)}
        title="Audit Evidence Inspection"
        subtitle={`Event UUID: ${selectedEvent?._id || ''}`}
        footer={
          <Button variant="primary" onClick={() => setSelectedEvent(null)}>
            Close Inspection
          </Button>
        }
      >
        {selectedEvent && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.875rem' }}>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>EVENT TYPE</span>
                <strong>{selectedEvent.eventType}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>OUTCOME</span>
                <Badge variant={selectedEvent.result === 'SUCCESS' ? 'success' : 'danger'}>
                  {selectedEvent.result}
                </Badge>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>ACTOR</span>
                <span>{selectedEvent.actorUserId?.email || 'System / Service Engine'}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>IP ADDRESS</span>
                <span className="font-mono">{selectedEvent.ipAddress || '127.0.0.1'}</span>
              </div>
            </div>

            <div>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem', marginBottom: '4px' }}>
                RAW CONTEXTUAL METADATA (SANITIZED)
              </span>
              <pre
                className="font-mono"
                style={{
                  padding: '1rem',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  maxHeight: '260px',
                  overflowY: 'auto',
                  fontSize: '0.75rem',
                  lineHeight: 1.5,
                }}
              >
                {JSON.stringify(selectedEvent.metadata || {}, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </Modal>
    </DashboardLayout>
  );
}
