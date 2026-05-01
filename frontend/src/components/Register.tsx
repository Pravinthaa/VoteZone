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
        ctx!.fillStyle = 'rgba(56, 189, 248, 0.6)';
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
            ctx!.strokeStyle = `rgba(56, 189, 248, ${opacity * 0.3})`;
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

const Register: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    roll_no: '',
    year: '',
    email: '',
    password: '',
    confirm_password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // Frontend Validations to match Backend constraints
    const rollRegex = /^[0-9]{2}[a-zA-Z]{1,2}[0-9]{3}$/;
    if (!rollRegex.test(formData.roll_no)) {
      setError('Invalid Roll No format (e.g., 21z223)');
      setIsLoading(false);
      return;
    }
    const expectedEmail = `${formData.roll_no}@psgtech.ac.in`.toLowerCase();
    if (formData.email.toLowerCase() !== expectedEmail) {
      setError(`Email must be ${expectedEmail}`);
      setIsLoading(false);
      return;
    }
    if (formData.password !== formData.confirm_password) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/students/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          roll_no: formData.roll_no,
          year: parseInt(formData.year),
          email: formData.email,
          password: formData.password
        }),
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || 'Registration Failed');
      }
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err: any) {
      setError(err.message || 'System Connection Error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="csea-layout">
      <CanvasBackground />
      
      <div className="cyber-ring ring-1"></div>
      <div className="cyber-ring ring-2"></div>

      <div className="csea-container" style={{ width: '480px', height: 'auto', minHeight: '500px', padding: '2.5rem 2rem' }}>
        
        <div className="panel-header" style={{ marginBottom: '2rem' }}>
          <h1 className="glitch-title" style={{ fontSize: '1.8rem' }}>REGISTRATION</h1>
          <div className="status-indicator">
            <span className="blink-dot"></span> NEW PROFILE CREATION
          </div>
        </div>

        <div className="panel-body">
          {success ? (
            <div className="success-state">
              <i className="ri-user-add-line auth-icon"></i>
              <h2 className="neon-text">PROFILE CREATED</h2>
              <p>Routing to login terminal...</p>
            </div>
          ) : (
            <form className="cyber-form" onSubmit={handleSubmit} style={{ gap: '1.2rem' }}>
              
              <div className="input-box">
                <i className="ri-user-3-line input-icon"></i>
                <input 
                  type="text" 
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="FULL NAME"
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="input-box" style={{ flex: 2 }}>
                  <i className="ri-terminal-box-line input-icon"></i>
                  <input 
                    type="text" 
                    name="roll_no"
                    value={formData.roll_no}
                    onChange={handleChange}
                    placeholder="ROLL NO (e.g. 21z223)"
                    required
                  />
                </div>
                <div className="input-box" style={{ flex: 1 }}>
                  <i className="ri-calendar-line input-icon"></i>
                  <input 
                    type="number" 
                    name="year"
                    value={formData.year}
                    onChange={handleChange}
                    placeholder="YEAR"
                    min="1"
                    max="5"
                    required
                  />
                </div>
              </div>

              <div className="input-box">
                <i className="ri-mail-line input-icon"></i>
                <input 
                  type="email" 
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="INSTITUTION EMAIL"
                  required
                />
              </div>

              <div className="input-box">
                <i className="ri-lock-password-line input-icon"></i>
                <input 
                  type="password" 
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="PASSWORD"
                  required
                />
              </div>

              <div className="input-box">
                <i className="ri-lock-password-fill input-icon"></i>
                <input 
                  type="password" 
                  name="confirm_password"
                  value={formData.confirm_password}
                  onChange={handleChange}
                  placeholder="CONFIRM PASSWORD"
                  required
                />
              </div>

              {error && (
                <div className="error-box">
                  <i className="ri-error-warning-line"></i> {error}
                </div>
              )}

              <button type="submit" className="cyber-btn" disabled={isLoading} style={{ marginTop: '0' }}>
                {isLoading ? 'CREATING...' : 'ESTABLISH PROFILE'}
              </button>

              <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
                <Link to="/login" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.85rem', letterSpacing: '1px', transition: 'color 0.3s' }} onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent-main)'} onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}>
                  [ RETURN TO LOGIN TERMINAL ]
                </Link>
              </div>

            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Register;
