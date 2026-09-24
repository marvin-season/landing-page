/*
 * For more info see
 * https://nextjs.org/docs/app/building-your-application/routing/internationalization
 * */

import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { locales, sourceLocale } from "@/lib/i18n/locales";
import { getAuthorizationUrl, getProtectedPage } from "@/lib/page-auth";

const defaultPrefix = `/${sourceLocale}`;

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const protectedPage = getProtectedPage(pathname);

  if (protectedPage) {
    const session = await auth();
    if (!session?.user?.id) {
      return withPrivateHeaders(
        NextResponse.redirect(
          new URL(getAuthorizationUrl(pathname), request.url),
        ),
        protectedPage.path === "/resume",
      );
    }

    if (!protectedPage.locale) {
      return NextResponse.next();
    }

    return withPrivateHeaders(
      localize(request),
      protectedPage.path === "/resume",
    );
  }

  const seoFiles = ["/manifest.json", "/robots.txt", "/sitemap.xml"];
  if (seoFiles.includes(pathname)) {
    return NextResponse.next();
  }

  return localize(request);
}

function withPrivateHeaders(response: NextResponse, enabled: boolean) {
  if (!enabled) return response;
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  return response;
}

function localize(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === defaultPrefix || pathname.startsWith(`${defaultPrefix}/`)) {
    request.nextUrl.pathname = pathname.slice(defaultPrefix.length) || "/";
    return NextResponse.redirect(request.nextUrl);
  }

  const pathnameHasLocale = locales.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  );
  if (pathnameHasLocale) return NextResponse.next();

  request.nextUrl.pathname = `${defaultPrefix}${pathname === "/" ? "" : pathname}`;
  return NextResponse.rewrite(request.nextUrl);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api/trpc (tRPC files)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - pdfjs (PDF.js worker, character maps, fonts, and Wasm)
     * - knowledge/examples (sample documents)
     * - favicon.ico (favicon file)
     * - manifest.json, robots.txt, sitemap.xml (SEO files)
     * - images - .svg, .png, .jpg, .jpeg, .gif, .webp
     * Agent is included so the session gate can run. Auth lives under [lang]
     * and is not a protected page, so the gate does not redirect it.
     */
    "/((?!knowledge/examples(?:/|$)|pdfjs(?:/|$)|_next/static|api|agui|admin|_next/image|favicon.ico|manifest\\.json|robots\\.txt|sitemap\\.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|md)$).*)",
  ],
};
