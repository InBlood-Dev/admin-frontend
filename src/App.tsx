import { useState } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import './App.css';
import Sidebar from './components/Sidebar';
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
import { dashboardStats } from './data/mock';

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

function AppLayout({ onLogout }: { onLogout: () => void }) {
  const location = useLocation();
  const title = pageTitles[location.pathname] || 'Dashboard';

  return (
    <div className="app-layout">
      <Sidebar
        onLogout={onLogout}
        pendingReports={dashboardStats.pending_reports}
        pendingVerifications={dashboardStats.pending_verifications}
      />
      <div className="app-main">
        <header className="app-header">
          <h2>{title}</h2>
          <div className="app-header-right">
            <span className="admin-badge">Admin</span>
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
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  if (!isLoggedIn) {
    return <Login onLogin={() => setIsLoggedIn(true)} />;
  }

  return (
    <BrowserRouter>
      <AppLayout onLogout={() => setIsLoggedIn(false)} />
    </BrowserRouter>
  );
}
