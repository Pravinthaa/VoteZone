import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './dashboard.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
const WS_URL = API_URL.replace('http', 'ws');

const VoterDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'browse' | 'vote'>('browse');
  const [elections, setElections] = useState<any[]>([]);
  const [selectedElection, setSelectedElection] = useState('');
  const [candidates, setCandidates] = useState<any[]>([]);
  const [selectedVotes, setSelectedVotes] = useState<Record<string, number>>({});
  const [liveVotes, setLiveVotes] = useState<number | null>(null);
  const [results, setResults] = useState<any>(null);
  const [voteMsg, setVoteMsg] = useState('');
  const [voteErr, setVoteErr] = useState('');
  const wsRef = useRef<WebSocket | null>(null);

  const token = () => localStorage.getItem('token') || '';

  useEffect(() => {
    if (!token()) return navigate('/login');
    fetch(`${API_URL}/elections/`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.ok ? r.json() : [])
      .then(setElections)
      .catch(() => {});
  }, [navigate]);

  useEffect(() => {
    if (!selectedElection) { setCandidates([]); setResults(null); setLiveVotes(null); return; }

    fetch(`${API_URL}/candidates/${selectedElection}`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.ok ? r.json() : [])
      .then(setCandidates)
      .catch(() => {});

    fetch(`${API_URL}/votes/${selectedElection}/results`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.ok ? r.json() : null)
      .then(setResults)
      .catch(() => setResults(null));

    const sel = elections.find(e => e.id.toString() === selectedElection);
    if (sel?.status === 'active') {
      const ws = new WebSocket(`${WS_URL}/votes/live/${selectedElection}`);
      ws.onmessage = ev => {
        try {
          const data = JSON.parse(ev.data);
          if (data.type === 'participation_update') setLiveVotes(data.total_votes);
        } catch { /* ignore */ }
      };
      wsRef.current = ws;
    } else {
      setLiveVotes(null);
    }
    return () => { wsRef.current?.close(); };
  }, [selectedElection, elections]);

  const handleVote = async (post: string) => {
    setVoteMsg(''); setVoteErr('');
    const candidateId = selectedVotes[post];
    if (!candidateId) return setVoteErr(`Select a candidate for: ${post}`);
    try {
      const res = await fetch(`${API_URL}/votes/cast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ election_id: parseInt(selectedElection), candidate_id: candidateId, post }),
      });
      if (res.ok) setVoteMsg(`Vote cast for ${post}`);
      else {
        const d = await res.json();
        setVoteErr(d.detail || 'Vote failed');
      }
    } catch { setVoteErr('Network error'); }
  };

  const sel = elections.find(e => e.id.toString() === selectedElection);
  const isActive = sel?.status === 'active';

  const tabs = [
    { key: 'browse', label: 'CANDIDATES' },
    { key: 'vote', label: isActive ? 'VOTE NOW' : results ? 'RESULTS' : 'VOTING' },
  ] as const;

  return (
    <div className="db-layout">
      <nav className="db-nav">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button className="db-back-btn" onClick={() => navigate(-1)}>← BACK</button>
          <span className="db-nav-brand">VOTE<span>ZONE</span></span>
        </div>
        <div className="db-nav-right">
          <select className="db-select" style={{ minWidth: 200, padding: '0.3rem 0.7rem', fontSize: '0.8rem' }}
            value={selectedElection} onChange={e => { setSelectedElection(e.target.value); setSelectedVotes({}); }}>
            <option value="">— select election —</option>
            {elections.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
          <div className="db-badge">
            <span className={`db-badge-dot`} style={{ background: isActive ? '#34d399' : 'var(--accent-main)' }} />
            {isActive ? 'LIVE' : sel?.status?.toUpperCase() ?? 'VOTER'}
          </div>
          <button className="db-logout" onClick={() => { localStorage.removeItem('token'); navigate('/login'); }}>LOGOUT</button>
        </div>
      </nav>

      <div className="db-tabs">
        {tabs.map(t => (
          <button key={t.key} className={`db-tab ${activeTab === t.key ? 'active' : ''}`} onClick={() => setActiveTab(t.key as any)}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="db-body">
        {/* ── BROWSE CANDIDATES ── */}
        {activeTab === 'browse' && (
          <div className="db-card">
            <div className="db-card-header">APPROVED CANDIDATES</div>
            <div className="db-card-body">
              {!selectedElection
                ? <div className="db-empty">Select an election to view candidates</div>
                : candidates.length === 0
                  ? <div className="db-empty">No approved candidates for this election</div>
                  : <div className="db-candidate-grid">
                      {candidates.map(c => (
                        <div key={c.id} className="db-candidate-card">
                          {c.photo_path
                            ? <img src={`${API_URL}/uploads/${c.photo_path}`} alt="Photo" className="db-candidate-photo" />
                            : <div className="db-candidate-photo-placeholder">⬡</div>}
                          <div className="db-candidate-info">
                            <span className="db-candidate-post">{c.post}</span>
                            <span className="db-candidate-id">Candidate #{c.id}</span>
                            {c.resume_path &&
                              <a href={`${API_URL}/uploads/${c.resume_path}`} target="_blank" rel="noreferrer"
                                className="db-btn db-btn-sm" style={{ textDecoration: 'none', display: 'inline-block', marginTop: '0.4rem' }}>
                                MANIFESTO
                              </a>}
                          </div>
                        </div>
                      ))}
                    </div>}
            </div>
          </div>
        )}

        {/* ── VOTING / RESULTS ── */}
        {activeTab === 'vote' && (
          <>
            {/* Live counter */}
            {isActive && liveVotes !== null && (
              <div className="db-live-counter">
                <span className="db-badge-dot" style={{ background: '#34d399' }} />
                LIVE PARTICIPATION — {liveVotes} VOTES CAST
              </div>
            )}

            {voteMsg && <div className="db-success">{voteMsg}</div>}
            {voteErr && <div className="db-error">{voteErr}</div>}

            {!selectedElection && <div className="db-empty db-card" style={{ padding: '3rem' }}>Select an election first</div>}

            {/* Results declared */}
            {selectedElection && results && (
              <div className="db-card">
                <div className="db-card-header">FINAL RESULTS</div>
                <div className="db-card-body">
                  {Object.entries(results.results).map(([post, list]: [string, any]) => (
                    <div key={post} style={{ marginBottom: '1.5rem' }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.7rem', letterSpacing: '2px',
                        color: 'var(--accent-main)', marginBottom: '0.6rem' }}>{post}</div>
                      {list.map((r: any) => (
                        <div key={r.candidate_id} className="db-result-row">
                          <span>Candidate #{r.candidate_id}</span>
                          <span className="db-result-votes">{r.votes} VOTES</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Active voting */}
            {selectedElection && isActive && !results && sel?.posts?.map((post: string) => {
              const postCandidates = candidates.filter(c => c.post === post);
              return (
                <div key={post} className="db-vote-block">
                  <span className="db-vote-post-label">{post}</span>
                  <select className="db-select" style={{ flex: 1 }}
                    value={selectedVotes[post] || ''}
                    onChange={e => setSelectedVotes({ ...selectedVotes, [post]: parseInt(e.target.value) })}>
                    <option value="">— select candidate —</option>
                    {postCandidates.map(c => <option key={c.id} value={c.id}>Candidate #{c.id}</option>)}
                  </select>
                  <button className="db-btn" onClick={() => handleVote(post)}>CAST</button>
                </div>
              );
            })}

            {/* Not active, no results */}
            {selectedElection && !isActive && !results && (
              <div className="db-card">
                <div className="db-empty">
                  {sel?.status === 'upcoming' ? 'Election has not started yet' : 'Results not yet declared'}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default VoterDashboard;
