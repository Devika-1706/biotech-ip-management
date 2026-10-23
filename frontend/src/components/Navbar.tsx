import React, { useState, useEffect } from 'react';
import { Search, User as UserIcon, LogOut, Settings, ShieldCheck, Menu } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { GlobalSearchModal } from './GlobalSearchModal';
import { Link } from 'react-router-dom';

interface NavbarProps {
  onToggleSidebar?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar }) => {
  const { user, logout } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Keyboard shortcut Ctrl+K / Cmd+K for global search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <header className="topbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {onToggleSidebar && (
          <button
            className="icon-btn"
            onClick={onToggleSidebar}
            style={{ display: 'none' }}
            id="mobile-menu-btn"
          >
            <Menu size={20} />
          </button>
        )}

        {/* Global Search Trigger */}
        <div className="search-trigger" onClick={() => setSearchOpen(true)}>
          <Search size={16} />
          <span>Quick search (records, patents, projects)...</span>
          <span className="search-shortcut">Ctrl K</span>
        </div>
      </div>

      <div className="topbar-actions">
        {/* Role Indicator Chip */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '5px 12px',
            borderRadius: 'var(--radius-full)',
            backgroundColor: 'var(--primary-light)',
            color: 'var(--primary-dark)',
            fontSize: '0.78rem',
            fontWeight: 600,
          }}
        >
          <ShieldCheck size={14} />
          <span>{user?.role || 'RESEARCHER'}</span>
        </div>

        {/* User Dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            className="icon-btn"
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            style={{ width: 'auto', padding: '0 10px', gap: '8px' }}
          >
            <UserIcon size={18} />
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
              {user?.name?.split(' ')[0]}
            </span>
          </button>

          {userMenuOpen && (
            <div
              style={{
                position: 'absolute',
                top: '46px',
                right: 0,
                width: '220px',
                backgroundColor: '#ffffff',
                border: '1px solid var(--border-light)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-lg)',
                padding: '8px',
                zIndex: 50,
              }}
              onClick={() => setUserMenuOpen(false)}
            >
              <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-light)', marginBottom: '6px' }}>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  {user?.name}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{user?.email}</div>
              </div>

              <Link
                to="/profile"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 12px',
                  color: 'var(--text-secondary)',
                  fontSize: '0.85rem',
                  textDecoration: 'none',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <Settings size={16} />
                <span>Profile & Diagnostics</span>
              </Link>

              <button
                onClick={logout}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 12px',
                  color: 'var(--status-danger)',
                  fontSize: '0.85rem',
                  border: 'none',
                  background: 'transparent',
                  textAlign: 'left',
                  cursor: 'pointer',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <LogOut size={16} />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <GlobalSearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </header>
  );
};
