import { LegalLayout, Section, List, EmailLink } from '../../components/legal/LegalPrimitives.jsx';
import SEO from '../../components/SEO.jsx';

export default function Terms() {
  return (
    <LegalLayout title="Terms & Conditions" lastUpdated="July 2026">
      <SEO
        title="Terms & Conditions — arpansarkar.org"
        description="Terms of use for arpansarkar.org's mentorship, resources, cutoffs, and counselling services."
        path="/terms"
      />
      <Section title="About these terms">
        <p>
          arpansarkar.org and every subdomain under it are operated by Arpan Sarkar, an
          individual based in Mangaluru, Karnataka, India — not a registered company or business
          entity. By using this platform, you agree to these terms.
        </p>
      </Section>

      <Section title="What we offer">
        <p>
          Mentorship (1:1 and group sessions), study resources, NEET college cutoff data, and
          counselling guidance — delivered across arpansarkar.org and its subdomains under one
          shared account.
        </p>
      </Section>

      <Section title="Eligibility & minors">
        <p>
          This platform is built for NEET aspirants, many of whom are under 18. If you're under
          18, by using this platform you (and your parent or guardian) are confirming that your
          parent or guardian is aware of, and permits you to receive, mentorship and guidance
          through arpansarkar.org. We rely on this being true and don't independently verify
          parental consent.
        </p>
      </Section>

      <Section title="Your account">
        <p>
          One account works across every arpansarkar.org subdomain. Keep your password and any
          verification codes confidential — you're responsible for activity that happens under
          your account.
        </p>
      </Section>

      <Section title="Payments">
        <p>
          Payments are processed through Razorpay. Amounts paid for mentorship, resources, or
          any other paid feature go toward covering the running costs of this platform — servers
          and domains — with the rest going toward charitable causes. Arpan does not draw a
          personal profit from payments made on this platform.
        </p>
      </Section>

      <Section title="No guarantee of results">
        <p>
          Mentorship, resources, and counselling guidance here are provided in good faith, based
          on personal experience with NEET. We don't guarantee any specific score, rank, college
          admission, or outcome. This platform supplements — it doesn't replace — official NEET
          and counselling authority information, which you should always verify independently.
        </p>
      </Section>

      <Section title="Acceptable use">
        <List
          items={[
            "Don't share your account access with anyone else.",
            "Don't redistribute or resell paid resources or content.",
            'Treat mentors and anyone else on the platform with respect.',
          ]}
        />
      </Section>

      <Section title="Content ownership">
        <p>
          Resources, materials, and content on this platform belong to Arpan Sarkar and are
          provided for your personal, non-commercial use only.
        </p>
      </Section>

      <Section title="Refunds & cancellations">
        <p>
          See our <a href="/refund-policy" className="text-lavender underline underline-offset-4">Refund Policy</a> for
          how rescheduling and payment issues are handled.
        </p>
      </Section>

      <Section title="Limitation of liability">
        <p>
          This platform is provided as-is. To the fullest extent permitted by law, Arpan Sarkar
          isn't liable for indirect or consequential damages arising from your use of this
          platform.
        </p>
      </Section>

      <Section title="Termination">
        <p>
          Accounts that violate these terms may be suspended or terminated at our discretion.
        </p>
      </Section>

      <Section title="Governing law">
        <p>These terms are governed by the laws of India, under the jurisdiction of the courts of Mangaluru, Karnataka.</p>
      </Section>

      <Section title="Changes to these terms">
        <p>
          If these terms change meaningfully, we'll update the date at the top of this page.
          Continuing to use the platform after a change means you accept the updated terms.
        </p>
      </Section>

      <Section title="Contact">
        <p>
          Questions about these terms — email <EmailLink address="contact@arpansarkar.org" />.
        </p>
      </Section>

      <Section title="Business details">
        <p>
          Legal name: Arpan Sarkar
          <br />
          Trade name: Arpan Sarkar
          <br />
          Operated as an individual — not a registered company or business entity.
          <br />
          Address: 24-5-580-9/1, Attavara 6th Cross Road, Mangaluru, Karnataka, India
          <br />
          Phone: {import.meta.env.VITE_CONTACT_PHONE}
          <br />
          Email: <EmailLink address="contact@arpansarkar.org" />
        </p>
      </Section>
    </LegalLayout>
  );
}
