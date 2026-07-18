import { LegalLayout, Section, List, EmailLink } from '../../components/legal/LegalPrimitives.jsx';
import SEO from '../../components/SEO.jsx';

export default function Privacy() {
  return (
    <LegalLayout title="Privacy Policy" lastUpdated="July 2026">
      <SEO
        title="Privacy Policy — arpansarkar.org"
        description="How arpansarkar.org collects, uses, and protects your data across the mentorship, resources, cutoffs, and counselling network."
        path="/privacy"
      />
      <Section title="Overview">
        <p>
          arpansarkar.org (and every subdomain under it — mentorship.arpansarkar.org, and any
          others launched later) is run by Arpan Sarkar as an individual, based in Mangaluru,
          Karnataka, India. This isn't a registered company — it's a personal, non-commercial
          educational initiative to support NEET aspirants with mentorship, study resources,
          college cutoff data, and counselling guidance. This policy explains what information
          is collected across the whole network and how it's used.
        </p>
      </Section>

      <Section title="Information we collect">
        <p>Depending on how you sign up and what you use, we collect:</p>
        <List
          items={[
            'Account info: your name and email address.',
            "Authentication data: if you sign in with Google, we receive your name, email, and profile photo from Google. If you sign in with email, we handle a verification code/link and, if you set one, a password — stored securely, never in plain text.",
            'Usage & purchase data: sessions you book, resources you access, and purchase/transaction records tied to your account.',
            "Payment data: payments are processed directly by Razorpay. We only ever see the transaction status, order ID, and amount — we never receive or store your card, UPI, or bank details.",
          ]}
        />
      </Section>

      <Section title="How we use this information">
        <List
          items={[
            'To provide mentorship, resources, cutoff data, and counselling guidance.',
            'To keep you signed in across every arpansarkar.org subdomain with one account (single sign-on).',
            'To process and verify payments for paid sessions or resources.',
            'To respond when you contact us for support.',
          ]}
        />
      </Section>

      <Section title="Third parties we work with">
        <p>We work with exactly three third-party services to run this platform:</p>
        <List
          items={[
            'Google — for Google sign-in (OAuth).',
            'Razorpay — for payment processing.',
            'Supabase — for our database and authentication infrastructure.',
          ]}
        />
        <p>
          We do not sell, rent, or share your personal data with any advertiser, data broker, or
          any other third party for any purpose. These three are the only parties your data ever
          passes through.
        </p>
      </Section>

      <Section title="Cookies & session data">
        <p>
          We use a single authentication cookie, scoped to <code className="text-lavender">.arpansarkar.org</code>,
          which is what lets you sign in once and stay signed in across every subdomain in the
          network. We don't use advertising or third-party tracking cookies.
        </p>
      </Section>

      <Section title="If you're under 18">
        <p>
          A large part of this platform's audience is NEET aspirants who are minors. If you're
          under 18, you should only use this platform with the knowledge and permission of a
          parent or guardian. Mentorship and guidance here are given on the understanding that a
          parent or guardian is aware of, and comfortable with, their child receiving it.
        </p>
      </Section>

      <Section title="Data retention & your rights">
        <p>
          We keep your account data for as long as your account is active. You can request
          access to, correction of, or deletion of your data at any time by emailing{' '}
          <EmailLink address="contact@arpansarkar.org" />.
        </p>
      </Section>

      <Section title="Security">
        <p>
          We take reasonable steps to protect your data, but no method of storage or transmission
          over the internet is ever 100% secure, and we can't guarantee absolute security.
        </p>
      </Section>

      <Section title="Changes to this policy">
        <p>
          If this policy changes in a meaningful way, we'll update the date at the top of this
          page. Continuing to use the platform after a change means you accept the updated policy.
        </p>
      </Section>

      <Section title="Contact">
        <p>
          Questions about this policy or your data — email <EmailLink address="contact@arpansarkar.org" />.
        </p>
        <p>
          Arpan Sarkar, 24-5-580-9/1, Attavara 6th Cross Road, Mangaluru, Karnataka, India.
          <br />
          Phone: {import.meta.env.VITE_CONTACT_PHONE}
        </p>
      </Section>
    </LegalLayout>
  );
}
