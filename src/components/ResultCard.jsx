import { motion } from 'framer-motion';

const bubbleRow = (filled) => (
  <div className="flex gap-1.5">
    {[0, 1, 2, 3].map((i) => (
      <span
        key={i}
        className={`h-2.5 w-2.5 rounded-full border ${
          i === filled ? 'border-amber bg-amber' : 'border-white/15'
        }`}
      />
    ))}
  </div>
);

export default function ResultCard() {
  return (
    <motion.div
      animate={{ y: [0, -10, 0] }}
      transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      className="relative w-full max-w-sm rounded-2xl border border-line bg-panel p-6 shadow-glow"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-white/40">Candidate</p>
          <p className="font-display text-lg font-semibold text-white">Arpan Sarkar</p>
        </div>
        <div className="relative h-16 w-16 shrink-0">
          <svg viewBox="0 0 60 60" className="h-16 w-16 -rotate-90">
            <circle cx="30" cy="30" r="26" fill="none" stroke="#1E2540" strokeWidth="5" />
            <motion.circle
              cx="30"
              cy="30"
              r="26"
              fill="none"
              stroke="#F59E0B"
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray="163"
              initial={{ strokeDashoffset: 163 }}
              animate={{ strokeDashoffset: 8 }}
              transition={{ duration: 1.4, ease: 'easeOut', delay: 0.5 }}
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center font-display text-[11px] font-bold text-amber">
            AIR
          </span>
        </div>
      </div>

      <div className="my-5 h-px w-full bg-line" />

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-white/45">Physics</span>
          {bubbleRow(2)}
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-white/45">Chemistry</span>
          {bubbleRow(1)}
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-white/45">Biology</span>
          {bubbleRow(3)}
        </div>
      </div>

      <div className="my-5 h-px w-full bg-line" />

      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.6, duration: 0.5 }}
        className="flex items-center justify-between rounded-lg bg-violet/10 px-4 py-3"
      >
        <span className="text-sm font-medium text-lavender">Status</span>
        <span className="font-display text-sm font-bold text-amber">QUALIFIED</span>
      </motion.div>

      <p className="mt-4 text-center text-[11px] leading-relaxed text-white/35">
        Every candidate's sheet looks different. This is what mine took to fill in —
        yours doesn't have to take as long.
      </p>
    </motion.div>
  );
}
