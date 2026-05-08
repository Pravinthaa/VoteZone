import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './dashboard.css';
import PieChart from '../components/piechart';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
const WS_URL = API_URL.replace('http', 'ws');

const VoterDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'browse' | 'vote' | 'my_votes'>('browse');
  const [elections, setElections] = useState<any[]>([]);
  const [selectedElection, setSelectedElection] = useState('');
  const [candidates, setCandidates] = useState<any[]>([]);
  const [selectedVotes, setSelectedVotes] = useState<Record<string, number>>({});
  const [liveVotes, setLiveVotes] = useState<number | null>(null);
  const [results, setResults] = useState<any>(null);
  const [voteMsg, setVoteMsg] = useState('');
  const [voteErr, setVoteErr] = useState('');
  const [myVotes, setMyVotes] = useState<any[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  const token = () => localStorage.getItem('token') || '';

  // ── Auth guard + fetch elections ─────────────────
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

  // ── Fetch candidates + results + websocket on election change ──
  useEffect(() => {
    if (!selectedElection) {
      setCandidates([]);
      setResults(null);
      setLiveVotes(null);
      setMyVotes([]);
      return;
    }

    fetch(`${API_URL}/candidates/${selectedElection}`, {
      headers: { Authorization: `Bearer ${token()}` },
    })
      .then(r => r.ok ? r.json() : [])
      .then(setCandidates)
      .catch(() => {});

    fetch(`${API_URL}/votes/${selectedElection}/results`, {
      headers: { Authorization: `Bearer ${token()}` },
    })
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

  // ── Fetch my votes when tab or election changes ──
  useEffect(() => {
    if (activeTab === 'my_votes' && selectedElection) {
      fetch(`${API_URL}/votes/my-votes/${selectedElection}`, {
        headers: { Authorization: `Bearer ${token()}` },
      })
        .then(r => r.ok ? r.json() : [])
        .then(setMyVotes)
        .catch(() => setMyVotes([]));
    }
  }, [activeTab, selectedElection]);

  const handleVote = async (post: string) => {
    setVoteMsg('');
    setVoteErr('');

    const candidateId = selectedVotes[post];
    if (!candidateId) {
      setVoteErr(`Select a candidate for: ${post}`);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/votes/cast`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token()}`,
        },
        body: JSON.stringify({
          election_id: parseInt(selectedElection),
          candidate_id: candidateId,
          post,
        }),
      });

      if (res.ok) {
        setVoteMsg(`Vote cast for ${post}`);
        setSelectedVotes(prev => ({ ...prev, [post]: 0 }));
      } else {
        let errMsg = 'Vote failed';
        try {
          const d = await res.json();
          if (d.detail) errMsg = d.detail;
        } catch {
          errMsg = await res.text();
        }
        setVoteErr(errMsg);
      }
    } catch {
      setVoteErr('Network error');
    }
  };

  const sel = elections.find(e => e.id.toString() === selectedElection);
  const isActive = sel?.status === 'active';

  const tabs = [
    { key: 'browse',   label: 'CANDIDATES' },
    { key: 'vote',     label: isActive ? 'VOTE NOW' : results ? 'RESULTS' : 'VOTING' },
    { key: 'my_votes', label: 'MY VOTES' },
  ] as const;

  return (
    <div className="db-layout">

      {/* ── Nav ── */}
      <nav className="db-nav">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button className="db-back-btn" onClick={() => navigate(-1)}>← BACK</button>
          <span className="db-nav-brand">VOTE<span>ZONE</span></span>
        </div>
        <div className="db-nav-right">
          <select
            className="db-select"
            style={{ minWidth: 200, padding: '0.3rem 0.7rem', fontSize: '0.8rem' }}
            value={selectedElection}
            onChange={e => { setSelectedElection(e.target.value); setSelectedVotes({}); }}
          >
            <option value="">— select election —</option>
            {elections.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
          <div className="db-badge">
            <span className="db-badge-dot" style={{ background: isActive ? '#34d399' : 'var(--accent-main)' }} />
            {isActive ? 'LIVE' : sel?.status?.toUpperCase() ?? 'VOTER'}
          </div>
          <button
            className="db-logout"
            onClick={() => {
              localStorage.removeItem('token');
              localStorage.removeItem('user_role');
              navigate('/login');
            }}
          >
            LOGOUT
          </button>
        </div>
      </nav>

      {/* ── Tabs ── */}
      <div className="db-tabs">
        {tabs.map(t => (
          <button
            key={t.key}
            className={`db-tab ${activeTab === t.key ? 'active' : ''}`}
            onClick={() => setActiveTab(t.key as any)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Body ── */}
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
                  : (
                    <div className="db-candidate-grid">
                      {candidates.map(c => (
                        <div key={c.id} className="db-candidate-card">
                          {c.photo_path
                            ? <img src={`${API_URL}/uploads/${c.photo_path}`} alt="Photo" className="db-candidate-photo" />
                            : <div className="db-candidate-photo-placeholder">⬡</div>}
                          <div className="db-candidate-info">
                            <span className="db-candidate-post">{c.post}</span>
                            <span className="db-candidate-name">{c.student_name ?? '—'}</span>
                            <span className="db-candidate-roll">{c.student_roll_no?.toUpperCase() ?? '—'}</span>
                            {c.resume_path && (
                              <a
                                href={`${API_URL}/uploads/${c.resume_path}`}
                                target="_blank"
                                rel="noreferrer"
                                className="db-btn db-btn-sm"
                                style={{ textDecoration: 'none', display: 'inline-block', marginTop: '0.4rem' }}
                              >
                                MANIFESTO
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
            </div>
          </div>
        )}

        {/* ── VOTING / RESULTS ── */}
        {activeTab === 'vote' && (
          <>
            {voteMsg && <div className="db-success">{voteMsg}</div>}
            {voteErr && <div className="db-error">{voteErr}</div>}

            {!selectedElection && (
              <div className="db-empty db-card" style={{ padding: '3rem' }}>
                Select an election first
              </div>
            )}

            {/* Results declared */}
            {selectedElection && results && (
              <div className="db-card">
                <div className="db-card-header">FINAL RESULTS</div>
                <div className="db-card-body">
                  {Object.entries(results.results).map(([post, list]: [string, any]) => {
                    const sorted = [...list].sort((a: any, b: any) => b.votes - a.votes);
                    const totalVotes = sorted.reduce((sum: number, r: any) => sum + r.votes, 0);
                    const chartId = `pie-${post.replace(/\s+/g, '-')}`;
                    return (
                      <div key={post} style={{ marginBottom: '2rem' }}>
                        <div style={{
                          fontFamily: 'var(--font-display)', fontSize: '0.7rem', letterSpacing: '2px',
                          color: 'var(--accent-main)', marginBottom: '0.8rem',
                        }}>
                          {post}
                          <span style={{ marginLeft: '1rem', color: 'var(--text-muted)', fontSize: '0.65rem' }}>
                            ({totalVotes} TOTAL VOTES)
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                          <div style={{ flex: 1, minWidth: 200 }}>
                            {sorted.map((r: any, idx: number) => {
                              const pct = totalVotes > 0 ? Math.round((r.votes / totalVotes) * 100) : 0;
                              return (
                                <div key={r.candidate_id} className="db-result-row"
                                  style={{ flexDirection: 'column', alignItems: 'stretch', gap: '0.3rem', marginBottom: '0.6rem' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                      {idx === 0 && totalVotes > 0 && (
                                        <span style={{
                                          fontSize: '0.6rem', background: 'var(--accent-main)', color: '#000',
                                          padding: '0.1rem 0.4rem', borderRadius: '2px',
                                          fontFamily: 'var(--font-display)', letterSpacing: '1px',
                                        }}>WINNER</span>
                                      )}
                                      Candidate #{r.candidate_id}
                                    </span>
                                    <span className="db-result-votes">{r.votes} VOTES ({pct}%)</span>
                                  </div>
                                  <div style={{ height: '4px', background: 'var(--border-color)', borderRadius: '2px', overflow: 'hidden' }}>
                                    <div style={{
                                      height: '100%', width: `${pct}%`,
                                      background: idx === 0 ? 'var(--accent-main)' : 'var(--text-muted)',
                                      borderRadius: '2px', transition: 'width 0.6s ease',
                                    }} />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          {totalVotes > 0 && (
                            <div style={{ width: 160, height: 160, flexShrink: 0 }}>
                              <PieChart candidates={sorted} totalVotes={totalVotes} chartId={chartId} />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Active voting */}
            {selectedElection && isActive && !results && sel?.posts?.map((post: string) => {
              const postCandidates = candidates.filter(c => c.post === post);
              return (
                <div key={post} className="db-vote-block">
                  <span className="db-vote-post-label">{post}</span>
                  <select
                    className="db-select"
                    style={{ flex: 1 }}
                    value={selectedVotes[post] || ''}
                    onChange={e => setSelectedVotes({ ...selectedVotes, [post]: parseInt(e.target.value) })}
                  >
                    <option value="">— select candidate —</option>
                    {postCandidates.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.student_name ?? `Candidate #${c.id}`}
                      </option>
                    ))}
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

        {/* ── MY VOTES ── */}
        {activeTab === 'my_votes' && (
          <div className="db-card">
            <div className="db-card-header">
              VOTING HISTORY
              {selectedElection && myVotes.length > 0 && (
                <span style={{
                  marginLeft: 'auto', fontFamily: 'Electrolize', fontSize: '0.7rem',
                  color: 'rgba(125,211,252,0.5)', fontWeight: 400, letterSpacing: 1,
                }}>
                  {myVotes.length} vote{myVotes.length !== 1 ? 's' : ''} cast
                </span>
              )}
            </div>
            <div className="db-card-body">
              {!selectedElection ? (
                <div className="db-empty">Select an election to view your votes</div>
              ) : myVotes.length === 0 ? (
                <div className="db-empty">You have not voted in this election yet</div>
              ) : (
                <>
                  <div style={{ overflowY: 'auto', maxHeight: '420px' }}>
                    <table className="db-table">
                      <thead>
                        <tr>
                          <th style={{ position: 'sticky', top: 0, zIndex: 1, background: 'rgba(3,7,18,0.95)' }}>POST</th>
                          <th style={{ position: 'sticky', top: 0, zIndex: 1, background: 'rgba(3,7,18,0.95)' }}>VOTED FOR</th>
                          <th style={{ position: 'sticky', top: 0, zIndex: 1, background: 'rgba(3,7,18,0.95)' }}>ROLL NO</th>
                        </tr>
                      </thead>
                      <tbody>
                        {myVotes.map((v, i) => (
                          <tr key={i}>
                            <td><span className="db-pill db-pill-blue">{v.post}</span></td>
                            <td style={{ fontWeight: 600, color: '#e0f2fe' }}>{v.candidate_name}</td>
                            <td style={{
                              fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '0.82rem',
                              color: '#7dd3fc', letterSpacing: '1px',
                            }}>
                              {v.candidate_roll_no?.toUpperCase() ?? '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div style={{
                    marginTop: '1.2rem', fontSize: '0.68rem', color: 'rgba(125,211,252,0.28)',
                    letterSpacing: '1.5px', textAlign: 'center', fontFamily: 'Electrolize',
                  }}>
                    YOUR VOTES ARE FINAL AND CANNOT BE CHANGED
                  </div>
                </>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default VoterDashboard;