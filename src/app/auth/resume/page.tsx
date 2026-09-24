import { redirect } from "next/navigation";
import { getAuthorizationUrl } from "@/lib/page-auth";

export default async function ResumeAuthRedirectPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const params = await searchParams;
  redirect(getAuthorizationUrl(params.returnTo ?? "/resume"));
}
