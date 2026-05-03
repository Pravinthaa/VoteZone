import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../components/Login.css';

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

  useEffect(() => {
    const fetchElections = async () => {
      const token = localStorage.getItem('token');
      if (!token) return navigate('/login');
      try {
        const res = await fetch(`${API_URL}/elections/`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (res.ok) setElections(await res.json());
      } catch (err: any) { console.error(err); }
    };
    fetchElections();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    const token = localStorage.getItem('token');
    
    if (!selectedElection || !selectedPost || !photo || !resume) {
      return setError('ALL FIELDS ARE REQUIRED FOR UPLINK');
    }

    const formData = new FormData();
    formData.append('election_id', selectedElection);
    formData.append('post', selectedPost);
    formData.append('photo', photo);
    formData.append('resume', resume);

    try {
      const res = await fetch(`${API_URL}/candidates/apply`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      if (res.ok) {
        setMessage('APPLICATION UPLINK SUCCESSFUL. AWAITING ADMIN APPROVAL.');
        // Reset form but don't force a reload so user sees success msg
      } else {
        const data = await res.json();
        setError(data.detail || 'TRANSMISSION FAILED');
      }
    } catch (err) {
      setError('NETWORK ERROR');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const selectedElectionData = elections.find(e => e.id.toString() === selectedElection);

  return (
    <div className="csea-layout">
      <div className="cyber-ring ring-1"></div>
      <div className="cyber-ring ring-2"></div>
      <div className="csea-container" style={{ maxWidth: '600px' }}>
        <div className="panel-header" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 className="glitch-title" style={{ textAlign: 'left', marginBottom: '0.5rem' }}>CANDIDATE PROTOCOL</h1>
            <div className="status-indicator" style={{ display: 'flex' }}><span className="blink-dot"></span> SECURE UPLINK ESTABLISHED</div>
          </div>
          <button onClick={handleLogout} className="cyber-btn" style={{ padding: '0.8rem 1.5rem', margin: 0 }}>TERMINATE SESSION</button>
        </div>
        <div className="panel-body">
          {error && <div className="error-box" style={{ marginBottom: '1rem' }}>{error}</div>}
          {message && <div style={{ color: '#34d399', background: 'rgba(52,211,153,0.1)', padding: '1rem', border: '1px solid #34d399', borderRadius: '4px', marginBottom: '1rem' }}>{message}</div>}
          
          <form onSubmit={handleSubmit} className="cyber-form">
            <div className="input-group">
              <label>TARGET ELECTION</label>
              <select required value={selectedElection} onChange={e => { setSelectedElection(e.target.value); setSelectedPost(''); }}>
                <option value="">-- SELECT ELECTION --</option>
                {elections.map(e => (
                  <option key={e.id} value={e.id}>{e.name} ({e.status})</option>
                ))}
              </select>
            </div>

            <div className="input-group">
              <label>TARGET POST</label>
              <select required value={selectedPost} onChange={e => setSelectedPost(e.target.value)} disabled={!selectedElection}>
                <option value="">-- SELECT POST --</option>
                {selectedElectionData?.posts?.map((p: string) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <div className="input-group">
              <label>PROFILE PHOTO UPLOAD (IMAGE)</label>
              <input type="file" accept="image/*" required onChange={e => setPhoto(e.target.files?.[0] || null)} style={{ padding: '1rem', background: 'rgba(0,0,0,0.3)', border: '1px dashed var(--glass-border)', color: 'var(--text-main)', width: '100%' }} />
            </div>

            <div className="input-group">
              <label>MANIFESTO UPLOAD (PDF)</label>
              <input type="file" accept="application/pdf" required onChange={e => setResume(e.target.files?.[0] || null)} style={{ padding: '1rem', background: 'rgba(0,0,0,0.3)', border: '1px dashed var(--glass-border)', color: 'var(--text-main)', width: '100%' }} />
            </div>

            <button type="submit" className="cyber-btn w-full">INITIATE UPLINK</button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CandidateDashboard;
