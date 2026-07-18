import { motion } from 'framer-motion';

export default function Story() {
  return (
    <section id="story" className="border-t border-line/70 px-5 py-20 md:py-28">
      <div className="mx-auto grid max-w-6xl gap-12 md:grid-cols-[0.9fr_1.1fr] md:gap-16">
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber">
            Why this exists
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold text-white md:text-4xl">
            The version of me that started this had no one to ask.
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 16 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="space-y-5 text-[15px] leading-relaxed text-white/65"
        >
          <p>
            NEET doesn't just test what you know — it tests what you're willing to give up.
            Sleep, birthdays, the version of yourself that had hobbies. I gave up a lot of it,
            more than once, over more than one attempt, and there were long stretches where I
            had no real way of knowing if any of it was working.
          </p>
          <p>
            What made those stretches harder wasn't the syllabus. It was not having anyone who'd
            actually been through it to ask the small, specific questions — which chapters
            actually matter this year, whether a rank is realistic for a college, what a
            counselling round is going to do to my options. I figured it out eventually, and I
            qualified NEET 2026.
          </p>
          <p>
            I'm currently studying MBBS at{' '}
            <span className="rounded bg-panel px-1.5 py-0.5 text-white/80">
              [Medical College Name — added soon]
            </span>
            . I'm building arpansarkar.org so the next student doesn't have to rebuild everything
            from zero the way I did — mentorship, resources, real cutoffs and counselling
            support, all from someone who was in the seat a year ago, not a decade ago.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
