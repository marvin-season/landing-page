/*
 * For more info see
 * https://nextjs.org/docs/app/building-your-application/routing/internationalization
 * */

import Negotiator from "negotiator";
import { type NextRequest, NextResponse } from "next/server";
import { locales } from "@/lib/i18n/locales";
import {
  getResumeAuthorizationUrl,
  hasResumeAccess,
  isResumePath,
  resumeCookieName,
} from "@/lib/resume-access";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isResumePath(pathname)) {
    let response: NextResponse;
    if (!hasResumeAccess(request.cookies.get(resumeCookieName)?.value)) {
      response = NextResponse.redirect(
        new URL(getResumeAuthorizationUrl(pathname), request.url),
      );
    } else if (pathname === "/resume" || pathname.startsWith("/resume/")) {
      request.nextUrl.pathname = `/${getRequestLocale(request.headers)}${pathname}`;
      response = NextResponse.redirect(request.nextUrl);
    } else {
      response = NextResponse.next();
    }
    response.headers.set("Cache-Control", "private, no-store, max-age=0");
    response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
    return response;
  }

  // Skip i18n routing for SEO files
  const seoFiles = ["/manifest.json", "/robots.txt", "/sitemap.xml"];
  if (seoFiles.includes(pathname)) {
    return NextResponse.next();
  }

  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`,
  );

  if (pathnameHasLocale) return;

  // Redirect if there is no locale
  const locale = getRequestLocale(request.headers);
  request.nextUrl.pathname = `/${locale}${pathname}`;
  // e.g. incoming request is /products
  // The new URL is now /en/products
  return NextResponse.redirect(request.nextUrl);
}

function getRequestLocale(requestHeaders: Headers): string {
  const langHeader = requestHeaders.get("accept-language") || undefined;
  const languages = new Negotiator({
    headers: { "accept-language": langHeader },
  }).languages(locales.slice());

  const activeLocale = languages[0] || locales[0] || "en";

  return activeLocale;
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
