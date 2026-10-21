import React, { useState, useEffect } from 'react';
import { adminService } from '../../services';
import DashboardLayout from '../../components/DashboardLayout';
import Button from '../../components/Button';
import Badge from '../../components/Badge';
import DataTable from '../../components/DataTable';
import ConfirmDialog from '../../components/ConfirmDialog';

export default function UsersAdminPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [confirmConfig, setConfirmConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    action: null,
    userId: null,
    newStatus: '',
  });

  const loadUsers = () => {
    setLoading(true);
    const params = statusFilter ? { status: statusFilter } : {};
    adminService.getUsers(params)
      .then((r) => setUsers(r.data.users || []))
      .catch(() => setError('Failed to retrieve user accounts.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadUsers();
  }, [statusFilter]);

  const handleStatusChange = async (userId, status) => {
    setError('');
    setMessage('');
    try {
      await adminService.updateUserStatus(userId, status);
      setMessage(`User account state successfully set to ${status}.`);
      loadUsers();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update user account status.');
    }
  };

  const statusVariant = {
    ACTIVE: 'success',
    SUSPENDED: 'warning',
    LOCKED: 'danger',
  };

  const columns = [
    {
      key: 'name',
      label: 'User Identity',
      sortable: true,
      render: (name, row) => (
        <div>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{name}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{row.email}</div>
        </div>
      ),
    },
    {
      key: 'roles',
      label: 'Assigned RBAC Roles',
      render: (roles) => (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
          {(roles || []).length > 0 ? (
            roles.map((r) => (
              <Badge key={r._id || r} variant="neutral">
                {r.name || r}
              </Badge>
            ))
          ) : (
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No Roles</span>
          )}
        </div>
      ),
    },
    {
      key: 'accountStatus',
      label: 'Account Status',
      sortable: true,
      render: (status) => (
        <Badge variant={statusVariant[status] || 'neutral'} dot>
          {status}
        </Badge>
      ),
    },
    {
      key: 'failedLoginAttempts',
      label: 'Failed Logins',
      sortable: true,
      render: (fails) => (
        <span
          className="font-mono"
          style={{
            fontWeight: fails > 0 ? 600 : 400,
            color: fails > 0 ? 'var(--apple-amber)' : 'var(--text-muted)',
          }}
        >
          {fails || 0}
        </span>
      ),
    },
    {
      key: 'lastLoginAt',
      label: 'Last Authentication',
      sortable: true,
      render: (date) => (
        <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
          {date ? new Date(date).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Never'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Administration',
      render: (_, row) => (
        <div style={{ display: 'flex', gap: '6px' }}>
          {row.accountStatus !== 'ACTIVE' && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleStatusChange(row._id, 'ACTIVE')}
            >
              Activate
            </Button>
          )}
          {row.accountStatus !== 'SUSPENDED' && (
            <Button
              variant="ghost"
              size="sm"
              style={{ color: 'var(--apple-amber)' }}
              onClick={() =>
                setConfirmConfig({
                  isOpen: true,
                  title: 'Suspend User Account',
                  message: `Are you sure you want to suspend "${row.name}" (${row.email})? They will be unable to log in until reactivated.`,
                  userId: row._id,
                  newStatus: 'SUSPENDED',
                })
              }
            >
              Suspend
            </Button>
          )}
          {row.accountStatus === 'LOCKED' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleStatusChange(row._id, 'ACTIVE')}
            >
              Unlock
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout
      title="User Management"
      subtitle="Enterprise directory administration, account lifecycles, and security posture controls."
      actions={
        <div style={{ display: 'flex', gap: '8px' }}>
          <select
            className="form-select"
            style={{ width: 'auto', minWidth: '160px', padding: '6px 12px', fontSize: '0.8125rem' }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            data-testid="user-status-filter"
          >
            <option value="">All Account Statuses</option>
            <option value="ACTIVE">Active Only</option>
            <option value="SUSPENDED">Suspended Only</option>
            <option value="LOCKED">Locked Only</option>
          </select>
          <Button variant="secondary" size="sm" onClick={loadUsers}>
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
      {message && (
        <div className="alert alert-success" style={{ marginBottom: '1.5rem' }}>
          <span>✓</span> {message}
        </div>
      )}

      <DataTable
        columns={columns}
        data={users}
        loading={loading}
        searchPlaceholder="Search users by name, email, role..."
        pageSize={10}
        emptyTitle="No users found"
        emptyDesc="Registered enterprise users will appear here."
        data-testid="users-table"
      />

      <ConfirmDialog
        isOpen={confirmConfig.isOpen}
        onClose={() => setConfirmConfig((c) => ({ ...c, isOpen: false }))}
        onConfirm={() => {
          handleStatusChange(confirmConfig.userId, confirmConfig.newStatus);
          setConfirmConfig((c) => ({ ...c, isOpen: false }));
        }}
        title={confirmConfig.title}
        message={confirmConfig.message}
        confirmText="Confirm Status Update"
        variant="warning"
      />
    </DashboardLayout>
  );
}
