/**
 * Site navigation (HOME_PAGE.md fix 2): anchors for sections on the home page, real routes for the rest.
 * Hrefs are next-intl Link targets, so the language prefix is added automatically.
 */

/** Main menu (header, drawer). `key` is the label in messages "nav". */
export const MAIN_NAV = [
  { key: "home", href: "/" },
  { key: "about", href: { pathname: "/", hash: "about" } },
  { key: "programs", href: "/programs" },
  { key: "gallery", href: { pathname: "/", hash: "gallery" } },
  { key: "news", href: "/news" },
  { key: "contact", href: "/contact" },
];

/**
 * Where "দান করুন" buttons go. Until the donate pages exist (phase F3) they scroll to the quick-donate
 * panel on the home page; from F3 change this to "/donate".
 */
export const DONATE_HREF = { pathname: "/", hash: "donate" };

/**
 * "Donate to this fund" links (program sidebar, DonateCta). The target is `/donate/[fund]?amount=` (PAGES.md).
 * That page arrives in phase F3; until then this falls back to DONATE_HREF so no link leads to a 404.
 * From F3 return `{ pathname: `/donate/${fundSlug}`, query: amount ? { amount } : undefined }`.
 * @param {string | null | undefined} fundSlug
 * @param {number} [amount]
 */
export function fundDonateHref(fundSlug, amount) {
  return DONATE_HREF;
}
