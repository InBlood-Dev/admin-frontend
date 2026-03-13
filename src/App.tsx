import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import './App.css';
import { useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import ErrorModal from './components/ErrorModal';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import UsersPage from './pages/UsersPage';
import MatchesPage from './pages/MatchesPage';
import ReportsPage from './pages/ReportsPage';
import StoriesPage from './pages/StoriesPage';
import VerificationsPage from './pages/VerificationsPage';
import SubscriptionsPage from './pages/SubscriptionsPage';
import NotificationsPage from './pages/NotificationsPage';
import SettingsPage from './pages/SettingsPage';

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/users': 'User Management',
  '/matches': 'Matches',
  '/reports': 'Content Moderation',
  '/stories': 'Stories Moderation',
  '/verifications': 'Verification Queue',
  '/subscriptions': 'Premium & Payments',
  '/notifications': 'Push Notifications',
  '/settings': 'App Config',
};

function AppLayout() {
  const { logout, admin } = useAuth();
  const location = useLocation();
  const title = pageTitles[location.pathname] || 'Dashboard';

  return (
    <div className="app-layout">
      <Sidebar
        onLogout={logout}
        pendingReports={0}
        pendingVerifications={0}
      />
      <div className="app-main">
        <header className="app-header">
          <h2>{title}</h2>
          <div className="app-header-right">
            <span className="admin-badge">{admin?.name ?? 'Admin'}</span>
          </div>
        </header>
        <main className="app-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/matches" element={<MatchesPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/stories" element={<StoriesPage />} />
            <Route path="/verifications" element={<VerificationsPage />} />
            <Route path="/subscriptions" element={<SubscriptionsPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  const { isAuthenticated, isLoading, sessionExpired, clearSessionExpired } = useAuth();

  if (isLoading) {
    return (
      <div className="auth-loading-screen">
        <div className="auth-loading-spinner" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <Login />
        {/* FIX Bug 4: use "OK" not "Try Again" -- there is nothing to retry on session expiry */}
        <ErrorModal
          isOpen={sessionExpired.active}
          title="Session Expired"
          message={sessionExpired.message}
          onClose={clearSessionExpired}
          actionLabel="OK"
        />
      </>
    );
  }

  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  );
}
