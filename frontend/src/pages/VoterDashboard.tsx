import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../components/Login.css';

const VoterDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'instructions' | 'candidates' | 'voting'>('instructions');

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const renderTabContent = () => {
    if (activeTab === 'instructions') {
      return (
        <div className="table-container" style={{ 
          background: 'rgba(0, 0, 0, 0.2)', 
          border: '1px solid var(--glass-border)',
          borderRadius: '8px',
          padding: '2rem',
          marginBottom: '2rem',
          color: 'var(--text-main)',
          lineHeight: '1.6'
        }}>
          <h2 style={{ color: 'var(--accent-main)', marginBottom: '1rem', letterSpacing: '1px', fontSize: '1.2rem' }}>
            <i className="ri-information-line"></i> VOTING PROTOCOLS
          </h2>
          <ul style={{ listStyleType: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <li style={{ display: 'flex', gap: '0.8rem', alignItems: 'flex-start' }}>
              <span style={{ color: 'var(--accent-main)' }}>01.</span>
              <span>Review the Candidate Profiles tab to read about each candidate's platform and qualifications before proceeding.</span>
            </li>
            <li style={{ display: 'flex', gap: '0.8rem', alignItems: 'flex-start' }}>
              <span style={{ color: 'var(--accent-main)' }}>02.</span>
              <span>Navigate to the Active Election tab when a voting session is officially opened by the Administrators.</span>
            </li>
            <li style={{ display: 'flex', gap: '0.8rem', alignItems: 'flex-start' }}>
              <span style={{ color: 'var(--accent-main)' }}>03.</span>
              <span>You may only cast your vote once per election. Your vote is securely hashed and cannot be altered once submitted.</span>
            </li>
            <li style={{ display: 'flex', gap: '0.8rem', alignItems: 'flex-start' }}>
              <span style={{ color: 'var(--accent-main)' }}>04.</span>
              <span>Do not refresh the page or disconnect from the terminal while a transaction is actively processing.</span>
            </li>
          </ul>
        </div>
      );
    }

    if (activeTab === 'candidates') {
      return (
        <div className="table-container" style={{ 
          background: 'rgba(0, 0, 0, 0.2)', 
          border: '1px solid var(--glass-border)',
          borderRadius: '8px',
          overflow: 'auto',
          maxHeight: '400px',
          marginBottom: '2rem',
          padding: '2rem',
          textAlign: 'center'
        }}>
          <i className="ri-profile-line" style={{ fontSize: '3rem', color: 'var(--text-muted)', marginBottom: '1rem', display: 'block' }}></i>
          <p style={{ color: 'var(--text-main)', fontSize: '1.2rem', marginBottom: '0.5rem' }}>DATABANK EMPTY</p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Awaiting candidate profiles from the central server.</p>
        </div>
      );
    }

    if (activeTab === 'voting') {
      return (
        <div className="table-container" style={{ 
          background: 'rgba(0, 0, 0, 0.2)', 
          border: '1px solid var(--glass-border)',
          borderRadius: '8px',
          overflow: 'auto',
          maxHeight: '400px',
          marginBottom: '2rem',
          padding: '2rem',
          textAlign: 'center'
        }}>
          <i className="ri-git-repository-private-line" style={{ fontSize: '3rem', color: 'var(--text-muted)', marginBottom: '1rem', display: 'block' }}></i>
          <p style={{ color: 'var(--text-main)', fontSize: '1.2rem', marginBottom: '0.5rem' }}>NO ACTIVE ELECTIONS</p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Voting is currently closed. Please wait for an Administrator to initiate a session.</p>
        </div>
      );
    }
  };

  return (
    <div className="csea-layout">
      <div className="cyber-ring ring-1"></div>
      <div className="cyber-ring ring-2"></div>
      <div className="csea-container" style={{ maxWidth: '1000px', width: '90%', height: 'auto', minHeight: '600px', padding: '3rem' }}>
        <div className="panel-header" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 className="glitch-title" style={{ textAlign: 'left', marginBottom: '0.5rem' }}>VOTER PROTOCOL</h1>
            <div className="status-indicator" style={{ display: 'flex' }}>
              <span className="blink-dot"></span> SECURE UPLINK ESTABLISHED
            </div>
          </div>
          <button onClick={handleLogout} className="cyber-btn" style={{ padding: '0.8rem 1.5rem', marginTop: 0 }}>
            TERMINATE SESSION
          </button>
        </div>

        <div className="panel-body">
          <div className="admin-tabs" style={{ 
            display: 'flex', 
            gap: '1rem', 
            marginBottom: '2rem', 
            borderBottom: '1px solid var(--glass-border)', 
            paddingBottom: '1rem' 
          }}>
            <button 
              onClick={() => setActiveTab('instructions')} 
              className={`cyber-btn ${activeTab === 'instructions' ? 'active-tab' : ''}`}
              style={{ flex: 1, padding: '1rem', opacity: activeTab === 'instructions' ? 1 : 0.5, borderBottom: activeTab === 'instructions' ? '2px solid var(--accent-main)' : '1px solid transparent', borderRadius: '8px 8px 0 0' }}
            >
              <i className="ri-file-list-3-line" style={{ marginRight: '0.5rem' }}></i> INSTRUCTIONS
            </button>
            <button 
              onClick={() => setActiveTab('candidates')} 
              className={`cyber-btn ${activeTab === 'candidates' ? 'active-tab' : ''}`}
              style={{ flex: 1, padding: '1rem', opacity: activeTab === 'candidates' ? 1 : 0.5, borderBottom: activeTab === 'candidates' ? '2px solid var(--accent-main)' : '1px solid transparent', borderRadius: '8px 8px 0 0' }}
            >
              <i className="ri-profile-line" style={{ marginRight: '0.5rem' }}></i> CANDIDATE PROFILES
            </button>
            <button 
              onClick={() => setActiveTab('voting')} 
              className={`cyber-btn ${activeTab === 'voting' ? 'active-tab' : ''}`}
              style={{ flex: 1, padding: '1rem', opacity: activeTab === 'voting' ? 1 : 0.5, borderBottom: activeTab === 'voting' ? '2px solid var(--accent-main)' : '1px solid transparent', borderRadius: '8px 8px 0 0' }}
            >
              <i className="ri-check-double-line" style={{ marginRight: '0.5rem' }}></i> ACTIVE ELECTION
            </button>
          </div>

          {renderTabContent()}

        </div>
      </div>
    </div>
  );
};

export default VoterDashboard;
