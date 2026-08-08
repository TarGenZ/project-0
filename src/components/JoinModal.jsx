import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  signInWithGoogle,
  signUpWithPassword,
  verifySignupOtp,
  signInWithPassword,
  signInWithEmailOtp,
  verifyEmailOtp,
  requestPasswordReset,
  verifyRecoveryOtp,
  updatePassword,
} from '../lib/shared-auth';
import InvisibleCaptcha from './InvisibleCaptcha.jsx';
import ModalShell from './ModalShell.jsx';
import PasswordField from './PasswordField.jsx';

const GoogleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 48 48">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l6-6C34.5 5.1 29.5 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21 21-9.4 21-21c0-1.4-.1-2.5-.4-3.5z" />
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.8 1.1 8 3l6-6C34.5 5.1 29.5 3 24 3 16.3 3 9.7 7.4 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 45c5.4 0 10.3-1.8 14-5l-6.5-5.3c-2 1.5-4.6 2.3-7.5 2.3-5.3 0-9.7-3.1-11.3-8l-6.5 5C9.6 40.5 16.2 45 24 45z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.2 5.7l6.5 5.3C41.6 35.6 45 30.5 45 24c0-1.4-.1-2.5-.4-3.5z" />
  </svg>
);

const CODE_LENGTH = 8;

