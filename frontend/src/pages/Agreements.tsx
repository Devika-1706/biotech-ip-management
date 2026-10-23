import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Edit, Trash2, Eye, Handshake, AlertCircle } from 'lucide-react';
import { agreementService, patentService, projectService } from '../services/api';
import { LicensingAgreement, Patent, Project, AgreementStatus } from '../types';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import { ConfirmModal } from '../components/ConfirmModal';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { EmptyState } from '../components/EmptyState';

export const Agreements: React.FC = () => {
  const { hasRole } = useAuth();
  const canManage = hasRole('ADMIN', 'IP MANAGER');

  const [agreements, setAgreements] = useState<LicensingAgreement[]>([]);
  const [patents, setPatents] = useState<Patent[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const [selectedAgreement, setSelectedAgreement] = useState<LicensingAgreement | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    agreementName: '',
    agreementId: '',
    patent: '',
    project: '',
    licensee: '',
    licensor: 'BioVault Therapeutics Inc.',
    agreementType: 'Exclusive Commercial License',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    royaltyInfo: '',
    status: 'Draft' as AgreementStatus,
    description: '',
  });

  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [agrRes, patRes, prjRes] = await Promise.all([
        agreementService.getAgreements({
          search: search || undefined,
          status: statusFilter || undefined,
          agreementType: typeFilter || undefined,
        }),
        patentService.getPatents(),
        projectService.getProjects(),
      ]);

      if (agrRes.data?.success) {
        setAgreements(agrRes.data.agreements);
      }
      if (patRes.data?.success) {
        setPatents(patRes.data.patents);
      }
      if (prjRes.data?.success) {
        setProjects(prjRes.data.projects);
      }
    } catch (err) {
      console.error('Failed to load agreements:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search, statusFilter, typeFilter]);

  const handleOpenCreate = () => {
    setSelectedAgreement(null);
    const oneYearLater = new Date();
    oneYearLater.setFullYear(oneYearLater.getFullYear() + 3);

    setFormData({
      agreementName: '',
      agreementId: `LA-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      patent: patents.length > 0 ? patents[0]._id : '',
      project: projects.length > 0 ? projects[0]._id : '',
      licensee: '',
      licensor: 'BioVault Therapeutics Inc.',
      agreementType: 'Exclusive Commercial License',
      startDate: new Date().toISOString().split('T')[0],
      endDate: oneYearLater.toISOString().split('T')[0],
      royaltyInfo: '5.0% Net Sales + $10M clinical milestone',
      status: 'Draft',
      description: '',
    });
    setFormError('');
    setIsFormOpen(true);
  };

  const handleOpenEdit = (a: LicensingAgreement) => {
    setSelectedAgreement(a);
    const patentId = typeof a.patent === 'object' && a.patent ? (a.patent as any)._id : a.patent;
    const projectId = typeof a.project === 'object' && a.project ? (a.project as any)._id : a.project;

    setFormData({
      agreementName: a.agreementName,
      agreementId: a.agreementId,
      patent: patentId || '',
      project: projectId || '',
      licensee: a.licensee,
      licensor: a.licensor,
      agreementType: a.agreementType,
      startDate: a.startDate ? new Date(a.startDate).toISOString().split('T')[0] : '',
      endDate: a.endDate ? new Date(a.endDate).toISOString().split('T')[0] : '',
      royaltyInfo: a.royaltyInfo || '',
      status: a.status,
      description: a.description || '',
    });
    setFormError('');
    setIsFormOpen(true);
  };

  const handleOpenDetail = (a: LicensingAgreement) => {
    setSelectedAgreement(a);
    setIsDetailOpen(true);
  };

  const handleOpenDelete = (a: LicensingAgreement) => {
    setSelectedAgreement(a);
    setIsDeleteOpen(true);
  };

  const handleSaveAgreement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.agreementName.trim() || !formData.licensee.trim() || !formData.endDate) {
      setFormError('Agreement title, licensee organization, and expiration date are required.');
      return;
    }

    setSubmitting(true);
    setFormError('');

    try {
      if (selectedAgreement) {
        await agreementService.updateAgreement(selectedAgreement._id, formData);
      } else {
        await agreementService.createAgreement(formData);
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
    if (!selectedAgreement) return;
    setSubmitting(true);
    try {
      await agreementService.deleteAgreement(selectedAgreement._id);
      setIsDeleteOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete agreement.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Licensing & Commercial Agreements</h1>
          <p className="page-subtitle">
            Global biopharma licenses, royalty terms, territory exclusivity, and expiration covenants
          </p>
        </div>
        {canManage && (
          <div className="header-actions">
            <button className="btn btn-primary" onClick={handleOpenCreate}>
              <Plus size={16} />
              <span>Draft New Licensing Agreement</span>
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
            placeholder="Search agreements, ID, licensee, royalty info..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className="filter-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Agreement Statuses</option>
          <option value="Draft">Draft</option>
          <option value="Negotiation">Negotiation</option>
          <option value="Active">Active</option>
          <option value="Expired">Expired</option>
          <option value="Terminated">Terminated</option>
        </select>

        <select
          className="filter-select"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="">All Agreement Types</option>
          <option value="Exclusive Commercial License">Exclusive Commercial License</option>
          <option value="Non-Exclusive License">Non-Exclusive License</option>
          <option value="Cross-License">Cross-License</option>
          <option value="Evaluation / Option">Evaluation / Option</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <LoadingSpinner message="Fetching licensing agreements..." />
      ) : agreements.length === 0 ? (
        <EmptyState
          title="No licensing agreements found"
          description="There are currently no agreements matching your filters."
          actionText={canManage ? 'Draft Agreement' : undefined}
          onAction={handleOpenCreate}
          icon={<Handshake size={32} />}
        />
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Agreement ID</th>
                <th>Agreement Name</th>
                <th>Licensee Partner</th>
                <th>Agreement Type</th>
                <th>Status</th>
                <th>Term & Expiry</th>
                <th>Royalty Terms</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {agreements.map((a) => {
                const isExpired = new Date(a.endDate) < new Date();
                return (
                  <tr key={a._id}>
                    <td>
                      <span className="font-mono" style={{ fontWeight: 700, color: 'var(--primary)' }}>
                        {a.agreementId}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)', maxWidth: '320px' }}>
                        {a.agreementName}
                      </div>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
                        {a.licensee}
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-neutral">{a.agreementType}</span>
                    </td>
                    <td>
                      <StatusBadge status={a.status} />
                    </td>
                    <td>
                      <div style={{ fontSize: '0.75rem', color: isExpired ? '#dc2626' : 'var(--text-muted)' }}>
                        Exp: {new Date(a.endDate).toLocaleDateString()}
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', maxWidth: '200px', display: 'inline-block' }}>
                        {a.royaltyInfo || 'Not specified'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="table-actions" style={{ justifyContent: 'flex-end' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleOpenDetail(a)}
                          title="View Details"
                        >
                          <Eye size={14} />
                        </button>
                        {canManage && (
                          <>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleOpenEdit(a)}
                              title="Edit Agreement"
                            >
                              <Edit size={14} />
                            </button>
                            <button
                              className="btn btn-danger-outline btn-sm"
                              onClick={() => handleOpenDelete(a)}
                              title="Delete Agreement"
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

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={selectedAgreement ? `Edit Agreement: ${selectedAgreement.agreementId}` : 'Draft New Licensing Agreement'}
        size="lg"
      >
        {formError && <div className="alert alert-danger">{formError}</div>}
        <form onSubmit={handleSaveAgreement}>
          <div className="form-group">
            <label className="form-label">
              Agreement Name <span className="required">*</span>
            </label>
            <input
              type="text"
              required
              className="form-control"
              placeholder="e.g. Exclusive Worldwide License for CasX Oncology Indications"
              value={formData.agreementName}
              onChange={(e) => setFormData({ ...formData, agreementName: e.target.value })}
            />
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">
                Licensee Organization <span className="required">*</span>
              </label>
              <input
                type="text"
                required
                className="form-control"
                placeholder="e.g. Novartis Gene Therapies AG"
                value={formData.licensee}
                onChange={(e) => setFormData({ ...formData, licensee: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Agreement Type <span className="required">*</span></label>
              <select
                className="form-control"
                value={formData.agreementType}
                onChange={(e) => setFormData({ ...formData, agreementType: e.target.value })}
              >
                <option value="Exclusive Commercial License">Exclusive Commercial License</option>
                <option value="Non-Exclusive License">Non-Exclusive License</option>
                <option value="Cross-License">Cross-License</option>
                <option value="Evaluation / Option">Evaluation / Option</option>
              </select>
            </div>
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Licensed Patent Asset</label>
              <select
                className="form-control"
                value={formData.patent}
                onChange={(e) => setFormData({ ...formData, patent: e.target.value })}
              >
                <option value="">Select Patent (Optional)</option>
                {patents.map((p) => (
                  <option key={p._id} value={p._id}>
                    [{p.patentNumber}] {p.title.slice(0, 40)}...
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Associated R&D Project</label>
              <select
                className="form-control"
                value={formData.project}
                onChange={(e) => setFormData({ ...formData, project: e.target.value })}
              >
                <option value="">Select Project (Optional)</option>
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
              <label className="form-label">Expiration / End Date <span className="required">*</span></label>
              <input
                type="date"
                required
                className="form-control"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              />
            </div>
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Agreement Status</label>
              <select
                className="form-control"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as AgreementStatus })}
              >
                <option value="Draft">Draft</option>
                <option value="Negotiation">Negotiation</option>
                <option value="Active">Active</option>
                <option value="Expired">Expired</option>
                <option value="Terminated">Terminated</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Royalty & Financial Terms</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. 6.5% Net Sales + $25M upfront milestone"
                value={formData.royaltyInfo}
                onChange={(e) => setFormData({ ...formData, royaltyInfo: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Scope & Territory Description</label>
            <textarea
              className="form-control"
              placeholder="Commercial exclusivity details, diligence obligations, termination clauses..."
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
              {submitting ? 'Saving...' : selectedAgreement ? 'Update Agreement' : 'Save Agreement'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Detail Modal */}
      <Modal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title={selectedAgreement ? `Agreement File: ${selectedAgreement.agreementId}` : 'Agreement Details'}
        size="lg"
      >
        {selectedAgreement && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <StatusBadge status={selectedAgreement.status} />
              <span className="badge badge-neutral">{selectedAgreement.agreementType}</span>
            </div>

            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '14px' }}>
              {selectedAgreement.agreementName}
            </h3>

            <div style={{ backgroundColor: '#f8fafc', padding: '14px', borderRadius: 'var(--radius-md)', marginBottom: '18px' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>
                Financial & Royalty Structure:
              </div>
              <p style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-main)' }}>
                {selectedAgreement.royaltyInfo || 'No financial terms entered'}
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', fontSize: '0.85rem' }}>
              <div>
                <strong>Licensee:</strong> {selectedAgreement.licensee}
              </div>
              <div>
                <strong>Licensor:</strong> {selectedAgreement.licensor}
              </div>
              <div>
                <strong>Effective Term:</strong>{' '}
                {new Date(selectedAgreement.startDate).toLocaleDateString()} &rarr;{' '}
                {new Date(selectedAgreement.endDate).toLocaleDateString()}
              </div>
              <div>
                <strong>Linked IP:</strong>{' '}
                {typeof selectedAgreement.patent === 'object' && selectedAgreement.patent
                  ? (selectedAgreement.patent as any).patentNumber
                  : 'N/A'}
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
        title="Confirm Agreement Deletion"
        message={`Are you sure you want to delete agreement record "${selectedAgreement?.agreementName}" [${selectedAgreement?.agreementId}]?`}
        confirmText="Delete Agreement"
        loading={submitting}
      />
    </div>
  );
};
