import { useState } from 'react';
import { motion } from 'framer-motion';
import { SUBDOMAIN_APPS } from './Navbar.jsx';
import ComingSoonModal from './ComingSoonModal.jsx';

export default function Network() {
  const [activeModal, setActiveModal] = useState(null);

  return (
    <section className="border-t border-line/70 px-5 py-20 md:py-28">
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }}
          className="max-w-xl"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber">
            One account, one network
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold text-white md:text-4xl">
            Sign in once. It works on every app I build here.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-white/55">
            Every subdomain shares the same account and the same database — sign in on one,
            and you're already signed in on the rest.
          </p>
        </motion.div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {SUBDOMAIN_APPS.map((app, i) => (
            <motion.button
              key={app.id}
              onClick={() => setActiveModal(app)}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.45, delay: i * 0.07 }}
              className="group flex flex-col items-start rounded-xl border border-line bg-panel/60 p-5 text-left transition hover:-translate-y-1 hover:border-violet/40 hover:bg-panel"
            >
              <span className="h-2 w-2 rounded-full bg-amber" />
              <p className="mt-3 font-display text-base font-semibold text-white">{app.name}</p>
              <p className="mt-1 text-xs text-lavender/80">{app.subdomain}</p>
              <p className="mt-3 text-xs leading-relaxed text-white/45">{app.blurb}</p>
            </motion.button>
          ))}
        </div>
      </div>

      <ComingSoonModal app={activeModal} onClose={() => setActiveModal(null)} />
    </section>
  );
}
