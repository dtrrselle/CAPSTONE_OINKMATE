import React, { useState } from 'react';
import './LoginAdmin.css';

interface ForgotPasswordAdminProps {
  onGoLogin: () => void;
}

type Step = 'email' | 'otp' | 'reset' | 'done';

const ForgotPasswordAdmin: React.FC<ForgotPasswordAdminProps> = ({ onGoLogin }) => {
  const [step, setStep]         = useState<Step>('email');
  const [email, setEmail]       = useState('');
  const [otp, setOtp]           = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const steps = ['email', 'otp', 'reset'];

  const handleSendOtp = async () => {
    if (!email) { setError('Please enter your email.'); return; }
    setLoading(true); setError('');
    try {
      const res  = await fetch('http://localhost/oinkmate-api/auth/forgot-password.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.success) { setStep('otp'); }
      else { setError(data.message); }
    } catch {
      setError('Cannot connect to server. Make sure XAMPP is running.');
    } finally { setLoading(false); }
  };

  const handleVerifyOtp = async () => {
    if (!otp) { setError('Please enter the OTP code.'); return; }
    setLoading(true); setError('');
    try {
      const res  = await fetch('http://localhost/oinkmate-api/auth/verify-otp.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      });
      const data = await res.json();
      if (data.success) { setStep('reset'); }
      else { setError(data.message); }
    } catch {
      setError('Cannot connect to server. Make sure XAMPP is running.');
    } finally { setLoading(false); }
  };

  const handleReset = async () => {
    if (!password || !confirm) { setError('Please fill in all fields.'); return; }
    if (password !== confirm)   { setError('Passwords do not match.'); return; }
    if (password.length < 6)    { setError('Password must be at least 6 characters.'); return; }
    setLoading(true); setError('');
    try {
      const res  = await fetch('http://localhost/oinkmate-api/auth/reset-password.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, password, confirm }),
      });
      const data = await res.json();
      if (data.success) { setStep('done'); }
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

      <div className="auth-right">
        <div className="auth-card">
          <div className="auth-card-logo">
            <img src="/src/assets/images/systemlogo.png" alt="OinkMate" />
          </div>
          <div className="auth-logo-divider" />

          {step === 'done' ? (
            <div className="auth-success">
              <div className="success-icon">✓</div>
              <h2>Password Reset!</h2>
              <p>Your password has been updated successfully. You can now sign in.</p>
              <button className="auth-btn" onClick={onGoLogin}>Back to Sign In</button>
            </div>
          ) : (
            <>
              {/* Step indicator */}
              <div className="otp-steps">
                {steps.map((s, i) => (
                  <div key={s} className={`otp-step ${step === s ? 'active' : steps.indexOf(step) > i ? 'done' : ''}`}>
                    <div className="otp-step-dot">
                      {steps.indexOf(step) > i ? '✓' : i + 1}
                    </div>
                    {i < steps.length - 1 && <div className="otp-step-line" />}
                  </div>
                ))}
              </div>

              <div className="auth-header">
                <div className="auth-eyebrow">Password Recovery</div>
                <h2>
                  {step === 'email' && 'Forgot password?'}
                  {step === 'otp'   && 'Check your email'}
                  {step === 'reset' && 'New password'}
                </h2>
                <p>
                  {step === 'email' && "Enter your registered email and we'll send a reset code."}
                  {step === 'otp'   && `We sent a 6-digit code to ${email}.`}
                  {step === 'reset' && 'Choose a strong new password.'}
                </p>
              </div>

              <div className="auth-form">
                {step === 'email' && (
                  <div className="form-group">
                    <label>Email Address</label>
                    <input type="email" placeholder="Enter your registered email"
                      value={email} onChange={(e) => setEmail(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendOtp()}
                      disabled={loading} />
                  </div>
                )}

                {step === 'otp' && (
                  <div className="form-group">
                    <label>6-Digit OTP Code</label>
                    <input
                      type="text"
                      placeholder="Enter OTP code"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      onKeyDown={(e) => e.key === 'Enter' && handleVerifyOtp()}
                      disabled={loading}
                      maxLength={6}
                      style={{ letterSpacing: '0.2em', fontSize: 20, fontWeight: 800, textAlign: 'center' }}
                    />
                  </div>
                )}

                {step === 'reset' && (
                  <>
                    <div className="form-group">
                      <label>New Password</label>
                      <input type="password" placeholder="Create a new password"
                        value={password} onChange={(e) => setPassword(e.target.value)} disabled={loading} />
                    </div>
                    <div className="form-group">
                      <label>Confirm Password</label>
                      <input type="password" placeholder="Repeat your new password"
                        value={confirm} onChange={(e) => setConfirm(e.target.value)} disabled={loading} />
                    </div>
                  </>
                )}

                {error && <div className="auth-error">{error}</div>}

                {step === 'email' && (
                  <button className="auth-btn" onClick={handleSendOtp} disabled={loading}>
                    {loading ? 'Sending...' : 'Send Reset Code'}
                  </button>
                )}
                {step === 'otp' && (
                  <>
                    <button className="auth-btn" onClick={handleVerifyOtp} disabled={loading}>
                      {loading ? 'Verifying...' : 'Verify Code'}
                    </button>
                    <div className="auth-footer-text">
                      Didn't get the code?{' '}
                      <button className="auth-link" onClick={handleSendOtp} disabled={loading}>Resend</button>
                    </div>
                  </>
                )}
                {step === 'reset' && (
                  <button className="auth-btn" onClick={handleReset} disabled={loading}>
                    {loading ? 'Resetting...' : 'Reset Password'}
                  </button>
                )}

                <div className="auth-footer-text">
                  <button className="auth-link" onClick={onGoLogin}>← Back to Sign In</button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordAdmin;