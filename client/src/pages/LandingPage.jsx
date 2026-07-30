import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './LandingPage.css';

export default function LandingPage() {
  const navigate = useNavigate();
  const { user, loginAsGuest } = useAuth();
  const [guestLoading, setGuestLoading] = useState(false);
  const canvasRef = useRef(null);

  // Shader Background Animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext('webgl');
    if (!gl) return;

    const vertexSrc = `
      attribute vec2 position;
      varying vec2 v_texCoord;
      void main() {
        v_texCoord = position * 0.5 + 0.5;
        gl_Position = vec4(position, 0.0, 1.0);
      }
    `;

    const fragmentSrc = `
      precision highp float;
      uniform float u_time;
      uniform vec2 u_resolution;
      varying vec2 v_texCoord;

      void main() {
          vec2 uv = v_texCoord;
          vec3 color1 = vec3(0.043, 0.075, 0.149);
          vec3 color2 = vec3(0.075, 0.043, 0.149);
          float noise = sin(uv.x * 2.0 + u_time * 0.5) * cos(uv.y * 2.0 + u_time * 0.3);
          vec3 baseColor = mix(color1, color2, noise * 0.5 + 0.5);
          vec2 glowPos = vec2(0.5 + 0.3 * sin(u_time * 0.2), 0.5 + 0.3 * cos(u_time * 0.3));
          float dist = length(uv - glowPos);
          vec3 glow = vec3(0.486, 0.227, 0.929) * (1.0 - smoothstep(0.0, 0.8, dist)) * 0.15;
          gl_FragColor = vec4(baseColor + glow, 1.0);
      }
    `;

    const createShader = (gl, type, source) => {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      return shader;
    };

    const program = gl.createProgram();
    const vertShader = createShader(gl, gl.VERTEX_SHADER, vertexSrc);
    const fragShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentSrc);
    gl.attachShader(program, vertShader);
    gl.attachShader(program, fragShader);
    gl.linkProgram(program);
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);

    const posLoc = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    const timeLoc = gl.getUniformLocation(program, 'u_time');
    const resLoc = gl.getUniformLocation(program, 'u_resolution');

    let animationFrameId;
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(resLoc, canvas.width, canvas.height);
    };

    window.addEventListener('resize', resize);
    resize();

    const render = (time) => {
      gl.uniform1f(timeLoc, time * 0.001);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      animationFrameId = requestAnimationFrame(render);
    };
    animationFrameId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  // Mockup Cursor Animation
  const [moved, setMoved] = useState(false);
  useEffect(() => {
    const interval = setInterval(() => {
      setMoved(prev => !prev);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleGuestExplore = async () => {
    setGuestLoading(true);
    try {
      await loginAsGuest();
      navigate('/dashboard');
    } catch (err) {
      console.error('Guest explore error:', err);
    } finally {
      setGuestLoading(false);
    }
  };

  return (
    <div className="landing-page font-body-lg">
      <canvas ref={canvasRef} id="shader-canvas" />

      {/* Header */}
      <header className="landing-header">
        <div className="landing-header-inner">
          <div className="logo-container">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <rect x="2" y="2" width="9" height="9" rx="2" fill="#579DFF"/>
              <rect x="13" y="2" width="9" height="5" rx="2" fill="#579DFF"/>
              <rect x="2" y="13" width="9" height="9" rx="2" fill="#579DFF"/>
              <rect x="13" y="9" width="9" height="13" rx="2" fill="#579DFF"/>
            </svg>
            <span className="logo-text">TaskFlow</span>
          </div>

          <div className="header-actions">
            {user ? (
              <button onClick={() => navigate('/dashboard')} className="btn-primary">
                Go to Dashboard
              </button>
            ) : (
              <>
                <Link to="/login" className="btn-secondary">Log In</Link>
                <Link to="/register" className="btn-primary">Sign Up</Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="landing-main">
        <div className="content-container">
          {/* Hero Section */}
          <section className="hero-section">
            <div className="hero-text">
              <h1 className="hero-title">
                TaskFlow: <span className="highlight-text">Real-time</span> Kanban
              </h1>
              <p className="hero-subtitle">
                The ultra-fast board for modern teams. Powered by WebSockets for instant updates.
              </p>
              <div className="hero-buttons">
                {user ? (
                  <button onClick={() => navigate('/dashboard')} className="btn-hero-primary">
                    Open Your Dashboard
                  </button>
                ) : (
                  <>
                    <button onClick={() => navigate('/register')} className="btn-hero-primary">
                      Get Started Now
                    </button>
                    <button onClick={handleGuestExplore} className="btn-hero-guest" disabled={guestLoading}>
                      {guestLoading ? 'Connecting...' : '⚡ Explore as Guest'}
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Stylized Kanban Mockup */}
            <div className="kanban-mockup-wrapper glass-card">
              <div className="mockup-columns">
                {/* Column 1 */}
                <div className="mockup-column">
                  <div className="col-bar"></div>
                  <div className="mockup-card primary-border">
                    <div className="card-line-lg"></div>
                    <div className="card-line-sm"></div>
                  </div>
                  <div 
                    className="mockup-card moving-card"
                    style={{
                      transform: moved ? 'translateX(calc(100% + 1rem))' : 'translateX(0)',
                      transition: 'transform 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}
                  >
                    <div className="card-header-pulse">
                      <div className="card-line-md"></div>
                      <div className="pulse-dot"></div>
                    </div>
                    <div className="card-line-full"></div>
                  </div>
                </div>

                {/* Column 2 */}
                <div className="mockup-column dashed-column">
                  <div className="col-bar"></div>
                </div>
              </div>

              {/* Ghost Cursor */}
              <div 
                className="ghost-cursor"
                style={{
                  left: moved ? '60%' : '20%',
                  top: moved ? '70%' : '40%',
                  transition: 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="#4EDEA3">
                  <path d="M3 3l7 18 3-7 7-3L3 3z"/>
                </svg>
                <div className="cursor-label glass-card">Sarah is moving card...</div>
              </div>
            </div>
          </section>

          {/* Simplified Features */}
          <section className="features-section">
            <div className="feature-card glass-card">
              <div className="feature-icon icon-purple">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
                </svg>
              </div>
              <h3>Live Sync</h3>
              <p>Real-time WebSocket updates across all team members instantly.</p>
            </div>

            <div className="feature-card glass-card">
              <div className="feature-icon icon-green">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                </svg>
              </div>
              <h3>Zero Latency</h3>
              <p>Instant interaction with zero lag for modern collaborative workflows.</p>
            </div>

            <div className="feature-card glass-card">
              <div className="feature-icon icon-purple">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7" rx="1"/>
                  <rect x="14" y="3" width="7" height="7" rx="1"/>
                  <rect x="14" y="14" width="7" height="7" rx="1"/>
                  <rect x="3" y="14" width="7" height="7" rx="1"/>
                </svg>
              </div>
              <h3>Minimalist Workspace</h3>
              <p>Clean, focused visual interface for maximum productivity and clarity.</p>
            </div>
          </section>

          {/* CTA Section */}
          <section className="cta-section">
            <div className="cta-box glass-card">
              <h2>Ready to accelerate your workflow?</h2>
              <div className="cta-buttons">
                <button onClick={handleGuestExplore} className="btn-cta-guest" disabled={guestLoading}>
                  {guestLoading ? 'Connecting...' : 'Explore as Guest'}
                </button>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
