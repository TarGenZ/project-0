import Navbar from '../components/Navbar.jsx';
import Hero from '../components/Hero.jsx';
import Story from '../components/Story.jsx';
import Pillars from '../components/Pillars.jsx';
import Network from '../components/Network.jsx';
import Footer from '../components/Footer.jsx';
import SEO from '../components/SEO.jsx';

export default function Home() {
  return (
    <div className="min-h-screen bg-base">
      <SEO
        title="Arpan Sarkar — NEET Mentorship, Resources & Counselling"
        description="Arpan Sarkar qualified NEET 2026 and is now in MBBS. Get 1:1 mentorship, study resources, NEET college cutoffs, and counselling guidance — built by someone who was in your seat one year ago."
        path="/"
      />
      <Navbar />
      <Hero />
      <Story />
      <Pillars />
      <Network />
      <Footer />
    </div>
  );
}
