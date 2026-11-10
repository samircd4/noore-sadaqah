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

/** Where "দান করুন" buttons go: the list of funds (PAGES.md "/donate"). */
export const DONATE_HREF = "/donate";

/**
 * "Donate to this fund" links (program sidebar, campaign page, DonateCta, get-involved):
 * `/donate/[fund]?amount=&campaign=&monthly=1` (PAGES.md), dropping empty values; DONATE_HREF without a fund.
 * @param {string | null | undefined} fundSlug
 * @param {{ amount?: number, campaign?: string, monthly?: boolean }} [options]
 */
export function fundDonateHref(fundSlug, { amount, campaign, monthly } = {}) {
  if (!fundSlug) return DONATE_HREF;
  /** @type {Record<string, string | number>} */
  const query = {};
  if (amount) query.amount = amount;
  if (campaign) query.campaign = campaign;
  if (monthly) query.monthly = 1;
  return { pathname: `/donate/${fundSlug}`, query };
}
