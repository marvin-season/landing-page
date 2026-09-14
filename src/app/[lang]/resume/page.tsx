import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { PageLangParam } from "@/lib/i18n/appRouterI18n";
import {
  getResumeAuthorizationUrl,
  hasResumeAccess,
  resumeCookieName,
} from "@/lib/resume-access";
import Experience from "./_components/experience";
import Intro from "./_components/intro";
import Stack from "./_components/stack";

export default async function ResumePage({ params }: PageLangParam) {
  const { lang } = await params;
  const cookieStore = await cookies();
  if (!hasResumeAccess(cookieStore.get(resumeCookieName)?.value)) {
    redirect(getResumeAuthorizationUrl(`/${lang}/resume`));
  }

  return (
    <div className="space-y-16">
      <Stack />
      <Intro />
      <Experience />
    </div>
  );
}
