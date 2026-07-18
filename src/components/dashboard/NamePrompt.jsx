import { useState } from 'react';
import { motion } from 'framer-motion';
import { updateProfileName } from '../../auth/AuthService';

// Only ever shown when profile.full_name is empty. Once saved, the parent
// removes this from the tree (profile.full_name is now set) and the
// protect_full_name DB trigger makes sure it can never be changed again —
// there's no edit path anywhere else in the app, so this really is one-time.
export default function NamePrompt({ userId, onSaved }) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setBusy(true);
    setError(null);
    try {
      await updateProfileName(userId, trimmed);
      onSaved(trimmed);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-8 rounded-2xl border border-violet/40 bg-violet/5 p-6"
    >
      <h2 className="font-display text-lg font-semibold text-white">What's your name?</h2>
      <p className="mt-1 text-sm text-white/55">
        This is how you'll show up across arpansarkar.org. You can only set this once, so take a
        second to get it right.
      </p>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          required
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          className="flex-1 rounded-lg border border-line bg-base px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-violet/60 focus:outline-none"
        />
        <button
          type="submit"
          disabled={busy || !name.trim()}
          className="rounded-lg bg-violet px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-soft disabled:opacity-50"
        >
          {busy ? 'Saving…' : 'Save name'}
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </motion.form>
  );
}
