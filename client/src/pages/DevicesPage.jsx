import React, { useState, useEffect } from 'react';
import { deviceService } from '../services';
import DashboardLayout from '../components/DashboardLayout';
import Button from '../components/Button';
import Badge from '../components/Badge';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';

export default function DevicesPage() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  
  // Registration Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [newDevice, setNewDevice] = useState({ name: '', type: 'LAPTOP' });

  // Confirmation dialog state
  const [confirmConfig, setConfirmConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    action: null,
    deviceId: null,
  });

  const loadDevices = async () => {
    try {
      setLoading(true);
      const r = await deviceService.getMine();
      setDevices(r.data.devices || []);
    } catch (err) {
      setError('Failed to fetch registered devices.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDevices();
  }, []);

  const handleAction = async (action, deviceId) => {
    setError('');
    setMessage('');
    try {
      if (action === 'trust') await deviceService.trust(deviceId);
      else if (action === 'revoke') await deviceService.revoke(deviceId);
      else if (action === 'block') await deviceService.block(deviceId);
      setMessage(`Device successfully updated (${action}ed).`);
      loadDevices();
    } catch (err) {
      setError(err.response?.data?.message || `Failed to ${action} device.`);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setRegistering(true);

    try {
      const deviceId = localStorage.getItem('deviceId') || ('dev-' + crypto.randomUUID());
      localStorage.setItem('deviceId', deviceId);
      await deviceService.register({
        deviceIdentifier: deviceId + '-' + Date.now(),
        name: newDevice.name,
        type: newDevice.type,
      });
      setMessage('Device registered in PENDING status. Admin or bootstrap trust required.');
      setIsModalOpen(false);
      setNewDevice({ name: '', type: 'LAPTOP' });
      loadDevices();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to register device.');
    } finally {
      setRegistering(false);
    }
  };

  const statusVariant = {
    TRUSTED: 'success',
    PENDING: 'warning',
    REVOKED: 'neutral',
    BLOCKED: 'danger',
  };

  const columns = [
    {
      key: 'name',
      label: 'Device Name & Identifier',
      sortable: true,
      render: (name, row) => (
        <div>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{name || 'Unnamed Device'}</div>
          <div className="font-mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            {row.deviceIdentifier}
          </div>
        </div>
      ),
    },
    {
      key: 'type',
      label: 'Type',
      sortable: true,
      render: (type) => {
        const icons = { LAPTOP: '💻', DESKTOP: '🖥️', MOBILE: '📱', TABLET: '⬛', OTHER: '🔌' };
        return (
          <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            {icons[type] || '💻'} {type}
          </span>
        );
      },
    },
    {
      key: 'status',
      label: 'Trust Posture',
      sortable: true,
      render: (status) => (
        <Badge variant={statusVariant[status] || 'neutral'} dot>
          {status}
        </Badge>
      ),
    },
    {
      key: 'lastSeenAt',
      label: 'Last Seen',
      sortable: true,
      render: (date) => (
        <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
          {date ? new Date(date).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Never'}
        </span>
      ),
    },
    {
      key: 'createdAt',
      label: 'Enrolled Date',
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
      render: (_, device) => (
        <div style={{ display: 'flex', gap: '6px' }}>
          {device.status === 'PENDING' && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleAction('trust', device._id)}
              data-testid="device-trust"
            >
              Trust
            </Button>
          )}
          {(device.status === 'TRUSTED' || device.status === 'PENDING') && (
            <Button
              variant="ghost"
              size="sm"
              style={{ color: 'var(--apple-amber)' }}
              onClick={() =>
                setConfirmConfig({
                  isOpen: true,
                  title: 'Revoke Device Trust',
                  message: `Are you sure you want to revoke trust for "${device.name}"? Active sessions on this device may be terminated.`,
                  action: 'revoke',
                  deviceId: device._id,
                })
              }
              data-testid="device-revoke"
            >
              Revoke
            </Button>
          )}
          {device.status !== 'BLOCKED' && (
            <Button
              variant="danger"
              size="sm"
              onClick={() =>
                setConfirmConfig({
                  isOpen: true,
                  title: 'Block Device',
                  message: `Are you sure you want to permanently block "${device.name}"? This device will be denied all future access attempts.`,
                  action: 'block',
                  deviceId: device._id,
                })
              }
              data-testid="device-block"
            >
              Block
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout
      title="Trusted Devices"
      subtitle="Cryptographic device identity inventory and Zero Trust boundary management."
      actions={
        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsModalOpen(true)}
          data-testid="register-device-btn"
        >
          + Enroll Device
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
        data={devices}
        loading={loading}
        searchPlaceholder="Filter devices by name, UUID, status..."
        pageSize={10}
        emptyTitle="No devices enrolled"
        emptyDesc="Enroll your workstation or browser to establish a trusted Zero Trust hardware credential."
        data-testid="devices-table"
      />

      {/* Enroll Device Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Enroll New Device"
        subtitle="Establish hardware identity for this endpoint"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={registering}
              onClick={handleRegisterSubmit}
              data-testid="submit-device-registration"
            >
              Enroll Device
            </Button>
          </>
        }
      >
        <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Device Friendly Name *</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. MacBook Pro M3 (Work)"
              value={newDevice.name}
              onChange={(e) => setNewDevice((p) => ({ ...p, name: e.target.value }))}
              required
              data-testid="device-name-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Hardware Form Factor</label>
            <select
              className="form-select"
              value={newDevice.type}
              onChange={(e) => setNewDevice((p) => ({ ...p, type: e.target.value }))}
              data-testid="device-type-select"
            >
              <option value="LAPTOP">Laptop</option>
              <option value="DESKTOP">Desktop Workstation</option>
              <option value="MOBILE">Mobile Phone</option>
              <option value="TABLET">Tablet Device</option>
              <option value="OTHER">Other Secure Endpoint</option>
            </select>
          </div>
        </form>
      </Modal>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmConfig.isOpen}
        onClose={() => setConfirmConfig((c) => ({ ...c, isOpen: false }))}
        onConfirm={() => {
          handleAction(confirmConfig.action, confirmConfig.deviceId);
          setConfirmConfig((c) => ({ ...c, isOpen: false }));
        }}
        title={confirmConfig.title}
        message={confirmConfig.message}
        confirmText={confirmConfig.action === 'block' ? 'Block Device' : 'Revoke Trust'}
        variant={confirmConfig.action === 'block' ? 'danger' : 'warning'}
      />
    </DashboardLayout>
  );
}
