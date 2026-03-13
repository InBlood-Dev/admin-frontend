import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { authService } from '../services/auth.service';
import type { AdminUser } from '../types';

interface SessionExpiredState {
  active: boolean;
  message: string;
}

interface AuthContextValue {
  admin: AdminUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  sessionExpired: SessionExpiredState;
  clearSessionExpired: () => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState<SessionExpiredState>({
    active: false,
    message: '',
  });

  const clearAuthStorage = () => {
    localStorage.removeItem('adminAccessToken');
    localStorage.removeItem('adminRefreshToken');
  };

  // On mount: validate any stored token
  useEffect(() => {
    const validate = async () => {
      const token = localStorage.getItem('adminAccessToken');
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        const profile = await authService.getProfile();
        setAdmin(profile);
      } catch {
        clearAuthStorage();
      } finally {
        setIsLoading(false);
      }
    };
    validate();
  }, []);

  // Listen for session-expired events fired by the axios interceptor
  useEffect(() => {
    const handler = () => {
      setAdmin(null);
      setSessionExpired({
        active: true,
        message: 'Your session has expired. Please log in again.',
      });
    };
    window.addEventListener('admin:session-expired', handler);
    return () => window.removeEventListener('admin:session-expired', handler);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await authService.login(email, password);
    localStorage.setItem('adminAccessToken', result.accessToken);
    localStorage.setItem('adminRefreshToken', result.refreshToken);
    setAdmin(result.admin);
  }, []);

  const logout = useCallback(() => {
    // Fire-and-forget: tell server to mark offline
    authService.logout().catch(() => {});
    clearAuthStorage();
    setAdmin(null);
  }, []);

  const clearSessionExpired = useCallback(() => {
    setSessionExpired({ active: false, message: '' });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        admin,
        isAuthenticated: admin !== null,
        isLoading,
        sessionExpired,
        clearSessionExpired,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
