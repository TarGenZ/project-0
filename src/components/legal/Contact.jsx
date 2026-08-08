import { LegalLayout, Section, EmailLink } from '../../components/legal/LegalPrimitives.jsx';
import SEO from '../../components/SEO.jsx';

export default function Contact() {
  return (
    <LegalLayout title="Contact Us" lastUpdated="July 2026">
      <SEO
        title="Contact Us — arpansarkar.org"
        description="Get in touch with Arpan Sarkar for mentorship, support, or general questions about arpansarkar.org."
        path="/contact"
      />
      <Section title="Where to reach us">
        <p>Different inboxes for different things — this gets your message to the right place faster.</p>

        <div className="mt-4 space-y-4">
          <div className="rounded-xl border border-line bg-panel/60 p-4">
            <p className="font-medium text-white">Support</p>
            <p className="mt-1 text-white/50">Bookings, payments, rescheduling, technical issues.</p>
            <p className="mt-2"><EmailLink address="support@arpansarkar.org" /></p>
          </div>

          <div className="rounded-xl border border-line bg-panel/60 p-4">
            <p className="font-medium text-white">Everything else</p>
            <p className="mt-1 text-white/50">General questions, feedback, or anything that doesn't fit elsewhere.</p>
            <p className="mt-2"><EmailLink address="contact@arpansarkar.org" /></p>
          </div>

          <div className="rounded-xl border border-line bg-panel/60 p-4">
            <p className="font-medium text-white">Message Arpan directly</p>
            <p className="mt-1 text-white/50">If you'd rather write to Arpan personally.</p>
            <p className="mt-2"><EmailLink address="arpanbhaiya@arpansarkar.org" /></p>
          </div>
        </div>

        <p className="mt-5 text-xs text-white/40">
          Note: <span className="text-white/60">auth@arpansarkar.org</span> only sends automated
          sign-in and verification emails — replies to it won't be seen. Use one of the addresses
          above instead.
        </p>
      </Section>

      <Section title="Address & business details">
        <p>
          Arpan Sarkar
          <br />
          24-5-580-9/1, Attavara 6th Cross Road
          <br />
          Mangaluru, Karnataka, India
          <br />
          Phone: {import.meta.env.VITE_CONTACT_PHONE}
        </p>
        <p className="mt-3">
          Legal name: Arpan Sarkar. Trade name: Arpan Sarkar. Operated as an individual — not a
          registered company or business entity.
        </p>
      </Section>

      <Section title="Response time">
        <p>We do our best to get back to you as quickly as we can.</p>
      </Section>
    </LegalLayout>
  );
}
