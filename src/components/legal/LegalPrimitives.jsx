import BackButton from '../BackButton.jsx';

export function LegalLayout({ title, lastUpdated, children }) {
  return (
    <div className="min-h-screen bg-base px-5 py-12 md:py-16">
      <BackButton fallback="/" />
      <div className="mx-auto max-w-3xl">
        <h1 className="mt-4 font-display text-3xl font-bold text-white md:text-4xl">{title}</h1>
        {lastUpdated && <p className="mt-2 text-xs text-white/40">Last updated: {lastUpdated}</p>}
        <div className="mt-10">{children}</div>
      </div>
    </div>
  );
}

export function Section({ title, children }) {
  return (
    <section className="mt-8 first:mt-0">
      <h2 className="font-display text-lg font-semibold text-white">{title}</h2>
      <div className="mt-2 space-y-3 text-sm leading-relaxed text-white/65">{children}</div>
    </section>
  );
}

export function List({ items }) {
  return (
    <ul className="list-disc space-y-1.5 pl-5">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

export function EmailLink({ address }) {
  return (
    <a href={`mailto:${address}`} className="text-lavender underline underline-offset-4 hover:text-lavender/80">
      {address}
    </a>
  );
}
