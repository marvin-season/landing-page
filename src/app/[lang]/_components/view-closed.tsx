import BookClient from "@app/_components/book-client";

import { msg } from "@lingui/core/macro";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { MotionSpan } from "@/components/ui";
import { getI18nInstance } from "@/lib/i18n/appRouterI18n";
import { cn } from "@/lib/utils";

type ViewClosedProps = {
  lang: string;
};

const ViewClosed: React.FC<ViewClosedProps> = ({ lang }) => {
  const directoryHref = `/${lang}/chapter`;
  const i18n = getI18nInstance(lang);

  return (
    <div className="flex flex-col items-center justify-center gap-10 text-center">
      <div className="relative flex justify-center">
        <div className="pointer-events-none absolute inset-0 rounded-[36px] bg-card/30 blur-3xl" />
        <Link
          href={directoryHref}
          className="relative flex justify-center"
          style={{ perspective: "1900px" }}
        >
          <BookClient>
            <div className="book-cover-closed">
              <div className="flex h-full flex-col justify-between p-8 text-left text-white">
                <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.4em] text-white/60">
                  <span>{i18n._(msg`AI STUDIO`)}</span>
                  <span className="h-1 w-1 rounded-full bg-white/40" />
                  <span>{i18n._(msg`2025`)}</span>
                </div>
                <div>
                  <p className="text-lg font-semibold leading-tight">
                    {i18n._(msg`Chapters Awaiting You`)}
                  </p>
                  <p className="mt-2 text-xs text-white/60">
                    {i18n._(
                      msg`Click the cover to awaken a new creative journey.`,
                    )}
                  </p>
                </div>
              </div>
            </div>
          </BookClient>
        </Link>
      </div>
      <div className="flex max-w-lg flex-col items-center gap-4">
        <p className="text-base leading-relaxed text-muted-foreground">
          {i18n._(
            msg`A freshly delivered AI creation handbook. Tap the cover to open the index and explore a new way of producing content with your team.`,
          )}
        </p>
        <Link
          href={directoryHref}
          className={cn(
            "group inline-flex items-center gap-3 rounded-full bg-primary px-7 py-3 text-base text-primary-foreground shadow-[0_28px_52px_-40px_var(--ring)] transition-colors hover:bg-primary/90",
          )}
        >
          {i18n._(msg`Start Reading`)}
          <MotionSpan
            className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-foreground/20"
            whileHover={{ x: 4 }}
          >
            <ArrowRight className="h-4 w-4" />
          </MotionSpan>
        </Link>
      </div>
    </div>
  );
};

export default ViewClosed;
