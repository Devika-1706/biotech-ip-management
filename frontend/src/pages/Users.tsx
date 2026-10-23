import React, { useState, useEffect } from 'react';
import { UserCog, Search, Filter, Trash2, Shield, Check, X, UserCheck, AlertCircle } from 'lucide-react';
import { userService } from '../services/api';
import { User, UserRole } from '../types';
import { useAuth } from '../context/AuthContext';
import { ConfirmModal } from '../components/ConfirmModal';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { EmptyState } from '../components/EmptyState';

export const Users: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  // Modals
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await userService.getUsers({
        search: search || undefined,
        role: roleFilter || undefined,
      });
      if (res.data?.success) {
        setUsers(res.data.users);
      }
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [search, roleFilter]);

  const handleRoleChange = async (targetUser: User, newRole: UserRole) => {
    try {
      const userId = targetUser._id || targetUser.id;
      await userService.updateUser(userId, { role: newRole });
      loadUsers();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update role.');
    }
  };

  const handleToggleActive = async (targetUser: User) => {
    try {
      const userId = targetUser._id || targetUser.id;
      await userService.updateUser(userId, { isActive: !targetUser.isActive });
      loadUsers();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update user status.');
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedUser) return;
    setSubmitting(true);
    try {
      const userId = selectedUser._id || selectedUser.id;
      await userService.deleteUser(userId);
      setIsDeleteOpen(false);
      loadUsers();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete user.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Enterprise User Management</h1>
          <p className="page-subtitle">
            Configure role-based access control (RBAC), provision researchers, and govern compliance clearances
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="filter-bar">
        <div className="filter-input-wrap">
          <Search size={18} />
          <input
            type="text"
            className="filter-input"
            placeholder="Search users by name, email, department..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className="filter-select"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
        >
          <option value="">All Roles</option>
          <option value="ADMIN">ADMIN</option>
          <option value="IP MANAGER">IP MANAGER</option>
          <option value="RESEARCHER">RESEARCHER</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <LoadingSpinner message="Loading user directory..." />
      ) : users.length === 0 ? (
        <EmptyState
          title="No users found"
          description="There are currently no users matching your criteria."
          icon={<UserCog size={32} />}
        />
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>User Details</th>
                <th>Role (RBAC)</th>
                <th>Department</th>
                <th>Account Status</th>
                <th>Provisioned Date</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isSelf = Boolean(currentUser && (currentUser.id === u.id || currentUser.id === (u as any)._id));
                return (
                  <tr key={u._id || u.id}>
                    <td>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                          {u.name} {isSelf && <span style={{ color: 'var(--primary)', fontSize: '0.75rem' }}>(You)</span>}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{u.email}</div>
                      </div>
                    </td>
                    <td>
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u, e.target.value as UserRole)}
                        disabled={isSelf}
                        className="filter-select"
                        style={{ padding: '4px 8px', fontSize: '0.78rem', fontWeight: 600 }}
                      >
                        <option value="RESEARCHER">RESEARCHER</option>
                        <option value="IP MANAGER">IP MANAGER</option>
                        <option value="ADMIN">ADMIN</option>
                      </select>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                        {u.department || 'Biotech R&D'}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`badge ${u.isActive !== false ? 'badge-success' : 'badge-danger'}`}
                      >
                        {u.isActive !== false ? 'Active' : 'Deactivated'}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="table-actions" style={{ justifyContent: 'flex-end' }}>
                        <button
                          className={`btn ${u.isActive !== false ? 'btn-secondary' : 'btn-primary'} btn-sm`}
                          onClick={() => handleToggleActive(u)}
                          disabled={isSelf}
                          title={u.isActive !== false ? 'Deactivate Account' : 'Activate Account'}
                        >
                          {u.isActive !== false ? 'Deactivate' : 'Activate'}
                        </button>
                        {!isSelf && (
                          <button
                            className="btn btn-danger-outline btn-sm"
                            onClick={() => {
                              setSelectedUser(u);
                              setIsDeleteOpen(true);
                            }}
                            title="Delete User"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete Modal */}
      <ConfirmModal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Confirm User Account Deletion"
        message={`Are you sure you want to delete ${selectedUser?.name} (${selectedUser?.email})?`}
        confirmText="Delete Account"
        loading={submitting}
      />
    </div>
  );
};
