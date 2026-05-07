import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminSocket } from '../components/adminsocket';
import './dashboard.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

interface Student {
  id: number;
  name: string;
  roll_no: string;
  year: number;
  email: string;
  is_candidate: boolean;
}

interface Election {
  id: number;
  name: string;
  start_time: string;
  end_time: string;
  status: string;
  posts: string[];
}

interface Candidate {
  id: number;
  post: string;
  status: string;
  resume_path?: string;
  photo_path?: string;
  student_name?: string;
  student_roll_no?: string;
}

interface Voter {
  id: number;
  name: string;
  roll_no: string;
}

interface LiveCount {
  candidate_name: string;
  post: string;
  votes: number;
}

// ── Tab type now includes all 7 keys ──────────────────────────────────────────
type TabKey = 'elections' | 'candidates' | 'all_candidates' | 'students' | 'voters' | 'non_voters' | 'live_counts';

const STATUS_PILL: Record<string, string> = {
  active: 'db-pill-green',
  upcoming: 'db-pill-blue',
  completed: 'db-pill-muted',
};

const CANDIDATE_STATUS_PILL: Record<string, string> = {
  approved: 'db-pill-green',
  pending: 'db-pill-blue',
  rejected: 'db-pill-red',
};

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabKey>('elections');
  const [students, setStudents] = useState<Student[]>([]);
  const [elections, setElections] = useState<Election[]>([]);
  const [pendingCandidates, setPendingCandidates] = useState<Candidate[]>([]);
  const [allCandidates, setAllCandidates] = useState<Candidate[]>([]);
  const [error, setError] = useState('');
  const [newElection, setNewElection] = useState({ name: '', start_time: '', end_time: '', posts: '' });

  // ── Voters / Non-voters / Live-counts state ───────────────────────────────
  const [selectedElectionId, setSelectedElectionId] = useState<number | ''>('');
  const [voters, setVoters] = useState<Voter[]>([]);
  const [nonVoters, setNonVoters] = useState<Voter[]>([]);
  const [liveCounts, setLiveCounts] = useState<LiveCount[]>([]);
  const [subLoading, setSubLoading] = useState(false);
const [activeElectionForSocket, setActiveElectionForSocket] = useState<number | null>(null);

  // ── Duration-edit state ───────────────────────────────────────────────────
  const [editingDuration, setEditingDuration] = useState<Record<number, { start: string; end: string }>>({});

  const token = () => localStorage.getItem('token') || '';
  const authHeaders = () => ({ Authorization: `Bearer ${token()}` });

  const fetchStudents = async () => {
    try {
      const res = await fetch(`${API_URL}/students/all`, { headers: authHeaders() });
      if (!res.ok) throw new Error('Access denied');
      const data = await res.json();
      setStudents([...data].sort((a: Student, b: Student) => a.id - b.id));
    } catch (e: any) {
      setError(e.message);
    }
  };

  const fetchElections = async () => {
    try {
      const res = await fetch(`${API_URL}/elections/`, { headers: authHeaders() });
      if (res.ok) setElections(await res.json());
    } catch { /* silent */ }
  };

  const fetchPending = async () => {
    try {
      const res = await fetch(`${API_URL}/candidates/pending`, { headers: authHeaders() });
      const data = await res.json();
      if (res.ok) setPendingCandidates(data);
    } catch (e) {
      console.error('fetchPending error:', e);
    }
  };

  const fetchAllCandidates = async () => {
    try {
      const res = await fetch(`${API_URL}/candidates/all`, { headers: authHeaders() });
      const data = await res.json();
      if (res.ok) setAllCandidates(data);
    } catch (e) {
      console.error('fetchAllCandidates error:', e);
    }
  };

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const role = localStorage.getItem('user_role');

    if (!storedToken || role !== 'admin') {
      localStorage.removeItem('token');
      localStorage.removeItem('user_role');
      navigate('/login');
      return;
    }

    if (activeTab === 'students') fetchStudents();
    else if (activeTab === 'elections') fetchElections();
    else if (activeTab === 'candidates') fetchPending();
    else if (activeTab === 'all_candidates') fetchAllCandidates();
    // voters / non_voters / live_counts need an election selected — fetch elections list for the picker
    else if (['voters', 'non_voters', 'live_counts'].includes(activeTab)) fetchElections();
  }, [activeTab, navigate]);

  // ── Fetch sub-data when election picker changes ───────────────────────────
  useEffect(() => {
    if (!selectedElectionId) return;

    const id = selectedElectionId as number;

    const load = async () => {
      setSubLoading(true);
      try {
        if (activeTab === 'voters') {
          const res = await fetch(`${API_URL}/admins/elections/${id}/voters`, { headers: authHeaders() });
          setVoters(res.ok ? await res.json() : []);
        } else if (activeTab === 'non_voters') {
          const res = await fetch(`${API_URL}/admins/elections/${id}/non-voters`, { headers: authHeaders() });
          setNonVoters(res.ok ? await res.json() : []);
        } else if (activeTab === 'live_counts') {
  const electionObj = elections.find(el => el.id === id);
  
  if (electionObj?.status === 'active') {
    // Socket will handle it — just set the election for the hook
    setActiveElectionForSocket(id);
    setSubLoading(false);
  } else {
    // Completed/stopped/declared — fetch results
    setActiveElectionForSocket(null);
    const res = await fetch(`${API_URL}/admins/elections/${id}/live-counts`, { headers: authHeaders() });
    const data = res.ok ? await res.json() : { tally: [] };
    setLiveCounts(data.tally ?? []);
  }
}
      } finally {
        setSubLoading(false);
      }
    };

    load();
  }, [selectedElectionId, activeTab]);
