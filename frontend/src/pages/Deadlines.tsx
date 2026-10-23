import React, { useState, useEffect } from 'react';
import { CalendarClock, AlertTriangle, Clock, Calendar, CheckCircle2, ArrowRight, Sparkles } from 'lucide-react';
import { deadlineService } from '../services/api';
import { DeadlineItem } from '../types';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { useNavigate } from 'react-router-dom';

export const Deadlines: React.FC = () => {
  const [deadlines, setDeadlines] = useState<DeadlineItem[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [fromCache, setFromCache] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'overdue' | 'dueToday' | 'dueThisWeek' | 'upcoming'>('all');
  const navigate = useNavigate();

  const loadDeadlines = async () => {
    setLoading(true);
    try {
      const res = await deadlineService.getDeadlines();
      if (res.data?.success) {
        setDeadlines(res.data.allDeadlines || []);
        setSummary(res.data.summary);
        setFromCache(Boolean(res.data.fromCache));
      }
    } catch (err) {
      console.error('Failed to load deadlines:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDeadlines();
  }, []);

  const getFilteredList = () => {
    if (activeTab === 'all') return deadlines;
    return deadlines.filter((d) => d.urgency === activeTab);
  };

  const handleNavigate = (d: DeadlineItem) => {
    if (d.category === 'Patent Expiry') navigate('/patents');
    else if (d.category === 'Regulatory Filing') navigate('/filings');
    else if (d.category === 'Compliance Item') navigate('/compliance');
    else if (d.category === 'Licensing Agreement') navigate('/agreements');
    else navigate('/projects');
  };

  if (loading) {
    return <LoadingSpinner message="Calculating cross-module expiration and compliance countdowns..." />;
  }

  const s = summary || {
    total: 0,
    overdueCount: 0,
    dueTodayCount: 0,
    dueThisWeekCount: 0,
    upcomingCount: 0,
  };

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Deadlines & Milestone Reminders</h1>
          <p className="page-subtitle">
            Synchronized countdowns across patent expirations, FDA/EMA filing deadlines, compliance audits, and commercial renewals
          </p>
        </div>
        <div className="header-actions">
          {fromCache && (
            <span
              style={{
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
                backgroundColor: 'var(--bg-muted)',
                padding: '4px 10px',
                borderRadius: 'var(--radius-full)',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <Sparkles size={13} color="var(--primary)" />
              Redis Cached Engine
            </span>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid-cols-4" style={{ marginBottom: '24px' }}>
        <div
          className="stat-card"
          onClick={() => setActiveTab('overdue')}
          style={{
            cursor: 'pointer',
            borderLeft: '4px solid var(--status-danger)',
            backgroundColor: activeTab === 'overdue' ? '#fef2f2' : '#ffffff',
          }}
        >
          <div className="stat-info">
            <span className="stat-label" style={{ color: 'var(--status-danger)' }}>Overdue Actions</span>
            <span className="stat-value" style={{ color: '#991b1b' }}>{s.overdueCount}</span>
            <span className="stat-subtext">Requires immediate intervention</span>
          </div>
          <div className="stat-icon-wrapper" style={{ backgroundColor: '#fee2e2', color: '#dc2626' }}>
            <AlertTriangle size={24} />
          </div>
        </div>

        <div
          className="stat-card"
          onClick={() => setActiveTab('dueToday')}
          style={{
            cursor: 'pointer',
            borderLeft: '4px solid var(--primary)',
            backgroundColor: activeTab === 'dueToday' ? '#eff6ff' : '#ffffff',
          }}
        >
          <div className="stat-info">
            <span className="stat-label" style={{ color: 'var(--primary)' }}>Due Today</span>
            <span className="stat-value">{s.dueTodayCount}</span>
            <span className="stat-subtext">Immediate calendar obligations</span>
          </div>
          <div className="stat-icon-wrapper" style={{ backgroundColor: '#e0f2fe', color: '#0284c7' }}>
            <Clock size={24} />
          </div>
        </div>

        <div
          className="stat-card"
          onClick={() => setActiveTab('dueThisWeek')}
          style={{
            cursor: 'pointer',
            borderLeft: '4px solid #d97706',
            backgroundColor: activeTab === 'dueThisWeek' ? '#fffbeb' : '#ffffff',
          }}
        >
          <div className="stat-info">
            <span className="stat-label" style={{ color: '#d97706' }}>Due This Week</span>
            <span className="stat-value">{s.dueThisWeekCount}</span>
            <span className="stat-subtext">7-day lookahead window</span>
          </div>
          <div className="stat-icon-wrapper" style={{ backgroundColor: '#fef3c7', color: '#b45309' }}>
            <Calendar size={24} />
          </div>
        </div>

        <div
          className="stat-card"
          onClick={() => setActiveTab('upcoming')}
          style={{
            cursor: 'pointer',
            borderLeft: '4px solid var(--status-success)',
            backgroundColor: activeTab === 'upcoming' ? '#ecfdf5' : '#ffffff',
          }}
        >
          <div className="stat-info">
            <span className="stat-label" style={{ color: 'var(--status-success)' }}>Upcoming (30-90 Days)</span>
            <span className="stat-value">{s.upcomingCount}</span>
            <span className="stat-subtext">Scheduled milestone horizons</span>
          </div>
          <div className="stat-icon-wrapper" style={{ backgroundColor: '#d1fae5', color: '#059669' }}>
            <CalendarClock size={24} />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        {[
          { key: 'all', label: `All Deadlines (${s.total})` },
          { key: 'overdue', label: `Overdue (${s.overdueCount})` },
          { key: 'dueToday', label: `Due Today (${s.dueTodayCount})` },
          { key: 'dueThisWeek', label: `Due This Week (${s.dueThisWeekCount})` },
          { key: 'upcoming', label: `Upcoming (${s.upcomingCount})` },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`btn ${activeTab === tab.key ? 'btn-primary' : 'btn-secondary'} btn-sm`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Deadlines Table */}
      {getFilteredList().length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
          <CheckCircle2 size={36} color="var(--status-success)" style={{ margin: '0 auto 12px' }} />
          <h4 style={{ fontSize: '1rem', fontWeight: 600 }}>No items in selected window</h4>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            All deadlines are satisfied or tracked for future cycles.
          </p>
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Title / Description</th>
                <th>Linked Project</th>
                <th>Due Date</th>
                <th>Countdown</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Jump To Asset</th>
              </tr>
            </thead>
            <tbody>
              {getFilteredList().map((item) => (
                <tr
                  key={`${item.entityType}-${item.id}`}
                  style={{
                    backgroundColor: item.urgency === 'overdue' ? 'rgba(254, 242, 242, 0.45)' : undefined,
                  }}
                >
                  <td>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        padding: '3px 8px',
                        borderRadius: 'var(--radius-full)',
                        backgroundColor:
                          item.urgency === 'overdue'
                            ? '#fee2e2'
                            : item.urgency === 'dueToday'
                            ? '#e0f2fe'
                            : '#f1f5f9',
                        color:
                          item.urgency === 'overdue'
                            ? '#b91c1c'
                            : item.urgency === 'dueToday'
                            ? '#0369a1'
                            : '#475569',
                      }}
                    >
                      {item.category}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text-main)', maxWidth: '340px' }}>
                      {item.title}
                    </div>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                      {item.projectName || 'General Platform'}
                    </span>
                  </td>
                  <td>
                    <span
                      style={{
                        fontSize: '0.85rem',
                        fontWeight: item.urgency === 'overdue' ? 700 : 500,
                        color: item.urgency === 'overdue' ? '#dc2626' : 'var(--text-main)',
                      }}
                    >
                      {new Date(item.dueDate).toLocaleDateString()}
                    </span>
                  </td>
                  <td>
                    <span
                      className="font-mono"
                      style={{
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        color:
                          item.daysRemaining < 0
                            ? '#dc2626'
                            : item.daysRemaining === 0
                            ? '#0284c7'
                            : '#059669',
                      }}
                    >
                      {item.daysRemaining < 0
                        ? `${Math.abs(item.daysRemaining)} days ago`
                        : item.daysRemaining === 0
                        ? 'TODAY'
                        : `In ${item.daysRemaining} days`}
                    </span>
                  </td>
                  <td>
                    <span className="badge badge-neutral">{item.status}</span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleNavigate(item)}
                      style={{ gap: '4px' }}
                    >
                      <span>Manage</span>
                      <ArrowRight size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
