import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Edit, Trash2, Eye, ShieldAlert, AlertTriangle, CheckCircle } from 'lucide-react';
import { complianceService, projectService } from '../services/api';
import { ComplianceItem, Project, ComplianceStatus, ComplianceRisk } from '../types';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import { ConfirmModal } from '../components/ConfirmModal';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { EmptyState } from '../components/EmptyState';

export const Compliance: React.FC = () => {
  const { hasRole, user } = useAuth();
  const canManage = hasRole('ADMIN', 'IP MANAGER');

  const [items, setItems] = useState<ComplianceItem[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [riskFilter, setRiskFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const [selectedItem, setSelectedItem] = useState<ComplianceItem | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    complianceItem: '',
    category: 'Biosafety (BSL-2/3)',
    project: '',
    responsiblePerson: '',
    dueDate: '',
    status: 'Pending' as ComplianceStatus,
    riskLevel: 'Medium' as ComplianceRisk,
    description: '',
  });

  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [comRes, prjRes] = await Promise.all([
        complianceService.getComplianceItems({
          search: search || undefined,
          status: statusFilter || undefined,
          riskLevel: riskFilter || undefined,
          category: categoryFilter || undefined,
        }),
        projectService.getProjects(),
      ]);

      if (comRes.data?.success) {
        setItems(comRes.data.complianceItems);
      }
      if (prjRes.data?.success) {
        setProjects(prjRes.data.projects);
      }
    } catch (err) {
      console.error('Failed to load compliance records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search, statusFilter, riskFilter, categoryFilter]);

  const handleOpenCreate = () => {
    setSelectedItem(null);
    const in15Days = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);

    setFormData({
      complianceItem: '',
      category: 'Biosafety (BSL-2/3)',
      project: projects.length > 0 ? projects[0]._id : '',
      responsiblePerson: user?.name || 'Dr. Patricia Hayes',
      dueDate: in15Days.toISOString().split('T')[0],
      status: 'Pending',
      riskLevel: 'Medium',
      description: '',
    });
    setFormError('');
    setIsFormOpen(true);
  };

  const handleOpenEdit = (c: ComplianceItem) => {
    setSelectedItem(c);
    const projectId = typeof c.project === 'object' && c.project ? (c.project as any)._id : c.project;

    setFormData({
      complianceItem: c.complianceItem,
      category: c.category,
      project: projectId || '',
      responsiblePerson: c.responsiblePerson,
      dueDate: c.dueDate ? new Date(c.dueDate).toISOString().split('T')[0] : '',
      status: c.status,
      riskLevel: c.riskLevel,
      description: c.description || '',
    });
    setFormError('');
    setIsFormOpen(true);
  };

  const handleOpenDetail = (c: ComplianceItem) => {
    setSelectedItem(c);
    setIsDetailOpen(true);
  };

  const handleOpenDelete = (c: ComplianceItem) => {
    setSelectedItem(c);
    setIsDeleteOpen(true);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.complianceItem.trim() || !formData.project || !formData.dueDate || !formData.responsiblePerson.trim()) {
      setFormError('Compliance title, associated project, deadline date, and responsible person are required.');
      return;
    }

    setSubmitting(true);
    setFormError('');

    try {
      if (selectedItem) {
        await complianceService.updateComplianceItem(selectedItem._id, formData);
      } else {
        await complianceService.createComplianceItem(formData);
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
    if (!selectedItem) return;
    setSubmitting(true);
    try {
      await complianceService.deleteComplianceItem(selectedItem._id);
      setIsDeleteOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete compliance item.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Biosafety & Regulatory Compliance</h1>
          <p className="page-subtitle">
            Track BSL-2/3 containment certifications, GLP audits, HIPAA patient genetics privacy, and risk alerts
          </p>
        </div>
        {canManage && (
          <div className="header-actions">
            <button className="btn btn-primary" onClick={handleOpenCreate}>
              <Plus size={16} />
              <span>Record Compliance Item</span>
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
            placeholder="Search compliance requirements, officers, descriptions..."
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
          <option value="Pending">Pending</option>
          <option value="In Progress">In Progress</option>
          <option value="Completed">Completed</option>
          <option value="Overdue">Overdue</option>
        </select>

        <select
          className="filter-select"
          value={riskFilter}
          onChange={(e) => setRiskFilter(e.target.value)}
        >
          <option value="">All Risk Levels</option>
          <option value="Critical">Critical</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>

        <select
          className="filter-select"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="">All Categories</option>
          <option value="Biosafety (BSL-2/3)">Biosafety (BSL-2/3)</option>
          <option value="GLP (Good Laboratory Practice)">GLP (Good Laboratory Practice)</option>
          <option value="GCP (Good Clinical Practice)">GCP (Good Clinical Practice)</option>
          <option value="HIPAA / Patient Data">HIPAA / Patient Data</option>
          <option value="Export Control / Material Transfer">Export Control / Material Transfer</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <LoadingSpinner message="Fetching compliance records..." />
      ) : items.length === 0 ? (
        <EmptyState
          title="No compliance items found"
          description="There are currently no items matching your criteria."
          actionText={canManage ? 'Record Compliance Item' : undefined}
          onAction={handleOpenCreate}
          icon={<ShieldAlert size={32} />}
        />
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Requirement Title</th>
                <th>Category</th>
                <th>Project</th>
                <th>Responsible Officer</th>
                <th>Status</th>
                <th>Risk Level</th>
                <th>Due Date</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const isOverdue = item.status === 'Overdue';
                const projectName = typeof item.project === 'object' && item.project ? (item.project as any).name : '';
                const projectCode = typeof item.project === 'object' && item.project ? (item.project as any).code : '';

                return (
                  <tr
                    key={item._id}
                    style={{
                      backgroundColor: isOverdue ? 'rgba(254, 242, 242, 0.45)' : undefined,
                    }}
                  >
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)', maxWidth: '320px' }}>
                        {item.complianceItem}
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-neutral">{item.category}</span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {projectCode ? `[${projectCode}] ` : ''}{projectName.slice(0, 24)}...
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.825rem' }}>{item.responsiblePerson}</span>
                    </td>
                    <td>
                      <StatusBadge status={item.status} />
                    </td>
                    <td>
                      <StatusBadge status={item.riskLevel} />
                    </td>
                    <td>
                      <span
                        style={{
                          fontSize: '0.8rem',
                          fontWeight: isOverdue ? 700 : 500,
                          color: isOverdue ? '#dc2626' : 'var(--text-main)',
                        }}
                      >
                        {new Date(item.dueDate).toLocaleDateString()}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="table-actions" style={{ justifyContent: 'flex-end' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleOpenDetail(item)}
                          title="View Details"
                        >
                          <Eye size={14} />
                        </button>
                        {canManage && (
                          <>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleOpenEdit(item)}
                              title="Edit Compliance Item"
                            >
                              <Edit size={14} />
                            </button>
                            <button
                              className="btn btn-danger-outline btn-sm"
                              onClick={() => handleOpenDelete(item)}
                              title="Delete Item"
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
        title={selectedItem ? 'Edit Compliance Item' : 'Record New Compliance Requirement'}
        size="lg"
      >
        {formError && <div className="alert alert-danger">{formError}</div>}
        <form onSubmit={handleSaveItem}>
          <div className="form-group">
            <label className="form-label">
              Compliance Item Title <span className="required">*</span>
            </label>
            <input
              type="text"
              required
              className="form-control"
              placeholder="e.g. BSL-3 Containment Negative Pressure & HEPA Filter Re-certification"
              value={formData.complianceItem}
              onChange={(e) => setFormData({ ...formData, complianceItem: e.target.value })}
            />
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Category <span className="required">*</span></label>
              <select
                className="form-control"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              >
                <option value="Biosafety (BSL-2/3)">Biosafety (BSL-2/3)</option>
                <option value="GLP (Good Laboratory Practice)">GLP (Good Laboratory Practice)</option>
                <option value="GCP (Good Clinical Practice)">GCP (Good Clinical Practice)</option>
                <option value="HIPAA / Patient Data">HIPAA / Patient Data</option>
                <option value="Export Control / Material Transfer">Export Control / Material Transfer</option>
              </select>
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

          <div className="form-grid-2">
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

            <div className="form-group">
              <label className="form-label">Compliance Due Date <span className="required">*</span></label>
              <input
                type="date"
                required
                className="form-control"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              />
            </div>
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Status</label>
              <select
                className="form-control"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as ComplianceStatus })}
              >
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
                <option value="Overdue">Overdue</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Risk Stratification Level</label>
              <select
                className="form-control"
                value={formData.riskLevel}
                onChange={(e) => setFormData({ ...formData, riskLevel: e.target.value as ComplianceRisk })}
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Audit Protocol & Protocol Requirements</label>
            <textarea
              className="form-control"
              placeholder="Regulatory checklist, calibration frequencies, standard operating procedures..."
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
              {submitting ? 'Saving...' : selectedItem ? 'Update Item' : 'Save Compliance Item'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Detail Modal */}
      <Modal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title="Compliance Record Details"
        size="lg"
      >
        {selectedItem && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <StatusBadge status={selectedItem.status} />
              <StatusBadge status={selectedItem.riskLevel} />
              <span className="badge badge-neutral">{selectedItem.category}</span>
            </div>

            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '14px' }}>
              {selectedItem.complianceItem}
            </h3>

            <div style={{ backgroundColor: '#f8fafc', padding: '14px', borderRadius: 'var(--radius-md)', marginBottom: '18px' }}>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                {selectedItem.description || 'No detailed audit notes recorded.'}
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', fontSize: '0.85rem' }}>
              <div>
                <strong>Due Date:</strong>{' '}
                <span style={{ color: selectedItem.status === 'Overdue' ? '#dc2626' : undefined, fontWeight: 600 }}>
                  {new Date(selectedItem.dueDate).toLocaleDateString()}
                  {selectedItem.status === 'Overdue' ? ' (OVERDUE)' : ''}
                </span>
              </div>
              <div>
                <strong>Responsible Officer:</strong> {selectedItem.responsiblePerson}
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
        title="Confirm Compliance Item Deletion"
        message={`Are you sure you want to delete compliance item "${selectedItem?.complianceItem}"?`}
        confirmText="Delete Item"
        loading={submitting}
      />
    </div>
  );
};
