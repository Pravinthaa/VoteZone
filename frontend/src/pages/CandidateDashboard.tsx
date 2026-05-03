import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './dashboard.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

const CandidateDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [elections, setElections] = useState<any[]>([]);
  const [selectedElection, setSelectedElection] = useState('');
  const [selectedPost, setSelectedPost] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [resume, setResume] = useState<File | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const token = () => localStorage.getItem('token') || '';

  useEffect(() => {
    if (!token()) return navigate('/login');
    fetch(`${API_URL}/elections/`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.ok ? r.json() : [])
      .then(setElections)
      .catch(() => {});
  }, [navigate]);

  const selectedElectionData = elections.find(e => e.id.toString() === selectedElection);

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

  return (
    <div className="db-layout">
      <nav className="db-nav">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button className="db-back-btn" onClick={() => navigate(-1)}>← BACK</button>
          <span className="db-nav-brand">VOTE<span>ZONE</span></span>
        </div>
        <div className="db-nav-right">
          <div className="db-badge"><span className="db-badge-dot" /> CANDIDATE PORTAL</div>
          <button className="db-logout" onClick={() => { localStorage.removeItem('token'); navigate('/login'); }}>LOGOUT</button>
        </div>
      </nav>

      <div className="db-body" style={{ maxWidth: 560, alignSelf: 'center', width: '100%' }}>
        <div className="db-card">
          <div className="db-card-header">CANDIDATE APPLICATION</div>
          <div className="db-card-body">
            {message && <div className="db-success" style={{ marginBottom: '1rem' }}>{message}</div>}
            {error && <div className="db-error" style={{ marginBottom: '1rem' }}>{error}</div>}

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
      </div>
    </div>
  );
};

export default CandidateDashboard;
