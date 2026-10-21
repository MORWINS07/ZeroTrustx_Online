import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// ── Request Interceptor — attach access token + device ID ──────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  const deviceId = localStorage.getItem('deviceId');
  if (deviceId) {
    config.headers['X-Device-Id'] = deviceId;
  }

  return config;
});

// ── Response Interceptor — handle 401 and token refresh ───────────────────
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Do NOT intercept auth endpoints (login, register, mfa challenge) - let them return their errors to the UI
    const isAuthRoute =
      originalRequest?.url?.includes('/auth/login') ||
      originalRequest?.url?.includes('/auth/register') ||
      originalRequest?.url?.includes('/mfa/login/verify');

    if (!isAuthRoute && error.response?.status === 401 && !originalRequest?._retry) {
      const refreshToken = localStorage.getItem('refreshToken');

      // No refresh token — force logout but preserve hardware device identity
      if (!refreshToken) {
        const deviceId = localStorage.getItem('deviceId');
        localStorage.clear();
        if (deviceId) localStorage.setItem('deviceId', deviceId);

        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const resp = await axios.post('/api/v1/auth/refresh', { refreshToken });
        const newAccessToken = resp.data.accessToken;
        localStorage.setItem('accessToken', newAccessToken);
        processQueue(null, newAccessToken);
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        const deviceId = localStorage.getItem('deviceId');
        localStorage.clear();
        if (deviceId) localStorage.setItem('deviceId', deviceId);

        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
