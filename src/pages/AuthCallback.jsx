import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import SEO from '../components/SEO.jsx';

// Reads ?next= and redirects there once Supabase finishes processing the
// OAuth redirect. Every app on arpansarkar.org needs this exact route.
export default function AuthCallback() {
  const [error, setError] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const next = params.get('next') || '/';

    // detectSessionInUrl: true means the client already parses the tokens;
    // we just need to wait for the session to land, then redirect.
    supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (sessionError) {
        setError(sessionError.message);
        return;
      }
      if (data.session) {
        window.location.replace(next);
      } else {
        const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
          if (session) {
            listener.subscription.unsubscribe();
            window.location.replace(next);
          }
        });
      }
    });
  }, []);

  return (
    <div className="min-h-screen bg-base flex items-center justify-center px-6">
      <SEO title="Signing in… — arpansarkar.org" path="/auth/callback" noindex />
      <div className="text-center">
        {error ? (
          <>
            <p className="font-display text-xl text-white mb-2">Sign-in didn't go through</p>
            <p className="text-white/60 text-sm">{error}</p>
            <a href="/" className="inline-block mt-6 text-amber underline underline-offset-4">
              Back to homepage
            </a>
          </>
        ) : (
          <>
            <div className="mx-auto mb-5 h-8 w-8 rounded-full border-2 border-violet border-t-transparent animate-spin" />
            <p className="font-display text-white/80">Signing you in…</p>
          </>
        )}
      </div>
    </div>
  );
}
