/*
 * For more info see
 * https://nextjs.org/docs/app/building-your-application/routing/internationalization
 * */

import { type NextRequest, NextResponse } from "next/server";
import { locales, sourceLocale } from "@/lib/i18n/locales";
import {
  getResumeAuthorizationUrl,
  hasResumeAccess,
  isResumePath,
  resumeCookieName,
} from "@/lib/resume-access";

const defaultPrefix = `/${sourceLocale}`;

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isResumePath(pathname)) {
    const response = !hasResumeAccess(
      request.cookies.get(resumeCookieName)?.value,
    )
      ? NextResponse.redirect(
          new URL(getResumeAuthorizationUrl(pathname), request.url),
        )
      : localize(request);
    response.headers.set("Cache-Control", "private, no-store, max-age=0");
    response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
    return response;
  }

  const seoFiles = ["/manifest.json", "/robots.txt", "/sitemap.xml"];
  if (seoFiles.includes(pathname)) {
    return NextResponse.next();
  }

  return localize(request);
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
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!knowledge/examples(?:/|$)|pdfjs(?:/|$)|_next/static|api|auth|agent|agui|admin|_next/image|favicon.ico|manifest\\.json|robots\\.txt|sitemap\\.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|md)$).*)",
  ],
};
