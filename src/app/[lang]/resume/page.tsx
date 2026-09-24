import type { PageLangParam } from "@/lib/i18n/appRouterI18n";
import Experience from "./_components/experience";
import Intro from "./_components/intro";
import Stack from "./_components/stack";

export default async function ResumePage({ params }: PageLangParam) {
  await params;

  return (
    <div className="space-y-16">
      <Stack />
      <Intro />
      <Experience />
    </div>
  );
}
