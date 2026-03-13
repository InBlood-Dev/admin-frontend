import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach the access token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('adminAccessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Track whether a refresh is already in progress to avoid parallel refresh loops
let isRefreshing = false;

type PendingEntry = {
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
};
let pendingRequests: PendingEntry[] = [];

// FIX Bug 1: resolve all queued requests with the new token
const processPendingRequests = (token: string) => {
  pendingRequests.forEach(({ resolve }) => resolve(token));
  pendingRequests = [];
};

// FIX Bug 1: reject all queued requests so callers fail fast instead of hanging
const rejectPendingRequests = (error: unknown) => {
  pendingRequests.forEach(({ reject }) => reject(error));
  pendingRequests = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Only attempt refresh on 401 and only once per originating request
    if (error.response?.status === 401 && !originalRequest._retried) {
      const refreshToken = localStorage.getItem('adminRefreshToken');

      if (!refreshToken) {
        clearAuthAndRedirect();
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // FIX Bug 3: mark queued requests as retried so they don't re-trigger refresh
        originalRequest._retried = true;
        // Queue this request; resolve/reject it once the ongoing refresh settles
        return new Promise((resolve, reject) => {
          pendingRequests.push({
            resolve: (token: string) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(api(originalRequest));
            },
            reject,
          });
        });
      }

      originalRequest._retried = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post(`${BASE_URL}/admin/auth/refresh-token`, {
          refresh_token: refreshToken,
        });

        const newAccessToken = data.data.accessToken;
        const newRefreshToken = data.data.refreshToken;

        localStorage.setItem('adminAccessToken', newAccessToken);
        localStorage.setItem('adminRefreshToken', newRefreshToken);

        processPendingRequests(newAccessToken);
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

        return api(originalRequest);
      } catch (refreshError) {
        // FIX Bug 1: reject all waiting requests before clearing auth
        rejectPendingRequests(refreshError);
        clearAuthAndRedirect();
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

function clearAuthAndRedirect() {
  localStorage.removeItem('adminAccessToken');
  localStorage.removeItem('adminRefreshToken');
  // Signal the AuthContext to clear state via a custom event
  window.dispatchEvent(new CustomEvent('admin:session-expired'));
}

export default api;
