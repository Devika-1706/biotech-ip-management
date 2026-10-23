import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  History,
  Search,
  Filter,
  User,
  Shield,
  Clock,
  ArrowRight,
  FolderKanban,
  FileCheck2,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { activityLogService } from '../services/api';
import { ActivityLogItem } from '../types';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { EmptyState } from '../components/EmptyState';

export const ActivityLogs: React.FC = () => {
  const [logs, setLogs] = useState<ActivityLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');

  const fetchLogs = async (targetPage = page) => {
    setLoading(true);
    try {
      const res = await activityLogService.getActivityLogs({
        page: targetPage,
        limit: 25,
        search: search || undefined,
        action: actionFilter || undefined,
        userRole: roleFilter || undefined,
        entityType: entityFilter || undefined,
      });

      if (res.data?.success) {
        setLogs(res.data.logs);
        setTotal(res.data.total);
        setPage(res.data.page);
        setTotalPages(res.data.totalPages || 1);
      }
    } catch (err) {
      console.error('Failed to load activity logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(1);
  }, [search, actionFilter, roleFilter, entityFilter]);

  const getActionBadgeColor = (action: string) => {
    if (action.includes('CREATE') || action.includes('UPLOAD')) {
      return { bg: '#ecfdf5', color: '#047857', border: '#a7f3d0' };
    }
    if (action.includes('UPDATE') || action.includes('CONVERT')) {
      return { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' };
    }
    if (action.includes('DELETE') || action.includes('REJECT')) {
      return { bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' };
    }
    return { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' };
  };

  const formatTimestamp = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Compliance Audit & Activity Logs</h1>
          <p className="page-subtitle">
            Immutable system audit trail tracking user interactions, asset lifecycle transitions, patent conversions, and document uploads.
          </p>
        </div>
        <div>
          <span className="badge badge-info" style={{ fontSize: '0.85rem', padding: '6px 14px' }}>
            {total} Total Audit Records
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="filter-bar">
        <div className="filter-input-wrap">
          <Search size={18} />
          <input
            type="text"
            className="filter-input"
            placeholder="Search by user, action code, details..."
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

        <select
          className="filter-select"
          value={entityFilter}
          onChange={(e) => setEntityFilter(e.target.value)}
        >
          <option value="">All Entity Types</option>
          <option value="Project">Project</option>
          <option value="Patent">Patent</option>
          <option value="TechnologyDisclosure">Technology Disclosure</option>
          <option value="LicensingAgreement">Licensing Agreement</option>
          <option value="RegulatoryFiling">Regulatory Filing</option>
          <option value="ComplianceItem">Compliance Item</option>
          <option value="Document">Document</option>
          <option value="User">User</option>
        </select>

        <select
          className="filter-select"
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
        >
          <option value="">All Actions</option>
          <option value="CREATE_PROJECT">CREATE_PROJECT</option>
          <option value="UPDATE_PROJECT">UPDATE_PROJECT</option>
          <option value="DELETE_PROJECT">DELETE_PROJECT</option>
          <option value="CREATE_PATENT">CREATE_PATENT</option>
          <option value="UPDATE_PATENT">UPDATE_PATENT</option>
          <option value="CREATE_DISCLOSURE">CREATE_DISCLOSURE</option>
          <option value="CONVERT_DISCLOSURE">CONVERT_DISCLOSURE</option>
          <option value="UPLOAD_DOCUMENT">UPLOAD_DOCUMENT</option>
          <option value="USER_LOGIN">USER_LOGIN</option>
        </select>
      </div>

      {/* Activity Logs Table */}
      {loading ? (
        <LoadingSpinner message="Querying enterprise audit log..." />
      ) : logs.length === 0 ? (
        <EmptyState
          title="No Logs Found"
          description="There are no audit events matching the selected filters."
          icon={<History size={36} />}
        />
      ) : (
        <>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Actor / User</th>
                  <th>Action</th>
                  <th>Entity Scope</th>
                  <th>Audit Event Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const badgeStyle = getActionBadgeColor(log.action);
                  const projectRef = (log.project as any);

                  return (
                    <tr key={log._id}>
                      <td style={{ whiteSpace: 'nowrap', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                        {formatTimestamp(log.timestamp)}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{log.userName}</span>
                          <span className="badge badge-outline" style={{ fontSize: '0.7rem' }}>
                            {log.userRole}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span
                          className="badge font-mono"
                          style={{
                            background: badgeStyle.bg,
                            color: badgeStyle.color,
                            border: `1px solid ${badgeStyle.border}`,
                            fontSize: '0.75rem',
                          }}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td>
                        <div>
                          <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{log.entityType}</span>
                          {projectRef && (
                            <div style={{ marginTop: 2 }}>
                              <Link
                                to={`/projects/${projectRef._id || projectRef}`}
                                style={{ fontSize: '0.75rem', color: 'var(--primary)', textDecoration: 'none' }}
                              >
                                {projectRef.name ? `[${projectRef.code}] ${projectRef.name}` : 'View Project'}
                              </Link>
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', maxWidth: 450 }}>
                          {log.details}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Showing page {page} of {totalPages} ({total} events)
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="btn btn-sm btn-outline"
                  disabled={page <= 1}
                  onClick={() => fetchLogs(page - 1)}
                >
                  <ChevronLeft size={16} />
                  <span>Previous</span>
                </button>
                <button
                  className="btn btn-sm btn-outline"
                  disabled={page >= totalPages}
                  onClick={() => fetchLogs(page + 1)}
                >
                  <span>Next</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
