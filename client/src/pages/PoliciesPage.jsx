import React, { useState, useEffect } from 'react';
import { policyService } from '../services';
import DashboardLayout from '../components/DashboardLayout';
import Button from '../components/Button';
import Badge from '../components/Badge';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';

export default function PoliciesPage() {
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    priority: 100,
    isActive: true,
    rules: [{ type: 'MFA', operator: 'REQUIRED', value: 'true', description: 'Requires verified TOTP' }],
  });

  // Delete confirm
  const [deleteConfirm, setDeleteConfirm] = useState({
    isOpen: false,
    policyId: null,
    policyName: '',
  });

  const loadPolicies = () => {
    setLoading(true);
    policyService.getAll()
      .then((r) => setPolicies(r.data.policies || []))
      .catch(() => setError('Failed to fetch Zero Trust policies.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadPolicies();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setCreating(true);

    try {
      await policyService.create(form);
      setMessage('Access policy successfully created and published.');
      setIsModalOpen(false);
      setForm({
        name: '',
        description: '',
        priority: 100,
        isActive: true,
        rules: [{ type: 'MFA', operator: 'REQUIRED', value: 'true', description: 'Requires verified TOTP' }],
      });
      loadPolicies();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create policy.');
    } finally {
      setCreating(false);
    }
  };

  const handleToggle = async (id, isActive) => {
    try {
      await policyService.update(id, { isActive: !isActive });
      setMessage(`Policy ${!isActive ? 'activated' : 'deactivated'}.`);
      loadPolicies();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update policy status.');
    }
  };

  const handleDelete = async (id) => {
    try {
      await policyService.remove(id);
      setMessage('Policy permanently deleted.');
      loadPolicies();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete policy.');
    }
  };

  const addRule = () => {
    setForm((f) => ({
      ...f,
      rules: [...f.rules, { type: 'DEVICE_STATUS', operator: 'EQUALS', value: 'TRUSTED', description: '' }],
    }));
  };

  const updateRule = (i, field, val) => {
    setForm((f) => {
      const copy = [...f.rules];
      copy[i] = { ...copy[i], [field]: val };
      return { ...f, rules: copy };
    });
  };

  const removeRule = (i) => {
    setForm((f) => ({ ...f, rules: f.rules.filter((_, idx) => idx !== i) }));
  };

  const columns = [
    {
      key: 'name',
      label: 'Policy Definition',
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
      key: 'priority',
      label: 'Priority Tier',
      sortable: true,
      render: (p) => (
        <span className="font-mono" style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--accent-primary)' }}>
          Tier {p}
        </span>
      ),
    },
    {
      key: 'rules',
      label: 'Enforced Rules',
      render: (rules) => (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
          {(rules || []).map((r, i) => (
            <span
              key={i}
              className="badge badge-neutral font-mono"
              style={{ fontSize: '0.6875rem' }}
            >
              {r.type} {r.operator} {String(r.value)}
            </span>
          ))}
        </div>
      ),
    },
    {
      key: 'isActive',
      label: 'Enforcement Status',
      sortable: true,
      render: (active) => (
        <Badge variant={active ? 'success' : 'neutral'} dot>
          {active ? 'Enforcing' : 'Disabled'}
        </Badge>
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
            onClick={() => handleToggle(row._id, row.isActive)}
          >
            {row.isActive ? 'Deactivate' : 'Activate'}
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() =>
              setDeleteConfirm({
                isOpen: true,
                policyId: row._id,
                policyName: row.name,
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
      title="Security Policies"
      subtitle="Context-aware Zero Trust evaluation rules and deterministic access guardrails."
      actions={
        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsModalOpen(true)}
          data-testid="add-policy-btn"
        >
          + Create Policy
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
        data={policies}
        loading={loading}
        searchPlaceholder="Filter policies by name or rule..."
        pageSize={8}
        emptyTitle="No security policies defined"
        emptyDesc="Create policy guardrails to enforce device trust, MFA, and permission checks."
        data-testid="policies-table"
      />

      {/* New Policy Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create Zero Trust Policy"
        subtitle="Specify evaluation rules and priority ranking"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={creating}
              onClick={handleCreate}
              data-testid="submit-policy"
            >
              Publish Policy
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Policy Name *</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Enforce Hardware Device & MFA"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Priority (1 = Highest)</label>
              <input
                type="number"
                className="form-input"
                min={1}
                max={1000}
                value={form.priority}
                onChange={(e) => setForm((f) => ({ ...f, priority: parseInt(e.target.value) || 100 }))}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <input
                type="text"
                className="form-input"
                placeholder="Optional policy scope notes"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <label className="form-label" style={{ marginBottom: 0 }}>
                Rule Conditions ({form.rules.length})
              </label>
              <Button type="button" variant="ghost" size="sm" onClick={addRule}>
                + Add Rule Signal
              </Button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              {form.rules.map((rule, i) => (
                <div
                  key={i}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1.2fr 1fr 1.2fr 36px',
                    gap: '0.5rem',
                    alignItems: 'center',
                    padding: '0.5rem',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--bg-secondary)',
                  }}
                >
                  <select
                    className="form-select font-mono"
                    value={rule.type}
                    onChange={(e) => updateRule(i, 'type', e.target.value)}
                  >
                    {['MFA', 'DEVICE_STATUS', 'SESSION_STATUS', 'ROLE', 'PERMISSION', 'RESOURCE_SENSITIVITY'].map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>

                  <select
                    className="form-select font-mono"
                    value={rule.operator}
                    onChange={(e) => updateRule(i, 'operator', e.target.value)}
                  >
                    {['REQUIRED', 'EQUALS', 'IN'].map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>

                  <input
                    type="text"
                    className="form-input font-mono"
                    placeholder="Match value"
                    value={rule.value}
                    onChange={(e) => updateRule(i, 'value', e.target.value)}
                  />

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    style={{ color: 'var(--apple-red)', padding: 0 }}
                    onClick={() => removeRule(i)}
                  >
                    ✕
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm((d) => ({ ...d, isOpen: false }))}
        onConfirm={() => {
          handleDelete(deleteConfirm.policyId);
          setDeleteConfirm((d) => ({ ...d, isOpen: false }));
        }}
        title="Delete Policy"
        message={`Are you sure you want to delete policy "${deleteConfirm.policyName}"? It will no longer protect resources.`}
        confirmText="Delete Policy"
        variant="danger"
      />
    </DashboardLayout>
  );
}
