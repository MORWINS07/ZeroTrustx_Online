import api from './api';

export const authService = {
  register: (data) => api.post('/auth/register', data),
  login: (email, password, deviceId) =>
    api.post('/auth/login', { email, password }, {
      headers: { 'X-Device-Id': deviceId }
    }),
  refresh: (refreshToken) => api.post('/auth/refresh', { refreshToken }),
  logout: (sessionId) => api.post('/auth/logout', { sessionId }),
};

export const mfaService = {
  getStatus: () => api.get('/mfa/status'),
  setup: () => api.post('/mfa/setup'),
  verify: (token) => api.post('/mfa/verify', { token }),
  verifyLogin: (mfaChallengeToken, token) =>
    api.post('/mfa/login/verify', { mfaChallengeToken, token }),
  disable: (token) => api.post('/mfa/disable', { token }),
};

export const deviceService = {
  bootstrap: (data) => api.post('/devices/bootstrap', data),
  register: (data) => api.post('/devices', data),
  getMine: () => api.get('/devices/mine'),
  trust: (deviceId) => api.post(`/devices/${deviceId}/trust`),
  revoke: (deviceId) => api.post(`/devices/${deviceId}/revoke`),
  block: (deviceId) => api.post(`/devices/${deviceId}/block`),
};

export const sessionService = {
  getAll: () => api.get('/sessions'),
  revoke: (sessionId) => api.delete(`/sessions/${sessionId}`),
  revokeAll: () => api.delete('/sessions'),
};

export const roleService = {
  getAll: () => api.get('/roles'),
  create: (data) => api.post('/roles', data),
  addPermissions: (roleId, permissionIds) =>
    api.post(`/roles/${roleId}/permissions`, { permissionIds }),
};

export const permissionService = {
  getAll: () => api.get('/permissions'),
  create: (data) => api.post('/permissions', data),
};

export const resourceService = {
  getAll: () => api.get('/resources'),
  create: (data) => api.post('/resources', data),
  update: (id, data) => api.patch(`/resources/${id}`, data),
  remove: (id) => api.delete(`/resources/${id}`),
};

export const policyService = {
  getAll: () => api.get('/policies'),
  create: (data) => api.post('/policies', data),
  update: (id, data) => api.patch(`/policies/${id}`, data),
  remove: (id) => api.delete(`/policies/${id}`),
};

export const accessService = {
  evaluate: (data) => api.post('/access-requests', data),
  getHistory: () => api.get('/access-requests'),
};

export const auditService = {
  getAll: (params) => api.get('/audit-events', { params }),
  getById: (id) => api.get(`/audit-events/${id}`),
};

export const adminService = {
  getDashboard: () => api.get('/admin/dashboard'),
  getUsers: (params) => api.get('/admin/users', { params }),
  getUser: (id) => api.get(`/admin/users/${id}`),
  updateUserStatus: (id, status) => api.patch(`/admin/users/${id}/status`, { status }),
  getSessions: (params) => api.get('/admin/sessions', { params }),
  getDevices: (params) => api.get('/admin/devices', { params }),
};

export const userRoleService = {
  assign: (userId, roleId) => api.post('/user-roles/assign', { userId, roleId }),
};
