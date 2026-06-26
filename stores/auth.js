import { writable } from 'svelte/store';
import { jwtDecode } from "jwt-decode";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Helper function to manage tokens and user data
function setSession(accessToken, refreshToken, decodedPayload) {
  const userRole = (decodedPayload.role || '').replace(/[\[\]']+/g, '').replace('ROLE_', '');
  
  localStorage.setItem('accessToken', accessToken);
  if (refreshToken) {
    localStorage.setItem('refreshToken', refreshToken);
  }
  localStorage.setItem('userName', decodedPayload.sub);
  localStorage.setItem('userRole', userRole);

  return { name: decodedPayload.sub, role: userRole };
}

// Helper function to clear session data
function clearSession() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('userName');
  localStorage.removeItem('userRole');
}

function createAuthStore() {
  const { subscribe, set, update } = writable({
    isAuthenticated: false,
    currentUser: null,
    isRefreshing: false,
  });

  async function refreshToken() {
    console.log("Intentando renovar el token de acceso...");
    const storedRefreshToken = localStorage.getItem('refreshToken');
    if (!storedRefreshToken) {
      update(store => ({ ...store, isRefreshing: false }));
      return false;
    }

    try {
      const response = await fetch(`${BASE_URL}/api/v1/auth/token/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: storedRefreshToken }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Failed to refresh token, status: ${response.status}, body: ${errorBody}`);
      }

      const data = await response.json();
      if (!data.accessToken) {
        throw new Error('Invalid refresh response: "accessToken" field missing.');
      }

      const newAccessToken = data.accessToken;
      const newDecodedPayload = jwtDecode(newAccessToken);
      
      const currentUser = setSession(newAccessToken, storedRefreshToken, newDecodedPayload);
      set({ isAuthenticated: true, currentUser, isRefreshing: false });
      
      return true;

    } catch (error) {
      console.error("Refresh token failed:", error);
      clearSession();
      set({ isAuthenticated: false, currentUser: null, isRefreshing: false });
      return false;
    }
  }

  return {
    subscribe,
    login: async (username, password) => {
      try {
        const response = await fetch(`${BASE_URL}/api/v1/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password }),
        });

        if (!response.ok) {
          console.error('Authentication error, Status:', response.status);
          throw new Error('Incorrect username or password.');
        }

        const data = await response.json();
        if (!data.status || !data.jwt || !data.refreshToken) {
          throw new Error(data.message || 'Login failed.');
        }

        const accessToken = data.jwt;
        const newRefreshToken = data.refreshToken;
        const decodedPayload = jwtDecode(accessToken);

        const userRole = (decodedPayload.role || '').replace(/[\[\]']+/g, '').replace('ROLE_', '');

        // Only allow ADMIN and MECANIC roles to log in
        const allowedRoles = ['ADMIN', 'MECANIC'];
        if (!allowedRoles.includes(userRole)) {
          return { success: false, error: 'Acceso denegado' };
        }

        const currentUser = setSession(accessToken, newRefreshToken, decodedPayload);
        set({ isAuthenticated: true, currentUser, isRefreshing: false });

        return { success: true, error: null };

      } catch (err) {
        return { success: false, error: err.message };
      }
    },
    logout: () => {
      clearSession();
      set({ isAuthenticated: false, currentUser: null, isRefreshing: false });
    },
    checkAuth: async () => {
        const token = localStorage.getItem('accessToken');
        console.log('checkAuth: token present:', !!token);
        if (!token) {
            set({ isAuthenticated: false, currentUser: null, isRefreshing: false });
            return false;
        }

        // Allow mock token for testing
        if (token === 'mock-token') {
            console.log('checkAuth: using mock token for testing');
            set({ isAuthenticated: true, currentUser: { name: 'Test User', role: 'ADMIN' }, isRefreshing: false });
            return true;
        }

        try {
            const decodedPayload = jwtDecode(token);
            const isExpired = decodedPayload.exp * 1000 < Date.now();
            console.log('checkAuth: token expired:', isExpired);

            if (isExpired) {
                update(store => ({ ...store, isRefreshing: true }));
                console.log("Token de acceso expirado, intentando renovar...");
                return await refreshToken();
            }

            const userRole = localStorage.getItem('userRole');
            set({ isAuthenticated: true, currentUser: { name: decodedPayload.sub, role: userRole }, isRefreshing: false });
            return true;

        } catch (error) {
            console.log('checkAuth: error decoding token:', error);
            console.log('checkAuth: token value:', token);
            clearSession();
            set({ isAuthenticated: false, currentUser: null, isRefreshing: false });
            return false;
        }
    },
    // Expose the refreshToken function in case it needs to be called manually
    // or from an API interceptor in the future.
    refreshToken,
  };
}

export const auth = createAuthStore();
