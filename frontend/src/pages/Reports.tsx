import React, { useState, useEffect } from 'react';
import { BarChart3, PieChart, Sparkles, RefreshCw, FileCheck2, FolderKanban, ShieldAlert, FileSpreadsheet, Handshake, Users2 } from 'lucide-react';
import { reportService } from '../services/api';
import { ReportsData } from '../types';
import { LoadingSpinner } from '../components/LoadingSpinner';

export const Reports: React.FC = () => {
  const [data, setData] = useState<ReportsData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadReports = async () => {
    setLoading(true);
    try {
      const res = await reportService.getReports();
      if (res.data?.success) {
        setData(res.data);
      }
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  if (loading) {
    return <LoadingSpinner message="Aggregating multi-dimensional portfolio analytics from database..." />;
  }

  // Helper to render proportional horizontal bars
  const renderBarChart = (items: { _id: string; count: number }[], color: string = '#0284c7') => {
    if (!items || items.length === 0) {
      return <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No data points recorded.</div>;
    }
    const maxVal = Math.max(...items.map((i) => i.count), 1);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {items.map((item) => (
          <div key={item._id || 'Unassigned'}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px' }}>
              <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{item._id || 'Unassigned'}</span>
              <span className="font-mono" style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>
                {item.count}
              </span>
            </div>
            <div style={{ height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${(item.count / maxVal) * 100}%`,
                  height: '100%',
                  backgroundColor: color,
                  borderRadius: '4px',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Executive Reports & Portfolio Analytics</h1>
          <p className="page-subtitle">
            Cross-module distribution metrics, jurisdictional patent coverage, compliance risks, and commercial pipeline
          </p>
        </div>
        <div className="header-actions">
          {data?.fromCache && (
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
              Redis Cached Analytics
            </span>
          )}
          <button className="btn btn-secondary btn-sm" onClick={loadReports}>
            <RefreshCw size={14} />
            <span>Refresh Analytics</span>
          </button>
        </div>
      </div>

      {/* Grid of Report Modules */}
      <div className="grid-cols-2">
        {/* 1. Patent Statistics: Jurisdiction & Status */}
        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileCheck2 size={20} color="var(--primary)" />
              <h3 className="card-title">Patent Portfolio Jurisdictions</h3>
            </div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Global Coverage</span>
          </div>
          {renderBarChart(data?.patents.byJurisdiction || [], '#0284c7')}

          <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-light)' }}>
            <h5 style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '10px' }}>
              Patents by Application Status
            </h5>
            {renderBarChart(data?.patents.byStatus || [], '#059669')}
          </div>
        </div>

        {/* 2. Project Statistics: Department & Priority */}
        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FolderKanban size={20} color="#2563eb" />
              <h3 className="card-title">R&D Projects by Department</h3>
            </div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Therapeutic Focus</span>
          </div>
          {renderBarChart(data?.projects.byDepartment || [], '#2563eb')}

          <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-light)' }}>
            <h5 style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '10px' }}>
              Project Priority Allocation
            </h5>
            {renderBarChart(data?.projects.byPriority || [], '#7c3aed')}
          </div>
        </div>

        {/* 3. Compliance Statistics: Risk & Category */}
        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldAlert size={20} color="#dc2626" />
              <h3 className="card-title">Compliance Risk Stratification</h3>
            </div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Audit Vulnerability</span>
          </div>
          {renderBarChart(data?.compliance.byRisk || [], '#dc2626')}

          <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-light)' }}>
            <h5 style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '10px' }}>
              Compliance by Category
            </h5>
            {renderBarChart(data?.compliance.byCategory || [], '#ea580c')}
          </div>
        </div>

        {/* 4. Regulatory Filing Statistics: Authority & Types */}
        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileSpreadsheet size={20} color="#0d9488" />
              <h3 className="card-title">Regulatory Submissions by Authority</h3>
            </div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>FDA / EMA Dossiers</span>
          </div>
          {renderBarChart(data?.filings.byAuthority || [], '#0d9488')}

          <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-light)' }}>
            <h5 style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '10px' }}>
              Filings by Regulatory Status
            </h5>
            {renderBarChart(data?.filings.byStatus || [], '#0284c7')}
          </div>
        </div>

        {/* 5. Licensing Agreement Statistics */}
        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Handshake size={20} color="#8b5cf6" />
              <h3 className="card-title">Commercial Licensing by Type</h3>
            </div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Deal Structures</span>
          </div>
          {renderBarChart(data?.agreements.byType || [], '#8b5cf6')}

          <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-light)' }}>
            <h5 style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '10px' }}>
              Agreements by Status
            </h5>
            {renderBarChart(data?.agreements.byStatus || [], '#059669')}
          </div>
        </div>

        {/* 6. Research Collaboration Statistics */}
        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users2 size={20} color="#d97706" />
              <h3 className="card-title">Research Collaborations by Structure</h3>
            </div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Institutional Ties</span>
          </div>
          {renderBarChart(data?.collaborations.byType || [], '#d97706')}

          <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-light)' }}>
            <h5 style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '10px' }}>
              Partnerships by Operational Status
            </h5>
            {renderBarChart(data?.collaborations.byStatus || [], '#2563eb')}
          </div>
        </div>
      </div>
    </div>
  );
};
