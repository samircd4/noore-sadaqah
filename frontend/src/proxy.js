import createIntlProxy from "next-intl/middleware";
import { routing } from "./i18n/routing";

const intlProxy = createIntlProxy(routing);

/**
 * Runs before every page request (Next.js 16 "proxy", formerly middleware).
 * F0: locale routing only. F4 adds /account protection and JWT refresh here (docs/SECURITY.md §2).
 */
export default function proxy(request) {
  return intlProxy(request);
}

export const config = {
  // Skip Next internals, files with an extension, and paths that are not pages:
  // /api (Nginx sends it to Django), /internal (revalidate hook), /admin (Django admin), /r (receipt links).
  matcher: ["/((?!api|internal|admin|r/|dj-static|_next|_vercel|.*\\..*).*)"],
};
