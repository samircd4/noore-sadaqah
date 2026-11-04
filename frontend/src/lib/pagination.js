/**
 * Which page numbers the Pagination component shows (PAGES.md "Pagination").
 * Always the first and last page, the current page and one neighbour on each side; gaps become "gap".
 * Pure function so it can be tested without rendering.
 *
 * pageItems(1, 3)  → [1, 2, 3]
 * pageItems(5, 10) → [1, "gap", 4, 5, 6, "gap", 10]
 *
 * @param {number} page  current page (1-based)
 * @param {number} pages total pages
 * @returns {Array<number | "gap">}
 */
export function pageItems(page, pages) {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);

  const wanted = new Set([1, pages, page - 1, page, page + 1]);
  // Near either end, show a few more numbers instead of a gap that would hide just one page.
  if (page <= 3) [2, 3, 4].forEach((n) => wanted.add(n));
  if (page >= pages - 2) [pages - 3, pages - 2, pages - 1].forEach((n) => wanted.add(n));

  const sorted = [...wanted].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);
  /** @type {Array<number | "gap">} */
  const items = [];
  for (const n of sorted) {
    const prev = items.at(-1);
    if (typeof prev === "number" && n - prev > 1) items.push(n - prev === 2 ? prev + 1 : "gap");
    items.push(n);
  }
  return items;
}
