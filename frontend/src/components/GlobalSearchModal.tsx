import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, FolderKanban, FileCheck2, Lightbulb, Handshake, FileSpreadsheet, ShieldAlert, Users2 } from 'lucide-react';
import { searchService } from '../services/api';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setQuery('');
      setResults(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim()) {
      setResults(null);
      setLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await searchService.globalSearch(query.trim());
        if (res.data?.success) {
          setResults(res.data.results);
        }
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  const handleSelect = (path: string) => {
    navigate(path);
    onClose();
  };

  const hasAnyResults =
    results &&
    (results.projects?.length ||
      results.patents?.length ||
      results.disclosures?.length ||
      results.agreements?.length ||
      results.filings?.length ||
      results.compliance?.length ||
      results.collaborations?.length);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-dialog modal-lg"
        onClick={(e) => e.stopPropagation()}
        style={{ marginTop: '60px', maxHeight: '80vh' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--border-light)' }}>
          <Search size={20} color="var(--text-muted)" style={{ marginRight: '12px' }} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search patents, projects, disclosures, filings, compliance, agreements..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              border: 'none',
              outline: 'none',
              fontSize: '1rem',
              width: '100%',
              backgroundColor: 'transparent',
              color: 'var(--text-main)',
            }}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
            >
              <X size={18} />
            </button>
          )}
        </div>

        <div style={{ padding: '20px', overflowY: 'auto', maxHeight: '60vh' }}>
          {loading && (
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
              Searching across biotechnology databases...
            </div>
          )}

          {!loading && !query && (
            <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Type a title, patent number, project code, or molecule name to search across all platform entities.
            </div>
          )}

          {!loading && query && !hasAnyResults && (
            <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              No matches found for "{query}".
            </div>
          )}

          {!loading && results && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Projects */}
              {results.projects?.length > 0 && (
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FolderKanban size={14} /> Projects ({results.projects.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {results.projects.map((p: any) => (
                      <div
                        key={p._id}
                        onClick={() => handleSelect('/projects')}
                        style={{
                          padding: '10px 14px',
                          borderRadius: 'var(--radius-md)',
                          backgroundColor: '#f8fafc',
                          border: '1px solid var(--border-light)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <div>
                          <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{p.name}</span>
                          <span style={{ marginLeft: '8px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>[{p.code}]</span>
                        </div>
                        <span className="badge badge-info">{p.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Patents */}
              {results.patents?.length > 0 && (
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FileCheck2 size={14} /> Patents ({results.patents.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {results.patents.map((pat: any) => (
                      <div
                        key={pat._id}
                        onClick={() => handleSelect('/patents')}
                        style={{
                          padding: '10px 14px',
                          borderRadius: 'var(--radius-md)',
                          backgroundColor: '#f8fafc',
                          border: '1px solid var(--border-light)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <div>
                          <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{pat.title}</span>
                          <span style={{ marginLeft: '8px', fontSize: '0.75rem', color: 'var(--primary)' }}>({pat.patentNumber})</span>
                        </div>
                        <span className="badge badge-success">{pat.applicationStatus}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Disclosures */}
              {results.disclosures?.length > 0 && (
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Lightbulb size={14} /> Technology Disclosures ({results.disclosures.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {results.disclosures.map((d: any) => (
                      <div
                        key={d._id}
                        onClick={() => handleSelect('/disclosures')}
                        style={{
                          padding: '10px 14px',
                          borderRadius: 'var(--radius-md)',
                          backgroundColor: '#f8fafc',
                          border: '1px solid var(--border-light)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <div>
                          <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{d.title}</span>
                          <span style={{ marginLeft: '8px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>[{d.disclosureId}]</span>
                        </div>
                        <span className="badge badge-warning">{d.reviewStatus}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Regulatory Filings */}
              {results.filings?.length > 0 && (
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FileSpreadsheet size={14} /> Regulatory Filings ({results.filings.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {results.filings.map((f: any) => (
                      <div
                        key={f._id}
                        onClick={() => handleSelect('/filings')}
                        style={{
                          padding: '10px 14px',
                          borderRadius: 'var(--radius-md)',
                          backgroundColor: '#f8fafc',
                          border: '1px solid var(--border-light)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <div>
                          <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{f.filingName}</span>
                          <span style={{ marginLeft: '8px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>({f.regulatoryAuthority})</span>
                        </div>
                        <span className="badge badge-info">{f.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Compliance */}
              {results.compliance?.length > 0 && (
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ShieldAlert size={14} /> Compliance Records ({results.compliance.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {results.compliance.map((c: any) => (
                      <div
                        key={c._id}
                        onClick={() => handleSelect('/compliance')}
                        style={{
                          padding: '10px 14px',
                          borderRadius: 'var(--radius-md)',
                          backgroundColor: '#f8fafc',
                          border: '1px solid var(--border-light)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <div>
                          <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{c.complianceItem}</span>
                          <span style={{ marginLeft: '8px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>({c.category})</span>
                        </div>
                        <span className="badge badge-danger">{c.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
