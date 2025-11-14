const BackgroundDecor: React.FC = () => (
  <>
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(148,163,184,0.18),transparent_55%)]" />
    <div className="absolute inset-x-0 top-0 h-48 bg-linear-to-b from-white via-white/60 to-transparent" />
    <div className="absolute -left-32 top-1/2 h-96 w-96 -translate-y-1/2 rounded-full bg-slate-200/40 blur-3xl" />
    <div className="absolute -right-24 top-2/3 h-80 w-80 rounded-full bg-slate-300/30 blur-3xl" />
    <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,transparent,rgba(15,23,42,0.04)_35%,transparent_70%)]" />
  </>
);

export default BackgroundDecor;
