const ChapterDirectoryLoading = () => {
  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-50">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(148,163,184,0.18),transparent_55%)]" />
      <div className="absolute inset-x-0 top-0 h-48 bg-linear-to-b from-white via-white/60 to-transparent" />
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center px-6 py-16 md:px-10">
        <div className="space-y-4">
          <div className="h-4 w-32 rounded-full bg-slate-200/80" />
          <div className="h-10 w-3/4 rounded-2xl bg-slate-200/80" />
          <div className="h-16 w-2/3 rounded-3xl bg-slate-200/70" />
        </div>
        <div className="mt-12 grid gap-8 lg:grid-cols-[minmax(260px,1fr)_minmax(320px,1.1fr)]">
          <div className="space-y-6">
            <div className="h-[360px] rounded-[32px] bg-slate-200/60 backdrop-blur" />
            <div className="h-32 rounded-3xl bg-slate-200/60 backdrop-blur" />
          </div>
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                // eslint-disable-next-line react/no-array-index-key
                key={index}
                className="h-28 rounded-3xl border border-slate-200/70 bg-white/70 shadow-sm shadow-slate-900/5 backdrop-blur"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChapterDirectoryLoading;
