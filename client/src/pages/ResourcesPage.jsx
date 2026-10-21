import React, { useState, useEffect } from 'react';
import { resourceService } from '../services';
import DashboardLayout from '../components/DashboardLayout';
import Button from '../components/Button';
import Badge from '../components/Badge';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';

export default function ResourcesPage() {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    type: 'APPLICATION',
    sensitivity: 'MEDIUM',
    isActive: true,
  });

  // Confirm delete state
  const [deleteConfirm, setDeleteConfirm] = useState({
    isOpen: false,
    resourceId: null,
    resourceName: '',
  });

  const loadResources = async () => {
    try {
      setLoading(true);
      const r = await resourceService.getAll();
      setResources(r.data.resources || []);
    } catch (err) {
      setError('Failed to fetch protected enterprise resources.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadResources();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setCreating(true);

    try {
      await resourceService.create(form);
      setMessage('Protected resource successfully provisioned.');
      setIsModalOpen(false);
      setForm({ name: '', description: '', type: 'APPLICATION', sensitivity: 'MEDIUM', isActive: true });
      loadResources();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create resource.');
    } finally {
      setCreating(false);
    }
  };

  const handleToggleActive = async (id, currentStatus) => {
    try {
      await resourceService.update(id, { isActive: !currentStatus });
      setMessage(`Resource status updated to ${!currentStatus ? 'Active' : 'Inactive'}.`);
      loadResources();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to toggle resource status.');
    }
  };

  const handleDelete = async (id) => {
    try {
      await resourceService.remove(id);
      setMessage('Resource deleted successfully.');
      loadResources();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete resource.');
    }
  };

  const sensitivityBadge = (sens) => {
    const map = {
      LOW: 'success',
      MEDIUM: 'warning',
      HIGH: 'danger',
      CRITICAL: 'danger',
    };
    return <Badge variant={map[sens] || 'neutral'} dot>{sens}</Badge>;
  };

  const columns = [
    {
      key: 'name',
      label: 'Resource Name & Overview',
      sortable: true,
      render: (name, row) => (
        <div>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{name}</div>
          {row.description && (
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              {row.description}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'type',
      label: 'Classification',
      sortable: true,
      render: (type) => (
        <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
          {type}
        </span>
      ),
    },
    {
      key: 'sensitivity',
      label: 'Security Tier',
      sortable: true,
      render: (sens) => sensitivityBadge(sens),
    },
    {
      key: 'isActive',
      label: 'Status',
      sortable: true,
      render: (active) => (
        <Badge variant={active ? 'success' : 'neutral'}>
          {active ? 'Active' : 'Disabled'}
        </Badge>
      ),
    },
    {
      key: 'createdAt',
      label: 'Created',
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
        <div style={{ display: 'flex', gap: '6px' }}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleToggleActive(row._id, row.isActive)}
          >
            {row.isActive ? 'Disable' : 'Enable'}
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() =>
              setDeleteConfirm({
                isOpen: true,
                resourceId: row._id,
                resourceName: row.name,
              })
            }
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout
      title="Protected Resources"
      subtitle="Enterprise asset catalog, sensitive endpoints, and boundary classifications."
      actions={
        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsModalOpen(true)}
          data-testid="add-resource-btn"
        >
          + Add Resource
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
        data={resources}
        loading={loading}
        searchPlaceholder="Filter resources by name, type, sensitivity..."
        pageSize={10}
        emptyTitle="No protected resources configured"
        emptyDesc="Register databases, APIs, or internal microservices to apply Zero Trust security policies."
        data-testid="resources-table"
      />

      {/* Add Resource Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Protected Resource"
        subtitle="Register an asset for Zero Trust policy enforcement"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={creating}
              onClick={handleCreate}
              data-testid="submit-resource"
            >
              Create Resource
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Resource Name *</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Production Database Cluster"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Classification Type</label>
              <select
                className="form-select"
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
              >
                {['APPLICATION', 'DATA', 'API', 'SYSTEM', 'PORTAL', 'OTHER'].map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Security Sensitivity</label>
              <select
                className="form-select"
                value={form.sensitivity}
                onChange={(e) => setForm((f) => ({ ...f, sensitivity: e.target.value }))}
              >
                {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Description (Optional)</label>
            <textarea
              className="form-input"
              rows={3}
              placeholder="Operational description or perimeter details"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm((d) => ({ ...d, isOpen: false }))}
        onConfirm={() => {
          handleDelete(deleteConfirm.resourceId);
          setDeleteConfirm((d) => ({ ...d, isOpen: false }));
        }}
        title="Delete Resource"
        message={`Are you sure you want to delete "${deleteConfirm.resourceName}"? All associated access policies will no longer evaluate this target.`}
        confirmText="Delete Resource"
        variant="danger"
      />
    </DashboardLayout>
  );
}
