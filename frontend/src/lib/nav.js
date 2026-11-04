/**
 * Site navigation (HOME_PAGE.md fix 2). Every menu item now has its own page (F2), so no home-page anchors remain.
 * Hrefs are next-intl Link targets, so the language prefix is added automatically.
 */

/** Main menu (header, drawer). `key` is the label in messages "nav". */
export const MAIN_NAV = [
  { key: "home", href: "/" },
  { key: "about", href: "/about" },
  { key: "programs", href: "/programs" },
  { key: "gallery", href: "/gallery" },
  { key: "news", href: "/news" },
  { key: "contact", href: "/contact" },
];

/**
 * Where "দান করুন" buttons go. Until the donate pages exist (phase F3) they scroll to the quick-donate
 * panel on the home page; from F3 change this to "/donate".
 */
export const DONATE_HREF = { pathname: "/", hash: "donate" };

/**
 * "Donate to this fund" links (program sidebar, campaign page, DonateCta). The target is
 * `/donate/[fund]?amount=&campaign=&monthly=1` (PAGES.md). That page arrives in phase F3; until then this falls
 * back to DONATE_HREF so no link leads to a 404. From F3 return
 * `{ pathname: `/donate/${fundSlug}`, query: { amount, campaign, monthly: monthly ? 1 : undefined } }`
 * (dropping empty values), or DONATE_HREF when there is no fund.
 * @param {string | null | undefined} fundSlug
 * @param {{ amount?: number, campaign?: string, monthly?: boolean }} [options]
 */
export function fundDonateHref(fundSlug, options = {}) {
  return DONATE_HREF;
}
