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

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [activeTab, setActiveTab] = useState<'students' | 'candidates' | 'elections'>('students');

  useEffect(() => {
    const fetchStudents = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }
      try {
        const res = await fetch(`${API_URL}/students/all`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (!res.ok) {
          throw new Error('Failed to fetch students. Root access required.');
        }
        const data = await res.json();
        setStudents(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    if (activeTab === 'students') {
      fetchStudents();
    }
  }, [navigate, activeTab]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const renderTabContent = () => {
    if (activeTab === 'students') {
      return (
        <div className="table-container" style={{ 
          background: 'rgba(0, 0, 0, 0.2)', 
          border: '1px solid var(--glass-border)',
          borderRadius: '8px',
          overflow: 'auto',
          maxHeight: '400px',
          marginBottom: '2rem'
        }}>
          {loading ? (
            <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--accent-main)' }}>
              SCANNING DATABASE...
            </p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', color: 'var(--text-main)' }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 1, background: 'rgba(3, 7, 18, 0.95)' }}>
                <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                  <th style={{ padding: '1rem', color: 'var(--accent-main)', letterSpacing: '1px' }}>ID</th>
                  <th style={{ padding: '1rem', color: 'var(--accent-main)', letterSpacing: '1px' }}>NAME</th>
                  <th style={{ padding: '1rem', color: 'var(--accent-main)', letterSpacing: '1px' }}>ROLL NO</th>
                  <th style={{ padding: '1rem', color: 'var(--accent-main)', letterSpacing: '1px' }}>YEAR</th>
                  <th style={{ padding: '1rem', color: 'var(--accent-main)', letterSpacing: '1px' }}>ROLE</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.id} style={{ borderBottom: '1px solid rgba(56, 189, 248, 0.05)' }}>
                    <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>{s.id}</td>
                    <td style={{ padding: '1rem' }}>{s.name}</td>
                    <td style={{ padding: '1rem', fontFamily: 'var(--font-sans)', textTransform: 'uppercase' }}>{s.roll_no}</td>
                    <td style={{ padding: '1rem' }}>{s.year}</td>
                    <td style={{ padding: '1rem' }}>
                      {s.is_candidate ? (
                        <span style={{ color: '#fb7185', background: 'rgba(251, 113, 133, 0.1)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem' }}>CANDIDATE</span>
                      ) : (
                        <span style={{ color: '#34d399', background: 'rgba(52, 211, 153, 0.1)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem' }}>VOTER</span>
                      )}
                    </td>
                  </tr>
                ))}
                {students.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      NO PROFILES FOUND IN DATABASE
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
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
          <i className="ri-user-received-line" style={{ fontSize: '3rem', color: 'var(--text-muted)', marginBottom: '1rem', display: 'block' }}></i>
          <p style={{ color: 'var(--text-main)', fontSize: '1.2rem', marginBottom: '0.5rem' }}>NO PENDING CANDIDATES</p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Awaiting data uplink from Candidate Registration server.</p>
        </div>
      );
    }

    if (activeTab === 'elections') {
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
          <i className="ri-bar-chart-box-line" style={{ fontSize: '3rem', color: 'var(--text-muted)', marginBottom: '1rem', display: 'block' }}></i>
          <p style={{ color: 'var(--text-main)', fontSize: '1.2rem', marginBottom: '0.5rem' }}>ELECTION TELEMETRY OFFLINE</p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Awaiting data uplink from Election Management server.</p>
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
            <h1 className="glitch-title" style={{ textAlign: 'left', marginBottom: '0.5rem' }}>ADMIN PROTOCOL</h1>
            <div className="status-indicator" style={{ display: 'flex' }}>
              <span className="blink-dot"></span> ROOT ACCESS GRANTED
            </div>
          </div>
          <button onClick={handleLogout} className="cyber-btn" style={{ padding: '0.8rem 1.5rem', marginTop: 0 }}>
            TERMINATE SESSION
          </button>
        </div>

        <div className="panel-body">
          {error && (
            <div className="error-box" style={{ marginBottom: '2rem' }}>
              <i className="ri-error-warning-line"></i> {error}
            </div>
          )}
          
          <div className="admin-tabs" style={{ 
            display: 'flex', 
            gap: '1rem', 
            marginBottom: '2rem', 
            borderBottom: '1px solid var(--glass-border)', 
            paddingBottom: '1rem' 
          }}>
            <button 
              onClick={() => setActiveTab('students')} 
              className={`cyber-btn ${activeTab === 'students' ? 'active-tab' : ''}`}
              style={{ flex: 1, padding: '1rem', opacity: activeTab === 'students' ? 1 : 0.5, borderBottom: activeTab === 'students' ? '2px solid var(--accent-main)' : '1px solid transparent', borderRadius: '8px 8px 0 0' }}
            >
              <i className="ri-team-line" style={{ marginRight: '0.5rem' }}></i> STUDENT DATABASE
            </button>
            <button 
              onClick={() => setActiveTab('candidates')} 
              className={`cyber-btn ${activeTab === 'candidates' ? 'active-tab' : ''}`}
              style={{ flex: 1, padding: '1rem', opacity: activeTab === 'candidates' ? 1 : 0.5, borderBottom: activeTab === 'candidates' ? '2px solid var(--accent-main)' : '1px solid transparent', borderRadius: '8px 8px 0 0' }}
            >
              <i className="ri-user-received-line" style={{ marginRight: '0.5rem' }}></i> CANDIDATE APPROVALS
            </button>
            <button 
              onClick={() => setActiveTab('elections')} 
              className={`cyber-btn ${activeTab === 'elections' ? 'active-tab' : ''}`}
              style={{ flex: 1, padding: '1rem', opacity: activeTab === 'elections' ? 1 : 0.5, borderBottom: activeTab === 'elections' ? '2px solid var(--accent-main)' : '1px solid transparent', borderRadius: '8px 8px 0 0' }}
            >
              <i className="ri-bar-chart-box-line" style={{ marginRight: '0.5rem' }}></i> ELECTION MGMT
            </button>
          </div>

          {renderTabContent()}

        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
