import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Edit, Trash2, Eye, Users2 } from 'lucide-react';
import { collaborationService, projectService } from '../services/api';
import { ResearchCollaboration, Project, CollaborationStatus } from '../types';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import { ConfirmModal } from '../components/ConfirmModal';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { EmptyState } from '../components/EmptyState';

export const Collaborations: React.FC = () => {
  const { hasRole, user } = useAuth();
  const canDelete = hasRole('ADMIN', 'IP MANAGER');

  const [collaborations, setCollaborations] = useState<ResearchCollaboration[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const [selectedCollab, setSelectedCollab] = useState<ResearchCollaboration | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    collaborationName: '',
    collaborationId: '',
    project: '',
    partnerOrganization: '',
    leadResearcher: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    collaborationType: 'Co-Development',
    status: 'Active' as CollaborationStatus,
    description: '',
  });

  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [colRes, prjRes] = await Promise.all([
        collaborationService.getCollaborations({
          search: search || undefined,
          status: statusFilter || undefined,
          collaborationType: typeFilter || undefined,
        }),
        projectService.getProjects(),
      ]);

      if (colRes.data?.success) {
        setCollaborations(colRes.data.collaborations);
      }
      if (prjRes.data?.success) {
        setProjects(prjRes.data.projects);
      }
    } catch (err) {
      console.error('Failed to load collaborations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search, statusFilter, typeFilter]);

  const handleOpenCreate = () => {
    setSelectedCollab(null);
    const twoYearsLater = new Date();
    twoYearsLater.setFullYear(twoYearsLater.getFullYear() + 2);

    setFormData({
      collaborationName: '',
      collaborationId: `RC-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      project: projects.length > 0 ? projects[0]._id : '',
      partnerOrganization: '',
      leadResearcher: user?.name || 'Dr. Sarah Lin',
      startDate: new Date().toISOString().split('T')[0],
      endDate: twoYearsLater.toISOString().split('T')[0],
      collaborationType: 'Co-Development',
      status: 'Proposed',
      description: '',
    });
    setFormError('');
    setIsFormOpen(true);
  };

  const handleOpenEdit = (c: ResearchCollaboration) => {
    setSelectedCollab(c);
    const projectId = typeof c.project === 'object' && c.project ? (c.project as any)._id : c.project;

    setFormData({
      collaborationName: c.collaborationName,
      collaborationId: c.collaborationId,
      project: projectId || '',
      partnerOrganization: c.partnerOrganization,
      leadResearcher: c.leadResearcher,
      startDate: c.startDate ? new Date(c.startDate).toISOString().split('T')[0] : '',
      endDate: c.endDate ? new Date(c.endDate).toISOString().split('T')[0] : '',
      collaborationType: c.collaborationType,
      status: c.status,
      description: c.description || '',
    });
    setFormError('');
    setIsFormOpen(true);
  };

  const handleOpenDetail = (c: ResearchCollaboration) => {
    setSelectedCollab(c);
    setIsDetailOpen(true);
  };

  const handleOpenDelete = (c: ResearchCollaboration) => {
    setSelectedCollab(c);
    setIsDeleteOpen(true);
  };

  const handleSaveCollab = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.collaborationName.trim() || !formData.project || !formData.partnerOrganization.trim() || !formData.leadResearcher.trim()) {
      setFormError('Collaboration title, project association, partner org, and lead scientist are required.');
      return;
    }

    setSubmitting(true);
    setFormError('');

    try {
      if (selectedCollab) {
        await collaborationService.updateCollaboration(selectedCollab._id, formData);
      } else {
        await collaborationService.createCollaboration(formData);
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
    if (!selectedCollab) return;
    setSubmitting(true);
    try {
      await collaborationService.deleteCollaboration(selectedCollab._id);
      setIsDeleteOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete collaboration.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Research Collaborations</h1>
          <p className="page-subtitle">
            Academic partnerships, clinical consortia, multi-institutional R&D charters, and shared IP
          </p>
        </div>
        <div className="header-actions">
          <button className="btn btn-primary" onClick={handleOpenCreate}>
            <Plus size={16} />
            <span>Initiate Collaboration</span>
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
            placeholder="Search collaborations, partner universities, scientists..."
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
          <option value="Proposed">Proposed</option>
          <option value="Active">Active</option>
          <option value="Completed">Completed</option>
          <option value="Terminated">Terminated</option>
        </select>

        <select
          className="filter-select"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="">All Collaboration Types</option>
          <option value="Co-Development">Co-Development</option>
          <option value="Pre-clinical Evaluation">Pre-clinical Evaluation</option>
          <option value="Sponsored Research Agreement">Sponsored Research Agreement</option>
          <option value="Clinical Consortium">Clinical Consortium</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <LoadingSpinner message="Fetching scientific collaborations..." />
      ) : collaborations.length === 0 ? (
        <EmptyState
          title="No collaborations found"
          description="Initiate a research partnership with external academic or biopharma organizations."
          actionText="Initiate Collaboration"
          onAction={handleOpenCreate}
          icon={<Users2 size={32} />}
        />
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Collab ID</th>
                <th>Partnership Name</th>
                <th>Partner Organization</th>
                <th>Collaboration Type</th>
                <th>Lead Researcher</th>
                <th>Status</th>
                <th>Duration</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {collaborations.map((c) => {
                return (
                  <tr key={c._id}>
                    <td>
                      <span className="font-mono" style={{ fontWeight: 700, color: 'var(--primary)' }}>
                        {c.collaborationId}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)', maxWidth: '300px' }}>
                        {c.collaborationName}
                      </div>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
                        {c.partnerOrganization}
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-neutral">{c.collaborationType}</span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.825rem' }}>{c.leadResearcher}</span>
                    </td>
                    <td>
                      <StatusBadge status={c.status} />
                    </td>
                    <td>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        {new Date(c.startDate).toLocaleDateString()} &rarr;{' '}
                        {c.endDate ? new Date(c.endDate).toLocaleDateString() : 'Ongoing'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="table-actions" style={{ justifyContent: 'flex-end' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleOpenDetail(c)}
                          title="View Details"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleOpenEdit(c)}
                          title="Edit Collaboration"
                        >
                          <Edit size={14} />
                        </button>
                        {canDelete && (
                          <button
                            className="btn btn-danger-outline btn-sm"
                            onClick={() => handleOpenDelete(c)}
                            title="Delete Collaboration"
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
        title={selectedCollab ? `Edit Collaboration: ${selectedCollab.collaborationId}` : 'Initiate Research Collaboration'}
        size="lg"
      >
        {formError && <div className="alert alert-danger">{formError}</div>}
        <form onSubmit={handleSaveCollab}>
          <div className="form-group">
            <label className="form-label">
              Collaboration Name <span className="required">*</span>
            </label>
            <input
              type="text"
              required
              className="form-control"
              placeholder="e.g. Broad Institute CRISPR Engineering Consortium"
              value={formData.collaborationName}
              onChange={(e) => setFormData({ ...formData, collaborationName: e.target.value })}
            />
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">
                Partner Organization <span className="required">*</span>
              </label>
              <input
                type="text"
                required
                className="form-control"
                placeholder="e.g. Broad Institute of MIT and Harvard"
                value={formData.partnerOrganization}
                onChange={(e) => setFormData({ ...formData, partnerOrganization: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Collaboration Type <span className="required">*</span></label>
              <select
                className="form-control"
                value={formData.collaborationType}
                onChange={(e) => setFormData({ ...formData, collaborationType: e.target.value })}
              >
                <option value="Co-Development">Co-Development</option>
                <option value="Pre-clinical Evaluation">Pre-clinical Evaluation</option>
                <option value="Sponsored Research Agreement">Sponsored Research Agreement</option>
                <option value="Clinical Consortium">Clinical Consortium</option>
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
                Lead Researcher / Investigators <span className="required">*</span>
              </label>
              <input
                type="text"
                required
                className="form-control"
                value={formData.leadResearcher}
                onChange={(e) => setFormData({ ...formData, leadResearcher: e.target.value })}
              />
            </div>
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Effective Start Date <span className="required">*</span></label>
              <input
                type="date"
                required
                className="form-control"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Target End Date</label>
              <input
                type="date"
                className="form-control"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Collaboration Status</label>
            <select
              className="form-control"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as CollaborationStatus })}
            >
              <option value="Proposed">Proposed</option>
              <option value="Active">Active</option>
              <option value="Completed">Completed</option>
              <option value="Terminated">Terminated</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Scientific Scope & Intellectual Property Terms</label>
            <textarea
              className="form-control"
              placeholder="Milestone commitments, publication review covenants, shared IP ownership rules..."
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
              {submitting ? 'Saving...' : selectedCollab ? 'Update Collaboration' : 'Initiate Partnership'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Detail Modal */}
      <Modal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title="Collaboration Agreement Details"
        size="lg"
      >
        {selectedCollab && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <StatusBadge status={selectedCollab.status} />
              <span className="badge badge-neutral">{selectedCollab.collaborationType}</span>
            </div>

            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '14px' }}>
              {selectedCollab.collaborationName}
            </h3>

            <div style={{ backgroundColor: '#f8fafc', padding: '14px', borderRadius: 'var(--radius-md)', marginBottom: '18px' }}>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                {selectedCollab.description || 'No detailed scope recorded.'}
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', fontSize: '0.85rem' }}>
              <div>
                <strong>Partner Organization:</strong> {selectedCollab.partnerOrganization}
              </div>
              <div>
                <strong>Lead Investigators:</strong> {selectedCollab.leadResearcher}
              </div>
              <div>
                <strong>Charter Timeline:</strong>{' '}
                {new Date(selectedCollab.startDate).toLocaleDateString()} &rarr;{' '}
                {selectedCollab.endDate ? new Date(selectedCollab.endDate).toLocaleDateString() : 'Ongoing'}
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
        title="Confirm Collaboration Deletion"
        message={`Are you sure you want to delete collaboration record "${selectedCollab?.collaborationName}"?`}
        confirmText="Delete Record"
        loading={submitting}
      />
    </div>
  );
};
