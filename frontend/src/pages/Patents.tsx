import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Edit, Trash2, Eye, FileCheck2, ExternalLink } from 'lucide-react';
import { patentService, projectService } from '../services/api';
import { Patent, Project, PatentStatus } from '../types';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import { ConfirmModal } from '../components/ConfirmModal';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { EmptyState } from '../components/EmptyState';

export const Patents: React.FC = () => {
  const { hasRole, user } = useAuth();
  const canManage = hasRole('ADMIN', 'IP MANAGER');

  const [patents, setPatents] = useState<Patent[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [jurisdictionFilter, setJurisdictionFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const [selectedPatent, setSelectedPatent] = useState<Patent | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    patentNumber: '',
    inventors: '',
    project: '',
    filingDate: new Date().toISOString().split('T')[0],
    priorityDate: '',
    applicationStatus: 'Draft' as PatentStatus,
    jurisdiction: 'USPTO (US)',
    owner: 'BioVault Therapeutics Inc.',
    expiryDate: '',
    description: '',
  });

  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadPatents = async () => {
    setLoading(true);
    try {
      const [patRes, prjRes] = await Promise.all([
        patentService.getPatents({
          search: search || undefined,
          status: statusFilter || undefined,
          jurisdiction: jurisdictionFilter || undefined,
          project: projectFilter || undefined,
        }),
        projectService.getProjects(),
      ]);

      if (patRes.data?.success) {
        setPatents(patRes.data.patents);
      }
      if (prjRes.data?.success) {
        setProjects(prjRes.data.projects);
      }
    } catch (err) {
      console.error('Failed to load patents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPatents();
  }, [search, statusFilter, jurisdictionFilter, projectFilter]);

  const handleOpenCreate = () => {
    setSelectedPatent(null);
    setFormData({
      title: '',
      patentNumber: `US-${Math.floor(10000000 + Math.random() * 90000000)}-B2`,
      inventors: user?.name ? `${user.name}` : 'Dr. Sarah Lin',
      project: projects.length > 0 ? projects[0]._id : '',
      filingDate: new Date().toISOString().split('T')[0],
      priorityDate: '',
      applicationStatus: 'Draft',
      jurisdiction: 'USPTO (US)',
      owner: 'BioVault Therapeutics Inc.',
      expiryDate: '',
      description: '',
    });
    setFormError('');
    setIsFormOpen(true);
  };

  const handleOpenEdit = (p: Patent) => {
    setSelectedPatent(p);
    const projectId = typeof p.project === 'object' && p.project ? (p.project as any)._id : p.project;
    setFormData({
      title: p.title,
      patentNumber: p.patentNumber,
      inventors: Array.isArray(p.inventors) ? p.inventors.join(', ') : '',
      project: projectId || '',
      filingDate: p.filingDate ? new Date(p.filingDate).toISOString().split('T')[0] : '',
      priorityDate: p.priorityDate ? new Date(p.priorityDate).toISOString().split('T')[0] : '',
      applicationStatus: p.applicationStatus,
      jurisdiction: p.jurisdiction,
      owner: p.owner,
      expiryDate: p.expiryDate ? new Date(p.expiryDate).toISOString().split('T')[0] : '',
      description: p.description,
    });
    setFormError('');
    setIsFormOpen(true);
  };

  const handleOpenDetail = (p: Patent) => {
    setSelectedPatent(p);
    setIsDetailOpen(true);
  };

  const handleOpenDelete = (p: Patent) => {
    setSelectedPatent(p);
    setIsDeleteOpen(true);
  };

  const handleSavePatent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.patentNumber.trim() || !formData.project) {
      setFormError('Patent title, patent number, and project association are required.');
      return;
    }

    setSubmitting(true);
    setFormError('');

    try {
      const payload = {
        ...formData,
        inventors: formData.inventors.split(',').map((s) => s.trim()).filter(Boolean),
      };

      if (selectedPatent) {
        await patentService.updatePatent(selectedPatent._id, payload);
      } else {
        await patentService.createPatent(payload);
      }
      setIsFormOpen(false);
      loadPatents();
    } catch (err: any) {
      setFormError(err.response?.data?.message || err.message || 'Operation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedPatent) return;
    setSubmitting(true);
    try {
      await patentService.deletePatent(selectedPatent._id);
      setIsDeleteOpen(false);
      loadPatents();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete patent.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Intellectual Property & Patents</h1>
          <p className="page-subtitle">
            Global biotechnology patent claims, examination tracking, priorities, and expiration timelines
          </p>
        </div>
        {canManage && (
          <div className="header-actions">
            <button className="btn btn-primary" onClick={handleOpenCreate}>
              <Plus size={16} />
              <span>Record New Patent</span>
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
            placeholder="Search patent title, number, inventors, owner..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className="filter-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="Draft">Draft</option>
          <option value="Filed">Filed</option>
          <option value="Under Examination">Under Examination</option>
          <option value="Granted">Granted</option>
          <option value="Rejected">Rejected</option>
          <option value="Expired">Expired</option>
        </select>

        <select
          className="filter-select"
          value={jurisdictionFilter}
          onChange={(e) => setJurisdictionFilter(e.target.value)}
        >
          <option value="">All Jurisdictions</option>
          <option value="USPTO (US)">USPTO (United States)</option>
          <option value="EPO (Europe)">EPO (Europe)</option>
          <option value="WIPO (PCT)">WIPO (PCT International)</option>
          <option value="JPO (Japan)">JPO (Japan)</option>
        </select>

        <select
          className="filter-select"
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
        >
          <option value="">All Associated Projects</option>
          {projects.map((prj) => (
            <option key={prj._id} value={prj._id}>
              {prj.code} - {prj.name.slice(0, 30)}...
            </option>
          ))}
        </select>
      </div>

      {/* Patents Table */}
      {loading ? (
        <LoadingSpinner message="Fetching patent records..." />
      ) : patents.length === 0 ? (
        <EmptyState
          title="No patents found"
          description="There are currently no patents matching your query filters."
          actionText={canManage ? 'Record Patent' : undefined}
          onAction={handleOpenCreate}
          icon={<FileCheck2 size={32} />}
        />
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Patent Number</th>
                <th>Patent Title</th>
                <th>Project</th>
                <th>Jurisdiction</th>
                <th>Application Status</th>
                <th>Filing / Expiry</th>
                <th>Inventors</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {patents.map((p) => {
                const projectName = typeof p.project === 'object' && p.project ? (p.project as any).name : 'Linked Project';
                const projectCode = typeof p.project === 'object' && p.project ? (p.project as any).code : '';

                return (
                  <tr key={p._id}>
                    <td>
                      <span className="font-mono" style={{ fontWeight: 700, color: 'var(--primary)' }}>
                        {p.patentNumber}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)', maxWidth: '340px' }} title={p.title}>
                        {p.title}
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {projectCode ? `[${projectCode}] ` : ''}{projectName.slice(0, 24)}...
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-neutral">{p.jurisdiction}</span>
                    </td>
                    <td>
                      <StatusBadge status={p.applicationStatus} />
                    </td>
                    <td>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Filed: {p.filingDate ? new Date(p.filingDate).toLocaleDateString() : 'N/A'}
                      </div>
                      {p.expiryDate && (
                        <div style={{ fontSize: '0.72rem', color: '#b45309' }}>
                          Exp: {new Date(p.expiryDate).toLocaleDateString()}
                        </div>
                      )}
                    </td>
                    <td>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        {Array.isArray(p.inventors) ? p.inventors.slice(0, 2).join(', ') : ''}
                        {p.inventors?.length > 2 ? ' et al.' : ''}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="table-actions" style={{ justifyContent: 'flex-end' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleOpenDetail(p)}
                          title="View Details"
                        >
                          <Eye size={14} />
                        </button>
                        {canManage && (
                          <>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleOpenEdit(p)}
                              title="Edit Patent"
                            >
                              <Edit size={14} />
                            </button>
                            <button
                              className="btn btn-danger-outline btn-sm"
                              onClick={() => handleOpenDelete(p)}
                              title="Delete Patent"
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
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

      {/* Create / Edit Patent Modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={selectedPatent ? `Edit Patent: ${selectedPatent.patentNumber}` : 'Record New Patent Application'}
        size="lg"
      >
        {formError && <div className="alert alert-danger">{formError}</div>}
        <form onSubmit={handleSavePatent}>
          <div className="form-group">
            <label className="form-label">
              Patent Title <span className="required">*</span>
            </label>
            <input
              type="text"
              required
              className="form-control"
              placeholder="e.g. Engineered CasX Endonuclease Variants for High-Efficiency Gene Editing"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">
                Patent Number / App Number <span className="required">*</span>
              </label>
              <input
                type="text"
                required
                className="form-control"
                placeholder="e.g. US-11849204-B2 or EP-3891240-A1"
                value={formData.patentNumber}
                onChange={(e) => setFormData({ ...formData, patentNumber: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                Associated Project <span className="required">*</span>
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
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">
                Inventors (Comma-separated) <span className="required">*</span>
              </label>
              <input
                type="text"
                required
                className="form-control"
                placeholder="Dr. Sarah Lin, Marcus Holloway, Dr. Kenji Sato"
                value={formData.inventors}
                onChange={(e) => setFormData({ ...formData, inventors: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Owner / Assignee Entity <span className="required">*</span></label>
              <input
                type="text"
                required
                className="form-control"
                value={formData.owner}
                onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
              />
            </div>
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Jurisdiction <span className="required">*</span></label>
              <select
                className="form-control"
                value={formData.jurisdiction}
                onChange={(e) => setFormData({ ...formData, jurisdiction: e.target.value })}
              >
                <option value="USPTO (US)">USPTO (United States)</option>
                <option value="EPO (Europe)">EPO (Europe)</option>
                <option value="WIPO (PCT)">WIPO (PCT International)</option>
                <option value="JPO (Japan)">JPO (Japan)</option>
                <option value="NMPA (China)">NMPA (China)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Application Status</label>
              <select
                className="form-control"
                value={formData.applicationStatus}
                onChange={(e) => setFormData({ ...formData, applicationStatus: e.target.value as PatentStatus })}
              >
                <option value="Draft">Draft</option>
                <option value="Filed">Filed</option>
                <option value="Under Examination">Under Examination</option>
                <option value="Granted">Granted</option>
                <option value="Rejected">Rejected</option>
                <option value="Expired">Expired</option>
              </select>
            </div>
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Filing Date <span className="required">*</span></label>
              <input
                type="date"
                required
                className="form-control"
                value={formData.filingDate}
                onChange={(e) => setFormData({ ...formData, filingDate: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Patent Expiry Date</label>
              <input
                type="date"
                className="form-control"
                value={formData.expiryDate}
                onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Abstract / Claims Summary</label>
            <textarea
              className="form-control"
              placeholder="Summary of independent claims, sequence identifiers, or molecular structure..."
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
              {submitting ? 'Saving...' : selectedPatent ? 'Update Patent' : 'Record Patent'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Detail Modal */}
      <Modal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title={selectedPatent ? `Patent File: ${selectedPatent.patentNumber}` : 'Patent Details'}
        size="lg"
      >
        {selectedPatent && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <StatusBadge status={selectedPatent.applicationStatus} />
              <span className="badge badge-neutral">{selectedPatent.jurisdiction}</span>
              <span className="badge badge-info">{selectedPatent.owner}</span>
            </div>

            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '14px' }}>
              {selectedPatent.title}
            </h3>

            <div style={{ backgroundColor: '#f8fafc', padding: '14px', borderRadius: 'var(--radius-md)', marginBottom: '18px' }}>
              <h5 style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '6px' }}>
                Abstract & Technical Scope
              </h5>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                {selectedPatent.description || 'No detailed technical claims recorded.'}
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', fontSize: '0.85rem' }}>
              <div>
                <strong>Inventors:</strong>{' '}
                {Array.isArray(selectedPatent.inventors) ? selectedPatent.inventors.join(', ') : 'Not specified'}
              </div>
              <div>
                <strong>Associated Project:</strong>{' '}
                {typeof selectedPatent.project === 'object' && selectedPatent.project
                  ? `${(selectedPatent.project as any).name} [${(selectedPatent.project as any).code}]`
                  : 'N/A'}
              </div>
              <div>
                <strong>Filing Date:</strong>{' '}
                {selectedPatent.filingDate ? new Date(selectedPatent.filingDate).toLocaleDateString() : 'N/A'}
              </div>
              <div>
                <strong>Expiration Date:</strong>{' '}
                {selectedPatent.expiryDate ? new Date(selectedPatent.expiryDate).toLocaleDateString() : 'Not Set'}
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
        title="Confirm Patent Record Deletion"
        message={`Are you sure you want to delete patent record "${selectedPatent?.title}" [${selectedPatent?.patentNumber}]?`}
        confirmText="Delete Patent"
        loading={submitting}
      />
    </div>
  );
};
