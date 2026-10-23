import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  FileCheck2,
  Lightbulb,
  Handshake,
  FileSpreadsheet,
  ShieldAlert,
  Users2,
  Files,
  CalendarClock,
  History,
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Eye,
  Download,
  ExternalLink,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  ArrowLeft,
  Dna,
  Sparkles,
  Upload,
  Calendar,
  User,
  Building,
  Check,
  AlertCircle,
} from 'lucide-react';
import {
  projectService,
  patentService,
  disclosureService,
  agreementService,
  filingService,
  complianceService,
  collaborationService,
  documentService,
} from '../services/api';
import {
  Project,
  Patent,
  TechnologyDisclosure,
  LicensingAgreement,
  RegulatoryFiling,
  ComplianceItem,
  ResearchCollaboration,
  DocumentRecord,
  ActivityLogItem,
  ProjectOverviewData,
  ProjectDeadlineItem,
  PatentStatus,
  DisclosureStatus,
  AgreementStatus,
  FilingStatus,
  ComplianceStatus,
  ComplianceRisk,
  CollaborationStatus,
} from '../types';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import { ConfirmModal } from '../components/ConfirmModal';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { EmptyState } from '../components/EmptyState';

type WorkspaceTab =
  | 'overview'
  | 'patents'
  | 'disclosures'
  | 'agreements'
  | 'regulatory'
  | 'deadlines'
  | 'collaborations'
  | 'documents'
  | 'activity';

