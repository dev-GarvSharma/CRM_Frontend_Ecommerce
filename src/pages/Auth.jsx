import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { ArrowRight, KeyRound, ShieldCheck, Sparkles } from 'lucide-react';
import { confirmVerification, isAdminAccount, login } from '../api/auth.js';
import LocalStorageService from '../admin/services/localStorageService.js';
import './auth.css';

export default function Auth() {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [challenge, setChallenge] = useState(null);
  const [purpose, setPurpose] = useState('login');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  if (LocalStorageService.getAccessToken() && isAdminAccount(LocalStorageService.getUserData())) {
    return <Navigate to="/admin" replace />;
  }

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const normalizedPhone = phone.trim().startsWith('+') ? phone.trim() : `+91${phone.trim()}`;
      if (!challenge) {
        const result = await login({ phone: normalizedPhone });
        const pending = result.data?.data;
        if (!result.success || !pending) {
          setError(result.message || 'Unable to request a verification code.');
          return;
        }
        setPurpose(pending.purpose || 'login');
        setChallenge(pending);
        if (pending.otp) setCode(String(pending.otp));
        return;
      }
      const result = await confirmVerification({ phone: normalizedPhone, purpose, code: code.trim() });
      const session = result.data?.data;
      if (!result.success || !session?.accessToken) {
        setError(result.message || 'That verification code is invalid or expired.');
        return;
      }
      if (!isAdminAccount(session.user)) {
        setError('This account does not have administrator access.');
        return;
      }
      LocalStorageService.setAuthData(session);
      navigate('/admin', { replace: true });
    } catch {
      setError('Unable to connect. Check your API settings and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="crm-login">
      <section className="crm-login-visual">
        <div className="crm-visual-top"><span className="crm-mark">E</span><span>ELSE Perfumes <small>ADMIN WORKSPACE</small></span></div>
        <div className="crm-visual-copy">
          <span className="crm-eyebrow"><Sparkles size={14} /> YOUR STORE, IN FOCUS</span>
          <h1>Everything<br />in its place.</h1>
          <p>Orders, inventory, customer care, and the details that keep your business moving.</p>
          <div className="crm-visual-note"><ShieldCheck size={18} /><span><strong>A secure space for your team</strong><small>Administrator access is verified on every sign in.</small></span></div>
        </div>
        <div className="crm-visual-footer">ELSE Perfumes <span>•</span> OPERATIONS</div>
      </section>
      <section className="crm-login-panel">
        <div className="crm-login-form-wrap">
          <div className="crm-mobile-brand"><span className="crm-mark">V</span><span>ELSE Perfumes <small>ADMIN WORKSPACE</small></span></div>
          <span className="crm-form-kicker">ADMINISTRATOR ACCESS</span>
          <h2>{challenge ? 'Check your phone' : 'Welcome back'}</h2>
          <p className="crm-form-intro">{challenge ? `Enter the verification code sent to ${challenge.destination || phone}.` : 'Sign in to manage your store and team.'}</p>
          <form className="crm-login-form" onSubmit={submit}>
            {!challenge ? <label>Mobile number<div className="crm-input-wrap"><span>+91</span><input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="98765 43210" autoComplete="tel-national" required /></div></label> : <label>Verification code<div className="crm-input-wrap"><KeyRound size={17} /><input inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Enter 6 digit code" maxLength={6} required /></div></label>}
            {challenge?.otp && <p className="crm-dev-code">Development code: <strong>{challenge.otp}</strong></p>}
            {error && <p className="crm-error" role="alert">{error}</p>}
            <button className="crm-submit" disabled={submitting}>{submitting ? 'Please wait…' : challenge ? 'Verify and continue' : 'Continue'} <ArrowRight size={17} /></button>
          </form>
          {challenge && <button className="crm-back-link" onClick={() => { setChallenge(null); setCode(''); setError(''); }}>Use a different number</button>}
          <p className="crm-help">Need access? <span>Contact your store administrator.</span></p>
        </div>
        <footer className="crm-panel-footer"><span>© {new Date().getFullYear()} ELSE Perfumes</span><span>Private admin portal</span></footer>
      </section>
    </main>
  );
}
