/**
 * Whole days left until a campaign ends (PAGES.md /campaigns/[slug] "days left"). Pure: the caller passes "now",
 * because a prerendered page can't read the clock (Cache Components); the browser fills it in (DaysLeft.jsx).
 * A campaign ending later today counts as 1 day; past end dates give 0.
 * @param {string | number | Date} endsAt
 * @param {number} now milliseconds since the epoch
 */
export function daysLeft(endsAt, now) {
  const end = new Date(endsAt).getTime();
  if (Number.isNaN(end) || end <= now) return 0;
  return Math.ceil((end - now) / 86_400_000);
}
