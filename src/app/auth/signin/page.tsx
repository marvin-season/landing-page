import { redirect } from "next/navigation";
import { getAuthorizationUrl } from "@/lib/page-auth";

export default async function SignInRedirectPage({
  searchParams,
}: {
  searchParams: Promise<{
    returnTo?: string;
    callbackUrl?: string;
    from?: string;
  }>;
}) {
  const params = await searchParams;
  redirect(
    getAuthorizationUrl(
      params.returnTo ?? params.callbackUrl ?? params.from ?? "/",
    ),
  );
}
