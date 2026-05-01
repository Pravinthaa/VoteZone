import React from 'react';
import '../components/Login.css';

const CandidateDashboard: React.FC = () => {
  return (
    <div className="csea-layout">
      <div className="cyber-ring ring-1"></div>
      <div className="cyber-ring ring-2"></div>
      <div className="csea-container" style={{ textAlign: 'center' }}>
        <div className="panel-header">
          <h1 className="glitch-title">CANDIDATE PROTOCOL</h1>
          <div className="status-indicator">
            <span className="blink-dot"></span> SECURE UPLINK ESTABLISHED
          </div>
        </div>
        <div className="panel-body">
          <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
            Welcome to the Candidate Management Console.
          </p>
          <a href="/login" className="cyber-btn" style={{ display: 'inline-flex', textDecoration: 'none' }}>
            TERMINATE SESSION
          </a>
        </div>
      </div>
    </div>
  );
};

export default CandidateDashboard;
