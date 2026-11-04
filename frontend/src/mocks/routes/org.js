/**
 * About-the-organisation endpoints (docs/API.md): /people/, /reports/, /jobs/, /transparency/totals/, /pages/{slug}/.
 */

import fundsFixture from "../fixtures/funds.json";
import jobsFixture from "../fixtures/jobs.json";
import pagesFixture from "../fixtures/pages.json";
import peopleFixture from "../fixtures/people.json";
import reportsFixture from "../fixtures/reports.json";
import transparencyFixture from "../fixtures/transparency.json";
import { errors, localize, ok } from "../helpers";
import { markdownToHtml } from "../markdown";
import { route } from "../router";

/** Removes fixture-only keys ("_note" …) so responses match API.md exactly. */
function clean(value) {
  if (Array.isArray(value)) return value.map(clean);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).filter(([k]) => !k.startsWith("_")).map(([k, v]) => [k, clean(v)]));
  }
  return value;
}

/** Today's date in Asia/Dhaka as YYYY-MM-DD (jobs close at the end of their closing day there). */
function dhakaToday(now = Date.now()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka" }).format(new Date(now));
}

/** Year in Asia/Dhaka for a timestamp (transparency totals are by Dhaka calendar year, API.md). */
function dhakaYear(iso) {
  return Number(new Intl.DateTimeFormat("en", { year: "numeric", timeZone: "Asia/Dhaka" }).format(new Date(iso)));
}

// --- /people/ -----------------------------------------------------------------------------------------
route("GET", "/people/", ({ locale }) => {
  const people = [...peopleFixture]
    .sort((a, b) => a.sort_order - b.sort_order)
    // The photo is shown only with consent (DATA_MODEL.md Person.photo_consent).
    .map((p) => ({ name: p.name, role: p.role, bio: p.bio, photo: p.photo_consent ? p.photo : null }));
  return ok(clean(localize(people, locale)));
});

// --- /reports/ ----------------------------------------------------------------------------------------
route("GET", "/reports/", ({ query, locale }) => {
  const reports = reportsFixture
    .filter((r) => !query.kind || r.kind === query.kind)
    .filter((r) => !query.year || String(r.year) === String(query.year))
    .sort((a, b) => b.published_at.localeCompare(a.published_at))
    .map((r) => ({ id: r.id, kind: r.kind, year: r.year, title: r.title, file_url: r.file_url, published_at: r.published_at }));
  return ok(clean(localize(reports, locale)));
});

// --- /jobs/ -------------------------------------------------------------------------------------------
route("GET", "/jobs/", ({ locale }) => {
  const today = dhakaToday();
  const jobs = jobsFixture
    .filter((j) => j.is_open && (!j.closes_at || j.closes_at >= today))
    .map((j) => ({
      slug: j.slug,
      title: j.title,
      location: j.location,
      body_html: markdownToHtml(localize(j.body, locale)),
      apply_email: j.apply_email,
      apply_url: j.apply_url,
      closes_at: j.closes_at,
    }));
  return ok(clean(localize(jobs, locale)));
});

// --- /transparency/totals/ ----------------------------------------------------------------------------
route("GET", "/transparency/totals/", ({ locale, store }) => {
  /** @type {Map<number, Map<string, number>>} year → fund → total */
  const byYear = new Map();
  const add = (year, fund, amount) => {
    if (!byYear.has(year)) byYear.set(year, new Map());
    const funds = /** @type {Map<string, number>} */ (byYear.get(year));
    funds.set(fund, (funds.get(fund) ?? 0) + amount);
  };
  for (const row of transparencyFixture.offline_totals) add(row.year, row.fund, row.total);
  for (const d of store.donations.values()) {
    if (d.status === "paid" && d.paid_at) add(dhakaYear(d.paid_at), d.fund, d.amount);
  }

  const order = new Map(fundsFixture.map((f) => [f.slug, f.sort_order]));
  const years = [...byYear.entries()]
    .sort(([a], [b]) => b - a)
    .map(([year, funds]) => {
      const rows = [...funds.entries()]
        .map(([slug, total]) => {
          const f = fundsFixture.find((x) => x.slug === slug);
          return { slug, title: localize(f?.title ?? slug, locale), total, is_zakat: Boolean(f?.is_zakat_eligible) };
        })
        // Non-zakat funds first, zakat funds after (shown separately, API.md).
        .sort((a, b) => Number(a.is_zakat) - Number(b.is_zakat) || (order.get(a.slug) ?? 99) - (order.get(b.slug) ?? 99));
      return { year, funds: rows, total: rows.reduce((sum, r) => sum + r.total, 0) };
    });
  return ok({ years });
});

// --- /pages/{slug}/ -----------------------------------------------------------------------------------
route("GET", "/pages/:slug/", ({ params, locale }) => {
  const page = pagesFixture.find((p) => p.slug === params.slug);
  if (!page) return errors.notFound();
  return ok(
    clean({
      slug: page.slug,
      title: localize(page.title, locale),
      body_html: markdownToHtml(localize(page.body, locale)),
      updated_at: page.updated_at,
    }),
  );
});
