import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './Login.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

const CanvasBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let particlesArray: any[] = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      init();
    };
    window.addEventListener('resize', resize);

    class Particle {
      x: number; y: number; dx: number; dy: number; size: number;
      constructor(x: number, y: number, dx: number, dy: number, size: number) {
        this.x = x; this.y = y; this.dx = dx; this.dy = dy; this.size = size;
      }
      draw() {
        ctx!.beginPath();
        ctx!.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx!.fillStyle = 'rgba(56, 189, 248, 0.6)'; // Blue, higher opacity
        ctx!.fill();
      }
      update() {
        if (this.x > canvas!.width || this.x < 0) this.dx = -this.dx;
        if (this.y > canvas!.height || this.y < 0) this.dy = -this.dy;
        this.x += this.dx;
        this.y += this.dy;
        this.draw();
      }
    }

    const init = () => {
      particlesArray = [];
      let num = (canvas.width * canvas.height) / 12000;
      for (let i = 0; i < num; i++) {
        let size = Math.random() * 1.5 + 0.5;
        let x = Math.random() * canvas.width;
        let y = Math.random() * canvas.height;
        let dx = (Math.random() - 0.5) * 1.0;
        let dy = (Math.random() - 0.5) * 1.0;
        particlesArray.push(new Particle(x, y, dx, dy, size));
      }
    };

    const connect = () => {
      for (let a = 0; a < particlesArray.length; a++) {
        for (let b = a; b < particlesArray.length; b++) {
          let dist = ((particlesArray[a].x - particlesArray[b].x) ** 2) + ((particlesArray[a].y - particlesArray[b].y) ** 2);
          if (dist < (canvas.width / 10) * (canvas.height / 10)) {
            let opacity = 1 - (dist / 15000);
            ctx!.strokeStyle = `rgba(56, 189, 248, ${opacity * 0.3})`; // Higher opacity blue
            ctx!.lineWidth = 1;
            ctx!.beginPath();
            ctx!.moveTo(particlesArray[a].x, particlesArray[a].y);
            ctx!.lineTo(particlesArray[b].x, particlesArray[b].y);
            ctx!.stroke();
          }
        }
      }
    };

    let frame: number;
    const animate = () => {
      frame = requestAnimationFrame(animate);
      ctx!.clearRect(0, 0, innerWidth, innerHeight);
      for (let i = 0; i < particlesArray.length; i++) particlesArray[i].update();
      connect();
    };

    resize();
    animate();
    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(frame);
    };
  }, []);

  return <canvas ref={canvasRef} className="cyber-canvas" />;
};

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [role, setRole] = useState<'student' | 'admin'>('student');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [initialCheckDone, setInitialCheckDone] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedRole = localStorage.getItem('user_role');
    if (token && storedRole) {
      setSuccess(true);
      setRole(storedRole as 'student' | 'admin');
      if (storedRole === 'admin') navigate('/admin');
    }
    setInitialCheckDone(true);
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    const endpoint = role === 'student' ? '/students/login' : '/admins/login';
    const payload = role === 'student' ? { roll_no: identifier, password } : { username: identifier, password };
    
    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || 'Authentication Failure');
      }
      const data = await response.json();
      if (data.access_token) {
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('user_role', role);
      }
      setSuccess(true);
      if (role === 'admin') {
        setTimeout(() => navigate('/admin'), 1500);
      }
    } catch (err: any) {
      setError(err.message || 'System Connection Error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user_role');
    setSuccess(false);
    setError(null);
    setIdentifier('');
    setPassword('');
  };

  return (
    <div className="csea-layout">
      <CanvasBackground />
      
      {success && (
        <button 
          onClick={handleLogout} 
          style={{ 
            position: 'fixed', 
            top: '2rem', 
            right: '2rem', 
            background: 'rgba(239, 68, 68, 0.15)', 
            color: '#ef4444', 
            border: '1px solid rgba(239, 68, 68, 0.4)',
            borderRadius: '6px',
            padding: '0.6rem 1.2rem',
            fontSize: '0.75rem',
            fontFamily: 'var(--font-display)',
            cursor: 'pointer',
            letterSpacing: '2px',
            zIndex: 100,
            backdropFilter: 'blur(8px)',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.25)';
            e.currentTarget.style.boxShadow = '0 0 15px rgba(239, 68, 68, 0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <i className="ri-logout-box-r-line" style={{ marginRight: '0.5rem' }}></i>
          LOGOUT
        </button>
      )}
      
      {/* Background Decorative Rings */}
      <div className="cyber-ring ring-1"></div>
      <div className="cyber-ring ring-2"></div>

      <div className="csea-container">
        
        <div className="panel-header">
          <h1 className="glitch-title">VoteZone</h1>
          <div className="status-indicator">
            <span className="blink-dot"></span> SYSTEM ONLINE
          </div>
        </div>

        <div className="panel-body">
          {!success && (
            <div className="role-selector">
              <button 
                className={`role-btn ${role === 'student' ? 'active' : ''}`}
                onClick={() => { setRole('student'); setError(null); setIdentifier(''); }}
                type="button"
              >
                <i className="ri-user-4-line"></i> STUDENT
              </button>
              <button 
                className={`role-btn ${role === 'admin' ? 'active' : ''}`}
                onClick={() => { setRole('admin'); setError(null); setIdentifier(''); }}
                type="button"
              >
                <i className="ri-admin-line"></i> ADMIN
              </button>
            </div>
          )}

          {success ? (
            <div className="success-state">
              <i className="ri-shield-check-line auth-icon"></i>
              <h2 className="neon-text">ACCESS GRANTED</h2>
              {role === 'admin' ? (
                <p style={{ marginTop: '1.5rem', letterSpacing: '2px', color: 'var(--accent-main)' }}>
                  INITIALIZING SECURE UPLINK...
                </p>
              ) : (
                <div style={{ marginTop: '3.5rem' }}>
                  <div style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '0.6rem',
                    letterSpacing: '3px',
                    color: 'rgba(125,211,252,0.45)',
                    marginBottom: '1rem'
                  }}>SELECT YOUR ROLE TO CONTINUE</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    <button onClick={() => navigate('/voter')} className="cyber-btn">
                      <i className="ri-check-double-line" style={{ marginRight: '0.5rem' }}></i>
                      VOTER PORTAL
                    </button>
                    <button onClick={() => navigate('/candidate')} className="cyber-btn"
                      style={{ borderColor: 'rgba(125,211,252,0.25)', color: 'rgba(125,211,252,0.6)' }}>
                      <i className="ri-user-star-line" style={{ marginRight: '0.5rem' }}></i>
                      CANDIDATE PORTAL
                    </button>
                  </div>
                  <div style={{
                    marginTop: '2rem',
                    paddingTop: '1.2rem',
                    borderTop: '1px solid rgba(56,189,248,0.08)',
                    fontFamily: 'var(--font-display)',
                    fontSize: '1.1rem',
                    fontWeight: 700,
                    letterSpacing: '5px',
                    color: 'rgba(56,189,248,0.35)'
                  }}></div>
                </div>
              )}
            </div>
          ) : (
            <form className="cyber-form" onSubmit={handleSubmit}>
              
              <div className="input-box">
                <i className="ri-terminal-box-line input-icon"></i>
                <input 
                  type="text" 
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder={role === 'student' ? 'ENTER ROLL NO' : 'ENTER ADMIN ID'}
                  required
                />
              </div>

              <div className="input-box">
                <i className="ri-lock-password-line input-icon"></i>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="ENTER PASSWORD"
                  required
                />
              </div>

              {error && (
                <div className="error-box">
                  <i className="ri-error-warning-line"></i> {error}
                </div>
              )}

              <button type="submit" className="cyber-btn" disabled={isLoading}>
                {isLoading ? 'VERIFYING...' : 'INITIALIZE LOGIN'}
              </button>

              {role === 'student' && (
                <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                  <Link to="/register" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.85rem', letterSpacing: '1px', transition: 'color 0.3s' }} onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent-main)'} onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}>
                    [ NO PROFILE DETECTED? INITIATE REGISTRATION ]
                  </Link>
                </div>
              )}
            </form>
          )}
          
        </div>
      </div>
    </div>
  );
};

export default Login;
