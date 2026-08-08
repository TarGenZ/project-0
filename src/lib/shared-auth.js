import { supabase } from './supabaseClient';

/**
 * Shared auth utilities for the arpansarkar.org network.
 * Copy this file as-is into any new subdomain app — do not fork the logic,
 * or SSO between apps will silently break.
 */

// Kick off Google OAuth. `next` is where the user should land after the
// callback finishes (defaults to wherever they started).
export async function signInWithGoogle(next = window.location.pathname) {
  const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo },
  });
  if (error) throw error;
}

// Email sign-in/signup, step 1: send the email. The same email carries both a
// clickable magic link (routes through /auth/callback) AND a 6-digit code
// (verified manually via verifyEmailOtp) — the template controls which
// pieces show up. captchaToken is required once hCaptcha is enabled in
// Supabase. Pass data: { full_name } on signup so the new-user trigger
// picks it up. Pass shouldCreateUser: false for a pure sign-in flow so a
// mistyped/unknown email fails clearly instead of quietly creating an account.
export async function signInWithEmailOtp(
  email,
  { next = window.location.pathname, captchaToken, data, shouldCreateUser = true } = {}
) {
  const emailRedirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
  const options = { emailRedirectTo, shouldCreateUser, captchaToken };
  if (data) options.data = data;
  const { error } = await supabase.auth.signInWithOtp({ email, options });
  if (error) throw error;
}

// Email sign-in, step 2 (only needed if the user types the code instead of
// clicking the link). Resolves once the session is active.
export async function verifyEmailOtp(email, token) {
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: 'email',
  });
  if (error) throw error;
  return data.session;
}

// ---------- Password auth ----------
// Coexists with Google + passwordless OTP on the same account — Supabase
// doesn't force a single method per email. Accounts created before this
// feature shipped have no password set until they go through "forgot
// password" once, which doubles as a way to add a password retroactively.

// Signup step 1: creates the user with a password, sends a confirmation
// email (same "Confirm signup" template as before — code only, no link
// unless you add {{ .ConfirmationURL }} to it). No session yet.
export async function signUpWithPassword(email, password, { captchaToken, data } = {}) {
  const emailRedirectTo = `${window.location.origin}/auth/callback`;
  const options = { captchaToken, emailRedirectTo };
  if (data) options.data = data;
  const { error } = await supabase.auth.signUp({ email, password, options });
  if (error) throw error;
}

// Signup step 2: confirms the code from that email and activates the session.
export async function verifySignupOtp(email, token) {
  const { data, error } = await supabase.auth.verifyOtp({ email, token, type: 'signup' });
  if (error) throw error;
  return data.session;
}

// Direct password login. Throws with Supabase's own message on wrong
// password/unknown email — the caller decides when to surface "Forgot
// Password?" based on that.
export async function signInWithPassword(email, password, captchaToken) {
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
    options: { captchaToken },
  });
  if (error) throw error;
}

// Forgot-password step 1: emails a recovery code (and link, if you add one
// to the "Reset Password" template — the app only drives the code path).
export async function requestPasswordReset(email, captchaToken) {
  const redirectTo = `${window.location.origin}/auth/callback?next=/`;
  const { error } = await supabase.auth.resetPasswordForEmail(email, { captchaToken, redirectTo });
  if (error) throw error;
}

// Forgot-password step 2: verifying the recovery code signs the user in
// with a short-lived session, just enough to set a new password next.
export async function verifyRecoveryOtp(email, token) {
  const { data, error } = await supabase.auth.verifyOtp({ email, token, type: 'recovery' });
  if (error) throw error;
  return data.session;
}

// Forgot-password step 3: requires the recovery session from verifyRecoveryOtp.
export async function updatePassword(newPassword) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

// Sends a fresh 6-digit code to an ALREADY-signed-in user (e.g. a first-time
// Google sign-up we need to gate). shouldCreateUser: false because this
// user already exists — we're just re-confirming their email.
export async function sendVerificationCode(email, captchaToken) {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false, captchaToken },
  });
  if (error) throw error;
}

// Call AFTER verifyEmailOtp() succeeds. The actual trust decision happens
// server-side in the confirm_email_verification() Postgres function, which
// checks Supabase's own record of a recent email confirmation rather than
// taking the client's word for it. Returns true only if that check passed.
export async function confirmEmailVerification() {
  const { data, error } = await supabase.rpc('confirm_email_verification');
  if (error) throw error;
  return data === true;
}

// Sign out and always land back on the main domain, per spec.
export async function signOutEverywhere() {
  await supabase.auth.signOut();
  window.location.href = 'https://arpansarkar.org';
}

export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function getProfile(userId) {
  if (!userId) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, is_admin, is_verified, created_at')
    .eq('id', userId)
    .single();
  if (error) {
    console.error('[getProfile] failed to load profile:', error.message);
    return null;
  }
  return data;
}

export function onAuthStateChange(callback) {
  const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });
  return () => listener.subscription.unsubscribe();
}

// Lets a signed-in user override their own display name (e.g. a Google
// sign-up editing the name Google supplied). RLS already restricts this to
// the caller's own row; the is_admin column is separately protected by a
// trigger so this can never be abused to touch anything else.
export async function updateProfileName(userId, fullName) {
  const { error } = await supabase.from('profiles').update({ full_name: fullName }).eq('id', userId);
  if (error) throw error;
}
