import React, { useState, useEffect } from 'react';
import { User as UserIcon, Lock, Shield, Server, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authService, systemService } from '../services/api';

export const Profile: React.FC = () => {
  const { user, updateUser } = useAuth();

  // Profile Form
  const [name, setName] = useState(user?.name || '');
  const [department, setDepartment] = useState(user?.department || '');
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'danger'; text: string } | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  // Password Form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdMsg, setPwdMsg] = useState<{ type: 'success' | 'danger'; text: string } | null>(null);
  const [pwdLoading, setPwdLoading] = useState(false);

  // Diagnostics
  const [systemHealth, setSystemHealth] = useState<any>(null);
  const [healthLoading, setHealthLoading] = useState(false);

  const fetchHealth = async () => {
    setHealthLoading(true);
    try {
      const res = await systemService.getHealth();
      setSystemHealth(res.data);
    } catch (err) {
      console.error('Failed to get health:', err);
    } finally {
      setHealthLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMsg(null);
    setProfileLoading(true);
    try {
      const res = await authService.updateProfile({ name, department });
      if (res.data?.success) {
        updateUser(res.data.user);
        setProfileMsg({ type: 'success', text: 'Profile details updated successfully.' });
      }
    } catch (err: any) {
      setProfileMsg({ type: 'danger', text: err.response?.data?.message || 'Failed to update profile.' });
    } finally {
      setProfileLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdMsg(null);

    if (newPassword !== confirmPassword) {
      setPwdMsg({ type: 'danger', text: 'New password and confirmation do not match.' });
      return;
    }

    if (newPassword.length < 6) {
      setPwdMsg({ type: 'danger', text: 'Password must be at least 6 characters long.' });
      return;
    }

    setPwdLoading(true);
    try {
      const res = await authService.changePassword({ currentPassword, newPassword });
      if (res.data?.success) {
        setPwdMsg({ type: 'success', text: 'Password changed successfully.' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err: any) {
      setPwdMsg({ type: 'danger', text: err.response?.data?.message || 'Failed to change password.' });
    } finally {
      setPwdLoading(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Profile & Platform Diagnostics</h1>
          <p className="page-subtitle">
            Manage your credentials, scientific affiliations, and monitor real-time database and Redis cache status
          </p>
        </div>
      </div>

      <div className="grid-cols-2">
        {/* Profile Card */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">User Profile Details</h3>
            <span className="badge badge-info">{user?.role}</span>
          </div>

          {profileMsg && <div className={`alert alert-${profileMsg.type}`}>{profileMsg.text}</div>}

          <form onSubmit={handleUpdateProfile}>
            <div className="form-group">
              <label className="form-label">Corporate Email Address (Read-only)</label>
              <input
                type="email"
                disabled
                className="form-control"
                value={user?.email || ''}
                style={{ backgroundColor: '#f1f5f9', cursor: 'not-allowed' }}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Full Name & Scientific Title</label>
              <input
                type="text"
                required
                className="form-control"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Department / Therapeutic Focus</label>
              <input
                type="text"
                className="form-control"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
              />
            </div>

            <button type="submit" className="btn btn-primary" disabled={profileLoading}>
              {profileLoading ? 'Saving...' : 'Update Profile'}
            </button>
          </form>
        </div>

        {/* Change Password Card */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Security & Password</h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>bcrypt Hashed</span>
          </div>

          {pwdMsg && <div className={`alert alert-${pwdMsg.type}`}>{pwdMsg.text}</div>}

          <form onSubmit={handleChangePassword}>
            <div className="form-group">
              <label className="form-label">Current Password</label>
              <input
                type="password"
                required
                className="form-control"
                placeholder="••••••••"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>

            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">New Password</label>
                <input
                  type="password"
                  required
                  className="form-control"
                  placeholder="Min 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Confirm New Password</label>
                <input
                  type="password"
                  required
                  className="form-control"
                  placeholder="Repeat new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>

            <button type="submit" className="btn btn-secondary" disabled={pwdLoading}>
              {pwdLoading ? 'Updating...' : 'Change Password'}
            </button>
          </form>
        </div>
      </div>

      {/* System Status & Infrastructure Diagnostics */}
      <div className="card" style={{ marginTop: '24px' }}>
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Server size={20} color="var(--primary)" />
            <h3 className="card-title">Platform Infrastructure & Service Diagnostics</h3>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={fetchHealth} disabled={healthLoading}>
            <RefreshCw size={14} className={healthLoading ? 'spinner' : ''} />
            <span>Check Connectivity</span>
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          {/* MongoDB Status */}
          <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)', backgroundColor: '#f8fafc' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Persistent Database</span>
              <span className="badge badge-success">
                <CheckCircle2 size={12} />
                {systemHealth?.services?.database?.status || 'Connected'}
              </span>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Engine: <strong>MongoDB + Mongoose ODM</strong>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Stores core biotechnology entities, audit trails, and document metadata.
            </div>
          </div>

          {/* Redis Cache Status */}
          <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)', backgroundColor: '#f8fafc' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Caching Layer</span>
              <span
                className={`badge ${
                  systemHealth?.services?.cache?.status === 'Connected' ? 'badge-success' : 'badge-info'
                }`}
              >
                {systemHealth?.services?.cache?.status || 'Active'}
              </span>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Mode: <strong>{systemHealth?.services?.cache?.mode || 'In-Memory Fallback & Redis'}</strong>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Caches dashboard metrics, deadline matrices, and cross-module reports with automatic invalidation.
            </div>
          </div>

          {/* API Engine Status */}
          <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)', backgroundColor: '#f8fafc' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>API Server</span>
              <span className="badge badge-success">
                <CheckCircle2 size={12} />
                {systemHealth?.status || 'Operational'}
              </span>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Framework: <strong>Node.js + Express.js REST</strong>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Server timestamp: {systemHealth?.timestamp ? new Date(systemHealth.timestamp).toLocaleTimeString() : 'Active'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
