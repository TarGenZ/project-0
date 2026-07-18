import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { sendVerificationCode, verifyEmailOtp, confirmEmailVerification } from '../AuthService';
import { useAuth } from '../useAuth';
import { CODE_LENGTH } from '../authTypes';
import InvisibleCaptcha from '../../components/InvisibleCaptcha.jsx';

/**
 * Blocks access to whatever it's rendered in place of, until the current
 * user verifies their email. Unlike the old VerifyEmailGate, this is never
 * mounted around the whole app — ProtectedRoute renders it in place of
 * `children` only for routes that opt into `requireVerified`, so public
 * pages (home, legal, even the auth pages themselves) are never affected.
 */
export default function VerifyEmailPrompt() {
  const { session, refreshProfile } = useAuth();
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const captchaRef = useRef(null);
  const email = session?.user?.email;

  useEffect(() => {
    if (codeSent || !email) return;
    captchaRef.current
      ?.getToken()
      .then((captchaToken) => sendVerificationCode(email, captchaToken))
      .then(() => setCodeSent(true))
      .catch((err) => setError(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email]);

  const handleResend = () => {
    if (!email) return;
    setError(null);
    captchaRef.current
      ?.getToken()
      .then((captchaToken) => sendVerificationCode(email, captchaToken))
      .catch((err) => setError(err.message));
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!email) {
      setError('Your session dropped — please sign in again.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await verifyEmailOtp(email, code);
      const confirmed = await confirmEmailVerification();
      if (!confirmed) {
        throw new Error('Could not confirm verification — please try the code again.');
      }
      await refreshProfile();
    } catch (err) {
      setError(err.message);
      setCode('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-base px-6">
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
              We sent a {CODE_LENGTH}-digit code to <span className="text-lavender">{email}</span>.
              Enter it below to finish setting up your account.
            </>
          ) : (
            'Sending your code…'
          )}
        </p>

        <form onSubmit={handleVerify}>
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

        <button
          onClick={handleResend}
          className="mt-4 w-full text-center text-xs text-white/40 hover:text-white/70"
        >
          Resend code
        </button>
      </motion.div>
      <InvisibleCaptcha ref={captchaRef} />
    </div>
  );
}
