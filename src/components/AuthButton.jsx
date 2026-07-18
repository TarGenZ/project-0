import { Link } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';

export default function AuthButton({ className = '' }) {
  const { loading, isAuthenticated, user, signOut } = useAuth();

  if (loading) {
    return <div className={`h-9 w-24 animate-pulse rounded-full bg-panel ${className}`} />;
  }

  if (isAuthenticated) {
    const email = user?.email || '';
    const initial = email.charAt(0).toUpperCase() || 'A';
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Link
          to="/dashboard"
          className="rounded-full border border-line px-3.5 py-1.5 text-sm text-white/70 transition hover:border-violet/50 hover:text-white"
        >
          Dashboard
        </Link>
        <button
          onClick={signOut}
          title={`Signed in as ${email} — click to sign out`}
          className="flex items-center gap-2 rounded-full border border-line bg-panel px-3 py-1.5 text-sm text-white/80 transition hover:border-violet/50 hover:text-white"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-violet text-xs font-semibold text-white">
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
        className="rounded-full bg-violet px-5 py-2 text-sm font-semibold text-white transition hover:bg-violet-soft"
      >
        JOIN US!
      </Link>
    </div>
  );
}