const { requestCounts } = useAdminSocket(
  activeElectionForSocket,
  () => { /* vote_update fires — requestCounts will push fresh tally */ },
  (counts: Record<string, { candidate_id: number; candidate_name: string; votes: number }[]>) => {
    // Flatten the grouped object into LiveCount[]
    const flat: LiveCount[] = Object.entries(counts).flatMap(([post, candidates]) =>
      candidates.map(c => ({ candidate_name: c.candidate_name, post, votes: c.votes }))
    );
    setLiveCounts(flat);
    setSubLoading(false);
  }
);

// Request initial counts when socket election changes
useEffect(() => {
  if (activeElectionForSocket) {
    setSubLoading(true);
    setTimeout(() => requestCounts(), 300); // slight delay for socket to join room
  }
}, [activeElectionForSocket]);

  // Reset picker when switching tabs
  useEffect(() => {
    setSelectedElectionId('');
    setVoters([]);
    setNonVoters([]);
    setLiveCounts([]);
  }, [activeTab]);

  const handleCreateElection = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/elections/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          name: newElection.name,
          start_time: new Date(newElection.start_time).toISOString(),
          end_time: new Date(newElection.end_time).toISOString(),
          posts: newElection.posts.split(',').map(p => p.trim()).filter(Boolean),
        }),
      });
      if (res.ok) {
        setNewElection({ name: '', start_time: '', end_time: '', posts: '' });
        fetchElections();
      } else {
        const d = await res.json();
        setError(d.detail || 'Failed to create election');
      }
    } catch {
      setError('Network error');
    }
  };

  const handleApprove = async (id: number) => {
    await fetch(`${API_URL}/candidates/${id}/approve`, { method: 'PUT', headers: authHeaders() });
    fetchPending();
  };

  const handleReject = async (id: number) => {
    await fetch(`${API_URL}/candidates/${id}/reject`, { method: 'PUT', headers: authHeaders() });
    fetchPending();
  };

  const handleForceReject = async (id: number) => {
    await fetch(`${API_URL}/candidates/${id}/reject`, { method: 'PUT', headers: authHeaders() });
    fetchAllCandidates();
  };

  const handleResetTopending = async (id: number) => {
    await fetch(`${API_URL}/candidates/${id}/reset`, { method: 'PUT', headers: authHeaders() });
    fetchAllCandidates();
  };

  // ── Duration edit helpers ─────────────────────────────────────────────────
  const toLocalDatetime = (iso: string) => {
    // Convert ISO string → datetime-local value (strips seconds / TZ for the input)
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const startEditDuration = (e: Election) => {
    setEditingDuration(prev => ({
      ...prev,
      [e.id]: { start: toLocalDatetime(e.start_time), end: toLocalDatetime(e.end_time) },
    }));
  };

  const cancelEditDuration = (id: number) => {
    setEditingDuration(prev => { const next = { ...prev }; delete next[id]; return next; });
  };

  const updateElectionDuration = async (id: number) => {
    const draft = editingDuration[id];
    if (!draft) return;
    try {
      const res = await fetch(`${API_URL}/admins/elections/${id}/duration`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          start_time: new Date(draft.start).toISOString(),
          end_time: new Date(draft.end).toISOString(),
        }),
      });
      if (res.ok) {
        cancelEditDuration(id);
        fetchElections();
      } else {
        const d = await res.json();
        setError(d.detail || 'Failed to update election duration');
      }
    } catch {
      setError('Network error');
    }
  };

  const deleteElection = async (id: number) => {
    await fetch(`${API_URL}/elections/delete/${id}`, { method: 'DELETE', headers: authHeaders() });
    fetchElections();
  };

  const declareResults = async (id: number) => {
  try {
    const res = await fetch(`${API_URL}/admins/results/${id}/declare`, {
      method: 'PUT',
      headers: authHeaders()
    });
    if (!res.ok) {
      const d = await res.json();
      alert(d.detail || 'Failed to declare results');
      return;
    }
    fetchElections();
  } catch {
    alert('Network error');
  }
};

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user_role');
    navigate('/login');
  };



  const tabs: { key: TabKey; label: string }[] = [
    { key: 'elections', label: 'ELECTIONS' },
    { key: 'candidates', label: 'APPROVALS' },
    { key: 'all_candidates', label: 'CANDIDATES' },
    { key: 'students', label: 'STUDENTS' },
    { key: 'voters', label: 'VOTERS' },
    { key: 'non_voters', label: 'NON‑VOTERS' },
    { key: 'live_counts', label: 'LIVE COUNTS' },
  ];

  // ── Shared election picker (for voters / non_voters / live_counts) ─────────
  const ElectionPicker = () => (
    <div className="db-field" style={{ marginBottom: '1.5rem', maxWidth: 360 }}>
      <label className="db-label">SELECT ELECTION</label>
      <select
        className="db-input"
        value={selectedElectionId}
        onChange={e => setSelectedElectionId(e.target.value ? Number(e.target.value) : '')}
      >
        <option value="">— choose an election —</option>
        {elections.map(el => (
          <option key={el.id} value={el.id}>{el.name}</option>
        ))}
      </select>
    </div>
  );

  return (
    <div className="db-layout">

      {/* Nav */}
      <nav className="db-nav">
        <span className="db-nav-brand">VOTE<span>ZONE</span></span>
        <div className="db-nav-right">
          <div className="db-badge"><span className="db-badge-dot" /> ADMIN UPLINK</div>
          <button className="db-logout" onClick={handleLogout}>LOGOUT</button>
        </div>
      </nav>

      {/* Tabs */}
      <div className="db-tabs">
        {tabs.map(t => (
          <button key={t.key} className={`db-tab ${activeTab === t.key ? 'active' : ''}`} onClick={() => setActiveTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="db-body">
        {error && <div className="db-error">{error}</div>}

        {/* ── ELECTIONS ── */}
        {activeTab === 'elections' && (
          <>
            <div className="db-card">
              <div className="db-card-header">INITIALIZE NEW ELECTION</div>
              <div className="db-card-body">
                <form className="db-form" onSubmit={handleCreateElection}>
                  <div className="db-grid-2">
                    <div className="db-field">
                      <label className="db-label">ELECTION NAME</label>
                      <input className="db-input" required placeholder="e.g. Student Council 2025"
                        value={newElection.name}
                        onChange={e => setNewElection({ ...newElection, name: e.target.value })} />
                    </div>
                    <div className="db-field">
                      <label className="db-label">POSTS</label>
                      <input className="db-input" required placeholder="President, Secretary"
                        value={newElection.posts}
                        onChange={e => setNewElection({ ...newElection, posts: e.target.value })} />
                    </div>
                    <div className="db-field">
                      <label className="db-label">START TIME</label>
                      <input className="db-input" type="datetime-local" required
                        value={newElection.start_time}
                        onChange={e => setNewElection({ ...newElection, start_time: e.target.value })} />
                    </div>
                    <div className="db-field">
                      <label className="db-label">END TIME</label>
                      <input className="db-input" type="datetime-local" required
                        value={newElection.end_time}
                        onChange={e => setNewElection({ ...newElection, end_time: e.target.value })} />
                    </div>
                  </div>
                  <button type="submit" className="db-btn db-btn-full">CREATE ELECTION</button>
                </form>
              </div>
            </div>

            <div className="db-card">
              <div className="db-card-header">
                ALL ELECTIONS
                <span style={{ marginLeft: 'auto', fontFamily: 'Electrolize', fontSize: '0.7rem', color: 'rgba(125,211,252,0.5)', fontWeight: 400, letterSpacing: 1 }}>
                  {elections.length} record{elections.length !== 1 ? 's' : ''}
                </span>
              </div>
              {elections.length === 0 ? (
                <div className="db-empty">No elections created yet</div>
              ) : (
                <table className="db-table">
                  <thead>
                    <tr>
                      <th>NAME</th><th>STATUS</th><th>POSTS</th><th>START</th><th>END</th><th>ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {elections.map(e => {
                      const draft = editingDuration[e.id];
                      return (
                        <tr key={e.id}>
                          <td style={{ fontWeight: 600 }}>{e.name}</td>
                          <td>
                            <span className={`db-pill ${STATUS_PILL[e.status] ?? 'db-pill-muted'}`}>
                              {e.status.toUpperCase()}
                            </span>
                          </td>
                          <td style={{ color: '#7dd3fc', fontSize: '0.82rem' }}>{e.posts?.join(' · ')}</td>

                          {/* ── Inline duration editor ── */}
                          {draft ? (
                            <>
                              <td>
                                <input
                                  className="db-input"
                                  type="datetime-local"
                                  value={draft.start}
                                  onChange={ev => setEditingDuration(prev => ({ ...prev, [e.id]: { ...prev[e.id], start: ev.target.value } }))}
                                  style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                                />
                              </td>
                              <td>
                                <input
                                  className="db-input"
                                  type="datetime-local"
                                  value={draft.end}
                                  onChange={ev => setEditingDuration(prev => ({ ...prev, [e.id]: { ...prev[e.id], end: ev.target.value } }))}
                                  style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                                />
                              </td>
                            </>
                          ) : (
                            <>
                              <td style={{ color: 'rgba(125,211,252,0.55)', fontSize: '0.8rem' }}>
                                {new Date(e.start_time).toLocaleString()}
                              </td>
                              <td style={{ color: 'rgba(125,211,252,0.55)', fontSize: '0.8rem' }}>
                                {new Date(e.end_time).toLocaleString()}
                              </td>
                            </>
                          )}

                          <td style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <button
                              className="db-btn db-btn-sm"
                              style={{ background: 'rgba(239,68,68,0.2)', color: '#ef4444', borderColor: 'rgba(239,68,68,0.4)' }}
                              onClick={() => deleteElection(e.id)}
                            >
                              DELETE
                            </button>
                            {draft ? (
                              <>
                                <button className="db-btn db-btn-sm" onClick={() => updateElectionDuration(e.id)}>
                                  SAVE
                                </button>
                                <button
                                  className="db-btn db-btn-sm"
                                  style={{ background: 'rgba(100,116,139,0.2)', color: '#94a3b8', borderColor: 'rgba(100,116,139,0.3)' }}
                                  onClick={() => cancelEditDuration(e.id)}
                                >
                                  CANCEL
                                </button>
                              </>
                            ) : (
                              <button className="db-btn db-btn-sm" onClick={() => startEditDuration(e)}>
                                EDIT DURATION
                              </button>
                            )}
                            {(e.status === 'completed' || e.status === 'stopped') && (
                              <button
                                className="db-btn db-btn-sm"
                                style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e', borderColor: 'rgba(34,197,94,0.35)' }}
                                onClick={() => declareResults(e.id)}
                              >
                                DECLARE
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {/* ── CANDIDATE APPROVALS ── */}
        {activeTab === 'candidates' && (
          <div className="db-card">
            <div className="db-card-header">
              PENDING APPROVALS
              {pendingCandidates.length > 0 && (
                <span style={{ marginLeft: 'auto', background: 'rgba(251,113,133,0.15)', color: '#fb7185',
                  border: '1px solid rgba(251,113,133,0.3)', borderRadius: 20, padding: '0.1rem 0.6rem',
                  fontFamily: 'Rajdhani', fontSize: '0.7rem', fontWeight: 700 }}>
                  {pendingCandidates.length} PENDING
                </span>
              )}
            </div>
            {pendingCandidates.length === 0 ? (
              <div className="db-empty">No pending applications — all clear</div>
            ) : (
              <table className="db-table">
                <thead>
                  <tr>
                    <th>STUDENT</th><th>ROLL NO</th><th>POST APPLIED</th><th>MANIFESTO</th><th>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingCandidates.map(c => (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 600, color: '#e0f2fe' }}>{c.student_name ?? '—'}</td>
                      <td style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '0.82rem', color: '#7dd3fc', letterSpacing: '1px' }}>
                        {c.student_roll_no?.toUpperCase() ?? '—'}
                      </td>
                      <td><span className="db-pill db-pill-blue">{c.post}</span></td>
                      <td>
                        {c.resume_path
                          ? <a href={`${API_URL}/uploads/${c.resume_path}`} target="_blank" rel="noreferrer"
                              style={{ color: '#38bdf8', fontSize: '0.82rem', textDecoration: 'none', borderBottom: '1px solid rgba(56,189,248,0.3)' }}>
                              View PDF ↗
                            </a>
                          : <span style={{ color: 'rgba(125,211,252,0.35)', fontSize: '0.82rem' }}>Not uploaded</span>}
                      </td>
                      <td style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="db-btn db-btn-sm" onClick={() => handleApprove(c.id)}>APPROVE</button>
                        <button className="db-btn db-btn-sm"
                          style={{ background: 'rgba(239,68,68,0.2)', color: '#ef4444', borderColor: 'rgba(239,68,68,0.4)' }}
                          onClick={() => handleReject(c.id)}>
                          REJECT
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ── ALL CANDIDATES ── */}
        {activeTab === 'all_candidates' && (
          <div className="db-card">
            <div className="db-card-header">
              ALL CANDIDATES
              <span style={{ marginLeft: 'auto', fontFamily: 'Electrolize', fontSize: '0.7rem', color: 'rgba(125,211,252,0.5)', fontWeight: 400, letterSpacing: 1 }}>
                {allCandidates.length} record{allCandidates.length !== 1 ? 's' : ''}
              </span>
            </div>
            {allCandidates.length === 0 ? (
              <div className="db-empty">No candidates found</div>
            ) : (
              <table className="db-table">
                <thead>
                  <tr>
                    <th>STUDENT</th><th>ROLL NO</th><th>POST</th><th>STATUS</th><th>MANIFESTO</th><th>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {allCandidates.map(c => (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 600, color: '#e0f2fe' }}>{c.student_name ?? '—'}</td>
                      <td style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '0.82rem', color: '#7dd3fc', letterSpacing: '1px' }}>
                        {c.student_roll_no?.toUpperCase() ?? '—'}
                      </td>
                      <td><span className="db-pill db-pill-blue">{c.post}</span></td>
                      <td>
                        <span className={`db-pill ${CANDIDATE_STATUS_PILL[c.status] ?? 'db-pill-muted'}`}>
                          {c.status.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        {c.resume_path
                          ? <a href={`${API_URL}/uploads/${c.resume_path}`} target="_blank" rel="noreferrer"
                              style={{ color: '#38bdf8', fontSize: '0.82rem', textDecoration: 'none', borderBottom: '1px solid rgba(56,189,248,0.3)' }}>
                              View PDF ↗
                            </a>
                          : <span style={{ color: 'rgba(125,211,252,0.35)', fontSize: '0.82rem' }}>Not uploaded</span>}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          {c.status !== 'rejected' && (
                            <button
                              className="db-btn db-btn-sm"
                              style={{ background: 'rgba(239,68,68,0.2)', color: '#ef4444', borderColor: 'rgba(239,68,68,0.4)' }}
                              onClick={() => handleForceReject(c.id)}
                            >
                              FORCE REJECT
                            </button>
                          )}
                          {c.status === 'rejected' && (
                            <button
                              className="db-btn db-btn-sm"
                              style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24', borderColor: 'rgba(251,191,36,0.35)' }}
                              onClick={() => handleResetTopending(c.id)}
                            >
                              ALLOW REAPPLY
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ── STUDENTS ── */}
        {activeTab === 'students' && (
          <div className="db-card">
            <div className="db-card-header">
              STUDENT REGISTRY
              <span style={{ marginLeft: 'auto', fontFamily: 'Electrolize', fontSize: '0.7rem', color: 'rgba(125,211,252,0.5)', fontWeight: 400, letterSpacing: 1 }}>
                {students.length} registered
              </span>
            </div>
            {students.length === 0 ? (
              <div className="db-empty">No students registered yet</div>
            ) : (
              <table className="db-table">
                <thead>
                  <tr><th>ID</th><th>NAME</th><th>ROLL NO</th><th>YEAR</th><th>ROLE</th></tr>
                </thead>
                <tbody>
                  {students.map(s => (
                    <tr key={s.id}>
                      <td style={{ color: 'rgba(125,211,252,0.55)', fontFamily: 'Rajdhani', fontWeight: 600 }}>#{s.id}</td>
                      <td style={{ fontWeight: 600, color: '#e0f2fe' }}>{s.name}</td>
                      <td style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '0.82rem', color: '#7dd3fc', letterSpacing: '1px' }}>{s.roll_no.toUpperCase()}</td>
                      <td style={{ color: 'rgba(125,211,252,0.6)' }}>Year {s.year}</td>
                      <td>
                        <span className={`db-pill ${s.is_candidate ? 'db-pill-red' : 'db-pill-green'}`}>
                          {s.is_candidate ? 'CANDIDATE' : 'VOTER'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ── VOTERS ── */}
        {activeTab === 'voters' && (
          <div className="db-card">
            <div className="db-card-header">
              VOTERS
              {selectedElectionId && !subLoading && (
                <span style={{ marginLeft: 'auto', fontFamily: 'Electrolize', fontSize: '0.7rem', color: 'rgba(125,211,252,0.5)', fontWeight: 400, letterSpacing: 1 }}>
                  {voters.length} voted
                </span>
              )}
            </div>
            <div className="db-card-body">
              <ElectionPicker />
              {subLoading && <div className="db-empty">Loading…</div>}
              {!subLoading && selectedElectionId && voters.length === 0 && (
                <div className="db-empty">No votes cast yet for this election</div>
              )}
              {!subLoading && voters.length > 0 && (
                <table className="db-table">
                  <thead><tr><th>NAME</th><th>ROLL NO</th></tr></thead>
                  <tbody>
                    {voters.map(v => (
                      <tr key={v.id}>
                        <td style={{ fontWeight: 600, color: '#e0f2fe' }}>{v.name}</td>
                        <td style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '0.82rem', color: '#7dd3fc', letterSpacing: '1px' }}>
                          {v.roll_no.toUpperCase()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ── NON-VOTERS ── */}
        {activeTab === 'non_voters' && (
          <div className="db-card">
            <div className="db-card-header">
              NON‑VOTERS
              {selectedElectionId && !subLoading && (
                <span style={{ marginLeft: 'auto', fontFamily: 'Electrolize', fontSize: '0.7rem', color: 'rgba(125,211,252,0.5)', fontWeight: 400, letterSpacing: 1 }}>
                  {nonVoters.length} haven't voted
                </span>
              )}
            </div>
            <div className="db-card-body">
              <ElectionPicker />
              {subLoading && <div className="db-empty">Loading…</div>}
              {!subLoading && selectedElectionId && nonVoters.length === 0 && (
                <div className="db-empty">Everyone has voted in this election 🎉</div>
              )}
              {!subLoading && nonVoters.length > 0 && (
                <table className="db-table">
                  <thead><tr><th>NAME</th><th>ROLL NO</th></tr></thead>
                  <tbody>
                    {nonVoters.map(v => (
                      <tr key={v.id}>
                        <td style={{ fontWeight: 600, color: '#e0f2fe' }}>{v.name}</td>
                        <td style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '0.82rem', color: '#fb7185', letterSpacing: '1px' }}>
                          {v.roll_no.toUpperCase()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ── LIVE COUNTS ── */}
        {activeTab === 'live_counts' && (
  <div className="db-card">
    <div className="db-card-header">
      {(() => {
        const sel = elections.find(el => el.id === selectedElectionId);
        if (!sel) return 'LIVE VOTE COUNTS';
        if (sel.status === 'active') return (
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="db-badge-dot" style={{ background: '#34d399' }} />
            LIVE COUNTS
          </span>
        );
        return 'FINAL RESULTS';
      })()}
      {selectedElectionId && !subLoading && (
        <span style={{ marginLeft: 'auto', fontFamily: 'Electrolize', fontSize: '0.7rem', color: 'rgba(125,211,252,0.5)', fontWeight: 400, letterSpacing: 1 }}>
          {liveCounts.length} entries
        </span>
      )}
    </div>
    <div className="db-card-body">
      <ElectionPicker />
      {subLoading && <div className="db-empty">Loading…</div>}
      {!subLoading && selectedElectionId && liveCounts.length === 0 && (
        <div className="db-empty">No vote data available yet</div>
      )}
      {!subLoading && liveCounts.length > 0 && (() => {
        const sel = elections.find(el => el.id === selectedElectionId);
        const isActive = sel?.status === 'active';

        // Group by post
        const grouped = liveCounts.reduce<Record<string, LiveCount[]>>((acc, row) => {
          if (!acc[row.post]) acc[row.post] = [];
          acc[row.post].push(row);
          return acc;
        }, {});

        return isActive ? (
          // ── Active: simple live table ──
          <table className="db-table">
            <thead><tr><th>CANDIDATE</th><th>POST</th><th>VOTES</th></tr></thead>
            <tbody>
              {liveCounts
                .slice()
                .sort((a, b) => b.votes - a.votes)
                .map((row, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600, color: '#e0f2fe' }}>{row.candidate_name}</td>
                    <td><span className="db-pill db-pill-blue">{row.post}</span></td>
                    <td>
                      <span style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '1.05rem', color: '#22c55e', letterSpacing: 1 }}>
                        {row.votes}
                      </span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        ) : (
          // ── Completed: results view like voter dashboard ──
          <div>
            {Object.entries(grouped).map(([post, candidates]) => {
              const sorted = [...candidates].sort((a, b) => b.votes - a.votes);
              const total = sorted.reduce((s, r) => s + r.votes, 0);
              return (
                <div key={post} style={{ marginBottom: '1.5rem' }}>
                  <div style={{ fontFamily: 'Rajdhani', fontSize: '0.7rem', letterSpacing: '2px', color: 'var(--accent-main)', marginBottom: '0.6rem' }}>
                    {post}
                    <span style={{ marginLeft: '1rem', color: 'rgba(125,211,252,0.4)', fontSize: '0.65rem' }}>
                      ({total} TOTAL VOTES)
                    </span>
                  </div>
                  {sorted.map((r, idx) => {
                    const pct = total > 0 ? Math.round((r.votes / total) * 100) : 0;
                    return (
                      <div key={r.candidate_name} style={{ marginBottom: '0.6rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#e0f2fe', fontSize: '0.85rem' }}>
                            {idx === 0 && total > 0 && (
                              <span style={{ fontSize: '0.6rem', background: '#22c55e', color: '#000', padding: '0.1rem 0.4rem', borderRadius: '2px', fontFamily: 'Rajdhani', letterSpacing: '1px' }}>
                                WINNER
                              </span>
                            )}
                            {r.candidate_name}
                          </span>
                          <span style={{ fontFamily: 'Rajdhani', fontWeight: 700, color: '#22c55e', fontSize: '0.9rem' }}>
                            {r.votes} VOTES ({pct}%)
                          </span>
                        </div>
                        <div style={{ height: '4px', background: 'rgba(125,211,252,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: idx === 0 ? '#22c55e' : 'rgba(125,211,252,0.3)', borderRadius: '2px', transition: 'width 0.6s ease' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        );
      })()}
    </div>
  </div>
)}

      </div>
    </div>
  );
};

export default AdminDashboard;