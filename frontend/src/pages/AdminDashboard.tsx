import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './dashboard.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

interface Student { id: number; name: string; roll_no: string; year: number; email: string; is_candidate: boolean; }
interface Election { id: number; name: string; start_time: string; end_time: string; status: string; posts: string[]; }
interface Candidate { id: number; post: string; status: string; resume_path?: string; photo_path?: string; }

const STATUS_PILL: Record<string, string> = {
  active: 'db-pill-green',
  upcoming: 'db-pill-blue',
  completed: 'db-pill-muted',
};

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'students' | 'candidates' | 'elections'>('elections');
  const [students, setStudents] = useState<Student[]>([]);
  const [elections, setElections] = useState<Election[]>([]);
  const [pendingCandidates, setPendingCandidates] = useState<Candidate[]>([]);
  const [error, setError] = useState('');
  const [newElection, setNewElection] = useState({ name: '', start_time: '', end_time: '', posts: '' });

  const token = () => localStorage.getItem('token') || '';

  const fetchStudents = async () => {
    try {
      const res = await fetch(`${API_URL}/students/all`, { headers: { Authorization: `Bearer ${token()}` } });
      if (!res.ok) throw new Error('Access denied');
      const data = await res.json();
      setStudents([...data].sort((a, b) => a.id - b.id));
    } catch (e: any) { setError(e.message); }
  };

  const fetchElections = async () => {
    try {
      const res = await fetch(`${API_URL}/elections/`, { headers: { Authorization: `Bearer ${token()}` } });
      if (res.ok) setElections(await res.json());
    } catch { /* silent */ }
  };

  const fetchPending = async () => {
    try {
      const res = await fetch(`${API_URL}/candidates/pending`, { headers: { Authorization: `Bearer ${token()}` } });
      if (res.ok) setPendingCandidates(await res.json());
    } catch { /* silent */ }
  };

  useEffect(() => {
    if (!localStorage.getItem('token')) return navigate('/login');
    if (activeTab === 'students') fetchStudents();
    else if (activeTab === 'elections') fetchElections();
    else if (activeTab === 'candidates') fetchPending();
  }, [activeTab]);

  const handleCreateElection = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/elections/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
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
    } catch { setError('Network error'); }
  };

  const handleApprove = async (id: number) => {
    await fetch(`${API_URL}/candidates/${id}/approve`, {
      method: 'PUT', headers: { Authorization: `Bearer ${token()}` },
    });
    fetchPending();
  };

  const tabs = [
    { key: 'elections', label: 'ELECTIONS' },
    { key: 'candidates', label: 'APPROVALS' },
    { key: 'students', label: 'STUDENTS' },
  ] as const;

  return (
    <div className="db-layout">
      {/* Nav */}
      <nav className="db-nav">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button className="db-back-btn" onClick={() => navigate(-1)}>← BACK</button>
          <span className="db-nav-brand">VOTE<span>ZONE</span></span>
        </div>
        <div className="db-nav-right">
          <div className="db-badge"><span className="db-badge-dot" /> ADMIN UPLINK</div>
          <button className="db-logout" onClick={() => { localStorage.removeItem('token'); navigate('/login'); }}>
            LOGOUT
          </button>
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
                      <input className="db-input" required placeholder="e.g. Student Council 2025" value={newElection.name}
                        onChange={e => setNewElection({ ...newElection, name: e.target.value })} />
                    </div>
                    <div className="db-field">
                      <label className="db-label">POSTS <span style={{opacity:0.5, fontWeight:400}}></span></label>
                      <input className="db-input" placeholder="President, Secretary"
                        required value={newElection.posts}
                        onChange={e => setNewElection({ ...newElection, posts: e.target.value })} />
                    </div>
                    <div className="db-field">
                      <label className="db-label">START TIME</label>
                      <input className="db-input" type="datetime-local" required value={newElection.start_time}
                        onChange={e => setNewElection({ ...newElection, start_time: e.target.value })} />
                    </div>
                    <div className="db-field">
                      <label className="db-label">END TIME</label>
                      <input className="db-input" type="datetime-local" required value={newElection.end_time}
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
                <span style={{ marginLeft: 'auto', fontFamily: 'Electrolize', fontSize: '0.7rem',
                  color: 'rgba(125,211,252,0.5)', fontWeight: 400, letterSpacing: 1 }}>
                  {elections.length} record{elections.length !== 1 ? 's' : ''}
                </span>
              </div>
              {elections.length === 0 ? (
                <div className="db-empty">No elections created yet</div>
              ) : (
                <table className="db-table">
                  <thead>
                    <tr>
                      <th>NAME</th>
                      <th>STATUS</th>
                      <th>POSTS</th>
                      <th>START</th>
                      <th>END</th>
                    </tr>
                  </thead>
                  <tbody>
                    {elections.map(e => (
                      <tr key={e.id}>
                        <td style={{ fontWeight: 600 }}>{e.name}</td>
                        <td><span className={`db-pill ${STATUS_PILL[e.status] ?? 'db-pill-muted'}`}>{e.status.toUpperCase()}</span></td>
                        <td style={{ color: '#7dd3fc', fontSize: '0.82rem' }}>{e.posts?.join(' · ')}</td>
                        <td style={{ color: 'rgba(125,211,252,0.55)', fontSize: '0.8rem' }}>{new Date(e.start_time).toLocaleString()}</td>
                        <td style={{ color: 'rgba(125,211,252,0.55)', fontSize: '0.8rem' }}>{new Date(e.end_time).toLocaleString()}</td>
                      </tr>
                    ))}
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
                    <th>CANDIDATE ID</th>
                    <th>POST APPLIED</th>
                    <th>MANIFESTO</th>
                    <th>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingCandidates.map(c => (
                    <tr key={c.id}>
                      <td style={{ color: 'rgba(125,211,252,0.6)', fontFamily: 'Rajdhani', fontWeight: 600 }}>#{c.id}</td>
                      <td><span className="db-pill db-pill-blue">{c.post}</span></td>
                      <td>
                        {c.resume_path
                          ? <a href={`${API_URL}/uploads/${c.resume_path}`} target="_blank" rel="noreferrer"
                              style={{ color: '#38bdf8', fontSize: '0.82rem', textDecoration: 'none', borderBottom: '1px solid rgba(56,189,248,0.3)' }}>View PDF ↗</a>
                          : <span style={{ color: 'rgba(125,211,252,0.35)', fontSize: '0.82rem' }}>Not uploaded</span>}
                      </td>
                      <td>
                        <button className="db-btn db-btn-sm" onClick={() => handleApprove(c.id)}>APPROVE</button>
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
              <span style={{ marginLeft: 'auto', fontFamily: 'Electrolize', fontSize: '0.7rem',
                color: 'rgba(125,211,252,0.5)', fontWeight: 400, letterSpacing: 1 }}>
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
      </div>
    </div>
  );
};

export default AdminDashboard;
