import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Edit, Trash2, Eye, FileSpreadsheet, AlertTriangle, Clock } from 'lucide-react';
import { filingService, projectService } from '../services/api';
import { RegulatoryFiling, Project, FilingStatus } from '../types';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import { ConfirmModal } from '../components/ConfirmModal';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { EmptyState } from '../components/EmptyState';

export const RegulatoryFilings: React.FC = () => {
  const { hasRole, user } = useAuth();
  const canManage = hasRole('ADMIN', 'IP MANAGER');

  const [filings, setFilings] = useState<RegulatoryFiling[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [authorityFilter, setAuthorityFilter] = useState('');

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const [selectedFiling, setSelectedFiling] = useState<RegulatoryFiling | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    filingName: '',
    filingId: '',
    project: '',
    regulatoryAuthority: 'FDA (United States)',
    filingType: 'IND (Investigational New Drug)',
    submissionDate: '',
    dueDate: '',
    status: 'Draft' as FilingStatus,
    responsiblePerson: '',
    description: '',
  });

  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [filRes, prjRes] = await Promise.all([
        filingService.getFilings({
          search: search || undefined,
          status: statusFilter || undefined,
          authority: authorityFilter || undefined,
        }),
        projectService.getProjects(),
      ]);

      if (filRes.data?.success) {
        setFilings(filRes.data.filings);
      }
      if (prjRes.data?.success) {
        setProjects(prjRes.data.projects);
      }
    } catch (err) {
      console.error('Failed to load filings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search, statusFilter, authorityFilter]);

  const handleOpenCreate = () => {
    setSelectedFiling(null);
    const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    setFormData({
      filingName: '',
      filingId: `REG-FDA-${Math.floor(1000 + Math.random() * 9000)}`,
      project: projects.length > 0 ? projects[0]._id : '',
      regulatoryAuthority: 'FDA (United States)',
      filingType: 'IND (Investigational New Drug)',
      submissionDate: '',
      dueDate: in30Days.toISOString().split('T')[0],
      status: 'Draft',
      responsiblePerson: user?.name || 'Dr. Eleanor Vance',
      description: '',
    });
    setFormError('');
    setIsFormOpen(true);
  };

  const handleOpenEdit = (f: RegulatoryFiling) => {
    setSelectedFiling(f);
    const projectId = typeof f.project === 'object' && f.project ? (f.project as any)._id : f.project;

    setFormData({
      filingName: f.filingName,
      filingId: f.filingId,
      project: projectId || '',
      regulatoryAuthority: f.regulatoryAuthority,
      filingType: f.filingType,
      submissionDate: f.submissionDate ? new Date(f.submissionDate).toISOString().split('T')[0] : '',
      dueDate: f.dueDate ? new Date(f.dueDate).toISOString().split('T')[0] : '',
      status: f.status,
      responsiblePerson: f.responsiblePerson,
      description: f.description || '',
    });
    setFormError('');
    setIsFormOpen(true);
  };

  const handleOpenDetail = (f: RegulatoryFiling) => {
    setSelectedFiling(f);
    setIsDetailOpen(true);
  };

  const handleOpenDelete = (f: RegulatoryFiling) => {
    setSelectedFiling(f);
    setIsDeleteOpen(true);
  };

  const handleSaveFiling = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.filingName.trim() || !formData.project || !formData.dueDate || !formData.responsiblePerson.trim()) {
      setFormError('Filing name, project association, due date, and responsible person are required.');
      return;
    }

    setSubmitting(true);
    setFormError('');

    try {
      if (selectedFiling) {
        await filingService.updateFiling(selectedFiling._id, formData);
      } else {
        await filingService.createFiling(formData);
      }
      setIsFormOpen(false);
      loadData();
    } catch (err: any) {
      setFormError(err.response?.data?.message || err.message || 'Operation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedFiling) return;
    setSubmitting(true);
    try {
      await filingService.deleteFiling(selectedFiling._id);
      setIsDeleteOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete regulatory filing.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Regulatory Dossiers & Filings</h1>
          <p className="page-subtitle">
            FDA, EMA, and international regulatory submissions, IND applications, and response deadlines
          </p>
        </div>
        {canManage && (
          <div className="header-actions">
            <button className="btn btn-primary" onClick={handleOpenCreate}>
              <Plus size={16} />
              <span>Create Regulatory Filing</span>
            </button>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="filter-bar">
        <div className="filter-input-wrap">
          <Search size={18} />
          <input
            type="text"
            className="filter-input"
            placeholder="Search filings, authority, type, responsible officer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className="filter-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Filing Statuses</option>
          <option value="Draft">Draft</option>
          <option value="Prepared">Prepared</option>
          <option value="Submitted">Submitted</option>
          <option value="Under Review">Under Review</option>
          <option value="Approved">Approved</option>
          <option value="Rejected">Rejected</option>
        </select>

        <select
          className="filter-select"
          value={authorityFilter}
          onChange={(e) => setAuthorityFilter(e.target.value)}
        >
          <option value="">All Regulatory Authorities</option>
          <option value="FDA (United States)">FDA (United States)</option>
          <option value="EMA (European Union)">EMA (European Union)</option>
          <option value="PMDA (Japan)">PMDA (Japan)</option>
          <option value="NMPA (China)">NMPA (China)</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <LoadingSpinner message="Fetching regulatory records..." />
      ) : filings.length === 0 ? (
        <EmptyState
          title="No regulatory filings found"
          description="There are currently no filings matching your filters."
          actionText={canManage ? 'New Regulatory Filing' : undefined}
          onAction={handleOpenCreate}
          icon={<FileSpreadsheet size={32} />}
        />
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Filing ID</th>
                <th>Filing Title</th>
                <th>Authority</th>
                <th>Filing Type</th>
                <th>Status</th>
                <th>Due Date / Timing</th>
                <th>Responsible Officer</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filings.map((f) => (
                <tr
                  key={f._id}
                  style={{
                    backgroundColor: f.isOverdue ? 'rgba(254, 242, 242, 0.4)' : undefined,
                  }}
                >
                  <td>
                    <span className="font-mono" style={{ fontWeight: 700, color: 'var(--primary)' }}>
                      {f.filingId}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text-main)', maxWidth: '320px' }}>
                      {f.filingName}
                    </div>
                  </td>
                  <td>
                    <span className="badge badge-neutral">{f.regulatoryAuthority}</span>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{f.filingType}</span>
                  </td>
                  <td>
                    <StatusBadge status={f.status} />
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {f.isOverdue && <AlertTriangle size={14} color="#dc2626" />}
                      {f.isUpcoming && <Clock size={14} color="#f59e0b" />}
                      <span
                        style={{
                          fontSize: '0.8rem',
                          fontWeight: f.isOverdue ? 700 : 500,
                          color: f.isOverdue ? '#dc2626' : f.isUpcoming ? '#b45309' : 'var(--text-main)',
                        }}
                      >
                        {new Date(f.dueDate).toLocaleDateString()}
                      </span>
                    </div>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.825rem' }}>{f.responsiblePerson}</span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div className="table-actions" style={{ justifyContent: 'flex-end' }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleOpenDetail(f)}
                        title="View Details"
                      >
                        <Eye size={14} />
                      </button>
                      {canManage && (
                        <>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleOpenEdit(f)}
                            title="Edit Filing"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            className="btn btn-danger-outline btn-sm"
                            onClick={() => handleOpenDelete(f)}
                            title="Delete Filing"
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={selectedFiling ? `Edit Regulatory Filing: ${selectedFiling.filingId}` : 'Create Regulatory Filing Dossier'}
        size="lg"
      >
        {formError && <div className="alert alert-danger">{formError}</div>}
        <form onSubmit={handleSaveFiling}>
          <div className="form-group">
            <label className="form-label">
              Filing / Application Title <span className="required">*</span>
            </label>
            <input
              type="text"
              required
              className="form-control"
              placeholder="e.g. IND Application for BV-CasX-101 in Severe Sickle Cell Disease"
              value={formData.filingName}
              onChange={(e) => setFormData({ ...formData, filingName: e.target.value })}
            />
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Regulatory Authority <span className="required">*</span></label>
              <select
                className="form-control"
                value={formData.regulatoryAuthority}
                onChange={(e) => setFormData({ ...formData, regulatoryAuthority: e.target.value })}
              >
                <option value="FDA (United States)">FDA (United States)</option>
                <option value="EMA (European Union)">EMA (European Union)</option>
                <option value="PMDA (Japan)">PMDA (Japan)</option>
                <option value="NMPA (China)">NMPA (China)</option>
                <option value="MHRA (United Kingdom)">MHRA (United Kingdom)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Filing Type <span className="required">*</span></label>
              <select
                className="form-control"
                value={formData.filingType}
                onChange={(e) => setFormData({ ...formData, filingType: e.target.value })}
              >
                <option value="IND (Investigational New Drug)">IND (Investigational New Drug)</option>
                <option value="NDA (New Drug Application)">NDA (New Drug Application)</option>
                <option value="BLA (Biologics License Application)">BLA (Biologics License Application)</option>
                <option value="CTA (Clinical Trial Authorization)">CTA (Clinical Trial Authorization)</option>
                <option value="Orphan Drug Designation">Orphan Drug Designation</option>
              </select>
            </div>
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">
                Associated R&D Project <span className="required">*</span>
              </label>
              <select
                required
                className="form-control"
                value={formData.project}
                onChange={(e) => setFormData({ ...formData, project: e.target.value })}
              >
                <option value="">Select Project</option>
                {projects.map((p) => (
                  <option key={p._id} value={p._id}>
                    [{p.code}] {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">
                Responsible Officer / Lead <span className="required">*</span>
              </label>
              <input
                type="text"
                required
                className="form-control"
                value={formData.responsiblePerson}
                onChange={(e) => setFormData({ ...formData, responsiblePerson: e.target.value })}
              />
            </div>
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Target Regulatory Deadline <span className="required">*</span></label>
              <input
                type="date"
                required
                className="form-control"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Official Submission Date</label>
              <input
                type="date"
                className="form-control"
                value={formData.submissionDate}
                onChange={(e) => setFormData({ ...formData, submissionDate: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Review Status</label>
            <select
              className="form-control"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as FilingStatus })}
            >
              <option value="Draft">Draft</option>
              <option value="Prepared">Prepared</option>
              <option value="Submitted">Submitted</option>
              <option value="Under Review">Under Review</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Dossier Notes & Scientific Context</label>
            <textarea
              className="form-control"
              placeholder="Module breakdown (CMC, Nonclinical, Clinical protocol)..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="modal-footer" style={{ margin: '16px -24px -24px', padding: '16px 24px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsFormOpen(false)}
              disabled={submitting}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Saving...' : selectedFiling ? 'Update Filing' : 'Save Filing'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Detail Modal */}
      <Modal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title={selectedFiling ? `Filing Dossier: ${selectedFiling.filingId}` : 'Filing Details'}
        size="lg"
      >
        {selectedFiling && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <StatusBadge status={selectedFiling.status} />
              <span className="badge badge-neutral">{selectedFiling.regulatoryAuthority}</span>
              <span className="badge badge-info">{selectedFiling.filingType}</span>
            </div>

            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '14px' }}>
              {selectedFiling.filingName}
            </h3>

            <div style={{ backgroundColor: '#f8fafc', padding: '14px', borderRadius: 'var(--radius-md)', marginBottom: '18px' }}>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                {selectedFiling.description || 'No detailed dossier notes recorded.'}
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', fontSize: '0.85rem' }}>
              <div>
                <strong>Regulatory Due Date:</strong>{' '}
                <span style={{ color: selectedFiling.isOverdue ? '#dc2626' : undefined, fontWeight: 600 }}>
                  {new Date(selectedFiling.dueDate).toLocaleDateString()}
                  {selectedFiling.isOverdue ? ' (OVERDUE)' : ''}
                </span>
              </div>
              <div>
                <strong>Submission Date:</strong>{' '}
                {selectedFiling.submissionDate
                  ? new Date(selectedFiling.submissionDate).toLocaleDateString()
                  : 'Not yet submitted'}
              </div>
              <div>
                <strong>Responsible Officer:</strong> {selectedFiling.responsiblePerson}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Modal */}
      <ConfirmModal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Confirm Filing Deletion"
        message={`Are you sure you want to delete regulatory filing "${selectedFiling?.filingName}" [${selectedFiling?.filingId}]?`}
        confirmText="Delete Filing"
        loading={submitting}
      />
    </div>
  );
};
