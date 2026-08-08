import { LegalLayout, Section, EmailLink } from '../../components/legal/LegalPrimitives.jsx';
import SEO from '../../components/SEO.jsx';

export default function RefundPolicy() {
  return (
    <LegalLayout title="Refund Policy" lastUpdated="July 2026">
      <SEO
        title="Refund Policy — arpansarkar.org"
        description="Refund and rescheduling policy for mentorship sessions and resources on arpansarkar.org."
        path="/refund-policy"
      />
      <Section title="All payments are final">
        <p>
          Payments made on arpansarkar.org and its subdomains — including mentorship sessions,
          group sessions, and resource bundles — are non-refundable.
        </p>
      </Section>

      <Section title="Why we don't offer refunds">
        <p>
          Arpan doesn't take a personal profit from this platform. Money collected goes directly
          toward covering server and domain costs, with the rest going toward charitable causes.
          Because of that, we're not able to offer refunds once a purchase is made.
        </p>
      </Section>

      <Section title="Can't make it? Reschedule instead">
        <p>
          If you're unable to attend a booked mentorship or group session, email{' '}
          <EmailLink address="support@arpansarkar.org" /> in advance and we'll move you to
          another available slot rather than issuing a refund.
        </p>
      </Section>

      <Section title="Payment errors are different">
        <p>
          This no-refunds policy doesn't cover genuine payment errors — a duplicate charge, a
          failed transaction that still deducted money, or anything else that looks like a
          technical mistake. If that happens, email{' '}
          <EmailLink address="support@arpansarkar.org" /> with your payment reference and we'll
          sort it out.
        </p>
      </Section>

      <Section title="Contact">
        <p>
          For rescheduling or payment issues — <EmailLink address="support@arpansarkar.org" />.
          For anything else — <EmailLink address="contact@arpansarkar.org" />.
        </p>
      </Section>
    </LegalLayout>
  );
}
