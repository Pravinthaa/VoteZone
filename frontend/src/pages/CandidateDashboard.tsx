import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './dashboard.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

type Application = {
  id: number;
  election_id: number;
  post: string;
  status: 'pending' | 'approved' | 'rejected';
  photo_path: string | null;
  resume_path: string | null;
};

const STATUS_STYLE: Record<string, React.CSSProperties> = {
  pending:  { color: '#f59e0b', background: '#f59e0b22', border: '1px solid #f59e0b55' },
  approved: { color: '#22c55e', background: '#22c55e22', border: '1px solid #22c55e55' },
  rejected: { color: '#ef4444', background: '#ef444422', border: '1px solid #ef444455' },
};

const CandidateDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'apply' | 'my'>('apply');

  // ── Apply tab state ──────────────────────────────────────────────────────
  const [elections, setElections] = useState<any[]>([]);
  const [selectedElection, setSelectedElection] = useState('');
  const [selectedPost, setSelectedPost] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [resume, setResume] = useState<File | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // ── My Applications tab state ────────────────────────────────────────────
  const [myApps, setMyApps] = useState<Application[]>([]);
  const [appsLoading, setAppsLoading] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editPost, setEditPost] = useState('');
  const [editPhoto, setEditPhoto] = useState<File | null>(null);
  const [editResume, setEditResume] = useState<File | null>(null);
  const [editMsg, setEditMsg] = useState('');
  const [editErr, setEditErr] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  const token = () => localStorage.getItem('token') || '';

  // ── Bootstrap ────────────────────────────────────────────────────────────
  useEffect(() => {
    const role = localStorage.getItem('user_role');
    if (!token() || role !== 'student') {
      localStorage.removeItem('token');
      localStorage.removeItem('user_role');
      navigate('/login');
      return;
    }
    fetch(`${API_URL}/elections/`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.ok ? r.json() : [])
      .then(setElections)
      .catch(() => {});
  }, [navigate]);

  // ── Load my applications when tab switches ───────────────────────────────
  useEffect(() => {
    if (tab !== 'my') return;
    setAppsLoading(true);
    fetch(`${API_URL}/candidates/my`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.ok ? r.json() : [])
      .then(setMyApps)
      .catch(() => {})
      .finally(() => setAppsLoading(false));
  }, [tab]);

  const selectedElectionData = elections.find(e => e.id.toString() === selectedElection);

  // ── Helper: find election name by id ────────────────────────────────────
  const electionName = (id: number) => elections.find(e => e.id === id)?.name ?? `Election #${id}`;

  // ── Find posts for the election being edited ─────────────────────────────
  const editElectionPosts = (app: Application) =>
    elections.find(e => e.id === app.election_id)?.posts ?? [];

  // ── Submit new application ───────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setMessage('');
    if (!selectedElection || !selectedPost || !photo || !resume)
      return setError('All fields are required');

    const formData = new FormData();
    formData.append('election_id', selectedElection);
    formData.append('post', selectedPost);
    formData.append('photo', photo);
    formData.append('resume', resume);

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/candidates/apply`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}` },
        body: formData,
      });
      if (res.ok) {
        setMessage('Application submitted — awaiting admin approval.');
        setSelectedElection(''); setSelectedPost(''); setPhoto(null); setResume(null);
      } else {
        const d = await res.json();
        setError(d.detail || 'Submission failed');
      }
    } catch { setError('Network error'); }
    finally { setLoading(false); }
  };

  // ── Open edit panel ──────────────────────────────────────────────────────
  const openEdit = (app: Application) => {
    setEditId(app.id);
    setEditPost(app.post);
    setEditPhoto(null);
    setEditResume(null);
    setEditMsg('');
    setEditErr('');
  };

  // ── Submit edit ──────────────────────────────────────────────────────────
  const handleEdit = async (app: Application) => {
    setEditErr(''); setEditMsg('');
    const formData = new FormData();
    if (editPost && editPost !== app.post) formData.append('post', editPost);
    if (editPhoto) formData.append('photo', editPhoto);
    if (editResume) formData.append('resume', editResume);

    setEditLoading(true);
    try {
      const res = await fetch(`${API_URL}/candidates/${app.id}/edit`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token()}` },
        body: formData,
      });
      if (res.ok) {
        const updated: Application = await res.json();
        setMyApps(prev => prev.map(a => a.id === updated.id ? updated : a));
        setEditMsg('Changes saved successfully.');
        setEditId(null);
      } else {
        const d = await res.json();
        setEditErr(d.detail || 'Update failed');
      }
    } catch { setEditErr('Network error'); }
    finally { setEditLoading(false); }
  };

  // ── UI ───────────────────────────────────────────────────────────────────
  return (
    <div className="db-layout">
      {/* NAV */}
      <nav className="db-nav">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button className="db-back-btn" onClick={() => navigate(-1)}>← BACK</button>
          <span className="db-nav-brand">VOTE<span>ZONE</span></span>
        </div>
        <div className="db-nav-right">
          <div className="db-badge"><span className="db-badge-dot" /> CANDIDATE PORTAL</div>
          <button className="db-logout" onClick={() => {
            localStorage.removeItem('token');
            localStorage.removeItem('user_role');
            navigate('/login');
          }}>LOGOUT</button>
        </div>
      </nav>

      <div className="db-body" style={{ maxWidth: 600, alignSelf: 'center', width: '100%' }}>

        {/* TABS */}
        <div style={{
          display: 'flex', gap: '0', marginBottom: '1.5rem',
          border: '1px solid var(--db-border, #333)',
          borderRadius: 6, overflow: 'hidden',
        }}>
          {(['apply', 'my'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flex: 1, padding: '0.65rem 1rem',
                background: tab === t ? 'var(--db-accent, #6366f1)' : 'transparent',
                color: tab === t ? '#fff' : 'var(--db-muted, #888)',
                border: 'none', cursor: 'pointer',
                fontFamily: 'inherit', fontSize: '0.75rem', fontWeight: 700,
                letterSpacing: '0.1em', transition: 'all 0.18s',
              }}
            >
              {t === 'apply' ? '+ NEW APPLICATION' : '📋 MY APPLICATIONS'}
            </button>
          ))}
        </div>

        {/* ── TAB: APPLY ─────────────────────────────────────────────────── */}
{tab === 'apply' && (
  <div className="db-card" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
    <div className="db-card-header">CANDIDATE APPLICATION</div>
    <div className="db-card-body">
      {message && <div className="db-success" style={{ marginBottom: '1rem' }}>{message}</div>}
      {error   && <div className="db-error"   style={{ marginBottom: '1rem' }}>{error}</div>}

      <form className="db-form" onSubmit={handleSubmit}>
        <div className="db-field">
          <label className="db-label">TARGET ELECTION</label>
          <select className="db-select" required value={selectedElection}
            onChange={e => { setSelectedElection(e.target.value); setSelectedPost(''); }}>
            <option value="">— select election —</option>
            {elections.map(e => (
              <option key={e.id} value={e.id}>{e.name} · {e.status}</option>
            ))}
          </select>
        </div>

        <div className="db-field">
          <label className="db-label">TARGET POST</label>
          <select className="db-select" required value={selectedPost}
            onChange={e => setSelectedPost(e.target.value)}
            disabled={!selectedElection}>
            <option value="">— select post —</option>
            {selectedElectionData?.posts?.map((p: string) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        <div className="db-field">
          <label className="db-label">PROFILE PHOTO</label>
          <input type="file" accept="image/*" required className="db-file-input"
            onChange={e => setPhoto(e.target.files?.[0] || null)} />
        </div>

        <div className="db-field">
          <label className="db-label">MANIFESTO (PDF)</label>
          <input type="file" accept="application/pdf" required className="db-file-input"
            onChange={e => setResume(e.target.files?.[0] || null)} />
        </div>

        <button type="submit" className="db-btn db-btn-full" disabled={loading}>
          {loading ? 'SUBMITTING...' : 'SUBMIT APPLICATION'}
        </button>
      </form>
    </div>
  </div>
)}


        {/* ── TAB: MY APPLICATIONS ───────────────────────────────────────── */}
        {tab === 'my' && (
          <div className="db-card">
            <div className="db-card-header">MY APPLICATIONS</div>
            <div className="db-card-body">
              {appsLoading && (
                <p style={{ color: 'var(--db-muted, #888)', textAlign: 'center', padding: '2rem 0' }}>
                  Loading…
                </p>
              )}

              {!appsLoading && myApps.length === 0 && (
                <p style={{ color: 'var(--db-muted, #888)', textAlign: 'center', padding: '2rem 0' }}>
                  No applications yet. Use the <strong style={{ color: '#fff' }}>+ NEW APPLICATION</strong> tab to apply.
                </p>
              )}

              {!appsLoading && myApps.map(app => (
                <div key={app.id} style={{
                  border: '1px solid var(--db-border, #333)',
                  borderRadius: 8, padding: '1rem',
                  marginBottom: '1rem',
                  background: 'var(--db-surface2, rgba(255,255,255,0.03))',
                }}>
                  {/* Application header row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                        {electionName(app.election_id)}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--db-muted, #888)' }}>
                        Post: <strong style={{ color: '#fff' }}>{app.post}</strong>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <span style={{
                        fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.07em',
                        padding: '0.2rem 0.6rem', borderRadius: 4, textTransform: 'uppercase',
                        ...STATUS_STYLE[app.status],
                      }}>
                        {app.status}
                      </span>

                      {app.status === 'pending' && (
                        <button
                          className="db-btn"
                          style={{ padding: '0.25rem 0.75rem', fontSize: '0.7rem' }}
                          onClick={() => editId === app.id ? setEditId(null) : openEdit(app)}
                        >
                          {editId === app.id ? 'CANCEL' : '✏ EDIT'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Inline edit panel — only for pending */}
                  {editId === app.id && (
                    <div style={{
                      marginTop: '1rem',
                      paddingTop: '1rem',
                      borderTop: '1px solid var(--db-border, #333)',
                    }}>
                      {editMsg && <div className="db-success" style={{ marginBottom: '0.75rem' }}>{editMsg}</div>}
                      {editErr && <div className="db-error"   style={{ marginBottom: '0.75rem' }}>{editErr}</div>}

                      <div className="db-field">
                        <label className="db-label">CHANGE POST</label>
                        <select className="db-select" value={editPost}
                          onChange={e => setEditPost(e.target.value)}>
                          {editElectionPosts(app).map((p: string) => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                          {editElectionPosts(app).length === 0 && (
                            <option value={app.post}>{app.post}</option>
                          )}
                        </select>
                      </div>

                      <div className="db-field">
                        <label className="db-label">REPLACE PHOTO <span style={{ color: 'var(--db-muted,#888)', fontWeight: 400 }}>(optional)</span></label>
                        <input type="file" accept="image/*" className="db-file-input"
                          onChange={e => setEditPhoto(e.target.files?.[0] || null)} />
                      </div>

                      <div className="db-field">
                        <label className="db-label">REPLACE MANIFESTO <span style={{ color: 'var(--db-muted,#888)', fontWeight: 400 }}>(optional)</span></label>
                        <input type="file" accept="application/pdf" className="db-file-input"
                          onChange={e => setEditResume(e.target.files?.[0] || null)} />
                      </div>

                      <button
                        className="db-btn db-btn-full"
                        disabled={editLoading}
                        onClick={() => handleEdit(app)}
                      >
                        {editLoading ? 'SAVING...' : 'SAVE CHANGES'}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CandidateDashboard;