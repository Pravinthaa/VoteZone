import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../components/Login.css';

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
}

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>([]);
  const [elections, setElections] = useState<Election[]>([]);
  const [pendingCandidates, setPendingCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [activeTab, setActiveTab] = useState<'students' | 'candidates' | 'elections'>('students');

  const [newElection, setNewElection] = useState({
    name: '',
    start_time: '',
    end_time: '',
    posts: ''
  });

  const fetchStudents = async () => {
    const token = localStorage.getItem('token');
    if (!token) return navigate('/login');
    try {
      const res = await fetch(`${API_URL}/students/all`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to fetch students. Root access required.');
      setStudents(await res.json());
    } catch (err: any) { setError(err.message); }
  };

  const fetchElections = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/elections/`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) setElections(await res.json());
    } catch (err: any) { console.error(err); }
  };

  const fetchPendingCandidates = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/candidates/pending`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) setPendingCandidates(await res.json());
    } catch (err: any) { console.error(err); }
  };

  useEffect(() => {
    setLoading(true);
    if (activeTab === 'students') fetchStudents();
    else if (activeTab === 'elections') fetchElections();
    else if (activeTab === 'candidates') fetchPendingCandidates();
    setLoading(false);
  }, [activeTab]);

  const handleCreateElection = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const postsArray = newElection.posts.split(',').map(p => p.trim()).filter(p => p);
    
    try {
      const res = await fetch(`${API_URL}/elections/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newElection.name,
          start_time: new Date(newElection.start_time).toISOString(),
          end_time: new Date(newElection.end_time).toISOString(),
          posts: postsArray
        })
      });
      if (res.ok) {
        setNewElection({ name: '', start_time: '', end_time: '', posts: '' });
        fetchElections();
      } else {
        const data = await res.json();
        alert(data.detail || 'Failed to create election');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleApproveCandidate = async (id: number) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/candidates/${id}/approve`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) fetchPendingCandidates();
    } catch (err) { console.error(err); }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <div className="csea-layout">
      <div className="cyber-ring ring-1"></div>
      <div className="cyber-ring ring-2"></div>
      <div className="csea-container" style={{ maxWidth: '1000px', width: '90%', minHeight: '600px', padding: '3rem' }}>
        <div className="panel-header" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 className="glitch-title" style={{ textAlign: 'left', marginBottom: '0.5rem' }}>ADMIN PROTOCOL</h1>
            <div className="status-indicator" style={{ display: 'flex' }}><span className="blink-dot"></span> ROOT ACCESS GRANTED</div>
          </div>
          <button onClick={handleLogout} className="cyber-btn" style={{ padding: '0.8rem 1.5rem' }}>TERMINATE SESSION</button>
        </div>

        <div className="panel-body">
          {error && <div className="error-box" style={{ marginBottom: '2rem' }}><i className="ri-error-warning-line"></i> {error}</div>}
          
          <div className="admin-tabs" style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem' }}>
            <button onClick={() => setActiveTab('students')} className={`cyber-btn ${activeTab === 'students' ? 'active-tab' : ''}`} style={{ flex: 1, opacity: activeTab === 'students' ? 1 : 0.5 }}>STUDENT DATABASE</button>
            <button onClick={() => setActiveTab('candidates')} className={`cyber-btn ${activeTab === 'candidates' ? 'active-tab' : ''}`} style={{ flex: 1, opacity: activeTab === 'candidates' ? 1 : 0.5 }}>CANDIDATE APPROVALS</button>
            <button onClick={() => setActiveTab('elections')} className={`cyber-btn ${activeTab === 'elections' ? 'active-tab' : ''}`} style={{ flex: 1, opacity: activeTab === 'elections' ? 1 : 0.5 }}>ELECTION MGMT</button>
          </div>

          {activeTab === 'students' && (
            <div className="table-container" style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', borderRadius: '8px', overflow: 'auto', maxHeight: '400px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', color: 'var(--text-main)' }}>
                <thead style={{ background: 'rgba(3,7,18,0.95)' }}>
                  <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                    <th style={{ padding: '1rem', color: 'var(--accent-main)' }}>ID</th>
                    <th style={{ padding: '1rem', color: 'var(--accent-main)' }}>NAME</th>
                    <th style={{ padding: '1rem', color: 'var(--accent-main)' }}>ROLL NO</th>
                    <th style={{ padding: '1rem', color: 'var(--accent-main)' }}>ROLE</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map(s => (
                    <tr key={s.id} style={{ borderBottom: '1px solid rgba(56,189,248,0.05)' }}>
                      <td style={{ padding: '1rem' }}>{s.id}</td>
                      <td style={{ padding: '1rem' }}>{s.name}</td>
                      <td style={{ padding: '1rem' }}>{s.roll_no}</td>
                      <td style={{ padding: '1rem' }}>{s.is_candidate ? 'CANDIDATE' : 'VOTER'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'candidates' && (
            <div className="table-container" style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', borderRadius: '8px', padding: '1rem' }}>
              {pendingCandidates.length === 0 ? <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>NO PENDING CANDIDATES</p> : (
                <table style={{ width: '100%', textAlign: 'left', color: 'var(--text-main)' }}>
                  <thead>
                    <tr>
                      <th style={{ padding: '1rem' }}>ID</th>
                      <th style={{ padding: '1rem' }}>POST</th>
                      <th style={{ padding: '1rem' }}>MANIFESTO</th>
                      <th style={{ padding: '1rem' }}>ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingCandidates.map(c => (
                      <tr key={c.id}>
                        <td style={{ padding: '1rem' }}>{c.id}</td>
                        <td style={{ padding: '1rem' }}>{c.post}</td>
                        <td style={{ padding: '1rem' }}>{c.resume_path ? <a href={`${API_URL}/uploads/${c.resume_path}`} target="_blank" rel="noreferrer" style={{color: 'var(--accent-main)'}}>View PDF</a> : 'N/A'}</td>
                        <td style={{ padding: '1rem' }}><button onClick={() => handleApproveCandidate(c.id)} className="cyber-btn" style={{ padding: '0.4rem 1rem' }}>APPROVE</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {activeTab === 'elections' && (
            <div>
              <form onSubmit={handleCreateElection} className="cyber-form" style={{ marginBottom: '2rem', padding: '1.5rem', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--glass-border)', borderRadius: '8px' }}>
                <h3 style={{ color: 'var(--accent-main)', marginBottom: '1rem' }}>INITIALIZE NEW ELECTION</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div className="input-group">
                    <label>ELECTION NAME</label>
                    <input type="text" required value={newElection.name} onChange={e => setNewElection({...newElection, name: e.target.value})} />
                  </div>
                  <div className="input-group">
                    <label>POSTS (Comma separated)</label>
                    <input type="text" placeholder="President, Vice President" required value={newElection.posts} onChange={e => setNewElection({...newElection, posts: e.target.value})} />
                  </div>
                  <div className="input-group">
                    <label>START TIME (Local)</label>
                    <input type="datetime-local" required value={newElection.start_time} onChange={e => setNewElection({...newElection, start_time: e.target.value})} />
                  </div>
                  <div className="input-group">
                    <label>END TIME (Local)</label>
                    <input type="datetime-local" required value={newElection.end_time} onChange={e => setNewElection({...newElection, end_time: e.target.value})} />
                  </div>
                </div>
                <button type="submit" className="cyber-btn w-full">CREATE ELECTION</button>
              </form>
              
              <table style={{ width: '100%', textAlign: 'left', color: 'var(--text-main)', border: '1px solid var(--glass-border)', borderRadius: '8px' }}>
                <thead style={{ background: 'rgba(3,7,18,0.95)' }}>
                  <tr>
                    <th style={{ padding: '1rem', color: 'var(--accent-main)' }}>NAME</th>
                    <th style={{ padding: '1rem', color: 'var(--accent-main)' }}>STATUS</th>
                    <th style={{ padding: '1rem', color: 'var(--accent-main)' }}>POSTS</th>
                  </tr>
                </thead>
                <tbody>
                  {elections.map(e => (
                    <tr key={e.id} style={{ borderBottom: '1px solid rgba(56,189,248,0.05)' }}>
                      <td style={{ padding: '1rem' }}>{e.name}</td>
                      <td style={{ padding: '1rem' }}><span style={{ color: e.status === 'active' ? '#34d399' : 'var(--text-muted)' }}>{e.status.toUpperCase()}</span></td>
                      <td style={{ padding: '1rem' }}>{e.posts.join(', ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
