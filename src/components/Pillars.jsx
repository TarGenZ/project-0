import { motion } from 'framer-motion';

const PILLARS = [
  {
    tag: 'SECTION A',
    title: 'Mentorship',
    desc: 'Direct 1:1 and small-group sessions with me. Study plans, doubt-clearing, and the honest "is this realistic for you" conversations no one else will have.',
    status: 'Live',
  },
  {
    tag: 'SECTION B',
    title: 'Resources',
    desc: 'The notes, revision sheets and question banks I actually used, organized by chapter and weightage instead of dumped in a folder.',
    status: 'Live',
  },
  {
    tag: 'SECTION C',
    title: 'Cutoffs',
    desc: 'College-wise NEET cutoffs and rank-to-college mapping, updated every counselling round instead of left stale from last year.',
    status: 'Live',
  },
  {
    tag: 'SECTION D',
    title: 'Counselling',
    desc: 'Round-by-round guidance on choice filling and seat allotment, so one rushed decision does not cost you a year.',
    status: 'In progress',
  },
];

const statusClass = (s) =>
  s === 'Live'
    ? 'rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] text-emerald-400'
    : 'rounded-full border border-line px-2.5 py-0.5 text-[10px] text-white/40';

export default function Pillars() {
  return (
    <section id="pillars" className="border-t border-line/70 px-4 py-14 sm:px-5 md:py-28">
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }}
          className="max-w-xl"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber">
            How I can help
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold text-white md:text-4xl">
            Four sections. Whatever you're stuck on is probably in one of them.
          </h2>
        </motion.div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2">
          {PILLARS.map((p, i) => (
            <motion.div
              key={p.title}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="group rounded-2xl border border-line bg-panel p-6 transition hover:border-violet/40"
            >
              <div className="flex items-center justify-between">
                <span className="font-display text-xs font-bold tracking-wider text-violet-soft">
                  {p.tag}
                </span>
                <span className={statusClass(p.status)}>
                  {p.status}
                </span>
              </div>
              <h3 className="mt-4 font-display text-xl font-semibold text-white">{p.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/55">{p.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
