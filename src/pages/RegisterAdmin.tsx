import React, { useState } from 'react';
import './LoginAdmin.css';

interface RegisterAdminProps {
  onGoLogin: () => void;
}

const RegisterAdmin: React.FC<RegisterAdminProps> = ({ onGoLogin }) => {
  const [form, setForm] = useState({
    fullName: '', email: '', username: '', password: '', confirm: '',
  });
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setTouched({ ...touched, [e.target.name]: true });
  };

  const getError = (field: string) => {
    if (!touched[field]) return '';
    if (field === 'fullName' && !form.fullName) return 'Full name is required.';
    if (field === 'email') {
      if (!form.email) return 'Email is required.';
      if (!/\S+@\S+\.\S+/.test(form.email)) return 'Enter a valid email.';
    }
    if (field === 'username' && !form.username) return 'Username is required.';
    if (field === 'password') {
      if (!form.password) return 'Password is required.';
      if (form.password.length < 6) return 'Must be at least 6 characters.';
    }
    if (field === 'confirm') {
      if (!form.confirm) return 'Please confirm your password.';
      if (form.confirm !== form.password) return 'Passwords do not match.';
    }
    return '';
  };

  const handleRegister = async () => {
    // mark all touched
    setTouched({ fullName: true, email: true, username: true, password: true, confirm: true });
    if (!form.fullName || !form.email || !form.username || !form.password || !form.confirm) {
      setError('Please fill in all fields.'); return;
    }
    if (!/\S+@\S+\.\S+/.test(form.email)) { setError('Enter a valid email.'); return; }
    if (form.password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (form.password !== form.confirm) { setError('Passwords do not match.'); return; }

    setLoading(true); setError('');
    try {
      const res  = await fetch('http://localhost/oinkmate-api/auth/register.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) { setSuccess(true); }
      else { setError(data.message); }
    } catch {
      setError('Cannot connect to server. Make sure XAMPP is running.');
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-left">
        <div className="auth-left-content">
          <div className="auth-left-label">OinkMate Admin Portal</div>
          <h1 className="auth-left-heading">
            Smart Piggery.<br /><span>Smarter</span><br />Management.
          </h1>
          <p className="auth-left-desc">
            Raspberry Pi-Based Automated Sanitation and Smart Feeding
            System for Piggeries. Monitor, manage, and act — all in one place.
          </p>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-card">
          <div className="auth-card-logo">
            <img src="/src/assets/images/systemlogo.png" alt="OinkMate" />
          </div>
          <div className="auth-logo-divider" />

          {success ? (
            <div className="auth-success">
              <div className="success-icon">✓</div>
              <h2>Account Created!</h2>
              <p>Your admin account has been registered successfully.</p>
              <button className="auth-btn" onClick={onGoLogin}>Back to Sign In</button>
            </div>
          ) : (
            <>
              <div className="auth-header">
                <div className="auth-eyebrow">Admin Portal</div>
                <h2>Create account</h2>
                <p>Register a new administrator account.</p>
              </div>

              <div className="auth-form">
                {[
                  { name: 'fullName', label: 'Full Name',        type: 'text',     placeholder: 'Enter your full name'     },
                  { name: 'email',    label: 'Email',            type: 'email',    placeholder: 'Enter your email address' },
                  { name: 'username', label: 'Username',         type: 'text',     placeholder: 'Choose a username'        },
                  { name: 'password', label: 'Password',         type: 'password', placeholder: 'Create a password'        },
                  { name: 'confirm',  label: 'Confirm Password', type: 'password', placeholder: 'Repeat your password'     },
                ].map(({ name, label, type, placeholder }) => (
                  <div className="form-group" key={name}>
                    <label>{label}</label>
                    <input
                      type={type}
                      name={name}
                      placeholder={placeholder}
                      value={form[name as keyof typeof form]}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      disabled={loading}
                      className={getError(name) ? 'input-error' : ''}
                    />
                    {getError(name) && (
                      <span className="field-error">⚠ {getError(name)}</span>
                    )}
                  </div>
                ))}

                {error && <div className="auth-error">⚠ {error}</div>}

                <button className="auth-btn" onClick={handleRegister} disabled={loading}>
                  {loading ? 'Creating account...' : 'Create Account'}
                </button>

                <div className="auth-footer-text">
                  Already have an account?{' '}
                  <button className="auth-link" onClick={onGoLogin}>Sign in here</button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default RegisterAdmin;