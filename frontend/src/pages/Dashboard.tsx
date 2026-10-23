import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FolderKanban,
  FileCheck2,
  Lightbulb,
  Handshake,
  FileSpreadsheet,
  ShieldAlert,
  Users2,
  CalendarClock,
  ArrowRight,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Clock,
  Sparkles,
} from 'lucide-react';
import { dashboardService, deadlineService } from '../services/api';
import { DashboardStats, DeadlineItem } from '../types';
import { StatCard } from '../components/StatCard';
import { LoadingSpinner } from '../components/LoadingSpinner';

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [deadlines, setDeadlines] = useState<DeadlineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const navigate = useNavigate();

  const loadData = async () => {
    try {
      const [dashRes, deadRes] = await Promise.all([
        dashboardService.getStats(),
        deadlineService.getDeadlines(),
      ]);

      if (dashRes.data?.success) {
        setStats(dashRes.data);
      }
      if (deadRes.data?.success && deadRes.data.allDeadlines) {
        setDeadlines(deadRes.data.allDeadlines.slice(0, 6)); // Top 6 upcoming/overdue
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  if (loading) {
    return <LoadingSpinner message="Fetching real-time biotechnology IP metrics..." />;
  }

  const s = stats?.summary || {
    totalProjects: 0,
    activeProjects: 0,
    totalPatents: 0,
    grantedPatents: 0,
    activeDisclosures: 0,
    activeAgreements: 0,
    pendingFilings: 0,
    totalCompliance: 0,
    overdueCompliance: 0,
    activeCollaborations: 0,
    upcomingDeadlines: 0,
  };

  // Funnel calculations
  const maxFunnelVal = Math.max(
    s.totalProjects,
    s.totalPatents,
    s.activeDisclosures,
    s.activeAgreements,
    1
  );

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Executive IP & Compliance Dashboard</h1>
          <p className="page-subtitle">
            Centralized biotechnology intelligence, portfolio status, and regulatory timelines
          </p>
        </div>
        <div className="header-actions">
          {stats?.fromCache && (
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
              Redis Cached Feed
            </span>
          )}
          <button
            className="btn btn-secondary btn-sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw size={14} className={refreshing ? 'spinner' : ''} />
            {refreshing ? 'Refreshing...' : 'Refresh Feed'}
          </button>
        </div>
      </div>

      {/* 8 Primary KPI Summary Cards */}
      <div className="grid-cols-4">
        <StatCard
          label="Total Projects"
          value={s.totalProjects}
          subtext={`${s.activeProjects} Active Clinical / Pre-clinical`}
          icon={<FolderKanban size={24} />}
          iconBgColor="#eff6ff"
          iconColor="#2563eb"
          onClick={() => navigate('/projects')}
        />
        <StatCard
          label="Patents Portfolio"
          value={s.totalPatents}
          subtext={`${s.grantedPatents} Granted / Enforceable`}
          icon={<FileCheck2 size={24} />}
          iconBgColor="#ecfdf5"
          iconColor="#059669"
          onClick={() => navigate('/patents')}
        />
        <StatCard
          label="Tech Disclosures"
          value={s.activeDisclosures}
          subtext="Under active patent evaluation"
          icon={<Lightbulb size={24} />}
          iconBgColor="#fffbeb"
          iconColor="#d97706"
          onClick={() => navigate('/disclosures')}
        />
        <StatCard
          label="Licensing Deals"
          value={s.activeAgreements}
          subtext="Commercial partnerships active"
          icon={<Handshake size={24} />}
          iconBgColor="#f5f3ff"
          iconColor="#7c3aed"
          onClick={() => navigate('/agreements')}
        />
        <StatCard
          label="Regulatory Filings"
          value={s.pendingFilings}
          subtext="FDA & EMA submissions pending"
          icon={<FileSpreadsheet size={24} />}
          iconBgColor="#e0f2fe"
          iconColor="#0284c7"
          onClick={() => navigate('/filings')}
        />
        <StatCard
          label="Compliance Items"
          value={s.totalCompliance}
          subtext={s.overdueCompliance > 0 ? `${s.overdueCompliance} Critical/Overdue` : 'All items in compliance'}
          icon={<ShieldAlert size={24} />}
          iconBgColor={s.overdueCompliance > 0 ? '#fef2f2' : '#ecfdf5'}
          iconColor={s.overdueCompliance > 0 ? '#dc2626' : '#059669'}
          onClick={() => navigate('/compliance')}
        />
        <StatCard
          label="Collaborations"
          value={s.activeCollaborations}
          subtext="University & Consortium R&D"
          icon={<Users2 size={24} />}
          iconBgColor="#ccfbf1"
          iconColor="#0d9488"
          onClick={() => navigate('/collaborations')}
        />
        <StatCard
          label="Target Deadlines"
          value={s.upcomingDeadlines}
          subtext="Next 30 days critical events"
          icon={<CalendarClock size={24} />}
          iconBgColor="#fef3c7"
          iconColor="#b45309"
          onClick={() => navigate('/deadlines')}
        />
      </div>

      {/* Charts Section: IP Lifecycle Progression & Compliance Breakdown */}
      <div className="grid-cols-2">
        {/* IP Lifecycle Funnel Visualizer */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Biotechnology IP Lifecycle Funnel</h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Conversion Pipeline</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '10px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px' }}>
                <span style={{ fontWeight: 600 }}>1. Active R&D Projects</span>
                <span className="font-mono" style={{ fontWeight: 700 }}>{s.totalProjects}</span>
              </div>
              <div style={{ height: '10px', backgroundColor: '#e2e8f0', borderRadius: '5px', overflow: 'hidden' }}>
                <div style={{ width: `${(s.totalProjects / maxFunnelVal) * 100}%`, height: '100%', backgroundColor: '#3b82f6', borderRadius: '5px' }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px' }}>
                <span style={{ fontWeight: 600 }}>2. Technology Disclosures</span>
                <span className="font-mono" style={{ fontWeight: 700 }}>{s.activeDisclosures}</span>
              </div>
              <div style={{ height: '10px', backgroundColor: '#e2e8f0', borderRadius: '5px', overflow: 'hidden' }}>
                <div style={{ width: `${(s.activeDisclosures / maxFunnelVal) * 100}%`, height: '100%', backgroundColor: '#f59e0b', borderRadius: '5px' }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px' }}>
                <span style={{ fontWeight: 600 }}>3. Patent Applications Filed / Examined</span>
                <span className="font-mono" style={{ fontWeight: 700 }}>{s.totalPatents}</span>
              </div>
              <div style={{ height: '10px', backgroundColor: '#e2e8f0', borderRadius: '5px', overflow: 'hidden' }}>
                <div style={{ width: `${(s.totalPatents / maxFunnelVal) * 100}%`, height: '100%', backgroundColor: '#0284c7', borderRadius: '5px' }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px' }}>
                <span style={{ fontWeight: 600 }}>4. Granted & Validated Patents</span>
                <span className="font-mono" style={{ fontWeight: 700 }}>{s.grantedPatents}</span>
              </div>
              <div style={{ height: '10px', backgroundColor: '#e2e8f0', borderRadius: '5px', overflow: 'hidden' }}>
                <div style={{ width: `${(s.grantedPatents / maxFunnelVal) * 100}%`, height: '100%', backgroundColor: '#10b981', borderRadius: '5px' }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px' }}>
                <span style={{ fontWeight: 600 }}>5. Active Commercial Licensing Deals</span>
                <span className="font-mono" style={{ fontWeight: 700 }}>{s.activeAgreements}</span>
              </div>
              <div style={{ height: '10px', backgroundColor: '#e2e8f0', borderRadius: '5px', overflow: 'hidden' }}>
                <div style={{ width: `${(s.activeAgreements / maxFunnelVal) * 100}%`, height: '100%', backgroundColor: '#8b5cf6', borderRadius: '5px' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Compliance Risk & Status Distribution */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Regulatory & Biosafety Compliance</h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Audit Readiness</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', margin: '14px 0 24px' }}>
            <div style={{ textAlign: 'center', padding: '12px', borderRadius: 'var(--radius-md)', backgroundColor: '#fef2f2', border: '1px solid #fecaca' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#dc2626', textTransform: 'uppercase' }}>Overdue</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#991b1b', marginTop: '2px' }}>{s.overdueCompliance}</div>
            </div>
            <div style={{ textAlign: 'center', padding: '12px', borderRadius: 'var(--radius-md)', backgroundColor: '#fffbeb', border: '1px solid #fde68a' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#d97706', textTransform: 'uppercase' }}>In Progress</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#92400e', marginTop: '2px' }}>
                {stats?.charts.complianceByStatus?.find((c) => c._id === 'In Progress')?.count || 0}
              </div>
            </div>
            <div style={{ textAlign: 'center', padding: '12px', borderRadius: 'var(--radius-md)', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase' }}>Pending</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1e40af', marginTop: '2px' }}>
                {stats?.charts.complianceByStatus?.find((c) => c._id === 'Pending')?.count || 0}
              </div>
            </div>
            <div style={{ textAlign: 'center', padding: '12px', borderRadius: 'var(--radius-md)', backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#059669', textTransform: 'uppercase' }}>Completed</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#065f46', marginTop: '2px' }}>
                {stats?.charts.complianceByStatus?.find((c) => c._id === 'Completed')?.count || 0}
              </div>
            </div>
          </div>

          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
            Risk Stratification
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {['Critical', 'High', 'Medium', 'Low'].map((r) => {
              const count = stats?.charts.complianceByRisk?.find((c) => c._id === r)?.count || 0;
              const color = r === 'Critical' ? '#dc2626' : r === 'High' ? '#ea580c' : r === 'Medium' ? '#f59e0b' : '#10b981';
              return (
                <div
                  key={r}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-light)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color }}>{r}</span>
                  <span style={{ fontSize: '1rem', fontWeight: 700, marginTop: '2px' }}>{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Grid: Upcoming Deadlines & Recent Activity Feed */}
      <div className="grid-cols-2" style={{ marginTop: '24px' }}>
        {/* Deadlines Widget */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Critical Upcoming Deadlines</h3>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => navigate('/deadlines')}
              style={{ fontSize: '0.75rem' }}
            >
              View Deadlines <ArrowRight size={12} />
            </button>
          </div>

          {deadlines.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)' }}>
              No immediate deadlines found.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {deadlines.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: item.urgency === 'overdue' ? '#fef2f2' : '#f8fafc',
                    border: `1px solid ${item.urgency === 'overdue' ? '#fecaca' : 'var(--border-light)'}`,
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1, marginRight: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                      <span
                        style={{
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          color: item.urgency === 'overdue' ? 'var(--status-danger)' : 'var(--text-secondary)',
                        }}
                      >
                        {item.category}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        color: 'var(--text-main)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                      title={item.title}
                    >
                      {item.title}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: item.urgency === 'overdue' ? '#dc2626' : 'var(--text-main)' }}>
                      {new Date(item.dueDate).toLocaleDateString()}
                    </div>
                    <span
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        color: item.urgency === 'overdue' ? '#b91c1c' : 'var(--text-muted)',
                      }}
                    >
                      {item.daysRemaining < 0
                        ? `${Math.abs(item.daysRemaining)}d overdue`
                        : item.daysRemaining === 0
                        ? 'Due Today'
                        : `In ${item.daysRemaining} days`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Audit Log / Recent Activities Feed */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Recent Lifecycle Activities</h3>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => navigate('/activity-logs')}
              style={{ fontSize: '0.75rem' }}
            >
              Full Audit Trail <ArrowRight size={12} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '380px', overflowY: 'auto' }}>
            {stats?.recentActivities && stats.recentActivities.length > 0 ? (
              stats.recentActivities.map((log) => (
                <div
                  key={log._id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    paddingBottom: '12px',
                    borderBottom: '1px solid var(--border-light)',
                  }}
                >
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: 'var(--radius-full)',
                      backgroundColor: 'var(--primary-light)',
                      color: 'var(--primary-dark)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      fontSize: '0.75rem',
                      fontWeight: 700,
                    }}
                  >
                    {log.userName?.[0] || 'U'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.825rem', color: 'var(--text-main)' }}>
                      <strong>{log.userName}</strong> ({log.userRole})
                    </div>
                    <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      {log.details}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-light)', marginTop: '4px' }}>
                      {new Date(log.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                No recent activity logged.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
