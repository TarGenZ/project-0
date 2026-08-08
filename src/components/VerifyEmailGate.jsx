import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  getSession,
  onAuthStateChange,
  getProfile,
  sendVerificationCode,
  verifyEmailOtp,
  confirmEmailVerification,
  signOutEverywhere,
} from '../lib/shared-auth';
import InvisibleCaptcha from './InvisibleCaptcha.jsx';

// gateStep: null (not gating) | 'code'
// Once gateStep is set it stays set for the rest of this session even after
// is_verified flips to true in the DB — otherwise the component would
// unmount itself mid-verification, before the user finishes entering the code.
export default function VerifyEmailGate({ children }) {
  const location = useLocation();
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [ready, setReady] = useState(false);
  const [gateStep, setGateStep] = useState(null);
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const captchaRef = useRef(null);

  const loadProfile = async (s) => {
    if (!s?.user?.id) {
      setProfile(null);
      return;
    }
    const p = await getProfile(s.user.id);
    setProfile(p);
  };

  useEffect(() => {
    (async () => {
      const s = await getSession();
      setSession(s);
      await loadProfile(s);
      setReady(true);
    })();
    return onAuthStateChange(async (s) => {
      setSession(s);
      await loadProfile(s);
    });
  }, []);

  // Never gate the callback route itself — the session may still be settling there.
  const onCallbackRoute = location.pathname === '/auth/callback';
  const needsVerification = ready && session && profile && profile.is_verified === false && !onCallbackRoute;

  useEffect(() => {
    if (needsVerification && gateStep === null) {
      setGateStep('code');
    }
  }, [needsVerification, gateStep]);

  useEffect(() => {
    if (gateStep === 'code' && !codeSent && session?.user?.email) {
      captchaRef.current
        ?.getToken()
        .then((captchaToken) => sendVerificationCode(session.user.email, captchaToken))
        .then(() => setCodeSent(true))
        .catch((err) => setError(err.message));
    }
  }, [gateStep, codeSent, session]);

  if (gateStep === null) return children;

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (!session?.user?.email) {
        throw new Error('Your session dropped — please sign in again.');
      }
      await verifyEmailOtp(session.user.email, code);
      const confirmed = await confirmEmailVerification();
      if (!confirmed) {
        throw new Error('Could not confirm verification — please try the code again.');
      }
      setGateStep(null);
    } catch (err) {
      setError(err.message);
      setCode('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-base px-6">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm rounded-2xl border border-line bg-panel p-7 shadow-glow"
      >
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-violet/40 bg-violet/10 px-3 py-1 text-xs font-medium text-lavender">
          <span className="h-1.5 w-1.5 rounded-full bg-amber animate-pulse" />
          ONE LAST STEP
        </div>
        <h2 className="font-display text-xl font-semibold text-white">Verify it's really you</h2>
        <p className="mt-2 text-sm leading-relaxed text-white/55">
          {codeSent ? (
            <>
              We sent an 8-digit code to{' '}
              <span className="text-lavender">{session?.user?.email}</span>. Enter it below to
              finish setting up your account.
            </>
          ) : (
            'Sending your code…'
          )}
        </p>

        <form onSubmit={handleVerifyCode}>
          <input
            type="text"
            inputMode="numeric"
            autoFocus
            maxLength={8}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            placeholder="12345678"
            className="mt-5 w-full rounded-lg border border-line bg-base px-4 py-2.5 text-center text-base tracking-[0.25em] text-white placeholder:tracking-normal placeholder:text-white/30 focus:border-violet/60 focus:outline-none"
          />
          {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={busy || code.length !== 8}
            className="mt-5 w-full rounded-lg bg-violet py-2.5 text-sm font-semibold text-white transition hover:bg-violet-soft disabled:opacity-50"
          >
            {busy ? 'Verifying…' : 'Verify & continue'}
          </button>
        </form>

        <button
          onClick={() => {
            if (!session?.user?.email) {
              setError('Your session dropped — please sign in again.');
              return;
            }
            captchaRef.current
              ?.getToken()
              .then((captchaToken) => sendVerificationCode(session.user.email, captchaToken))
              .catch((err) => setError(err.message));
          }}
          className="mt-4 w-full text-center text-xs text-white/40 hover:text-white/70"
        >
          Resend code
        </button>
        <button
          onClick={signOutEverywhere}
          className="mt-2 w-full text-center text-xs text-white/30 hover:text-white/60"
        >
          Sign out instead
        </button>
      </motion.div>
      <InvisibleCaptcha ref={captchaRef} />
    </div>
  );
}
