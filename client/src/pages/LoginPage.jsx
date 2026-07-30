import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './LoginPage.css';

export default function LoginPage() {
  const navigate = useNavigate();
  const { user, login, loginAsGuest } = useAuth();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const handleGuestLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await loginAsGuest();
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Guest login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      await login(formData.email, formData.password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <Link to="/" className="back-home-link">
          ← Back to Home
        </Link>
        <div className="auth-header">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
            <rect x="2" y="2" width="9" height="9" rx="2" fill="#579DFF"/>
            <rect x="13" y="2" width="9" height="5" rx="2" fill="#579DFF"/>
            <rect x="2" y="13" width="9" height="9" rx="2" fill="#579DFF"/>
            <rect x="13" y="9" width="9" height="13" rx="2" fill="#579DFF"/>
          </svg>
          <h1>Welcome to TaskFlow</h1>
          <p className="auth-subtitle">Sign in to continue</p>
        </div>
        
        {error && <div className="auth-error">{error}</div>}
        
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              placeholder="Enter your email"
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              placeholder="Enter your password"
              required
            />
          </div>
          
          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

          <div className="auth-divider"><span>OR</span></div>

          <button 
            type="button" 
            className="guest-auth-button" 
            disabled={loading}
            onClick={handleGuestLogin}
          >
            ⚡ Continue as Guest (Instant Access)
          </button>
        </form>
        
        <p className="auth-footer">
          Don't have an account? <Link to="/register">Sign up</Link>
        </p>
      </div>
    </div>
  );
}
