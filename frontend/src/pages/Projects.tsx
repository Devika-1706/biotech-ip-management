import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  FolderKanban,
  LayoutGrid,
  List,
  ExternalLink,
  Users,
  Calendar,
  FileCheck2,
  Lightbulb,
  Handshake,
  FileSpreadsheet,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';
import { projectService } from '../services/api';
import { Project, ProjectStatus, ProjectPriority } from '../types';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import { ConfirmModal } from '../components/ConfirmModal';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { EmptyState } from '../components/EmptyState';

export const Projects: React.FC = () => {
  const navigate = useNavigate();
  const { hasRole, user } = useAuth();
  const canManage = hasRole('ADMIN', 'IP MANAGER');

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    department: 'Gene Therapy',
    projectManagerName: '',
    teamMembers: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    status: 'Planning' as ProjectStatus,
    priority: 'Medium' as ProjectPriority,
  });

  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadProjects = async () => {
    setLoading(true);
    try {
      const res = await projectService.getProjects({
        search: search || undefined,
        status: statusFilter || undefined,
        priority: priorityFilter || undefined,
        department: departmentFilter || undefined,
        sortBy,
        order,
      });
      if (res.data?.success) {
        setProjects(res.data.projects);
      }
    } catch (err) {
      console.error('Failed to load projects:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, [search, statusFilter, priorityFilter, departmentFilter, sortBy, order]);

  const handleOpenCreate = () => {
    setSelectedProject(null);
    setFormData({
      name: '',
      code: `PRJ-${Math.floor(1000 + Math.random() * 9000)}`,
      description: '',
      department: 'Gene Therapy',
      projectManagerName: user?.name || 'Dr. Alex Rivera',
      teamMembers: 'Dr. Sarah Lin, Dr. Marcus Vance',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      status: 'Planning',
      priority: 'Medium',
    });
    setFormError('');
    setIsFormOpen(true);
  };

  const handleOpenEdit = (project: Project, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedProject(project);
    setFormData({
      name: project.name,
      code: project.code,
      description: project.description || '',
      department: project.department,
      projectManagerName: project.projectManagerName || '',
      teamMembers: Array.isArray(project.teamMembers) ? project.teamMembers.join(', ') : '',
      startDate: project.startDate ? new Date(project.startDate).toISOString().split('T')[0] : '',
      endDate: project.endDate ? new Date(project.endDate).toISOString().split('T')[0] : '',
      status: project.status,
      priority: project.priority,
    });
    setFormError('');
    setIsFormOpen(true);
  };

  const handleOpenDelete = (project: Project, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedProject(project);
    setIsDeleteOpen(true);
  };

  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.code.trim()) {
      setFormError('Project name and project code are required.');
      return;
    }

    setSubmitting(true);
    setFormError('');

    const payload = {
      ...formData,
      teamMembers: formData.teamMembers
        .split(',')
        .map((m) => m.trim())
        .filter(Boolean),
    };

    try {
      if (selectedProject) {
        await projectService.updateProject(selectedProject._id, payload);
      } else {
        await projectService.createProject(payload);
      }
      setIsFormOpen(false);
      loadProjects();
    } catch (err: any) {
      setFormError(err.response?.data?.message || err.message || 'Operation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedProject) return;
    setSubmitting(true);
    try {
      await projectService.deleteProject(selectedProject._id);
      setIsDeleteOpen(false);
      loadProjects();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete project.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'TBD';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Biotechnology R&D Projects</h1>
          <p className="page-subtitle">
            Centralized therapeutic project portfolio. Select any project to enter its dedicated IP, regulatory & compliance workspace.
          </p>
        </div>
        <div className="header-actions">
          {/* View Mode Toggle */}
          <div className="view-toggle-group">
            <button
              type="button"
              className={`view-toggle-btn ${viewMode === 'cards' ? 'active' : ''}`}
              onClick={() => setViewMode('cards')}
              title="Cards Grid View"
            >
              <LayoutGrid size={16} />
              <span>Cards</span>
            </button>
            <button
              type="button"
              className={`view-toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
              title="Table View"
            >
              <List size={16} />
              <span>Table</span>
            </button>
          </div>

          {canManage && (
            <button className="btn btn-primary" onClick={handleOpenCreate}>
              <Plus size={16} />
              <span>Create New Project</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="filter-bar">
        <div className="filter-input-wrap">
          <Search size={18} />
          <input
            type="text"
            className="filter-input"
            placeholder="Search by project name, code, department..."
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
          <option value="Planning">Planning</option>
          <option value="Active">Active</option>
          <option value="On Hold">On Hold</option>
          <option value="Completed">Completed</option>
          <option value="Archived">Archived</option>
        </select>

        <select
          className="filter-select"
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
        >
          <option value="">All Priorities</option>
          <option value="Critical">Critical Priority</option>
          <option value="High">High Priority</option>
          <option value="Medium">Medium Priority</option>
          <option value="Low">Low Priority</option>
        </select>

        <select
          className="filter-select"
          value={departmentFilter}
          onChange={(e) => setDepartmentFilter(e.target.value)}
        >
          <option value="">All Departments</option>
          <option value="Gene Therapy">Gene Therapy</option>
          <option value="Oncology Therapeutics">Oncology Therapeutics</option>
          <option value="Immunotherapy">Immunotherapy</option>
          <option value="Neurobiology">Neurobiology</option>
          <option value="Synthetic Biology">Synthetic Biology</option>
          <option value="Oncology R&D">Oncology R&D</option>
        </select>

        <select
          className="filter-select"
          value={`${sortBy}-${order}`}
          onChange={(e) => {
            const [sb, ord] = e.target.value.split('-');
            setSortBy(sb);
            setOrder(ord as any);
          }}
        >
          <option value="createdAt-desc">Newest First</option>
          <option value="createdAt-asc">Oldest First</option>
          <option value="name-asc">Name (A-Z)</option>
          <option value="priority-desc">Priority</option>
          <option value="endDate-asc">Due Date (Earliest)</option>
        </select>
      </div>

      {/* Projects Display */}
      {loading ? (
        <LoadingSpinner message="Loading R&D projects..." />
      ) : projects.length === 0 ? (
        <EmptyState
          title="No projects found"
          description="There are currently no projects matching your query filters."
          actionText={canManage ? 'Create Project' : undefined}
          onAction={handleOpenCreate}
          icon={<FolderKanban size={32} />}
        />
      ) : viewMode === 'cards' ? (
        /* Cards Grid View */
        <div className="projects-cards-grid">
          {projects.map((p) => {
            const counts = p.counts || {
              patents: 0,
              disclosures: 0,
              agreements: 0,
              filings: 0,
              compliance: 0,
              collaborations: 0,
              documents: 0,
            };

            return (
              <div
                key={p._id}
                className="project-card"
                onClick={() => navigate(`/projects/${p._id}`)}
                style={{ cursor: 'pointer' }}
              >
                <div className="project-card-header">
                  <div>
                    <span className="font-mono" style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 700 }}>
                      {p.code}
                    </span>
                    <span style={{ margin: '0 6px', color: 'var(--border-subtle)' }}>•</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{p.department}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <StatusBadge status={p.status} />
                    <StatusBadge status={p.priority} />
                  </div>
                </div>

                <h3 className="project-card-title">{p.name}</h3>

                <p className="project-card-desc">
                  {p.description || 'Comprehensive biotechnology asset program and therapeutic pipeline.'}
                </p>

                {/* Scoped Child Counts Matrix */}
                <div className="project-card-counts-bar">
                  <div className="card-count-cell" title="Associated Patents">
                    <span className="card-count-val">{counts.patents}</span>
                    <span className="card-count-lbl">Patents</span>
                  </div>
                  <div className="card-count-cell" title="Tech Disclosures">
                    <span className="card-count-val">{counts.disclosures}</span>
                    <span className="card-count-lbl">Disclosures</span>
                  </div>
                  <div className="card-count-cell" title="Licensing Deals">
                    <span className="card-count-val">{counts.agreements}</span>
                    <span className="card-count-lbl">Deals</span>
                  </div>
                  <div className="card-count-cell" title="Regulatory Filings">
                    <span className="card-count-val">{counts.filings}</span>
                    <span className="card-count-lbl">Filings</span>
                  </div>
                </div>

                <div className="project-card-footer">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div
                      style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '50%',
                        background: 'var(--primary-light)',
                        color: 'var(--primary-dark)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                      }}
                    >
                      {(p.projectManagerName || 'U').charAt(0)}
                    </div>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                      {p.projectManagerName || 'Lead Researcher'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }} onClick={(e) => e.stopPropagation()}>
                    {canManage && (
                      <>
                        <button
                          className="icon-btn"
                          title="Edit Project"
                          onClick={(e) => handleOpenEdit(p, e)}
                        >
                          <Edit size={15} />
                        </button>
                        <button
                          className="icon-btn text-danger"
                          title="Delete Project"
                          onClick={(e) => handleOpenDelete(p, e)}
                        >
                          <Trash2 size={15} />
                        </button>
                      </>
                    )}
                    <button
                      className="btn btn-sm btn-outline"
                      onClick={() => navigate(`/projects/${p._id}`)}
                    >
                      <span>Workspace</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Project Name</th>
                <th>Department</th>
                <th>Lead / Manager</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Artifacts & Compliance</th>
                <th>Timeline</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => {
                const counts = p.counts || {
                  patents: 0,
                  disclosures: 0,
                  agreements: 0,
                  filings: 0,
                  compliance: 0,
                  collaborations: 0,
                  documents: 0,
                };

                return (
                  <tr
                    key={p._id}
                    onClick={() => navigate(`/projects/${p._id}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td>
                      <span className="font-mono" style={{ fontWeight: 600, color: 'var(--primary)' }}>
                        {p.code}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{p.name}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        {p.description ? p.description.slice(0, 50) + '...' : 'No description'}
                      </div>
                    </td>
                    <td>{p.department}</td>
                    <td>{p.projectManagerName || 'Lead Researcher'}</td>
                    <td>
                      <StatusBadge status={p.status} />
                    </td>
                    <td>
                      <StatusBadge status={p.priority} />
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        <span className="badge" style={{ background: '#e0f2fe', color: '#0369a1', fontSize: '0.72rem' }} title="Patents">
                          {counts.patents} Pat
                        </span>
                        <span className="badge" style={{ background: '#fef3c7', color: '#b45309', fontSize: '0.72rem' }} title="Disclosures">
                          {counts.disclosures} Disc
                        </span>
                        <span className="badge" style={{ background: '#ecfdf5', color: '#047857', fontSize: '0.72rem' }} title="Deals">
                          {counts.agreements} Deals
                        </span>
                        <span className="badge" style={{ background: '#f5f3ff', color: '#6d28d9', fontSize: '0.72rem' }} title="Filings">
                          {counts.filings} Filings
                        </span>
                      </div>
                    </td>
                    <td style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                      {formatDate(p.startDate)} – {formatDate(p.endDate)}
                    </td>
                    <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                        <button
                          className="btn btn-sm btn-outline"
                          onClick={() => navigate(`/projects/${p._id}`)}
                          title="Open Project Workspace"
                        >
                          <span>Workspace</span>
                          <ArrowRight size={13} />
                        </button>
                        {canManage && (
                          <>
                            <button
                              className="icon-btn"
                              title="Edit Project"
                              onClick={(e) => handleOpenEdit(p, e)}
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              className="icon-btn text-danger"
                              title="Delete Project"
                              onClick={(e) => handleOpenDelete(p, e)}
                            >
                              <Trash2 size={16} />
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

      {/* Create / Edit Project Modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={selectedProject ? `Edit Project: ${selectedProject.name}` : 'Create Biotechnology Project'}
        size="lg"
      >
        <form onSubmit={handleSaveProject}>
          {formError && <div className="form-error-banner">{formError}</div>}

          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Project Code *</label>
              <input
                type="text"
                className="form-input font-mono"
                required
                placeholder="e.g. PRJ-2041"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Department / Unit *</label>
              <select
                className="form-select"
                required
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              >
                <option value="Gene Therapy">Gene Therapy</option>
                <option value="Oncology Therapeutics">Oncology Therapeutics</option>
                <option value="Immunotherapy">Immunotherapy</option>
                <option value="Neurobiology">Neurobiology</option>
                <option value="Synthetic Biology">Synthetic Biology</option>
                <option value="Oncology R&D">Oncology R&D</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Project Title *</label>
            <input
              type="text"
              className="form-input"
              required
              placeholder="e.g. CRISPR Cas-12 Directed Gene Editing"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Program Description</label>
            <textarea
              className="form-textarea"
              rows={3}
              placeholder="Summary of scientific scope, targets, and clinical milestones..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Project Manager / Principal Investigator</label>
              <input
                type="text"
                className="form-input"
                placeholder="Dr. Alex Rivera"
                value={formData.projectManagerName}
                onChange={(e) => setFormData({ ...formData, projectManagerName: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Team Members (comma-separated)</label>
              <input
                type="text"
                className="form-input"
                placeholder="Dr. Sarah Lin, Dr. Marcus Vance"
                value={formData.teamMembers}
                onChange={(e) => setFormData({ ...formData, teamMembers: e.target.value })}
              />
            </div>
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Start Date</label>
              <input
                type="date"
                className="form-input"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Target Completion / End Date</label>
              <input
                type="date"
                className="form-input"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              />
            </div>
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Pipeline Status</label>
              <select
                className="form-select"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as ProjectStatus })}
              >
                <option value="Planning">Planning</option>
                <option value="Active">Active</option>
                <option value="On Hold">On Hold</option>
                <option value="Completed">Completed</option>
                <option value="Archived">Archived</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Strategic Priority</label>
              <select
                className="form-select"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as ProjectPriority })}
              >
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setIsFormOpen(false)}
              disabled={submitting}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Saving Project...' : selectedProject ? 'Update Project' : 'Create Project'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Biotechnology Project"
        message={`Are you sure you want to delete "${selectedProject?.name}" (${selectedProject?.code})? This action will permanently remove this project record.`}
        confirmText="Delete Project"
        isDanger={true}
        loading={submitting}
      />
    </div>
  );
};
