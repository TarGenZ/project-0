import { Link } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';

// Shared style for both authenticated action buttons — identical border,
// background, padding, size, and text so they read as a matched pair.
const BTN =
  'flex items-center gap-2 rounded-full border border-line bg-panel px-3.5 py-1.5 text-sm text-white/70 transition hover:border-violet/50 hover:text-white';

export default function AuthButton({ className = '' }) {
  const { loading, isAuthenticated, user, signOut } = useAuth();

  if (loading) {
    return <div className={`h-8 w-24 animate-pulse rounded-full bg-panel ${className}`} />;
  }

  if (isAuthenticated) {
    const email   = user?.email || '';
    const initial = email.charAt(0).toUpperCase() || 'A';

    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Link to="/dashboard" className={BTN}>
          Dashboard
        </Link>

        <button
          onClick={signOut}
          title={`Signed in as ${email} — click to sign out`}
          className={BTN}
        >
          {/* Avatar sits inside the button but is sized to not inflate the line height */}
          <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-violet text-[10px] font-bold text-[#fff]">
            {initial}
          </span>
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div className={`flex ${className}`}>
      <Link
        to="/signup"
        className="rounded-full bg-violet px-5 py-2 text-sm font-semibold text-[#fff] transition hover:bg-violet-soft"
      >
        JOIN US!
      </Link>
    </div>
  );
}
