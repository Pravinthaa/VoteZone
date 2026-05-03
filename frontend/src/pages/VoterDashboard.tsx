import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import '../components/Login.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
const WS_URL = API_URL.replace('http', 'ws');

const VoterDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'instructions' | 'candidates' | 'voting'>('instructions');
  const [elections, setElections] = useState<any[]>([]);
  const [selectedElection, setSelectedElection] = useState('');
  const [candidates, setCandidates] = useState<any[]>([]);
  const [selectedVotes, setSelectedVotes] = useState<Record<string, number>>({});
  const [liveVotes, setLiveVotes] = useState<number | null>(null);
  const [results, setResults] = useState<any>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const fetchElections = async () => {
      const token = localStorage.getItem('token');
      if (!token) return navigate('/login');
      try {
        const res = await fetch(`${API_URL}/elections/`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (res.ok) setElections(await res.json());
      } catch (err) { console.error(err); }
    };
    fetchElections();
  }, [navigate]);

  useEffect(() => {
    if (!selectedElection) return;
    
    const fetchCandidates = async () => {
      const token = localStorage.getItem('token');
      try {
        const res = await fetch(`${API_URL}/candidates/${selectedElection}`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (res.ok) setCandidates(await res.json());
      } catch (err) { console.error(err); }
    };
    fetchCandidates();

    const fetchResults = async () => {
      const token = localStorage.getItem('token');
      try {
        const res = await fetch(`${API_URL}/votes/${selectedElection}/results`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (res.ok) setResults(await res.json());
        else setResults(null);
      } catch (err) { setResults(null); }
    };

    const sel = elections.find(e => e.id.toString() === selectedElection);
    if (sel?.results_status === 'declared') {
      fetchResults();
    } else {
      setResults(null);
    }

    if (sel?.status === 'active') {
      const ws = new WebSocket(`${WS_URL}/votes/live/${selectedElection}`);
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'participation_update') {
          setLiveVotes(data.total_votes);
        }
      };
      wsRef.current = ws;
    } else {
      setLiveVotes(null);
    }

    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, [selectedElection, elections]);

  const handleCastVote = async (post: string) => {
    const candidateId = selectedVotes[post];
    if (!candidateId) return alert('SELECT A CANDIDATE FIRST');
    const token = localStorage.getItem('token');
    
    try {
      const res = await fetch(`${API_URL}/votes/cast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          election_id: parseInt(selectedElection),
          candidate_id: candidateId,
          post: post
        })
      });
      if (res.ok) {
        alert('VOTE CAST SUCCESSFULLY');
      } else {
        const data = await res.json();
        alert(data.detail || 'VOTE FAILED');
      }
    } catch (err) {
      alert('NETWORK ERROR');
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
      <div className="csea-container" style={{ maxWidth: '1000px', width: '90%', minHeight: '600px', padding: '3rem' }}>
        <div className="panel-header" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 className="glitch-title" style={{ textAlign: 'left', marginBottom: '0.5rem' }}>VOTER PROTOCOL</h1>
            <div className="status-indicator" style={{ display: 'flex' }}><span className="blink-dot"></span> SECURE UPLINK ESTABLISHED</div>
          </div>
          <button onClick={handleLogout} className="cyber-btn" style={{ padding: '0.8rem 1.5rem', marginTop: 0 }}>TERMINATE SESSION</button>
        </div>

        <div className="panel-body">
          <div style={{ marginBottom: '2rem' }}>
            <label style={{ color: 'var(--accent-main)', marginRight: '1rem' }}>ACTIVE ELECTION UPLINK:</label>
            <select className="cyber-input" value={selectedElection} onChange={(e) => setSelectedElection(e.target.value)} style={{ background: 'rgba(0,0,0,0.5)', color: 'var(--text-main)', border: '1px solid var(--accent-main)', padding: '0.5rem' }}>
              <option value="">-- SELECT ELECTION --</option>
              {elections.map(e => <option key={e.id} value={e.id}>{e.name} ({e.status})</option>)}
            </select>
          </div>

          <div className="admin-tabs" style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem' }}>
            <button onClick={() => setActiveTab('instructions')} className={`cyber-btn ${activeTab === 'instructions' ? 'active-tab' : ''}`} style={{ flex: 1, opacity: activeTab === 'instructions' ? 1 : 0.5 }}>INSTRUCTIONS</button>
            <button onClick={() => setActiveTab('candidates')} className={`cyber-btn ${activeTab === 'candidates' ? 'active-tab' : ''}`} style={{ flex: 1, opacity: activeTab === 'candidates' ? 1 : 0.5 }}>CANDIDATE PROFILES</button>
            <button onClick={() => setActiveTab('voting')} className={`cyber-btn ${activeTab === 'voting' ? 'active-tab' : ''}`} style={{ flex: 1, opacity: activeTab === 'voting' ? 1 : 0.5 }}>VOTING & RESULTS</button>
          </div>

          {activeTab === 'instructions' && (
            <div className="table-container" style={{ background: 'rgba(0, 0, 0, 0.2)', border: '1px solid var(--glass-border)', borderRadius: '8px', padding: '2rem', color: 'var(--text-main)', lineHeight: '1.6' }}>
              <h2 style={{ color: 'var(--accent-main)', marginBottom: '1rem', fontSize: '1.2rem' }}>VOTING PROTOCOLS</h2>
              <ul style={{ listStyleType: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <li><span style={{ color: 'var(--accent-main)' }}>01.</span> Select an Election from the dropdown.</li>
                <li><span style={{ color: 'var(--accent-main)' }}>02.</span> Review Candidate Profiles to read manifestos.</li>
                <li><span style={{ color: 'var(--accent-main)' }}>03.</span> Cast your vote in the Voting tab when Active.</li>
              </ul>
            </div>
          )}

          {activeTab === 'candidates' && (
            <div className="table-container" style={{ background: 'rgba(0, 0, 0, 0.2)', border: '1px solid var(--glass-border)', borderRadius: '8px', padding: '2rem' }}>
              {!selectedElection ? <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>SELECT AN ELECTION TO VIEW PROFILES</p> : 
                candidates.length === 0 ? <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>NO CANDIDATES APPROVED FOR THIS ELECTION</p> :
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                  {candidates.map(c => (
                    <div key={c.id} style={{ border: '1px solid var(--accent-main)', borderRadius: '8px', padding: '1rem', textAlign: 'center', background: 'rgba(0,0,0,0.4)' }}>
                      {c.photo_path && <img src={`${API_URL}/uploads/${c.photo_path}`} alt="Profile" style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: '4px', marginBottom: '1rem' }} />}
                      <h3 style={{ color: 'var(--text-main)', marginBottom: '0.5rem' }}>{c.post}</h3>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>ID: {c.id}</p>
                      {c.resume_path && <a href={`${API_URL}/uploads/${c.resume_path}`} target="_blank" rel="noreferrer" className="cyber-btn" style={{ padding: '0.4rem 1rem', display: 'inline-block', fontSize: '0.8rem' }}>VIEW MANIFESTO</a>}
                    </div>
                  ))}
                </div>
              }
            </div>
          )}

          {activeTab === 'voting' && (
            <div className="table-container" style={{ background: 'rgba(0, 0, 0, 0.2)', border: '1px solid var(--glass-border)', borderRadius: '8px', padding: '2rem' }}>
              {!selectedElection ? <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>SELECT AN ELECTION</p> : 
               results ? (
                 <div>
                   <h2 style={{ color: 'var(--accent-main)', textAlign: 'center', marginBottom: '2rem' }}>FINAL RESULTS DECLARED</h2>
                   {Object.entries(results.results).map(([post, postResults]: [string, any]) => (
                     <div key={post} style={{ marginBottom: '2rem', border: '1px solid var(--glass-border)', padding: '1rem', borderRadius: '8px' }}>
                       <h3 style={{ color: '#fb7185', marginBottom: '1rem' }}>POST: {post}</h3>
                       {postResults.map((r: any) => (
                         <div key={r.candidate_id} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--glass-border)', padding: '0.5rem 0', color: 'var(--text-main)' }}>
                           <span>Candidate ID: {r.candidate_id}</span>
                           <span style={{ color: '#34d399', fontWeight: 'bold' }}>{r.votes} VOTES</span>
                         </div>
                       ))}
                     </div>
                   ))}
                 </div>
               ) :
               selectedElectionData?.status !== 'active' ? <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>ELECTION IS NOT ACTIVE</p> :
               (
                 <div>
                   <div style={{ textAlign: 'center', marginBottom: '2rem', border: '1px solid #34d399', padding: '1rem', borderRadius: '8px', background: 'rgba(52,211,153,0.1)' }}>
                     <span className="blink-dot" style={{ background: '#34d399' }}></span> 
                     <span style={{ color: '#34d399', marginLeft: '0.5rem', fontWeight: 'bold', letterSpacing: '2px' }}>
                       LIVE PARTICIPATION: {liveVotes !== null ? liveVotes : 'CONNECTING...'} TOTAL VOTES
                     </span>
                   </div>
                   
                   {selectedElectionData.posts.map((post: string) => {
                     const postCandidates = candidates.filter(c => c.post === post);
                     return (
                       <div key={post} style={{ marginBottom: '2rem', border: '1px solid var(--glass-border)', padding: '1rem', borderRadius: '8px' }}>
                         <h3 style={{ color: 'var(--accent-main)', marginBottom: '1rem' }}>{post}</h3>
                         <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                           <select 
                             className="cyber-input" 
                             style={{ background: 'rgba(0,0,0,0.5)', color: 'var(--text-main)', padding: '0.5rem', flex: 1 }}
                             value={selectedVotes[post] || ''}
                             onChange={(e) => setSelectedVotes({...selectedVotes, [post]: parseInt(e.target.value)})}
                           >
                             <option value="">-- SELECT CANDIDATE --</option>
                             {postCandidates.map(c => <option key={c.id} value={c.id}>Candidate ID {c.id}</option>)}
                           </select>
                           <button className="cyber-btn" onClick={() => handleCastVote(post)} style={{ margin: 0 }}>CAST VOTE</button>
                         </div>
                       </div>
                     )
                   })}
                 </div>
               )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default VoterDashboard;
