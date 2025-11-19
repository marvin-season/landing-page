const BackgroundDecor: React.FC = () => (
  <>
    <div
      className="absolute inset-0"
      style={{
        background:
          "radial-gradient(circle at top, var(--book-decor-glow), transparent 55%)",
      }}
    />
    <div
      className="absolute -left-32 top-1/2 h-96 w-96 -translate-y-1/2 rounded-full blur-3xl"
      style={{ background: "var(--book-decor-ambient)" }}
    />
    <div
      className="absolute -right-24 top-2/3 h-80 w-80 rounded-full blur-3xl"
      style={{ background: "var(--book-decor-halo)" }}
    />
    <div
      className="pointer-events-none absolute inset-0"
      style={{
        background:
          "linear-gradient(120deg, transparent, var(--book-decor-overlay) 35%, transparent 70%)",
      }}
    />
  </>
);

export default BackgroundDecor;
