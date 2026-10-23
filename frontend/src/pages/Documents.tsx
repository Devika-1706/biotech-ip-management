import React, { useState, useEffect } from 'react';
import { Upload, Search, Filter, Download, Trash2, Files, FileText, CheckCircle2 } from 'lucide-react';
import { documentService } from '../services/api';
import { DocumentRecord, RelatedEntityType } from '../types';
import { useAuth } from '../context/AuthContext';
import { Modal } from '../components/Modal';
import { ConfirmModal } from '../components/ConfirmModal';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { EmptyState } from '../components/EmptyState';

export const Documents: React.FC = () => {
  const { hasRole, user } = useAuth();
  const canDelete = hasRole('ADMIN', 'IP MANAGER');

  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [entityFilter, setEntityFilter] = useState('');

  // Modals
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<DocumentRecord | null>(null);

  // Upload Form
  const [file, setFile] = useState<File | null>(null);
  const [docName, setDocName] = useState('');
  const [docType, setDocType] = useState('Patent Application Form');
  const [entityType, setEntityType] = useState<RelatedEntityType>('Patent');
  const [entityName, setEntityName] = useState('');
  const [description, setDescription] = useState('');

  const [uploadError, setUploadError] = useState('');
  const [uploading, setUploading] = useState(false);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const res = await documentService.getDocuments({
        search: search || undefined,
        relatedEntityType: entityFilter || undefined,
      });
      if (res.data?.success) {
        setDocuments(res.data.documents);
      }
    } catch (err) {
      console.error('Failed to load documents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, [search, entityFilter]);

  const handleOpenUpload = () => {
    setFile(null);
    setDocName('');
    setDocType('Patent Application Form');
    setEntityType('Patent');
    setEntityName('');
    setDescription('');
    setUploadError('');
    setIsUploadOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      if (!docName) {
        setDocName(selected.name);
      }
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setUploadError('Please choose a file to upload.');
      return;
    }

    setUploading(true);
    setUploadError('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('documentName', docName || file.name);
      formData.append('documentType', docType);
      formData.append('relatedEntityType', entityType);
      formData.append('relatedEntityName', entityName);
      formData.append('description', description);

      await documentService.uploadDocument(formData);
      setIsUploadOpen(false);
      loadDocuments();
    } catch (err: any) {
      setUploadError(err.response?.data?.message || err.message || 'File upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedDoc) return;
    setUploading(true);
    try {
      await documentService.deleteDocument(selectedDoc._id);
      setIsDeleteOpen(false);
      loadDocuments();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete document.');
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Document Vault & Repository</h1>
          <p className="page-subtitle">
            Secure regulatory dossiers, patent claims specifications, lab records, and executed licensing charters
          </p>
        </div>
        <div className="header-actions">
          <button className="btn btn-primary" onClick={handleOpenUpload}>
            <Upload size={16} />
            <span>Upload Document</span>
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
            placeholder="Search documents by name, type, uploader, description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className="filter-select"
          value={entityFilter}
          onChange={(e) => setEntityFilter(e.target.value)}
        >
          <option value="">All Associated Entities</option>
          <option value="Patent">Patent</option>
          <option value="Project">Project</option>
          <option value="TechnologyDisclosure">Technology Disclosure</option>
          <option value="LicensingAgreement">Licensing Agreement</option>
          <option value="RegulatoryFiling">Regulatory Filing</option>
          <option value="ComplianceItem">Compliance Record</option>
          <option value="ResearchCollaboration">Research Collaboration</option>
          <option value="General">General Corporate</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <LoadingSpinner message="Accessing secure document vault..." />
      ) : documents.length === 0 ? (
        <EmptyState
          title="No documents in vault"
          description="Upload patent specifications, regulatory filings, or compliance verification certificates."
          actionText="Upload Document"
          onAction={handleOpenUpload}
          icon={<Files size={32} />}
        />
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Document Name</th>
                <th>Document Type</th>
                <th>Related Entity</th>
                <th>File Size</th>
                <th>Uploaded By</th>
                <th>Upload Date</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => (
                <tr key={doc._id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FileText size={18} color="var(--primary)" />
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-main)', maxWidth: '300px' }}>
                          {doc.documentName}
                        </div>
                        {doc.description && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', maxWidth: '300px' }}>
                            {doc.description}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="badge badge-neutral">{doc.documentType}</span>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      {doc.relatedEntityType}
                      {doc.relatedEntityName ? ` (${doc.relatedEntityName})` : ''}
                    </span>
                  </td>
                  <td>
                    <span className="font-mono" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {formatFileSize(doc.fileSize)}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.825rem' }}>{doc.uploaderName || 'System User'}</span>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {new Date(doc.uploadDate).toLocaleDateString()}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div className="table-actions" style={{ justifyContent: 'flex-end' }}>
                      <a
                        href={documentService.downloadDocumentUrl(doc._id)}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-secondary btn-sm"
                        title="Download Document"
                      >
                        <Download size={14} />
                      </a>
                      {canDelete && (
                        <button
                          className="btn btn-danger-outline btn-sm"
                          onClick={() => {
                            setSelectedDoc(doc);
                            setIsDeleteOpen(true);
                          }}
                          title="Delete Document"
                        >
                          <Trash2 size={14} />
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

      {/* Upload Modal */}
      <Modal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        title="Upload Document to BioVault"
        size="md"
      >
        {uploadError && <div className="alert alert-danger">{uploadError}</div>}
        <form onSubmit={handleUploadSubmit}>
          <div className="form-group">
            <label className="form-label">
              Select File <span className="required">*</span>
            </label>
            <input
              type="file"
              required
              className="form-control"
              onChange={handleFileChange}
              style={{ padding: '8px' }}
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              Document Display Title <span className="required">*</span>
            </label>
            <input
              type="text"
              required
              className="form-control"
              placeholder="e.g. CasX USPTO Granted Independent Claims Specification"
              value={docName}
              onChange={(e) => setDocName(e.target.value)}
            />
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Document Classification <span className="required">*</span></label>
              <select
                className="form-control"
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
              >
                <option value="Patent Application Form">Patent Application Form</option>
                <option value="Lab Notebook Extract">Lab Notebook Extract</option>
                <option value="FDA 1571 Form">FDA 1571 Form</option>
                <option value="Audit Protocol">Audit Protocol</option>
                <option value="MTA Agreement">MTA Agreement</option>
                <option value="Collaboration Charter">Collaboration Charter</option>
                <option value="Technical Specification">Technical Specification</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Related Platform Entity</label>
              <select
                className="form-control"
                value={entityType}
                onChange={(e) => setEntityType(e.target.value as RelatedEntityType)}
              >
                <option value="Patent">Patent</option>
                <option value="Project">Project</option>
                <option value="TechnologyDisclosure">Technology Disclosure</option>
                <option value="LicensingAgreement">Licensing Agreement</option>
                <option value="RegulatoryFiling">Regulatory Filing</option>
                <option value="ComplianceItem">Compliance Record</option>
                <option value="ResearchCollaboration">Research Collaboration</option>
                <option value="General">General Corporate</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Related Asset Identifier / Number</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. US-11849204-B2 or PRJ-CRISPR-01"
              value={entityName}
              onChange={(e) => setEntityName(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Description & Confidentiality Scope</label>
            <textarea
              className="form-control"
              placeholder="Summary of document contents..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="modal-footer" style={{ margin: '16px -24px -24px', padding: '16px 24px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsUploadOpen(false)}
              disabled={uploading}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={uploading}>
              {uploading ? 'Encrypting & Storing...' : 'Upload Document'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Modal */}
      <ConfirmModal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Confirm Document Deletion"
        message={`Are you sure you want to delete "${selectedDoc?.documentName}"? The physical file will be removed from disk storage.`}
        confirmText="Delete Document"
        loading={uploading}
      />
    </div>
  );
};
