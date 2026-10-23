import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderKanban,
  History,
  UserCog,
  Dna,
  LogOut,
  Settings,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Sidebar: React.FC = () => {
  const { user, logout, isAdmin, isIPManager } = useAuth();

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const canViewActivityLogs = isAdmin || isIPManager || user?.role === 'IP MANAGER';

  return (
    <aside className="sidebar">
      {/* Brand Header */}
      <div className="sidebar-brand">
        <div className="brand-logo-icon">
          <Dna size={22} />
        </div>
        <div className="brand-text">
          <span className="brand-title">BioVault IP</span>
          <span className="brand-sub">Project-Centric IP & Compliance</span>
        </div>
      </div>

      {/* Navigation Links - Project-Centric Structure */}
      <nav className="sidebar-nav">
        <div className="nav-section-label">Main Workspace</div>
        
        <NavLink
          to="/dashboard"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <LayoutDashboard size={18} />
          <span>Dashboard</span>
        </NavLink>

        <NavLink
          to="/projects"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <FolderKanban size={18} />
          <span>Projects</span>
        </NavLink>

        <div className="nav-section-label">Audit & Governance</div>

        {canViewActivityLogs && (
          <NavLink
            to="/activity-logs"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <History size={18} />
            <span>Activity Logs</span>
          </NavLink>
        )}

        {isAdmin && (
          <>
            <div className="nav-section-label">System Control</div>
            <NavLink
              to="/users"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <UserCog size={18} />
              <span>User Management</span>
            </NavLink>
          </>
        )}
      </nav>

      {/* User Footer Profile */}
      <div className="sidebar-user">
        <div className="user-avatar">{user ? getInitials(user.name) : 'BV'}</div>
        <div className="user-info">
          <div className="user-name" title={user?.name}>
            {user?.name || 'Authorized User'}
          </div>
          <span className="user-role-badge">{user?.role || 'RESEARCHER'}</span>
        </div>
        <NavLink
          to="/profile"
          className="icon-btn"
          style={{ width: '32px', height: '32px', background: 'transparent', border: 'none', color: '#94a3b8' }}
          title="Account Settings"
        >
          <Settings size={18} />
        </NavLink>
        <button
          className="icon-btn"
          onClick={logout}
          style={{ width: '32px', height: '32px', background: 'transparent', border: 'none', color: '#ef4444' }}
          title="Log Out"
        >
          <LogOut size={18} />
        </button>
      </div>
    </aside>
  );
};
