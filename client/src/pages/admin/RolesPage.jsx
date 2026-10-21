import React, { useState, useEffect } from 'react';
import { roleService, permissionService } from '../../services';
import DashboardLayout from '../../components/DashboardLayout';
import Button from '../../components/Button';
import Badge from '../../components/Badge';
import DataTable from '../../components/DataTable';
import Modal from '../../components/Modal';

export default function RolesPage() {
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Modals
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isPermModalOpen, setIsPermModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const [roleForm, setRoleForm] = useState({ name: '', description: '' });
  const [permForm, setPermForm] = useState({ name: '', resource: '', action: 'read', description: '' });

  const loadData = async () => {
    try {
      setLoading(true);
      const [rRes, pRes] = await Promise.all([roleService.getAll(), permissionService.getAll()]);
      setRoles(rRes.data.roles || []);
      setPermissions(pRes.data.permissions || []);
    } catch {
      setError('Failed to fetch RBAC roles and permissions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateRole = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setCreating(true);

    try {
      await roleService.create(roleForm);
      setMessage('Role successfully defined.');
      setIsRoleModalOpen(false);
      setRoleForm({ name: '', description: '' });
      loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create role.');
    } finally {
      setCreating(false);
    }
  };

  const handleCreatePerm = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setCreating(true);

    try {
      await permissionService.create(permForm);
      setMessage('Granular permission successfully created.');
      setIsPermModalOpen(false);
      setPermForm({ name: '', resource: '', action: 'read', description: '' });
      loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create permission.');
    } finally {
      setCreating(false);
    }
  };

  const resourcesList = [
    'users',
    'devices',
    'sessions',
    'roles',
    'permissions',
    'resources',
    'policies',
    'audit_events',
    'access_requests',
  ];

  const actionsList = ['read', 'write', 'delete', 'admin'];

  const permColumns = [
    {
      key: 'name',
      label: 'Permission Name',
      sortable: true,
      render: (name, row) => (
        <div>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{name}</div>
          {row.description && (
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{row.description}</div>
          )}
        </div>
      ),
    },
    {
      key: 'resource',
      label: 'Resource Target',
      sortable: true,
      render: (res) => (
        <span className="font-mono" style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
          {res}
        </span>
      ),
    },
    {
      key: 'action',
      label: 'Allowed Action',
      sortable: true,
      render: (act) => (
        <span className="badge badge-neutral font-mono" style={{ textTransform: 'uppercase', fontSize: '0.6875rem' }}>
          {act}
        </span>
      ),
    },
  ];

  return (
    <DashboardLayout
      title="Roles & Authorization"
      subtitle="Role-Based Access Control (RBAC) governance, privilege tiering, and capability models."
      actions={
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button variant="secondary" size="sm" onClick={() => setIsPermModalOpen(true)} data-testid="add-permission-btn">
            + New Permission
          </Button>
          <Button variant="primary" size="sm" onClick={() => setIsRoleModalOpen(true)} data-testid="add-role-btn">
            + New Role
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

      {/* Roles Grid */}
      <div style={{ marginBottom: '2.5rem' }}>
        <div className="section-header">
          <h2 className="section-title">Defined Roles ({roles.length})</h2>
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            System and custom capability bundles
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
          {roles.map((r) => (
            <div key={r._id} className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {r.name}
                </span>
                {r.isSystemRole && <Badge variant="info">System</Badge>}
              </div>

              {r.description && (
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '1rem', flex: 1 }}>
                  {r.description}
                </p>
              )}

              <div>
                <span style={{ fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                  GRANULAR PRIVILEGES ({(r.permissions || []).length})
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxHeight: '100px', overflowY: 'auto' }}>
                  {(r.permissions || []).length > 0 ? (
                    r.permissions.map((p) => (
                      <span key={p._id || p} className="badge badge-neutral font-mono" style={{ fontSize: '0.6875rem' }}>
                        {p.resource ? `${p.resource}:${p.action}` : p}
                      </span>
                    ))
                  ) : (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No permissions attached</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Permissions DataTable */}
      <div>
        <div className="section-header">
          <h2 className="section-title">System Permissions ({permissions.length})</h2>
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            Atomic privilege tokens enforced by authorization middleware
          </span>
        </div>

        <DataTable
          columns={permColumns}
          data={permissions}
          loading={loading}
          searchPlaceholder="Search permissions by name, resource, action..."
          pageSize={8}
          emptyTitle="No permissions created"
          emptyDesc="Permissions define what actions users with assigned roles can execute."
          data-testid="permissions-table"
        />
      </div>

      {/* Create Role Modal */}
      <Modal
        isOpen={isRoleModalOpen}
        onClose={() => setIsRoleModalOpen(false)}
        title="Create New Role"
        subtitle="Bundle permissions into a functional job role"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsRoleModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={creating}
              onClick={handleCreateRole}
              data-testid="submit-role"
            >
              Create Role
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateRole} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Role Name *</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. AUDITOR or CLOUD_ENGINEER"
              value={roleForm.name}
              onChange={(e) => setRoleForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Role Description</label>
            <textarea
              className="form-input"
              rows={3}
              placeholder="Operational responsibilities and scope"
              value={roleForm.description}
              onChange={(e) => setRoleForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
        </form>
      </Modal>

      {/* Create Permission Modal */}
      <Modal
        isOpen={isPermModalOpen}
        onClose={() => setIsPermModalOpen(false)}
        title="Create System Permission"
        subtitle="Define an atomic resource:action permission"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsPermModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={creating}
              onClick={handleCreatePerm}
              data-testid="submit-permission"
            >
              Create Permission
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreatePerm} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Permission Label *</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Read Devices"
              value={permForm.name}
              onChange={(e) => setPermForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Target Resource *</label>
              <select
                className="form-select font-mono"
                value={permForm.resource}
                onChange={(e) => setPermForm((f) => ({ ...f, resource: e.target.value }))}
                required
              >
                <option value="">Select Resource...</option>
                {resourcesList.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Permitted Action *</label>
              <select
                className="form-select font-mono"
                value={permForm.action}
                onChange={(e) => setPermForm((f) => ({ ...f, action: e.target.value }))}
                required
              >
                {actionsList.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Description (Optional)</label>
            <input
              type="text"
              className="form-input"
              placeholder="Short description of this privilege"
              value={permForm.description}
              onChange={(e) => setPermForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
}
