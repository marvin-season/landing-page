import type { ReactNode } from "react";

import BackgroundDecor from "@/components/sections/book-experience/background-decor";

const ChapterLayout = ({ children }: { children: ReactNode }) => {
  return (
    <section className="relative min-h-screen overflow-hidden bg-slate-50 text-slate-900">
      <BackgroundDecor />
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-16 md:px-10">
        {children}
      </div>
    </section>
  );
};

export default ChapterLayout;
