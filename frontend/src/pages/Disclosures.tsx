import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Edit, Trash2, Eye, Lightbulb, Sparkles, CheckCircle2, ArrowRight } from 'lucide-react';
import { disclosureService, projectService } from '../services/api';
import { TechnologyDisclosure, Project, DisclosureStatus, DisclosurePriority } from '../types';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import { ConfirmModal } from '../components/ConfirmModal';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { EmptyState } from '../components/EmptyState';

export const Disclosures: React.FC = () => {
  const { hasRole, user } = useAuth();
  const canReview = hasRole('ADMIN', 'IP MANAGER');

  const [disclosures, setDisclosures] = useState<TechnologyDisclosure[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isConvertOpen, setIsConvertOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const [selectedDisclosure, setSelectedDisclosure] = useState<TechnologyDisclosure | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    disclosureId: '',
    inventor: '',
    project: '',
    description: '',
    priority: 'Medium' as DisclosurePriority,
    reviewStatus: 'Submitted' as DisclosureStatus,
    reviewer: '',
    decision: '',
  });

  // Conversion Form State
  const [convertData, setConvertData] = useState({
    patentNumber: '',
    jurisdiction: 'USPTO (US)',
    owner: 'BioVault Therapeutics Inc.',
    description: '',
  });

  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [discRes, prjRes] = await Promise.all([
        disclosureService.getDisclosures({
          search: search || undefined,
          status: statusFilter || undefined,
          priority: priorityFilter || undefined,
        }),
        projectService.getProjects(),
      ]);

      if (discRes.data?.success) {
        setDisclosures(discRes.data.disclosures);
      }
      if (prjRes.data?.success) {
        setProjects(prjRes.data.projects);
      }
    } catch (err) {
      console.error('Failed to load technology disclosures:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search, statusFilter, priorityFilter]);

  const handleOpenCreate = () => {
    setSelectedDisclosure(null);
    setFormData({
      title: '',
      disclosureId: `TD-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      inventor: user?.name || 'Lead Researcher',
      project: projects.length > 0 ? projects[0]._id : '',
      description: '',
      priority: 'Medium',
      reviewStatus: 'Submitted',
      reviewer: 'IP Review Committee',
      decision: '',
    });
    setFormError('');
    setIsFormOpen(true);
  };

  const handleOpenEdit = (d: TechnologyDisclosure) => {
    setSelectedDisclosure(d);
    const projectId = typeof d.project === 'object' && d.project ? (d.project as any)._id : d.project;
    setFormData({
      title: d.title,
      disclosureId: d.disclosureId,
      inventor: d.inventor,
      project: projectId || '',
      description: d.description,
      priority: d.priority,
      reviewStatus: d.reviewStatus,
      reviewer: d.reviewer || '',
      decision: d.decision || '',
    });
    setFormError('');
    setIsFormOpen(true);
  };

  const handleOpenDetail = (d: TechnologyDisclosure) => {
    setSelectedDisclosure(d);
    setIsDetailOpen(true);
  };

  const handleOpenConvert = (d: TechnologyDisclosure) => {
    setSelectedDisclosure(d);
    setConvertData({
      patentNumber: `US-${Math.floor(10000000 + Math.random() * 90000000)}-B2`,
      jurisdiction: 'USPTO (US)',
      owner: 'BioVault Therapeutics Inc.',
      description: d.description,
    });
    setIsConvertOpen(true);
  };

  const handleOpenDelete = (d: TechnologyDisclosure) => {
    setSelectedDisclosure(d);
    setIsDeleteOpen(true);
  };

  const handleSaveDisclosure = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.project) {
      setFormError('Disclosure title and project association are required.');
      return;
    }

    setSubmitting(true);
    setFormError('');

    try {
      if (selectedDisclosure) {
        await disclosureService.updateDisclosure(selectedDisclosure._id, formData);
      } else {
        await disclosureService.createDisclosure(formData);
      }
      setIsFormOpen(false);
      loadData();
    } catch (err: any) {
      setFormError(err.response?.data?.message || err.message || 'Operation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmConvert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDisclosure) return;

    setSubmitting(true);
    try {
      await disclosureService.convertToPatent(selectedDisclosure._id, convertData);
      setIsConvertOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Conversion to patent failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedDisclosure) return;
    setSubmitting(true);
    try {
      await disclosureService.deleteDisclosure(selectedDisclosure._id);
      setIsDeleteOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete disclosure.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Technology Disclosures</h1>
          <p className="page-subtitle">
            Scientific invention disclosures, evaluation pipeline, prior art review, and patent conversion
          </p>
        </div>
        <div className="header-actions">
          <button className="btn btn-primary" onClick={handleOpenCreate}>
            <Plus size={16} />
            <span>Submit Invention Disclosure</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="filter-bar">
        <div className="filter-input-wrap">
          <Search size={18} />
          <input
            type="text"
            className="filter-input"
            placeholder="Search disclosures, ID, inventor, description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className="filter-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Review Statuses</option>
          <option value="Submitted">Submitted</option>
          <option value="Under Review">Under Review</option>
          <option value="Approved">Approved</option>
          <option value="Rejected">Rejected</option>
          <option value="Converted to Patent">Converted to Patent</option>
        </select>

        <select
          className="filter-select"
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
        >
          <option value="">All Priorities</option>
          <option value="Critical">Critical</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <LoadingSpinner message="Loading invention disclosures..." />
      ) : disclosures.length === 0 ? (
        <EmptyState
          title="No technology disclosures found"
          description="Submit an invention disclosure to initiate the IP evaluation workflow."
          actionText="Submit Disclosure"
          onAction={handleOpenCreate}
          icon={<Lightbulb size={32} />}
        />
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Disclosure ID</th>
                <th>Invention Title</th>
                <th>Inventor</th>
                <th>Project</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Submitted</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {disclosures.map((d) => {
                const projectName = typeof d.project === 'object' && d.project ? (d.project as any).name : '';
                const projectCode = typeof d.project === 'object' && d.project ? (d.project as any).code : '';
                const isApproved = d.reviewStatus === 'Approved';

                return (
                  <tr key={d._id}>
                    <td>
                      <span className="font-mono" style={{ fontWeight: 700, color: 'var(--primary)' }}>
                        {d.disclosureId}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)', maxWidth: '340px' }} title={d.title}>
                        {d.title}
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.85rem' }}>{d.inventor}</span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {projectCode ? `[${projectCode}] ` : ''}{projectName.slice(0, 24)}...
                      </span>
                    </td>
                    <td>
                      <StatusBadge status={d.reviewStatus} />
                    </td>
                    <td>
                      <StatusBadge status={d.priority} />
                    </td>
                    <td>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        {new Date(d.submissionDate).toLocaleDateString()}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="table-actions" style={{ justifyContent: 'flex-end' }}>
                        {/* Convert to Patent Button (for Approved status) */}
                        {isApproved && canReview && (
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => handleOpenConvert(d)}
                            title="Convert to Patent Application"
                            style={{ backgroundColor: '#059669', borderColor: '#059669' }}
                          >
                            <Sparkles size={13} />
                            <span>Convert to Patent</span>
                          </button>
                        )}

                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleOpenDetail(d)}
                          title="View Details"
                        >
                          <Eye size={14} />
                        </button>

                        {(canReview || d.reviewStatus === 'Submitted') && (
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleOpenEdit(d)}
                            title="Edit / Review"
                          >
                            <Edit size={14} />
                          </button>
                        )}

                        {canReview && (
                          <button
                            className="btn btn-danger-outline btn-sm"
                            onClick={() => handleOpenDelete(d)}
                            title="Delete Disclosure"
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

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={selectedDisclosure ? `Edit Disclosure: ${selectedDisclosure.disclosureId}` : 'Submit Technology Disclosure'}
        size="lg"
      >
        {formError && <div className="alert alert-danger">{formError}</div>}
        <form onSubmit={handleSaveDisclosure}>
          <div className="form-group">
            <label className="form-label">
              Invention Title <span className="required">*</span>
            </label>
            <input
              type="text"
              required
              className="form-control"
              placeholder="e.g. High-Density Enzymatic Synthesis of Modified Nucleosides"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">
                Primary Inventor / Scientist <span className="required">*</span>
              </label>
              <input
                type="text"
                required
                className="form-control"
                value={formData.inventor}
                onChange={(e) => setFormData({ ...formData, inventor: e.target.value })}
              />
            </div>

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
          </div>

          <div className="form-group">
            <label className="form-label">Detailed Technical Disclosure & Utility</label>
            <textarea
              className="form-control"
              style={{ minHeight: '110px' }}
              placeholder="Describe the unexpected technical effect, novel catalyst, sequence variation, or formulation..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Commercial & Scientific Priority</label>
              <select
                className="form-control"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as DisclosurePriority })}
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>

            {canReview && (
              <div className="form-group">
                <label className="form-label">Review Status (Lifecycle)</label>
                <select
                  className="form-control"
                  value={formData.reviewStatus}
                  onChange={(e) => setFormData({ ...formData, reviewStatus: e.target.value as DisclosureStatus })}
                >
                  <option value="Submitted">Submitted</option>
                  <option value="Under Review">Under Review</option>
                  <option value="Approved">Approved</option>
                  <option value="Rejected">Rejected</option>
                  <option value="Converted to Patent">Converted to Patent</option>
                </select>
              </div>
            )}
          </div>

          {canReview && (
            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">Reviewer / Committee Officer</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Marcus Holloway, Esq."
                  value={formData.reviewer}
                  onChange={(e) => setFormData({ ...formData, reviewer: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Committee Decision Notes</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Approved for patent filing; FTO clear."
                  value={formData.decision}
                  onChange={(e) => setFormData({ ...formData, decision: e.target.value })}
                />
              </div>
            </div>
          )}

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
              {submitting ? 'Saving...' : selectedDisclosure ? 'Update Disclosure' : 'Submit Disclosure'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Convert to Patent Modal */}
      <Modal
        isOpen={isConvertOpen}
        onClose={() => setIsConvertOpen(false)}
        title="Convert Invention Disclosure to Patent Application"
      >
        <form onSubmit={handleConfirmConvert}>
          <div style={{ padding: '12px', backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 'var(--radius-md)', marginBottom: '16px', fontSize: '0.85rem', color: '#065f46' }}>
            Converting <strong>[{selectedDisclosure?.disclosureId}] {selectedDisclosure?.title}</strong> will automatically generate a new Patent record linked to this project and update this disclosure status to <em>Converted to Patent</em>.
          </div>

          <div className="form-group">
            <label className="form-label">
              Generated Patent Number <span className="required">*</span>
            </label>
            <input
              type="text"
              required
              className="form-control"
              value={convertData.patentNumber}
              onChange={(e) => setConvertData({ ...convertData, patentNumber: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Initial Filing Jurisdiction <span className="required">*</span></label>
            <select
              className="form-control"
              value={convertData.jurisdiction}
              onChange={(e) => setConvertData({ ...convertData, jurisdiction: e.target.value })}
            >
              <option value="USPTO (US)">USPTO (United States)</option>
              <option value="EPO (Europe)">EPO (Europe)</option>
              <option value="WIPO (PCT)">WIPO (PCT International)</option>
              <option value="JPO (Japan)">JPO (Japan)</option>
            </select>
          </div>

          <div className="modal-footer" style={{ margin: '16px -24px -24px', padding: '16px 24px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsConvertOpen(false)}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ backgroundColor: '#059669', borderColor: '#059669' }}
              disabled={submitting}
            >
              {submitting ? 'Converting...' : 'Execute Patent Conversion'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Detail Modal */}
      <Modal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title={selectedDisclosure ? `Disclosure Dossier: ${selectedDisclosure.disclosureId}` : 'Disclosure Details'}
        size="lg"
      >
        {selectedDisclosure && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <StatusBadge status={selectedDisclosure.reviewStatus} />
              <StatusBadge status={selectedDisclosure.priority} />
            </div>

            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '14px' }}>
              {selectedDisclosure.title}
            </h3>

            <div style={{ backgroundColor: '#f8fafc', padding: '14px', borderRadius: 'var(--radius-md)', marginBottom: '18px' }}>
              <h5 style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '6px' }}>
                Technical Invention Description
              </h5>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                {selectedDisclosure.description}
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', fontSize: '0.85rem' }}>
              <div>
                <strong>Lead Inventor:</strong> {selectedDisclosure.inventor}
              </div>
              <div>
                <strong>Submission Date:</strong>{' '}
                {new Date(selectedDisclosure.submissionDate).toLocaleDateString()}
              </div>
              <div>
                <strong>Reviewer:</strong> {selectedDisclosure.reviewer || 'Unassigned'}
              </div>
              <div>
                <strong>Review Decision:</strong>{' '}
                {selectedDisclosure.decision || 'Under Committee Review'}
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
        title="Confirm Disclosure Deletion"
        message={`Are you sure you want to delete disclosure "${selectedDisclosure?.title}" [${selectedDisclosure?.disclosureId}]?`}
        confirmText="Delete Disclosure"
        loading={submitting}
      />
    </div>
  );
};
