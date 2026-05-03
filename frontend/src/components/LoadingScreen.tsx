import { useEffect, useState, useRef } from 'react';
import './LoadingScreen.css';

interface LoadingScreenProps {
  onComplete: () => void;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ onComplete }) => {
  const [fading, setFading] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  /* ── Particle canvas ── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const particles: { x: number; y: number; vx: number; vy: number; r: number; alpha: number }[] = [];
    for (let i = 0; i < 90; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        r: Math.random() * 1.4 + 0.4,
        alpha: Math.random() * 0.5 + 0.15,
      });
    }

    let raf: number;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(56,189,248,${p.alpha})`;
        ctx.fill();
      });

      // Draw faint connection lines
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 110) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(56,189,248,${0.12 * (1 - dist / 110)})`;
            ctx.lineWidth = 0.5;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }
      raf = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(raf);
    };
  }, []);

  /* ── Exit timing ── */
  useEffect(() => {
    const t = setTimeout(() => {
      setFading(true);
      setTimeout(() => onComplete(), 700);
    }, 2800);
    return () => clearTimeout(t);
  }, [onComplete]);

  return (
    <div className={`vz-loading ${fading ? 'vz-fade-out' : ''}`}>
      {/* particle field */}
      <canvas ref={canvasRef} className="vz-canvas" />

      <div className="vz-glow" />

      <div className="vz-content">
        {/* glitch title */}
        <h1 className="vz-title" data-text="VOTEZONE">
          <span className="vz-word vz-vote">VOTE</span>
          <span className="vz-word vz-zone">ZONE</span>
        </h1>

        {/* sweep bar */}
        <div className="vz-bar-wrap">
          <div className="vz-bar" />
        </div>
      </div>

      {/* animated corners */}
      <div className="vz-corner vz-tl" />
      <div className="vz-corner vz-tr" />
      <div className="vz-corner vz-bl" />
      <div className="vz-corner vz-br" />
    </div>
  );
};

export default LoadingScreen;