export const ProjectWorkspace: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { hasRole, user } = useAuth();
  const canManage = hasRole('ADMIN', 'IP MANAGER');

  const currentTab = (searchParams.get('tab') as WorkspaceTab) || 'overview';

  // Core Project State
  const [project, setProject] = useState<Project | null>(null);
  const [overview, setOverview] = useState<ProjectOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tabLoading, setTabLoading] = useState(false);

  // Tab Data States
  const [patents, setPatents] = useState<Patent[]>([]);
  const [disclosures, setDisclosures] = useState<TechnologyDisclosure[]>([]);
  const [agreements, setAgreements] = useState<LicensingAgreement[]>([]);
  const [filings, setFilings] = useState<RegulatoryFiling[]>([]);
  const [complianceItems, setComplianceItems] = useState<ComplianceItem[]>([]);
  const [deadlines, setDeadlines] = useState<ProjectDeadlineItem[]>([]);
  const [collaborations, setCollaborations] = useState<ResearchCollaboration[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [activity, setActivity] = useState<ActivityLogItem[]>([]);

  // Sub-tab for Regulatory & Compliance ('filings' | 'compliance')
  const [regulatorySubTab, setRegulatorySubTab] = useState<'filings' | 'compliance'>('filings');

  // Search & Filter state inside active tab
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals state
  const [isEditProjectOpen, setIsEditProjectOpen] = useState(false);
  const [isPatentModalOpen, setIsPatentModalOpen] = useState(false);
  const [isDisclosureModalOpen, setIsDisclosureModalOpen] = useState(false);
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [isAgreementModalOpen, setIsAgreementModalOpen] = useState(false);
  const [isFilingModalOpen, setIsFilingModalOpen] = useState(false);
  const [isComplianceModalOpen, setIsComplianceModalOpen] = useState(false);
  const [isCollaborationModalOpen, setIsCollaborationModalOpen] = useState(false);
  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Active items for editing/deleting
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: string; id: string; name: string } | null>(null);

  // Forms
  const [patentForm, setPatentForm] = useState({
    title: '',
    patentNumber: '',
    inventors: '',
    filingDate: new Date().toISOString().split('T')[0],
    applicationStatus: 'Draft' as PatentStatus,
    jurisdiction: 'USPTO (US)',
    owner: 'BioVault Therapeutics Inc.',
    expiryDate: '',
    description: '',
  });

  const [disclosureForm, setDisclosureForm] = useState({
    title: '',
    disclosureId: '',
    inventor: user?.name || '',
    priority: 'Medium',
    description: '',
  });

  const [convertForm, setConvertForm] = useState({
    patentNumber: '',
    jurisdiction: 'USPTO (US)',
    owner: 'BioVault Therapeutics Inc.',
  });

  const [agreementForm, setAgreementForm] = useState({
    agreementName: '',
    agreementId: '',
    licensee: '',
    licensor: 'BioVault Therapeutics Inc.',
    agreementType: 'Exclusive Commercial License',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    royaltyInfo: '',
    status: 'Draft' as AgreementStatus,
    description: '',
  });

  const [filingForm, setFilingForm] = useState({
    filingName: '',
    filingId: '',
    regulatoryAuthority: 'FDA (United States)',
    filingType: 'IND (Investigational New Drug)',
    submissionDate: '',
    dueDate: '',
    status: 'Draft' as FilingStatus,
    responsiblePerson: user?.name || 'Regulatory Affairs Team',
    description: '',
  });

  const [complianceForm, setComplianceForm] = useState({
    complianceItem: '',
    category: 'Biosafety (BSL-2/3)',
    responsiblePerson: user?.name || 'Compliance Officer',
    dueDate: '',
    status: 'Pending' as ComplianceStatus,
    riskLevel: 'Medium' as ComplianceRisk,
    description: '',
  });

  const [collabForm, setCollabForm] = useState({
    collaborationName: '',
    collaborationId: '',
    partnerOrganization: '',
    leadResearcher: user?.name || '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    collaborationType: 'Co-Development',
    status: 'Active' as CollaborationStatus,
    description: '',
  });

  const [docUploadFile, setDocUploadFile] = useState<File | null>(null);
  const [docForm, setDocForm] = useState({
    documentName: '',
    documentType: 'Technical Specification',
    description: '',
  });

  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Load project overview
  const loadProjectOverview = async () => {
    if (!projectId) return;
    try {
      const res = await projectService.getOverview(projectId);
      if (res.data?.success) {
        setProject(res.data.project);
        setOverview(res.data);
      }
    } catch (err: any) {
      console.error('Failed to load project overview:', err);
    } finally {
      setLoading(false);
    }
  };

  // Switch tab & fetch tab data
  const handleTabChange = (tab: WorkspaceTab) => {
    setSearchParams({ tab });
    setSearchTerm('');
    setStatusFilter('');
  };

  // Load active tab data
  const loadTabData = async () => {
    if (!projectId) return;
    setTabLoading(true);
    try {
      if (currentTab === 'overview') {
        await loadProjectOverview();
      } else if (currentTab === 'patents') {
        const res = await projectService.getPatents(projectId, {
          search: searchTerm || undefined,
          status: statusFilter || undefined,
        });
        if (res.data?.success) setPatents(res.data.patents);
      } else if (currentTab === 'disclosures') {
        const res = await projectService.getDisclosures(projectId, {
          search: searchTerm || undefined,
          status: statusFilter || undefined,
        });
        if (res.data?.success) setDisclosures(res.data.disclosures);
      } else if (currentTab === 'agreements') {
        const res = await projectService.getAgreements(projectId, {
          search: searchTerm || undefined,
          status: statusFilter || undefined,
        });
        if (res.data?.success) setAgreements(res.data.agreements);
      } else if (currentTab === 'regulatory') {
        const [fRes, cRes] = await Promise.all([
          projectService.getFilings(projectId, { search: searchTerm || undefined }),
          projectService.getCompliance(projectId, { search: searchTerm || undefined }),
        ]);
        if (fRes.data?.success) setFilings(fRes.data.filings);
        if (cRes.data?.success) setComplianceItems(cRes.data.compliance);
      } else if (currentTab === 'deadlines') {
        const res = await projectService.getDeadlines(projectId);
        if (res.data?.success) setDeadlines(res.data.deadlines);
      } else if (currentTab === 'collaborations') {
        const res = await projectService.getCollaborations(projectId, {
          search: searchTerm || undefined,
          status: statusFilter || undefined,
        });
        if (res.data?.success) setCollaborations(res.data.collaborations);
      } else if (currentTab === 'documents') {
        const res = await projectService.getDocuments(projectId, { search: searchTerm || undefined });
        if (res.data?.success) setDocuments(res.data.documents);
      } else if (currentTab === 'activity') {
        const res = await projectService.getActivity(projectId);
        if (res.data?.success) setActivity(res.data.activity);
      }
    } catch (err) {
      console.error('Error loading workspace tab:', err);
    } finally {
      setTabLoading(false);
    }
  };

  useEffect(() => {
    loadProjectOverview();
  }, [projectId]);

  useEffect(() => {
    loadTabData();
  }, [projectId, currentTab, searchTerm, statusFilter]);

  // Helper date formatting
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Delete Action Handler
  const confirmDeleteAction = async () => {
    if (!deleteTarget) return;
    setSubmitting(true);
    try {
      if (deleteTarget.type === 'patent') await patentService.deletePatent(deleteTarget.id);
      else if (deleteTarget.type === 'disclosure') await disclosureService.deleteDisclosure(deleteTarget.id);
      else if (deleteTarget.type === 'agreement') await agreementService.deleteAgreement(deleteTarget.id);
      else if (deleteTarget.type === 'filing') await filingService.deleteFiling(deleteTarget.id);
      else if (deleteTarget.type === 'compliance') await complianceService.deleteComplianceItem(deleteTarget.id);
      else if (deleteTarget.type === 'collaboration') await collaborationService.deleteCollaboration(deleteTarget.id);
      else if (deleteTarget.type === 'document') await documentService.deleteDocument(deleteTarget.id);

      setIsDeleteModalOpen(false);
      setDeleteTarget(null);
      loadTabData();
      loadProjectOverview();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Delete operation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  // --- Handlers for Child Form Submissions ---
  const handleSavePatent = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError('');
    try {
      const payload = {
        ...patentForm,
        project: projectId,
        inventors: patentForm.inventors.split(',').map((s) => s.trim()).filter(Boolean),
      };
      if (selectedItem) {
        await patentService.updatePatent(selectedItem._id, payload);
      } else {
        await patentService.createPatent(payload);
      }
      setIsPatentModalOpen(false);
      loadTabData();
      loadProjectOverview();
    } catch (err: any) {
      setFormError(err.response?.data?.message || err.message || 'Operation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveDisclosure = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError('');
    try {
      const payload = { ...disclosureForm, project: projectId };
      if (selectedItem) {
        await disclosureService.updateDisclosure(selectedItem._id, payload);
      } else {
        await disclosureService.createDisclosure(payload);
      }
      setIsDisclosureModalOpen(false);
      loadTabData();
      loadProjectOverview();
    } catch (err: any) {
      setFormError(err.response?.data?.message || err.message || 'Operation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConvertToPatent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    setSubmitting(true);
    setFormError('');
    try {
      await disclosureService.convertToPatent(selectedItem._id, convertForm);
      setIsConvertModalOpen(false);
      loadTabData();
      loadProjectOverview();
    } catch (err: any) {
      setFormError(err.response?.data?.message || err.message || 'Conversion failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveAgreement = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError('');
    try {
      const payload = { ...agreementForm, project: projectId };
      if (selectedItem) {
        await agreementService.updateAgreement(selectedItem._id, payload);
      } else {
        await agreementService.createAgreement(payload);
      }
      setIsAgreementModalOpen(false);
      loadTabData();
      loadProjectOverview();
    } catch (err: any) {
      setFormError(err.response?.data?.message || err.message || 'Operation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveFiling = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError('');
    try {
      const payload = { ...filingForm, project: projectId };
      if (selectedItem) {
        await filingService.updateFiling(selectedItem._id, payload);
      } else {
        await filingService.createFiling(payload);
      }
      setIsFilingModalOpen(false);
      loadTabData();
      loadProjectOverview();
    } catch (err: any) {
      setFormError(err.response?.data?.message || err.message || 'Operation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveCompliance = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError('');
    try {
      const payload = { ...complianceForm, project: projectId };
      if (selectedItem) {
        await complianceService.updateComplianceItem(selectedItem._id, payload);
      } else {
        await complianceService.createComplianceItem(payload);
      }
      setIsComplianceModalOpen(false);
      loadTabData();
      loadProjectOverview();
    } catch (err: any) {
      setFormError(err.response?.data?.message || err.message || 'Operation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveCollab = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError('');
    try {
      const payload = { ...collabForm, project: projectId };
      if (selectedItem) {
        await collaborationService.updateCollaboration(selectedItem._id, payload);
      } else {
        await collaborationService.createCollaboration(payload);
      }
      setIsCollaborationModalOpen(false);
      loadTabData();
      loadProjectOverview();
    } catch (err: any) {
      setFormError(err.response?.data?.message || err.message || 'Operation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docUploadFile) {
      setFormError('Please select a file to upload.');
      return;
    }
    setSubmitting(true);
    setFormError('');
    try {
      const fd = new FormData();
      fd.append('file', docUploadFile);
      fd.append('documentName', docForm.documentName || docUploadFile.name);
      fd.append('documentType', docForm.documentType);
      fd.append('relatedEntityType', 'Project');
      fd.append('relatedEntityId', projectId || '');
      fd.append('project', projectId || '');
      fd.append('description', docForm.description);

      await documentService.uploadDocument(fd);
      setIsDocumentModalOpen(false);
      setDocUploadFile(null);
      loadTabData();
      loadProjectOverview();
    } catch (err: any) {
      setFormError(err.response?.data?.message || err.message || 'Upload failed.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading Project Workspace..." />;
  }

  if (!project) {
    return (
      <EmptyState
        title="Project Not Found"
        description="The requested biotechnology project workspace could not be located."
        actionText="Back to Projects"
        onAction={() => navigate('/projects')}
        icon={<AlertCircle size={36} />}
      />
    );
  }

  const counts = overview?.counts || {
    patents: 0,
    disclosures: 0,
    agreements: 0,
    filings: 0,
    compliance: 0,
    collaborations: 0,
    documents: 0,
  };

  return (
    <div className="project-workspace">
      {/* Workspace Header Hero Banner */}
      <div className="workspace-header-banner">
        <div className="workspace-breadcrumb">
          <Link to="/projects">
            <ArrowLeft size={14} style={{ display: 'inline', marginRight: 4 }} />
            Projects
          </Link>
          <span>/</span>
          <span>{project.code}</span>
          <span>/</span>
          <span style={{ color: '#ffffff', fontWeight: 600 }}>Workspace</span>
        </div>

        <div className="workspace-header-main">
          <div className="workspace-title-group">
            <h1>
              <span>{project.name}</span>
              <span className="workspace-code-tag">{project.code}</span>
            </h1>

            <div className="workspace-meta-row">
              <span className="workspace-meta-item">
                <Building size={15} />
                <span>{project.department}</span>
              </span>
              <span className="workspace-meta-divider">•</span>
              <span className="workspace-meta-item">
                <User size={15} />
                <span>Lead: {project.projectManagerName || 'Principal Investigator'}</span>
              </span>
              <span className="workspace-meta-divider">•</span>
              <span className="workspace-meta-item">
                <Calendar size={15} />
                <span>{formatDate(project.startDate)} – {formatDate(project.endDate)}</span>
              </span>
              <span className="workspace-meta-divider">•</span>
              <StatusBadge status={project.status} />
              <StatusBadge status={project.priority} />
            </div>

            {project.teamMembers && project.teamMembers.length > 0 && (
              <div style={{ marginTop: 10, display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Investigators:</span>
                {project.teamMembers.map((m, idx) => (
                  <span
                    key={idx}
                    style={{
                      fontSize: '0.75rem',
                      background: 'rgba(255, 255, 255, 0.1)',
                      color: '#f1f5f9',
                      padding: '2px 8px',
                      borderRadius: '12px',
                    }}
                  >
                    {m}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {canManage && (
              <button
                className="btn btn-sm btn-outline"
                style={{ borderColor: 'rgba(255,255,255,0.2)', color: '#ffffff' }}
                onClick={() => setIsEditProjectOpen(true)}
              >
                <Edit size={14} />
                <span>Edit Project</span>
              </button>
            )}
            <button
              className="btn btn-sm btn-primary"
              onClick={() => handleTabChange('overview')}
            >
              <LayoutDashboard size={14} />
              <span>Overview</span>
            </button>
          </div>
        </div>
      </div>

      {/* Workspace Tabs Navigation Bar */}
      <div className="workspace-tabs-bar">
        <button
          className={`workspace-tab-btn ${currentTab === 'overview' ? 'active' : ''}`}
          onClick={() => handleTabChange('overview')}
        >
          <LayoutDashboard size={16} />
          <span>Overview</span>
        </button>

        <button
          className={`workspace-tab-btn ${currentTab === 'patents' ? 'active' : ''}`}
          onClick={() => handleTabChange('patents')}
        >
          <FileCheck2 size={16} />
          <span>Patents</span>
          <span className="tab-pill-badge">{counts.patents}</span>
        </button>

        <button
          className={`workspace-tab-btn ${currentTab === 'disclosures' ? 'active' : ''}`}
          onClick={() => handleTabChange('disclosures')}
        >
          <Lightbulb size={16} />
          <span>Disclosures</span>
          <span className="tab-pill-badge">{counts.disclosures}</span>
        </button>

        <button
          className={`workspace-tab-btn ${currentTab === 'agreements' ? 'active' : ''}`}
          onClick={() => handleTabChange('agreements')}
        >
          <Handshake size={16} />
          <span>Agreements & Licensing</span>
          <span className="tab-pill-badge">{counts.agreements}</span>
        </button>

        <button
          className={`workspace-tab-btn ${currentTab === 'regulatory' ? 'active' : ''}`}
          onClick={() => handleTabChange('regulatory')}
        >
          <FileSpreadsheet size={16} />
          <span>Regulatory & Compliance</span>
          <span className="tab-pill-badge">{counts.filings + counts.compliance}</span>
        </button>

        <button
          className={`workspace-tab-btn ${currentTab === 'deadlines' ? 'active' : ''}`}
          onClick={() => handleTabChange('deadlines')}
        >
          <CalendarClock size={16} />
          <span>Deadlines & Tasks</span>
          {overview?.upcomingDeadlines && overview.upcomingDeadlines.some((d) => d.isOverdue) && (
            <span className="tab-pill-badge" style={{ background: '#ef4444', color: '#fff' }}>!</span>
          )}
        </button>

        <button
          className={`workspace-tab-btn ${currentTab === 'collaborations' ? 'active' : ''}`}
          onClick={() => handleTabChange('collaborations')}
        >
          <Users2 size={16} />
          <span>Collaborations</span>
          <span className="tab-pill-badge">{counts.collaborations}</span>
        </button>

        <button
          className={`workspace-tab-btn ${currentTab === 'documents' ? 'active' : ''}`}
          onClick={() => handleTabChange('documents')}
        >
          <Files size={16} />
          <span>Documents</span>
          <span className="tab-pill-badge">{counts.documents}</span>
        </button>

        <button
          className={`workspace-tab-btn ${currentTab === 'activity' ? 'active' : ''}`}
          onClick={() => handleTabChange('activity')}
        >
          <History size={16} />
          <span>Activity Log</span>
        </button>
      </div>

      {/* Tab Content Rendering */}
      {tabLoading ? (
        <LoadingSpinner message="Refreshing workspace module..." />
      ) : (
        <div>
          {/* TAB 1: OVERVIEW */}
          {currentTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {/* Milestone Progress Bar */}
              <div className="card" style={{ padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Sparkles size={18} color="var(--primary)" />
                    <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>Asset Maturity & Milestone Progress</span>
                  </div>
                  <span style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--primary)' }}>
                    {overview?.milestoneProgress?.score || 25}%
                  </span>
                </div>
                <div style={{ height: 8, background: 'var(--bg-muted)', borderRadius: 4, overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${overview?.milestoneProgress?.score || 25}%`,
                      background: 'linear-gradient(90deg, #0284c7 0%, #0d9488 100%)',
                      borderRadius: 4,
                      transition: 'width 0.6s ease',
                    }}
                  />
                </div>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: 8 }}>
                  Calculated dynamically from granted patents, converted tech disclosures, approved regulatory filings, and active licenses.
                </p>
              </div>

              {/* KPI Summary Cards Grid */}
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-header">
                    <span className="stat-title">Patents</span>
                    <div className="stat-icon-wrap primary">
                      <FileCheck2 size={20} />
                    </div>
                  </div>
                  <div className="stat-value">{counts.patents}</div>
                  <div className="stat-footer">
                    <span className="text-success font-semibold">{overview?.counts?.patentsGranted || 0} Granted</span>
                    <span style={{ margin: '0 4px' }}>•</span>
                    <span>{overview?.counts?.patentsFiled || 0} In Examination</span>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-header">
                    <span className="stat-title">Tech Disclosures</span>
                    <div className="stat-icon-wrap warning">
                      <Lightbulb size={20} />
                    </div>
                  </div>
                  <div className="stat-value">{counts.disclosures}</div>
                  <div className="stat-footer">
                    <span className="text-success font-semibold">{overview?.counts?.disclosuresApproved || 0} Approved</span>
                    <span style={{ margin: '0 4px' }}>•</span>
                    <span>{overview?.counts?.disclosuresPending || 0} Under Review</span>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-header">
                    <span className="stat-title">Licensing Agreements</span>
                    <div className="stat-icon-wrap teal">
                      <Handshake size={20} />
                    </div>
                  </div>
                  <div className="stat-value">{counts.agreements}</div>
                  <div className="stat-footer">
                    <span className="text-success font-semibold">{overview?.counts?.agreementsActive || 0} Active Deals</span>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-header">
                    <span className="stat-title">Regulatory Filings</span>
                    <div className="stat-icon-wrap indigo">
                      <FileSpreadsheet size={20} />
                    </div>
                  </div>
                  <div className="stat-value">{counts.filings}</div>
                  <div className="stat-footer">
                    <span className="text-success font-semibold">{overview?.counts?.filingsApproved || 0} Approved</span>
                    <span style={{ margin: '0 4px' }}>•</span>
                    <span>{overview?.counts?.filingsPending || 0} Pending</span>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-header">
                    <span className="stat-title">Compliance Audits</span>
                    <div className="stat-icon-wrap danger">
                      <ShieldAlert size={20} />
                    </div>
                  </div>
                  <div className="stat-value">{counts.compliance}</div>
                  <div className="stat-footer">
                    <span className="text-danger font-semibold">{overview?.counts?.complianceCritical || 0} High Risk</span>
                    <span style={{ margin: '0 4px' }}>•</span>
                    <span>{overview?.counts?.compliancePending || 0} Incomplete</span>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-header">
                    <span className="stat-title">Collaborations</span>
                    <div className="stat-icon-wrap success">
                      <Users2 size={20} />
                    </div>
                  </div>
                  <div className="stat-value">{counts.collaborations}</div>
                  <div className="stat-footer">
                    <span>Academic & Biotech Partners</span>
                  </div>
                </div>
              </div>

              {/* Two Column Layout: Upcoming Deadlines & Recent Project Activity */}
              <div className="grid-cols-2">
                {/* Upcoming Project Deadlines */}
                <div className="card">
                  <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 className="card-title">Project Critical Deadlines</h3>
                    <button className="btn btn-sm btn-outline" onClick={() => handleTabChange('deadlines')}>
                      <span>View All</span>
                    </button>
                  </div>
                  <div className="card-body" style={{ padding: 0 }}>
                    {!overview?.upcomingDeadlines || overview.upcomingDeadlines.length === 0 ? (
                      <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>
                        No urgent deadlines logged for this project.
                      </div>
                    ) : (
                      <div className="table-container" style={{ border: 'none', margin: 0 }}>
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th>Obligation</th>
                              <th>Category</th>
                              <th>Due Date</th>
                              <th>Days Left</th>
                            </tr>
                          </thead>
                          <tbody>
                            {overview.upcomingDeadlines.map((d, idx) => (
                              <tr key={idx}>
                                <td>
                                  <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.875rem' }}>
                                    {d.title}
                                  </div>
                                </td>
                                <td>
                                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{d.category}</span>
                                </td>
                                <td>{formatDate(d.dueDate)}</td>
                                <td>
                                  {d.isOverdue ? (
                                    <span className="badge badge-danger">Overdue ({Math.abs(d.daysRemaining)}d)</span>
                                  ) : d.daysRemaining <= 7 ? (
                                    <span className="badge badge-warning">{d.daysRemaining} days</span>
                                  ) : (
                                    <span className="badge badge-info">{d.daysRemaining} days</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>

                {/* Recent Project Activity Stream */}
                <div className="card">
                  <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 className="card-title">Recent Project Activity</h3>
                    <button className="btn btn-sm btn-outline" onClick={() => handleTabChange('activity')}>
                      <span>Audit Trail</span>
                    </button>
                  </div>
                  <div className="card-body">
                    {!overview?.recentActivity || overview.recentActivity.length === 0 ? (
                      <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>
                        No recorded project activity yet.
                      </div>
                    ) : (
                      <div className="activity-timeline">
                        {overview.recentActivity.slice(0, 5).map((a, idx) => (
                          <div key={idx} className="activity-item">
                            <div className="activity-dot" />
                            <div className="activity-content">
                              <div className="activity-header">
                                <span className="activity-user">{a.userName}</span>
                                <span className="activity-time">{formatDate(a.timestamp)}</span>
                              </div>
                              <div className="activity-action" style={{ fontSize: '0.84rem', marginTop: 2 }}>
                                {a.details}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PATENTS */}
          {currentTab === 'patents' && (
            <div>
              <div className="filter-bar" style={{ marginBottom: 16 }}>
                <div className="filter-input-wrap">
                  <Search size={16} />
                  <input
                    type="text"
                    className="filter-input"
                    placeholder="Search patents by title, number, inventor..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
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
                {canManage && (
                  <button
                    className="btn btn-primary"
                    style={{ marginLeft: 'auto' }}
                    onClick={() => {
                      setSelectedItem(null);
                      setPatentForm({
                        title: '',
                        patentNumber: `US-${Math.floor(10000000 + Math.random() * 90000000)}-B2`,
                        inventors: user?.name || 'Lead Inventor',
                        filingDate: new Date().toISOString().split('T')[0],
                        applicationStatus: 'Draft',
                        jurisdiction: 'USPTO (US)',
                        owner: 'BioVault Therapeutics Inc.',
                        expiryDate: '',
                        description: '',
                      });
                      setIsPatentModalOpen(true);
                    }}
                  >
                    <Plus size={16} />
                    <span>File New Patent</span>
                  </button>
                )}
              </div>

              {patents.length === 0 ? (
                <EmptyState
                  title="No Patents In This Project"
                  description="No intellectual property patent filings are linked to this project."
                  actionText={canManage ? 'File New Patent' : undefined}
                  onAction={() => setIsPatentModalOpen(true)}
                  icon={<FileCheck2 size={32} />}
                />
              ) : (
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Patent Number</th>
                        <th>Patent Title</th>
                        <th>Inventors</th>
                        <th>Jurisdiction</th>
                        <th>Status</th>
                        <th>Filing Date</th>
                        <th>Expiry Date</th>
                        {canManage && <th style={{ textAlign: 'right' }}>Actions</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {patents.map((p) => (
                        <tr key={p._id}>
                          <td>
                            <span className="font-mono" style={{ fontWeight: 600, color: 'var(--primary)' }}>
                              {p.patentNumber}
                            </span>
                          </td>
                          <td>
                            <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{p.title}</div>
                            {p.description && (
                              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                {p.description.slice(0, 60)}...
                              </div>
                            )}
                          </td>
                          <td>{Array.isArray(p.inventors) ? p.inventors.join(', ') : p.inventors}</td>
                          <td>{p.jurisdiction}</td>
                          <td>
                            <StatusBadge status={p.applicationStatus} />
                          </td>
                          <td>{formatDate(p.filingDate)}</td>
                          <td>{formatDate(p.expiryDate)}</td>
                          {canManage && (
                            <td style={{ textAlign: 'right' }}>
                              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                                <button
                                  className="icon-btn"
                                  title="Edit Patent"
                                  onClick={() => {
                                    setSelectedItem(p);
                                    setPatentForm({
                                      title: p.title,
                                      patentNumber: p.patentNumber,
                                      inventors: Array.isArray(p.inventors) ? p.inventors.join(', ') : p.inventors,
                                      filingDate: p.filingDate ? new Date(p.filingDate).toISOString().split('T')[0] : '',
                                      applicationStatus: p.applicationStatus,
                                      jurisdiction: p.jurisdiction,
                                      owner: p.owner,
                                      expiryDate: p.expiryDate ? new Date(p.expiryDate).toISOString().split('T')[0] : '',
                                      description: p.description || '',
                                    });
                                    setIsPatentModalOpen(true);
                                  }}
                                >
                                  <Edit size={16} />
                                </button>
                                <button
                                  className="icon-btn text-danger"
                                  title="Delete Patent"
                                  onClick={() => {
                                    setDeleteTarget({ type: 'patent', id: p._id, name: p.title });
                                    setIsDeleteModalOpen(true);
                                  }}
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: TECHNOLOGY DISCLOSURES */}
          {currentTab === 'disclosures' && (
            <div>
              <div className="filter-bar" style={{ marginBottom: 16 }}>
                <div className="filter-input-wrap">
                  <Search size={16} />
                  <input
                    type="text"
                    className="filter-input"
                    placeholder="Search disclosures by title, ID, inventor..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
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
                  <option value="Converted to Patent">Converted to Patent</option>
                  <option value="Rejected">Rejected</option>
                </select>
                <button
                  className="btn btn-primary"
                  style={{ marginLeft: 'auto' }}
                  onClick={() => {
                    setSelectedItem(null);
                    setDisclosureForm({
                      title: '',
                      disclosureId: `TD-${Math.floor(1000 + Math.random() * 9000)}`,
                      inventor: user?.name || 'Dr. Alex Rivera',
                      priority: 'Medium',
                      description: '',
                    });
                    setIsDisclosureModalOpen(true);
                  }}
                >
                  <Plus size={16} />
                  <span>Submit Disclosure</span>
                </button>
              </div>

              {disclosures.length === 0 ? (
                <EmptyState
                  title="No Inventions Disclosed"
                  description="No lab or technology disclosures have been registered under this project."
                  actionText="Submit Disclosure"
                  onAction={() => setIsDisclosureModalOpen(true)}
                  icon={<Lightbulb size={32} />}
                />
              ) : (
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Invention Title</th>
                        <th>Lead Inventor</th>
                        <th>Submission</th>
                        <th>Priority</th>
                        <th>Review Status</th>
                        <th style={{ textAlign: 'right' }}>Workflow Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {disclosures.map((d) => (
                        <tr key={d._id}>
                          <td>
                            <span className="font-mono" style={{ fontWeight: 600, color: 'var(--primary)' }}>
                              {d.disclosureId}
                            </span>
                          </td>
                          <td>
                            <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{d.title}</div>
                            {d.description && (
                              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                {d.description.slice(0, 50)}...
                              </div>
                            )}
                          </td>
                          <td>{d.inventor}</td>
                          <td>{formatDate(d.submissionDate)}</td>
                          <td>
                            <StatusBadge status={d.priority} />
                          </td>
                          <td>
                            <StatusBadge status={d.reviewStatus} />
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                              {canManage && d.reviewStatus === 'Approved' && !d.convertedPatent && (
                                <button
                                  className="btn btn-sm btn-outline"
                                  title="Convert to Granted Patent"
                                  onClick={() => {
                                    setSelectedItem(d);
                                    setConvertForm({
                                      patentNumber: `US-${Math.floor(10000000 + Math.random() * 90000000)}-B2`,
                                      jurisdiction: 'USPTO (US)',
                                      owner: 'BioVault Therapeutics Inc.',
                                    });
                                    setIsConvertModalOpen(true);
                                  }}
                                >
                                  <Sparkles size={13} />
                                  <span>Convert to Patent</span>
                                </button>
                              )}
                              {canManage && (
                                <>
                                  <button
                                    className="icon-btn"
                                    title="Edit Disclosure"
                                    onClick={() => {
                                      setSelectedItem(d);
                                      setDisclosureForm({
                                        title: d.title,
                                        disclosureId: d.disclosureId,
                                        inventor: d.inventor,
                                        priority: d.priority,
                                        description: d.description || '',
                                      });
                                      setIsDisclosureModalOpen(true);
                                    }}
                                  >
                                    <Edit size={16} />
                                  </button>
                                  <button
                                    className="icon-btn text-danger"
                                    title="Delete Disclosure"
                                    onClick={() => {
                                      setDeleteTarget({ type: 'disclosure', id: d._id, name: d.title });
                                      setIsDeleteModalOpen(true);
                                    }}
                                  >
                                    <Trash2 size={16} />
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
            </div>
          )}

          {/* TAB 4: AGREEMENTS & LICENSING */}
          {currentTab === 'agreements' && (
            <div>
              <div className="filter-bar" style={{ marginBottom: 16 }}>
                <div className="filter-input-wrap">
                  <Search size={16} />
                  <input
                    type="text"
                    className="filter-input"
                    placeholder="Search agreements by licensee, ID, title..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <select
                  className="filter-select"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="">All Agreement Statuses</option>
                  <option value="Active">Active</option>
                  <option value="Draft">Draft</option>
                  <option value="Negotiation">Negotiation</option>
                  <option value="Expired">Expired</option>
                  <option value="Terminated">Terminated</option>
                </select>
                {canManage && (
                  <button
                    className="btn btn-primary"
                    style={{ marginLeft: 'auto' }}
                    onClick={() => {
                      setSelectedItem(null);
                      setAgreementForm({
                        agreementName: '',
                        agreementId: `AGR-${Math.floor(1000 + Math.random() * 9000)}`,
                        licensee: '',
                        licensor: 'BioVault Therapeutics Inc.',
                        agreementType: 'Exclusive Commercial License',
                        startDate: new Date().toISOString().split('T')[0],
                        endDate: '',
                        royaltyInfo: '6.5% Net Sales',
                        status: 'Draft',
                        description: '',
                      });
                      setIsAgreementModalOpen(true);
                    }}
                  >
                    <Plus size={16} />
                    <span>New Licensing Deal</span>
                  </button>
                )}
              </div>

              {agreements.length === 0 ? (
                <EmptyState
                  title="No Agreements Recorded"
                  description="No licensing contracts, tech transfer, or commercialization deals exist for this project."
                  actionText={canManage ? 'New Licensing Deal' : undefined}
                  onAction={() => setIsAgreementModalOpen(true)}
                  icon={<Handshake size={32} />}
                />
              ) : (
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Deal Name</th>
                        <th>Licensee</th>
                        <th>Type</th>
                        <th>Royalties / Commercial Terms</th>
                        <th>Expiration</th>
                        <th>Status</th>
                        {canManage && <th style={{ textAlign: 'right' }}>Actions</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {agreements.map((a) => (
                        <tr key={a._id}>
                          <td>
                            <span className="font-mono" style={{ fontWeight: 600, color: 'var(--primary)' }}>
                              {a.agreementId}
                            </span>
                          </td>
                          <td>
                            <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{a.agreementName}</div>
                          </td>
                          <td>{a.licensee}</td>
                          <td>{a.agreementType}</td>
                          <td style={{ fontSize: '0.8125rem' }}>{a.royaltyInfo || 'Fixed Milestone Fees'}</td>
                          <td>{formatDate(a.endDate)}</td>
                          <td>
                            <StatusBadge status={a.status} />
                          </td>
                          {canManage && (
                            <td style={{ textAlign: 'right' }}>
                              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                                <button
                                  className="icon-btn"
                                  title="Edit Agreement"
                                  onClick={() => {
                                    setSelectedItem(a);
                                    setAgreementForm({
                                      agreementName: a.agreementName,
                                      agreementId: a.agreementId,
                                      licensee: a.licensee,
                                      licensor: a.licensor,
                                      agreementType: a.agreementType,
                                      startDate: a.startDate ? new Date(a.startDate).toISOString().split('T')[0] : '',
                                      endDate: a.endDate ? new Date(a.endDate).toISOString().split('T')[0] : '',
                                      royaltyInfo: a.royaltyInfo || '',
                                      status: a.status,
                                      description: a.description || '',
                                    });
                                    setIsAgreementModalOpen(true);
                                  }}
                                >
                                  <Edit size={16} />
                                </button>
                                <button
                                  className="icon-btn text-danger"
                                  title="Delete Agreement"
                                  onClick={() => {
                                    setDeleteTarget({ type: 'agreement', id: a._id, name: a.agreementName });
                                    setIsDeleteModalOpen(true);
                                  }}
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: REGULATORY & COMPLIANCE */}
          {currentTab === 'regulatory' && (
            <div>
              {/* Segmented Control for Subtabs */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div className="view-toggle-group">
                  <button
                    className={`view-toggle-btn ${regulatorySubTab === 'filings' ? 'active' : ''}`}
                    onClick={() => setRegulatorySubTab('filings')}
                  >
                    <FileSpreadsheet size={16} />
                    <span>Regulatory Filings ({filings.length})</span>
                  </button>
                  <button
                    className={`view-toggle-btn ${regulatorySubTab === 'compliance' ? 'active' : ''}`}
                    onClick={() => setRegulatorySubTab('compliance')}
                  >
                    <ShieldAlert size={16} />
                    <span>Biosafety & Compliance Audits ({complianceItems.length})</span>
                  </button>
                </div>

                {canManage && (
                  regulatorySubTab === 'filings' ? (
                    <button
                      className="btn btn-primary"
                      onClick={() => {
                        setSelectedItem(null);
                        setFilingForm({
                          filingName: '',
                          filingId: `REG-${Math.floor(1000 + Math.random() * 9000)}`,
                          regulatoryAuthority: 'FDA (United States)',
                          filingType: 'IND (Investigational New Drug)',
                          submissionDate: '',
                          dueDate: '',
                          status: 'Draft',
                          responsiblePerson: user?.name || 'Regulatory Affairs Team',
                          description: '',
                        });
                        setIsFilingModalOpen(true);
                      }}
                    >
                      <Plus size={16} />
                      <span>Submit Regulatory Filing</span>
                    </button>
                  ) : (
                    <button
                      className="btn btn-primary"
                      onClick={() => {
                        setSelectedItem(null);
                        setComplianceForm({
                          complianceItem: '',
                          category: 'Biosafety (BSL-2/3)',
                          responsiblePerson: user?.name || 'Compliance Officer',
                          dueDate: '',
                          status: 'Pending',
                          riskLevel: 'Medium',
                          description: '',
                        });
                        setIsComplianceModalOpen(true);
                      }}
                    >
                      <Plus size={16} />
                      <span>Add Compliance Item</span>
                    </button>
                  )
                )}
              </div>

              {regulatorySubTab === 'filings' ? (
                filings.length === 0 ? (
                  <EmptyState
                    title="No Regulatory Filings"
                    description="No FDA, EMA, or PMDA regulatory submissions recorded for this project."
                    actionText={canManage ? 'Submit Filing' : undefined}
                    onAction={() => setIsFilingModalOpen(true)}
                    icon={<FileSpreadsheet size={32} />}
                  />
                ) : (
                  <div className="table-container">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Filing ID</th>
                          <th>Submission Name</th>
                          <th>Agency / Authority</th>
                          <th>Type</th>
                          <th>Due Date</th>
                          <th>Officer</th>
                          <th>Status</th>
                          {canManage && <th style={{ textAlign: 'right' }}>Actions</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {filings.map((f) => (
                          <tr key={f._id}>
                            <td>
                              <span className="font-mono" style={{ fontWeight: 600, color: 'var(--primary)' }}>
                                {f.filingId}
                              </span>
                            </td>
                            <td>
                              <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{f.filingName}</div>
                            </td>
                            <td>{f.regulatoryAuthority}</td>
                            <td>{f.filingType}</td>
                            <td>{formatDate(f.dueDate)}</td>
                            <td>{f.responsiblePerson}</td>
                            <td>
                              <StatusBadge status={f.status} />
                            </td>
                            {canManage && (
                              <td style={{ textAlign: 'right' }}>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                                  <button
                                    className="icon-btn"
                                    title="Edit Filing"
                                    onClick={() => {
                                      setSelectedItem(f);
                                      setFilingForm({
                                        filingName: f.filingName,
                                        filingId: f.filingId,
                                        regulatoryAuthority: f.regulatoryAuthority,
                                        filingType: f.filingType,
                                        submissionDate: f.submissionDate ? new Date(f.submissionDate).toISOString().split('T')[0] : '',
                                        dueDate: f.dueDate ? new Date(f.dueDate).toISOString().split('T')[0] : '',
                                        status: f.status,
                                        responsiblePerson: f.responsiblePerson,
                                        description: f.description || '',
                                      });
                                      setIsFilingModalOpen(true);
                                    }}
                                  >
                                    <Edit size={16} />
                                  </button>
                                  <button
                                    className="icon-btn text-danger"
                                    title="Delete Filing"
                                    onClick={() => {
                                      setDeleteTarget({ type: 'filing', id: f._id, name: f.filingName });
                                      setIsDeleteModalOpen(true);
                                    }}
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              ) : (
                /* Compliance Items Table */
                complianceItems.length === 0 ? (
                  <EmptyState
                    title="No Compliance Requirements"
                    description="No biosafety audits, ethical approvals, or GLP protocols logged."
                    actionText={canManage ? 'Add Compliance Item' : undefined}
                    onAction={() => setIsComplianceModalOpen(true)}
                    icon={<ShieldAlert size={32} />}
                  />
                ) : (
                  <div className="table-container">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Item / Audit</th>
                          <th>Category</th>
                          <th>Responsible Officer</th>
                          <th>Due Date</th>
                          <th>Risk Level</th>
                          <th>Status</th>
                          {canManage && <th style={{ textAlign: 'right' }}>Actions</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {complianceItems.map((c) => (
                          <tr key={c._id}>
                            <td>
                              <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{c.complianceItem}</div>
                              {c.description && (
                                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                  {c.description.slice(0, 50)}...
                                </div>
                              )}
                            </td>
                            <td>{c.category}</td>
                            <td>{c.responsiblePerson}</td>
                            <td>{formatDate(c.dueDate)}</td>
                            <td>
                              <StatusBadge status={c.riskLevel} />
                            </td>
                            <td>
                              <StatusBadge status={c.status} />
                            </td>
                            {canManage && (
                              <td style={{ textAlign: 'right' }}>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                                  <button
                                    className="icon-btn"
                                    title="Edit Compliance Item"
                                    onClick={() => {
                                      setSelectedItem(c);
                                      setComplianceForm({
                                        complianceItem: c.complianceItem,
                                        category: c.category,
                                        responsiblePerson: c.responsiblePerson,
                                        dueDate: c.dueDate ? new Date(c.dueDate).toISOString().split('T')[0] : '',
                                        status: c.status,
                                        riskLevel: c.riskLevel,
                                        description: c.description || '',
                                      });
                                      setIsComplianceModalOpen(true);
                                    }}
                                  >
                                    <Edit size={16} />
                                  </button>
                                  <button
                                    className="icon-btn text-danger"
                                    title="Delete Compliance Item"
                                    onClick={() => {
                                      setDeleteTarget({ type: 'compliance', id: c._id, name: c.complianceItem });
                                      setIsDeleteModalOpen(true);
                                    }}
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              )}
            </div>
          )}

          {/* TAB 6: DEADLINES & TASKS */}
          {currentTab === 'deadlines' && (
            <div>
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  Unified project schedule consolidating regulatory milestones, compliance inspections, agreement renewal windows, and patent maintenance deadlines.
                </p>
              </div>

              {deadlines.length === 0 ? (
                <EmptyState
                  title="No Scheduled Deadlines"
                  description="There are currently no active regulatory, compliance, or contract deadlines for this project."
                  icon={<CalendarClock size={32} />}
                />
              ) : (
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Urgency</th>
                        <th>Milestone / Task</th>
                        <th>Type / Category</th>
                        <th>Code / Identifier</th>
                        <th>Due Date</th>
                        <th>Days Left</th>
                        <th>Assigned Lead</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {deadlines.map((d) => (
                        <tr key={d.id}>
                          <td>
                            {d.isOverdue ? (
                              <span className="badge badge-danger">OVERDUE</span>
                            ) : d.daysRemaining <= 7 ? (
                              <span className="badge badge-warning">DUE SOON</span>
                            ) : (
                              <span className="badge badge-info">UPCOMING</span>
                            )}
                          </td>
                          <td>
                            <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{d.title}</div>
                          </td>
                          <td>
                            <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{d.itemType}</span>
                          </td>
                          <td>
                            <span className="font-mono" style={{ fontSize: '0.78rem' }}>{d.code}</span>
                          </td>
                          <td>{formatDate(d.dueDate)}</td>
                          <td>
                            <span style={{ fontWeight: 700, color: d.isOverdue ? 'var(--status-danger)' : 'var(--text-main)' }}>
                              {d.daysRemaining < 0 ? `${Math.abs(d.daysRemaining)} days ago` : `${d.daysRemaining} days`}
                            </span>
                          </td>
                          <td>{d.responsiblePerson}</td>
                          <td>
                            <StatusBadge status={d.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 7: RESEARCH COLLABORATIONS */}
          {currentTab === 'collaborations' && (
            <div>
              <div className="filter-bar" style={{ marginBottom: 16 }}>
                <div className="filter-input-wrap">
                  <Search size={16} />
                  <input
                    type="text"
                    className="filter-input"
                    placeholder="Search collaborations by partner, lead, ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                {canManage && (
                  <button
                    className="btn btn-primary"
                    style={{ marginLeft: 'auto' }}
                    onClick={() => {
                      setSelectedItem(null);
                      setCollabForm({
                        collaborationName: '',
                        collaborationId: `COL-${Math.floor(1000 + Math.random() * 9000)}`,
                        partnerOrganization: '',
                        leadResearcher: user?.name || 'Dr. Alex Rivera',
                        startDate: new Date().toISOString().split('T')[0],
                        endDate: '',
                        collaborationType: 'Co-Development',
                        status: 'Active',
                        description: '',
                      });
                      setIsCollaborationModalOpen(true);
                    }}
                  >
                    <Plus size={16} />
                    <span>Add Collaboration</span>
                  </button>
                )}
              </div>

              {collaborations.length === 0 ? (
                <EmptyState
                  title="No Research Collaborations"
                  description="No joint venture, sponsored research, or clinical partner programs attached to this project."
                  actionText={canManage ? 'Add Collaboration' : undefined}
                  onAction={() => setIsCollaborationModalOpen(true)}
                  icon={<Users2 size={32} />}
                />
              ) : (
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Partnership / Initiative</th>
                        <th>Partner Organization</th>
                        <th>Lead Researcher</th>
                        <th>Type</th>
                        <th>Timeline</th>
                        <th>Status</th>
                        {canManage && <th style={{ textAlign: 'right' }}>Actions</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {collaborations.map((c) => (
                        <tr key={c._id}>
                          <td>
                            <span className="font-mono" style={{ fontWeight: 600, color: 'var(--primary)' }}>
                              {c.collaborationId}
                            </span>
                          </td>
                          <td>
                            <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{c.collaborationName}</div>
                            {c.description && (
                              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                {c.description.slice(0, 50)}...
                              </div>
                            )}
                          </td>
                          <td>{c.partnerOrganization}</td>
                          <td>{c.leadResearcher}</td>
                          <td>{c.collaborationType}</td>
                          <td style={{ fontSize: '0.8125rem' }}>
                            {formatDate(c.startDate)} – {formatDate(c.endDate)}
                          </td>
                          <td>
                            <StatusBadge status={c.status} />
                          </td>
                          {canManage && (
                            <td style={{ textAlign: 'right' }}>
                              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                                <button
                                  className="icon-btn"
                                  title="Edit Collaboration"
                                  onClick={() => {
                                    setSelectedItem(c);
                                    setCollabForm({
                                      collaborationName: c.collaborationName,
                                      collaborationId: c.collaborationId,
                                      partnerOrganization: c.partnerOrganization,
                                      leadResearcher: c.leadResearcher,
                                      startDate: c.startDate ? new Date(c.startDate).toISOString().split('T')[0] : '',
                                      endDate: c.endDate ? new Date(c.endDate).toISOString().split('T')[0] : '',
                                      collaborationType: c.collaborationType,
                                      status: c.status,
                                      description: c.description || '',
                                    });
                                    setIsCollaborationModalOpen(true);
                                  }}
                                >
                                  <Edit size={16} />
                                </button>
                                <button
                                  className="icon-btn text-danger"
                                  title="Delete Collaboration"
                                  onClick={() => {
                                    setDeleteTarget({ type: 'collaboration', id: c._id, name: c.collaborationName });
                                    setIsDeleteModalOpen(true);
                                  }}
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 8: DOCUMENT VAULT */}
          {currentTab === 'documents' && (
            <div>
              <div className="filter-bar" style={{ marginBottom: 16 }}>
                <div className="filter-input-wrap">
                  <Search size={16} />
                  <input
                    type="text"
                    className="filter-input"
                    placeholder="Search documents by name, type, description..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <button
                  className="btn btn-primary"
                  style={{ marginLeft: 'auto' }}
                  onClick={() => {
                    setDocUploadFile(null);
                    setDocForm({
                      documentName: '',
                      documentType: 'Technical Specification',
                      description: '',
                    });
                    setIsDocumentModalOpen(true);
                  }}
                >
                  <Upload size={16} />
                  <span>Upload Document</span>
                </button>
              </div>

              {documents.length === 0 ? (
                <EmptyState
                  title="Document Vault Empty"
                  description="No clinical protocols, patent specifications, or regulatory reports uploaded for this project."
                  actionText="Upload Document"
                  onAction={() => setIsDocumentModalOpen(true)}
                  icon={<Files size={32} />}
                />
              ) : (
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Document Title</th>
                        <th>Type / Classification</th>
                        <th>Uploaded By</th>
                        <th>Upload Date</th>
                        <th>File Size</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {documents.map((doc) => (
                        <tr key={doc._id}>
                          <td>
                            <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{doc.documentName}</div>
                            {doc.description && (
                              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                {doc.description.slice(0, 60)}...
                              </div>
                            )}
                          </td>
                          <td>
                            <span className="badge badge-info">{doc.documentType}</span>
                          </td>
                          <td>{doc.uploaderName || 'System User'}</td>
                          <td>{formatDate(doc.uploadDate || doc.createdAt)}</td>
                          <td style={{ fontSize: '0.8125rem' }}>
                            {doc.fileSize ? `${(doc.fileSize / 1024).toFixed(1)} KB` : 'N/A'}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                              <a
                                href={documentService.downloadDocumentUrl(doc._id)}
                                target="_blank"
                                rel="noreferrer"
                                className="icon-btn"
                                title="Download Document"
                              >
                                <Download size={16} />
                              </a>
                              {canManage && (
                                <button
                                  className="icon-btn text-danger"
                                  title="Delete Document"
                                  onClick={() => {
                                    setDeleteTarget({ type: 'document', id: doc._id, name: doc.documentName });
                                    setIsDeleteModalOpen(true);
                                  }}
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 9: ACTIVITY HISTORY */}
          {currentTab === 'activity' && (
            <div className="card" style={{ padding: 20 }}>
              <h3 className="card-title" style={{ marginBottom: 16 }}>
                Project Audit History & Event Timeline
              </h3>
              {activity.length === 0 ? (
                <EmptyState
                  title="No Audit Records"
                  description="No historical changes logged for this project yet."
                  icon={<History size={32} />}
                />
              ) : (
                <div className="activity-timeline">
                  {activity.map((a) => (
                    <div key={a._id} className="activity-item">
                      <div className="activity-dot" />
                      <div className="activity-content">
                        <div className="activity-header">
                          <span className="activity-user">{a.userName}</span>
                          <span className="badge badge-outline" style={{ fontSize: '0.7rem' }}>
                            {a.userRole}
                          </span>
                          <span className="activity-time">{formatDate(a.timestamp)}</span>
                        </div>
                        <div style={{ marginTop: 4, fontSize: '0.875rem', color: 'var(--text-main)' }}>
                          <span className="font-mono" style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary)', marginRight: 6 }}>
                            [{a.action}]
                          </span>
                          <span>{a.details}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* --- MODALS --- */}

      {/* Modal: Edit Project */}
      <Modal
        isOpen={isEditProjectOpen}
        onClose={() => setIsEditProjectOpen(false)}
        title={`Edit Project: ${project.name}`}
        size="lg"
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setSubmitting(true);
            try {
              await projectService.updateProject(project._id, project);
              setIsEditProjectOpen(false);
              loadProjectOverview();
            } catch (err: any) {
              alert(err.message || 'Failed to update project.');
            } finally {
              setSubmitting(false);
            }
          }}
        >
          <div className="form-group">
            <label className="form-label">Project Name *</label>
            <input
              type="text"
              className="form-input"
              value={project.name}
              onChange={(e) => setProject({ ...project, name: e.target.value })}
              required
            />
          </div>
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Department *</label>
              <input
                type="text"
                className="form-input"
                value={project.department}
                onChange={(e) => setProject({ ...project, department: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Project Manager</label>
              <input
                type="text"
                className="form-input"
                value={project.projectManagerName || ''}
                onChange={(e) => setProject({ ...project, projectManagerName: e.target.value })}
              />
            </div>
          </div>
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Status</label>
              <select
                className="form-select"
                value={project.status}
                onChange={(e) => setProject({ ...project, status: e.target.value as any })}
              >
                <option value="Planning">Planning</option>
                <option value="Active">Active</option>
                <option value="On Hold">On Hold</option>
                <option value="Completed">Completed</option>
                <option value="Archived">Archived</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Priority</label>
              <select
                className="form-select"
                value={project.priority}
                onChange={(e) => setProject({ ...project, priority: e.target.value as any })}
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              className="form-textarea"
              rows={3}
              value={project.description || ''}
              onChange={(e) => setProject({ ...project, description: e.target.value })}
            />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-outline" onClick={() => setIsEditProjectOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Patent Form */}
      <Modal
        isOpen={isPatentModalOpen}
        onClose={() => setIsPatentModalOpen(false)}
        title={selectedItem ? `Edit Patent: ${selectedItem.patentNumber}` : 'File Project Patent'}
      >
        <form onSubmit={handleSavePatent}>
          {formError && <div className="form-error-banner">{formError}</div>}
          <div className="form-group">
            <label className="form-label">Patent Title *</label>
            <input
              type="text"
              className="form-input"
              required
              value={patentForm.title}
              onChange={(e) => setPatentForm({ ...patentForm, title: e.target.value })}
            />
          </div>
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Patent / App Number *</label>
              <input
                type="text"
                className="form-input font-mono"
                required
                value={patentForm.patentNumber}
                onChange={(e) => setPatentForm({ ...patentForm, patentNumber: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Jurisdiction *</label>
              <select
                className="form-select"
                value={patentForm.jurisdiction}
                onChange={(e) => setPatentForm({ ...patentForm, jurisdiction: e.target.value })}
              >
                <option value="USPTO (US)">USPTO (US)</option>
                <option value="EPO (Europe)">EPO (Europe)</option>
                <option value="WIPO (PCT)">WIPO (PCT)</option>
                <option value="JPO (Japan)">JPO (Japan)</option>
                <option value="CNIPA (China)">CNIPA (China)</option>
              </select>
            </div>
          </div>
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Lead Inventors (comma separated) *</label>
              <input
                type="text"
                className="form-input"
                required
                value={patentForm.inventors}
                onChange={(e) => setPatentForm({ ...patentForm, inventors: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select
                className="form-select"
                value={patentForm.applicationStatus}
                onChange={(e) => setPatentForm({ ...patentForm, applicationStatus: e.target.value as any })}
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
              <label className="form-label">Filing Date</label>
              <input
                type="date"
                className="form-input"
                value={patentForm.filingDate}
                onChange={(e) => setPatentForm({ ...patentForm, filingDate: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Maintenance / Expiry Date</label>
              <input
                type="date"
                className="form-input"
                value={patentForm.expiryDate}
                onChange={(e) => setPatentForm({ ...patentForm, expiryDate: e.target.value })}
              />
            </div>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-outline" onClick={() => setIsPatentModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Saving...' : 'Save Patent'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Tech Disclosure Form */}
      <Modal
        isOpen={isDisclosureModalOpen}
        onClose={() => setIsDisclosureModalOpen(false)}
        title={selectedItem ? `Edit Disclosure: ${selectedItem.disclosureId}` : 'Submit Technology Disclosure'}
      >
        <form onSubmit={handleSaveDisclosure}>
          {formError && <div className="form-error-banner">{formError}</div>}
          <div className="form-group">
            <label className="form-label">Invention Title *</label>
            <input
              type="text"
              className="form-input"
              required
              placeholder="e.g. Novel Recombinant Viral Capsid Variant"
              value={disclosureForm.title}
              onChange={(e) => setDisclosureForm({ ...disclosureForm, title: e.target.value })}
            />
          </div>
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Disclosure ID *</label>
              <input
                type="text"
                className="form-input font-mono"
                required
                value={disclosureForm.disclosureId}
                onChange={(e) => setDisclosureForm({ ...disclosureForm, disclosureId: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Lead Inventor *</label>
              <input
                type="text"
                className="form-input"
                required
                value={disclosureForm.inventor}
                onChange={(e) => setDisclosureForm({ ...disclosureForm, inventor: e.target.value })}
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Technical Claims & Experimental Validation</label>
            <textarea
              className="form-textarea"
              rows={3}
              value={disclosureForm.description}
              onChange={(e) => setDisclosureForm({ ...disclosureForm, description: e.target.value })}
            />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-outline" onClick={() => setIsDisclosureModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit Disclosure'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Convert Disclosure to Patent */}
      <Modal
        isOpen={isConvertModalOpen}
        onClose={() => setIsConvertModalOpen(false)}
        title={`Convert Disclosure to Patent: ${selectedItem?.disclosureId}`}
      >
        <form onSubmit={handleConvertToPatent}>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
            Converting invention <strong>"{selectedItem?.title}"</strong> into a registered patent record within project {project.code}.
          </p>
          <div className="form-group">
            <label className="form-label">Assigned Patent Number *</label>
            <input
              type="text"
              className="form-input font-mono"
              required
              value={convertForm.patentNumber}
              onChange={(e) => setConvertForm({ ...convertForm, patentNumber: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Primary Filing Jurisdiction</label>
            <select
              className="form-select"
              value={convertForm.jurisdiction}
              onChange={(e) => setConvertForm({ ...convertForm, jurisdiction: e.target.value })}
            >
              <option value="USPTO (US)">USPTO (US)</option>
              <option value="EPO (Europe)">EPO (Europe)</option>
              <option value="WIPO (PCT)">WIPO (PCT)</option>
            </select>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-outline" onClick={() => setIsConvertModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Converting...' : 'Convert & File Patent'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Licensing Agreement Form */}
      <Modal
        isOpen={isAgreementModalOpen}
        onClose={() => setIsAgreementModalOpen(false)}
        title={selectedItem ? `Edit Agreement: ${selectedItem.agreementId}` : 'Create Licensing Agreement'}
      >
        <form onSubmit={handleSaveAgreement}>
          {formError && <div className="form-error-banner">{formError}</div>}
          <div className="form-group">
            <label className="form-label">Deal / Agreement Name *</label>
            <input
              type="text"
              className="form-input"
              required
              placeholder="e.g. Global Co-Development License"
              value={agreementForm.agreementName}
              onChange={(e) => setAgreementForm({ ...agreementForm, agreementName: e.target.value })}
            />
          </div>
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Agreement ID *</label>
              <input
                type="text"
                className="form-input font-mono"
                required
                value={agreementForm.agreementId}
                onChange={(e) => setAgreementForm({ ...agreementForm, agreementId: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Licensee Entity *</label>
              <input
                type="text"
                className="form-input"
                required
                placeholder="e.g. Novartis Pharma AG"
                value={agreementForm.licensee}
                onChange={(e) => setAgreementForm({ ...agreementForm, licensee: e.target.value })}
              />
            </div>
          </div>
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Agreement Type</label>
              <select
                className="form-select"
                value={agreementForm.agreementType}
                onChange={(e) => setAgreementForm({ ...agreementForm, agreementType: e.target.value })}
              >
                <option value="Exclusive Commercial License">Exclusive Commercial License</option>
                <option value="Non-Exclusive Research License">Non-Exclusive Research License</option>
                <option value="Material Transfer Agreement (MTA)">Material Transfer Agreement (MTA)</option>
                <option value="Option Agreement">Option Agreement</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Commercial Royalty Terms</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. 5.5% Net Revenue + $10M Milestone"
                value={agreementForm.royaltyInfo}
                onChange={(e) => setAgreementForm({ ...agreementForm, royaltyInfo: e.target.value })}
              />
            </div>
          </div>
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Start Date *</label>
              <input
                type="date"
                className="form-input"
                required
                value={agreementForm.startDate}
                onChange={(e) => setAgreementForm({ ...agreementForm, startDate: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Expiration Date *</label>
              <input
                type="date"
                className="form-input"
                required
                value={agreementForm.endDate}
                onChange={(e) => setAgreementForm({ ...agreementForm, endDate: e.target.value })}
              />
            </div>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-outline" onClick={() => setIsAgreementModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Saving...' : 'Save Agreement'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Regulatory Filing Form */}
      <Modal
        isOpen={isFilingModalOpen}
        onClose={() => setIsFilingModalOpen(false)}
        title={selectedItem ? `Edit Filing: ${selectedItem.filingId}` : 'Submit Regulatory Filing'}
      >
        <form onSubmit={handleSaveFiling}>
          {formError && <div className="form-error-banner">{formError}</div>}
          <div className="form-group">
            <label className="form-label">Filing Title *</label>
            <input
              type="text"
              className="form-input"
              required
              placeholder="e.g. Phase 1 Clinical Protocol IND Application"
              value={filingForm.filingName}
              onChange={(e) => setFilingForm({ ...filingForm, filingName: e.target.value })}
            />
          </div>
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Filing ID *</label>
              <input
                type="text"
                className="form-input font-mono"
                required
                value={filingForm.filingId}
                onChange={(e) => setFilingForm({ ...filingForm, filingId: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Authority</label>
              <select
                className="form-select"
                value={filingForm.regulatoryAuthority}
                onChange={(e) => setFilingForm({ ...filingForm, regulatoryAuthority: e.target.value })}
              >
                <option value="FDA (United States)">FDA (United States)</option>
                <option value="EMA (European Union)">EMA (European Union)</option>
                <option value="PMDA (Japan)">PMDA (Japan)</option>
                <option value="NMPA (China)">NMPA (China)</option>
                <option value="Health Canada">Health Canada</option>
              </select>
            </div>
          </div>
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Filing Type</label>
              <select
                className="form-select"
                value={filingForm.filingType}
                onChange={(e) => setFilingForm({ ...filingForm, filingType: e.target.value })}
              >
                <option value="IND (Investigational New Drug)">IND (Investigational New Drug)</option>
                <option value="NDA (New Drug Application)">NDA (New Drug Application)</option>
                <option value="BLA (Biologics License Application)">BLA (Biologics License Application)</option>
                <option value="CTA (Clinical Trial Authorisation)">CTA (Clinical Trial Authorisation)</option>
                <option value="Orphan Drug Designation">Orphan Drug Designation</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Regulatory Deadline / Due Date *</label>
              <input
                type="date"
                className="form-input"
                required
                value={filingForm.dueDate}
                onChange={(e) => setFilingForm({ ...filingForm, dueDate: e.target.value })}
              />
            </div>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-outline" onClick={() => setIsFilingModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Saving...' : 'Save Filing'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Compliance Form */}
      <Modal
        isOpen={isComplianceModalOpen}
        onClose={() => setIsComplianceModalOpen(false)}
        title={selectedItem ? `Edit Compliance: ${selectedItem.complianceItem}` : 'Add Compliance Requirement'}
      >
        <form onSubmit={handleSaveCompliance}>
          {formError && <div className="form-error-banner">{formError}</div>}
          <div className="form-group">
            <label className="form-label">Compliance Item / Protocol *</label>
            <input
              type="text"
              className="form-input"
              required
              placeholder="e.g. Annual BSL-2 Facility Recertification"
              value={complianceForm.complianceItem}
              onChange={(e) => setComplianceForm({ ...complianceForm, complianceItem: e.target.value })}
            />
          </div>
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Category</label>
              <select
                className="form-select"
                value={complianceForm.category}
                onChange={(e) => setComplianceForm({ ...complianceForm, category: e.target.value })}
              >
                <option value="Biosafety (BSL-2/3)">Biosafety (BSL-2/3)</option>
                <option value="Good Laboratory Practice (GLP)">Good Laboratory Practice (GLP)</option>
                <option value="Good Clinical Practice (GCP)">Good Clinical Practice (GCP)</option>
                <option value="Institutional Biosafety Committee (IBC)">IBC Approval</option>
                <option value="IRB / Ethics Clearance">IRB / Ethics Clearance</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Risk Level</label>
              <select
                className="form-select"
                value={complianceForm.riskLevel}
                onChange={(e) => setComplianceForm({ ...complianceForm, riskLevel: e.target.value as any })}
              >
                <option value="Low">Low Risk</option>
                <option value="Medium">Medium Risk</option>
                <option value="High">High Risk</option>
                <option value="Critical">Critical Risk</option>
              </select>
            </div>
          </div>
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Due Date *</label>
              <input
                type="date"
                className="form-input"
                required
                value={complianceForm.dueDate}
                onChange={(e) => setComplianceForm({ ...complianceForm, dueDate: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Responsible Person</label>
              <input
                type="text"
                className="form-input"
                value={complianceForm.responsiblePerson}
                onChange={(e) => setComplianceForm({ ...complianceForm, responsiblePerson: e.target.value })}
              />
            </div>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-outline" onClick={() => setIsComplianceModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Saving...' : 'Save Compliance Item'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Collaboration Form */}
      <Modal
        isOpen={isCollaborationModalOpen}
        onClose={() => setIsCollaborationModalOpen(false)}
        title={selectedItem ? `Edit Collaboration: ${selectedItem.collaborationName}` : 'Add Research Collaboration'}
      >
        <form onSubmit={handleSaveCollab}>
          {formError && <div className="form-error-banner">{formError}</div>}
          <div className="form-group">
            <label className="form-label">Initiative / Project Name *</label>
            <input
              type="text"
              className="form-input"
              required
              placeholder="e.g. AAV Capsid Directed Evolution Consortium"
              value={collabForm.collaborationName}
              onChange={(e) => setCollabForm({ ...collabForm, collaborationName: e.target.value })}
            />
          </div>
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Collaboration ID *</label>
              <input
                type="text"
                className="form-input font-mono"
                required
                value={collabForm.collaborationId}
                onChange={(e) => setCollabForm({ ...collabForm, collaborationId: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Partner Organization *</label>
              <input
                type="text"
                className="form-input"
                required
                placeholder="e.g. Stanford University School of Medicine"
                value={collabForm.partnerOrganization}
                onChange={(e) => setCollabForm({ ...collabForm, partnerOrganization: e.target.value })}
              />
            </div>
          </div>
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Lead Researcher</label>
              <input
                type="text"
                className="form-input"
                value={collabForm.leadResearcher}
                onChange={(e) => setCollabForm({ ...collabForm, leadResearcher: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Type</label>
              <select
                className="form-select"
                value={collabForm.collaborationType}
                onChange={(e) => setCollabForm({ ...collabForm, collaborationType: e.target.value })}
              >
                <option value="Co-Development">Co-Development</option>
                <option value="Sponsored Academic Research">Sponsored Academic Research</option>
                <option value="Pre-Clinical Testing">Pre-Clinical Testing</option>
                <option value="Clinical Trial Joint Study">Clinical Trial Joint Study</option>
              </select>
            </div>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-outline" onClick={() => setIsCollaborationModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Saving...' : 'Save Collaboration'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Document Upload */}
      <Modal
        isOpen={isDocumentModalOpen}
        onClose={() => setIsDocumentModalOpen(false)}
        title="Upload Project Artifact"
      >
        <form onSubmit={handleUploadDocument}>
          {formError && <div className="form-error-banner">{formError}</div>}
          <div className="form-group">
            <label className="form-label">Select File *</label>
            <input
              type="file"
              className="form-input"
              required
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setDocUploadFile(e.target.files[0]);
                  if (!docForm.documentName) {
                    setDocForm({ ...docForm, documentName: e.target.files[0].name });
                  }
                }
              }}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Document Display Name</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. CRISPR Formulation Assay Data (PDF)"
              value={docForm.documentName}
              onChange={(e) => setDocForm({ ...docForm, documentName: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Classification / Type</label>
            <select
              className="form-select"
              value={docForm.documentType}
              onChange={(e) => setDocForm({ ...docForm, documentType: e.target.value })}
            >
              <option value="Technical Specification">Technical Specification</option>
              <option value="Patent Draft / Claim">Patent Draft / Claim</option>
              <option value="Clinical Protocol">Clinical Protocol</option>
              <option value="Regulatory Dossier">Regulatory Dossier</option>
              <option value="Biosafety Certificate">Biosafety Certificate</option>
              <option value="Licensing Contract">Licensing Contract</option>
            </select>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-outline" onClick={() => setIsDocumentModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Uploading...' : 'Upload Document'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeleteTarget(null);
        }}
        onConfirm={confirmDeleteAction}
        title={`Delete ${deleteTarget?.type || 'Record'}`}
        message={`Are you sure you want to remove "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmText="Confirm Delete"
        isDanger={true}
        loading={submitting}
      />
    </div>
  );
};
