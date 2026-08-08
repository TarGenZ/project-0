# arpansarkar.org — homepage

Vite + React homepage for the arpansarkar.org network. Dark theme, Framer Motion,
plugs into the existing Supabase project and Razorpay account — no new infra
to set up.

## Run locally

```bash
npm install
cp .env.example .env   # fill in the 4 shared values + VITE_RAZORPAY_KEY_ID
npm run dev
```

## What's in here

- `src/lib/supabaseClient.js` + `src/lib/shared-auth.js` — the exact SSO setup
  (`storageKey: 'arpansarkar-auth'`, `.arpansarkar.org` cookie domain,
  `/auth/callback?next=`) to copy verbatim into every future subdomain app.
- `src/pages/AuthCallback.jsx` — the required `/auth/callback` route.
- `src/lib/razorpay.js` + `api/create-order.js` + `api/verify-payment.js` —
  a reusable checkout flow (order → verify → your own DB insert). The
  homepage itself doesn't sell anything yet, so nothing calls `startCheckout`
  here — wire it up in the first subdomain app that needs to charge for
  something (mentorship sessions, resource bundles, etc.).
- `src/components/Navbar.jsx` — holds `SUBDOMAIN_APPS`, the single source of
  truth for every subdomain link. Add a new app here and it shows up in both
  the nav and the network grid automatically.
- `src/components/ComingSoonModal.jsx` — what fires when someone clicks a
  subdomain that isn't live yet. Once an app ships, just delete its entry
  from `SUBDOMAIN_APPS` (or point it at the real URL) and the modal stops
  firing for it.

## Before shipping

- Replace `[Medical College Name — added soon]` in `src/components/Story.jsx`
  once you're ready to name it.
- Update `hello@arpansarkar.org` in the footer if that's not the real inbox.
- Set the 4 env vars (+ `VITE_RAZORPAY_KEY_ID`) in Vercel project settings.
- Point the domain's DNS at Vercel and set cookie domain behavior at the
  Supabase Auth settings level if you haven't already for the mentorship app.

## Deploy

Push to a Git repo Vercel is watching, or `vercel --prod`. `vercel.json`
already rewrites `/api/*` to the serverless functions and everything else to
`index.html`.
