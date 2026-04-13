import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Heart,
  ShieldAlert,
  BadgeCheck,
  CreditCard,
  Settings,
  LogOut,
  Clapperboard,
  Bell,
  FileText,
} from 'lucide-react';

interface Props {
  onLogout: () => void;
  pendingReports: number;
  pendingVerifications: number;
}

export default function Sidebar({ onLogout, pendingReports, pendingVerifications }: Props) {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <img src="/logo.png" alt="inBlood" className="logo-img" />
        <h1><span style={{ color: 'var(--accent)' }}>in</span>Blood</h1>
        <span>Admin</span>
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-section">Overview</div>
        <NavLink to="/" end>
          <LayoutDashboard /> Dashboard
        </NavLink>

        <div className="sidebar-section">Manage</div>
        <NavLink to="/users">
          <Users /> Users
        </NavLink>
        <NavLink to="/matches">
          <Heart /> Matches
        </NavLink>

        <div className="sidebar-section">Moderation</div>
        <NavLink to="/reports">
          <ShieldAlert /> Reports
          {pendingReports > 0 && <span className="sidebar-badge">{pendingReports}</span>}
        </NavLink>
        <NavLink to="/stories">
          <Clapperboard /> Stories
        </NavLink>
        <NavLink to="/verifications">
          <BadgeCheck /> Verifications
          {pendingVerifications > 0 && <span className="sidebar-badge">{pendingVerifications}</span>}
        </NavLink>

        <div className="sidebar-section">Revenue</div>
        <NavLink to="/subscriptions">
          <CreditCard /> Payments
        </NavLink>

        <div className="sidebar-section">Operations</div>
        <NavLink to="/notifications">
          <Bell /> Notifications
        </NavLink>
        <NavLink to="/legal-pages">
          <FileText /> Legal Pages
        </NavLink>
        <NavLink to="/settings">
          <Settings /> App Config
        </NavLink>

        <div style={{ marginTop: 'auto', paddingTop: 12 }}>
          <a onClick={onLogout} style={{ cursor: 'pointer' }}>
            <LogOut /> Logout
          </a>
        </div>
      </nav>

      <div className="sidebar-footer">
        v2.5.0 &middot; inBlood Admin
      </div>
    </aside>
  );
}
