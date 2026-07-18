import { motion } from 'framer-motion';
import ResultCard from './ResultCard.jsx';

export default function Hero() {
  return (
    <section id="top" className="relative overflow-hidden px-5 pt-16 pb-20 md:pt-24 md:pb-28">
      <div className="mx-auto grid max-w-6xl items-center gap-14 md:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-violet/30 bg-violet/10 px-3 py-1 text-xs font-medium text-lavender">
            NEET 2026 qualified — now in MBBS
          </div>

          <h1 className="mt-5 font-display text-4xl font-bold leading-[1.08] text-white sm:text-5xl md:text-[3.4rem]">
            I sat where you're sitting.
            <br />
            <span className="text-lavender">Let's make sure you don't stay stuck there.</span>
          </h1>

          <p className="mt-6 max-w-lg text-base leading-relaxed text-white/60">
            I'm Arpan Sarkar. NEET took every ordinary comfort from me before it gave anything
            back — and I remember exactly which parts of it nobody explains to you in time.
            I'm building the network of tools I needed back then: a mentor who picks up,
            resources that don't waste your revision time, real cutoffs, and counselling that
            doesn't leave you guessing on results day.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a
              href="#pillars"
              className="rounded-full bg-amber px-6 py-3 text-sm font-semibold text-base shadow-amberGlow transition hover:brightness-110"
            >
              See how I can help
            </a>
            <a
              href="#story"
              className="rounded-full border border-line px-6 py-3 text-sm font-semibold text-white/80 transition hover:border-violet/50 hover:text-white"
            >
              Read the story
            </a>
          </div>

          <div className="mt-10 flex gap-8 text-sm">
            <div>
              <p className="font-display text-2xl font-bold text-white">100%</p>
              <p className="text-white/45">self-funded journey</p>
            </div>
            <div>
              <p className="font-display text-2xl font-bold text-white">1</p>
              <p className="text-white/45">mentor, every message answered personally</p>
            </div>
            <div>
              <p className="font-display text-2xl font-bold text-white">4</p>
              <p className="text-white/45">apps in the network, more coming</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, ease: 'easeOut', delay: 0.15 }}
          className="flex justify-center md:justify-end"
        >
          <ResultCard />
        </motion.div>
      </div>
    </section>
  );
}