// Steps:
//  'form'            sign up (name+email+password) or log in (email+password), tab-dependent
//  'code'            verify the emailed code — for signup confirmation OR passwordless login fallback
//  'forgot-email'    ask/confirm which email to send a reset code to
//  'forgot-code'     verify that reset code
//  'forgot-password' set a new password
export default function JoinModal({ open, onClose }) {
  const [tab, setTab] = useState('signup'); // 'signup' | 'login'
  const [step, setStep] = useState('form');
  const [codeMode, setCodeMode] = useState('signup-confirm'); // 'signup-confirm' | 'login-passwordless'

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [showForgotLink, setShowForgotLink] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const captchaRef = useRef(null);

  const reset = () => {
    setTab('signup');
    setStep('form');
    setCodeMode('signup-confirm');
    setName('');
    setEmail('');
    setPassword('');
    setCode('');
    setNewPassword('');
    setShowForgotLink(false);
    setError(null);
    setBusy(false);
  };

  const close = () => {
    onClose();
    setTimeout(reset, 200);
  };

  const switchTab = (next) => {
    setTab(next);
    setStep('form');
    setPassword('');
    setShowForgotLink(false);
    setError(null);
  };

  const handleGoogle = async () => {
    setError(null);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err.message);
    }
  };

  // ---------- Sign up ----------
  const handleSignup = async (e) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const captchaToken = await captchaRef.current.getToken();
      await signUpWithPassword(email, password, { captchaToken, data: { full_name: name.trim() } });
      setCodeMode('signup-confirm');
      setStep('code');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  // ---------- Log in ----------
  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setShowForgotLink(false);
    setBusy(true);
    try {
      const captchaToken = await captchaRef.current.getToken();
      await signInWithPassword(email, password, captchaToken);
      close();
      window.location.reload();
    } catch (err) {
      setError(err.message || 'Wrong email or password.');
      setShowForgotLink(true);
    } finally {
      setBusy(false);
    }
  };

  const handlePasswordlessLogin = async () => {
    if (!email) {
      setError('Enter your email above first.');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const captchaToken = await captchaRef.current.getToken();
      await signInWithEmailOtp(email, { captchaToken, shouldCreateUser: false });
      setCodeMode('login-passwordless');
      setStep('code');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  // ---------- Code verification (shared by signup confirm + passwordless login) ----------
  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (codeMode === 'signup-confirm') {
        await verifySignupOtp(email, code);
      } else {
        await verifyEmailOtp(email, code);
      }
      close();
      window.location.reload();
    } catch (err) {
      setError(err.message);
      setCode('');
    } finally {
      setBusy(false);
    }
  };

  // ---------- Forgot password ----------
  const goToForgot = () => {
    setError(null);
    setStep('forgot-email');
  };

  const handleSendResetCode = async (e) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const captchaToken = await captchaRef.current.getToken();
      await requestPasswordReset(email, captchaToken);
      setCode('');
      setStep('forgot-code');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleVerifyResetCode = async (e) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await verifyRecoveryOtp(email, code);
      setStep('forgot-password');
    } catch (err) {
      setError(err.message);
      setCode('');
    } finally {
      setBusy(false);
    }
  };

  const handleSetNewPassword = async (e) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await updatePassword(newPassword);
      close();
      window.location.reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <ModalShell open={open} onClose={close}>
        <motion.div
          role="dialog"
          aria-modal="true"
          className="w-full rounded-2xl border border-line bg-panel p-7 shadow-glow"
          initial={{ opacity: 0, y: 16, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 340, damping: 28 }}
        >
          {step === 'form' && (
            <>
              <div className="mb-5 flex rounded-lg border border-line bg-base p-1">
                <button
                  type="button"
                  onClick={() => switchTab('signup')}
                  className={`flex-1 rounded-md py-2 text-sm font-semibold transition ${
                    tab === 'signup' ? 'bg-violet text-white' : 'text-white/50 hover:text-white'
                  }`}
                >
                  Sign up
                </button>
                <button
                  type="button"
                  onClick={() => switchTab('login')}
                  className={`flex-1 rounded-md py-2 text-sm font-semibold transition ${
                    tab === 'login' ? 'bg-violet text-white' : 'text-white/50 hover:text-white'
                  }`}
                >
                  Log in
                </button>
              </div>

              <h3 className="font-display text-xl font-semibold text-white">
                {tab === 'signup' ? 'Create your account' : 'Welcome back'}
              </h3>
              <p className="mt-1 text-sm text-white/50">
                One account, works on every app on arpansarkar.org.
              </p>

              {tab === 'signup' ? (
                <form onSubmit={handleSignup}>
                  <label className="mt-5 block text-xs font-medium text-white/50">Full name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    className="mt-1.5 w-full rounded-lg border border-line bg-base px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-violet/60 focus:outline-none"
                  />

                  <label className="mt-4 block text-xs font-medium text-white/50">Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="mt-1.5 w-full rounded-lg border border-line bg-base px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-violet/60 focus:outline-none"
                  />

                  <label className="mt-4 block text-xs font-medium text-white/50">Password</label>
                  <PasswordField
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    autoComplete="new-password"
                    className="mt-1.5"
                  />

                  {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
                  <button
                    type="submit"
                    disabled={busy}
                    className="mt-5 w-full rounded-lg bg-violet py-2.5 text-sm font-semibold text-white transition hover:bg-violet-soft disabled:opacity-50"
                  >
                    {busy ? 'Creating…' : 'Create account'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleLogin}>
                  <label className="mt-5 block text-xs font-medium text-white/50">Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="mt-1.5 w-full rounded-lg border border-line bg-base px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-violet/60 focus:outline-none"
                  />

                  <label className="mt-4 block text-xs font-medium text-white/50">Password</label>
                  <PasswordField
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    className="mt-1.5"
                  />

                  {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
                  {showForgotLink && (
                    <button
                      type="button"
                      onClick={goToForgot}
                      className="mt-2 text-xs font-medium text-amber underline underline-offset-4 hover:text-amber/80"
                    >
                      Forgot Password?
                    </button>
                  )}

                  <button
                    type="submit"
                    disabled={busy}
                    className="mt-5 w-full rounded-lg bg-violet py-2.5 text-sm font-semibold text-white transition hover:bg-violet-soft disabled:opacity-50"
                  >
                    {busy ? 'Logging in…' : 'Log in'}
                  </button>
                  <button
                    type="button"
                    onClick={handlePasswordlessLogin}
                    disabled={busy}
                    className="mt-3 w-full text-center text-xs text-white/40 hover:text-white/70"
                  >
                    No password set? Email me a code instead
                  </button>
                </form>
              )}

              <div className="my-4 flex items-center gap-3">
                <div className="h-px flex-1 bg-line" />
                <span className="text-xs text-white/30">or</span>
                <div className="h-px flex-1 bg-line" />
              </div>

              <button
                type="button"
                onClick={handleGoogle}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-line bg-base py-2.5 text-sm font-semibold text-white transition hover:border-violet/50"
              >
                <GoogleIcon />
                Continue with Google
              </button>
            </>
          )}

          {step === 'code' && (
            <form onSubmit={handleVerifyCode}>
              <button
                type="button"
                onClick={() => setStep('form')}
                className="mb-3 text-xs text-white/40 hover:text-white/70"
              >
                ← back
              </button>
              <h3 className="font-display text-xl font-semibold text-white">Enter your code</h3>
              <p className="mt-1 text-sm leading-relaxed text-white/50">
                We sent an {CODE_LENGTH}-digit code to <span className="text-lavender">{email}</span>.
              </p>
              <input
                type="text"
                inputMode="numeric"
                autoFocus
                maxLength={CODE_LENGTH}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder={'1'.repeat(CODE_LENGTH)}
                className="mt-5 w-full rounded-lg border border-line bg-base px-4 py-2.5 text-center text-base tracking-[0.25em] text-white placeholder:tracking-normal placeholder:text-white/30 focus:border-violet/60 focus:outline-none"
              />
              {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
              <button
                type="submit"
                disabled={busy || code.length !== CODE_LENGTH}
                className="mt-5 w-full rounded-lg bg-violet py-2.5 text-sm font-semibold text-white transition hover:bg-violet-soft disabled:opacity-50"
              >
                {busy ? 'Verifying…' : 'Verify & continue'}
              </button>
            </form>
          )}

          {step === 'forgot-email' && (
            <form onSubmit={handleSendResetCode}>
              <button
                type="button"
                onClick={() => setStep('form')}
                className="mb-3 text-xs text-white/40 hover:text-white/70"
              >
                ← back
              </button>
              <h3 className="font-display text-xl font-semibold text-white">Reset your password</h3>
              <p className="mt-1 text-sm text-white/50">We'll send a code to confirm it's you.</p>
              <input
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="mt-5 w-full rounded-lg border border-line bg-base px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-violet/60 focus:outline-none"
              />
              {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
              <button
                type="submit"
                disabled={busy}
                className="mt-5 w-full rounded-lg bg-violet py-2.5 text-sm font-semibold text-white transition hover:bg-violet-soft disabled:opacity-50"
              >
                {busy ? 'Sending…' : 'Send reset code'}
              </button>
            </form>
          )}

          {step === 'forgot-code' && (
            <form onSubmit={handleVerifyResetCode}>
              <h3 className="font-display text-xl font-semibold text-white">Enter the reset code</h3>
              <p className="mt-1 text-sm leading-relaxed text-white/50">
                Sent to <span className="text-lavender">{email}</span>.
              </p>
              <input
                type="text"
                inputMode="numeric"
                autoFocus
                maxLength={CODE_LENGTH}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder={'1'.repeat(CODE_LENGTH)}
                className="mt-5 w-full rounded-lg border border-line bg-base px-4 py-2.5 text-center text-base tracking-[0.25em] text-white placeholder:tracking-normal placeholder:text-white/30 focus:border-violet/60 focus:outline-none"
              />
              {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
              <button
                type="submit"
                disabled={busy || code.length !== CODE_LENGTH}
                className="mt-5 w-full rounded-lg bg-violet py-2.5 text-sm font-semibold text-white transition hover:bg-violet-soft disabled:opacity-50"
              >
                {busy ? 'Verifying…' : 'Verify code'}
              </button>
            </form>
          )}

          {step === 'forgot-password' && (
            <form onSubmit={handleSetNewPassword}>
              <h3 className="font-display text-xl font-semibold text-white">Set a new password</h3>
              <p className="mt-1 text-sm text-white/50">You'll be logged in right after this.</p>
              <PasswordField
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
                autoComplete="new-password"
                className="mt-5"
              />
              {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
              <button
                type="submit"
                disabled={busy}
                className="mt-5 w-full rounded-lg bg-violet py-2.5 text-sm font-semibold text-white transition hover:bg-violet-soft disabled:opacity-50"
              >
                {busy ? 'Saving…' : 'Save new password'}
              </button>
            </form>
          )}
        </motion.div>
      </ModalShell>
      <InvisibleCaptcha ref={captchaRef} />
    </>
  );
}
