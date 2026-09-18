import React, { useState } from 'react';
import './LoginAdmin.css';

interface LoginAdminProps {
  onLogin: (admin: { id: number; full_name: string; username: string }) => void;
  onGoRegister: () => void;
  onGoForgot: () => void;
}

const LoginAdmin: React.FC<LoginAdminProps> = ({ onLogin, onGoRegister, onGoForgot }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const handleLogin = async () => {
    if (!username || !password) { setError('Please fill in all fields.'); return; }
    setLoading(true); setError('');
    try {
      const res  = await fetch('http://localhost/oinkmate-api/auth/login.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (data.success) { onLogin(data.admin); }
      else { setError(data.message); }
    } catch {
      setError('Cannot connect to server. Make sure XAMPP is running.');
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      {/* Left — solid green, no stats */}
      <div className="auth-left">
        <div className="auth-left-content">
          <div className="auth-left-label">OinkMate Admin Portal</div>
          <h1 className="auth-left-heading">
            Smart Piggery.<br />
            <span>Smarter</span><br />
            Management.
          </h1>
          <p className="auth-left-desc">
            Raspberry Pi-Based Automated Sanitation and Smart
            Feeding System for Piggeries. Monitor, manage, and
            act — all in one place.
          </p>
        </div>
      </div>

      {/* Right — form with logo on top */}
      <div className="auth-right">
        <div className="auth-card">
          {/* Logo */}
          <div className="auth-card-logo">
            <img src="/src/assets/images/systemlogo.png" alt="OinkMate" />
          </div>
          <div className="auth-logo-divider" />

          <div className="auth-header">
            <div className="auth-eyebrow">Admin Portal</div>
            <h2>Welcome back</h2>
            <p>Sign in to your account to continue.</p>
          </div>

          <div className="auth-form">
            <div className="form-group">
              <label>Username</label>
              <input
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                disabled={loading}
              />
            </div>

            <div className="auth-forgot">
              <button className="auth-link small" onClick={onGoForgot}>
                Forgot password?
              </button>
            </div>

            {error && <div className="auth-error">{error}</div>}

            <button className="auth-btn" onClick={handleLogin} disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>

            <div className="auth-footer-text">
              Don't have an account?{' '}
              <button className="auth-link" onClick={onGoRegister}>
                Register here
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginAdmin;