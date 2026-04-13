import { useState, type FormEvent } from 'react';
import { Heart } from 'lucide-react';
import { isAxiosError } from 'axios';
import { useAuth } from '../context/AuthContext';
import ErrorModal from '../components/ErrorModal';

export default function Login() {
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorModal, setErrorModal] = useState({ open: false, title: '', message: '' });

  const showError = (title: string, message: string) => {
    setErrorModal({ open: true, title, message });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await login(email, password);
      // On success AuthContext sets isAuthenticated = true; App re-renders automatically
    } catch (err) {
      let message = 'Unable to connect to the server. Please check your connection and try again.';

      if (isAxiosError(err) && err.response) {
        const data = err.response.data;
        // FIX Bug 2: prefer the first specific field error over the generic "Validation error" message
        message = data?.errors?.[0]?.message || data?.message || message;
      }

      showError('Login Failed', message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="login-page">
        <div className="login-card">
          <div className="login-header">
            <div className="logo-icon">
              <Heart size={22} color="white" fill="white" />
            </div>
            <h1><span style={{ color: 'var(--accent)' }}>in</span>Blood</h1>
            <p>Admin Dashboard</p>
          </div>
          <form className="login-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                className="form-input"
                placeholder="admin@inblood.app"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                className="form-input"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>
            <button type="submit" className="login-btn" disabled={isLoading}>
              {isLoading ? (
                <span className="login-btn-loading">
                  <span className="btn-spinner" /> Signing in...
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        </div>
      </div>

      <ErrorModal
        isOpen={errorModal.open}
        title={errorModal.title}
        message={errorModal.message}
        onClose={() => setErrorModal({ open: false, title: '', message: '' })}
      />
    </>
  );
}
