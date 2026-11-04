/**
 * Public content endpoints (docs/API.md "Public content"), served from the fixtures.
 */

import campaignsFixture from "../fixtures/campaigns.json";
import fundsFixture from "../fixtures/funds.json";
import galleryFixture from "../fixtures/gallery.json";
import postsFixture from "../fixtures/posts.json";
import programsFixture from "../fixtures/programs.json";
import siteFixture from "../fixtures/site.json";
import { errors, localize, ok, paginate } from "../helpers";
import { markdownToHtml } from "../markdown";
import { route } from "../router";

/** Removes fixture-only keys ("_note" …) so responses match API.md exactly. */
function clean(value) {
  if (Array.isArray(value)) return value.map(clean);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !key.startsWith("_"))
        .map(([key, v]) => [key, clean(v)]),
    );
  }
  return value;
}

/** Markdown → safe HTML (Django will render real markdown and sanitize it). */
const toHtml = markdownToHtml;

const bySort = (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0);

const categories = [...postsFixture.categories].sort(bySort);

function categoryOf(slug, locale) {
  const c = categories.find((x) => x.slug === slug);
  return c ? { slug: c.slug, name: localize(c.name, locale) } : null;
}

function fundRef(slug, locale) {
  const f = fundsFixture.find((x) => x.slug === slug);
  return f ? { slug: f.slug, title: localize(f.title, locale) } : null;
}

// --- /site/ -------------------------------------------------------------------------------------------
route("GET", "/site/", ({ locale }) => ok(clean(localize(siteFixture, locale))));

// --- /funds/ ------------------------------------------------------------------------------------------
function fundOut(f, locale, detail) {
  const out = {
    slug: f.slug,
    title: f.title,
    summary: f.summary,
    cover: f.cover,
    preset_amounts: f.preset_amounts,
    min_amount: f.min_amount,
    is_zakat_eligible: f.is_zakat_eligible,
    is_fitra: f.is_fitra,
    allow_recurring: f.allow_recurring,
    bank_details: f.bank_details,
  };
  if (detail) out.body_html = toHtml(localize(f.body, locale));
  return clean(localize(out, locale));
}

route("GET", "/funds/", ({ locale }) => ok([...fundsFixture].sort(bySort).map((f) => fundOut(f, locale, false))));

route("GET", "/funds/:slug/", ({ params, locale }) => {
  const f = fundsFixture.find((x) => x.slug === params.slug);
  return f ? ok(fundOut(f, locale, true)) : errors.notFound();
});

// --- /programs/ ---------------------------------------------------------------------------------------
function programOut(p, locale) {
  return clean(
    localize(
      { slug: p.slug, badge: p.badge, title: p.title, summary: p.summary, cover: p.cover, fund: fundRef(p.fund, locale) },
      locale,
    ),
  );
}

route("GET", "/programs/", ({ query, locale }) => {
  const list = [...programsFixture].sort(bySort).filter((p) => !query.featured || p.is_featured);
  return ok(list.map((p) => programOut(p, locale)));
});

route("GET", "/programs/:slug/", ({ params, locale }) => {
  const all = [...programsFixture].sort(bySort);
  const p = all.find((x) => x.slug === params.slug);
  if (!p) return errors.notFound();

  const f = fundsFixture.find((x) => x.slug === p.fund);
  const detail = {
    ...programOut(p, locale),
    body_html: toHtml(localize(p.body, locale)),
    goals: p.goals ?? [],
    beneficiary: p.beneficiary ?? "",
    area: p.area ?? "",
    duration: p.duration ?? "",
    faq: p.faq ?? [],
    impact: p.impact ?? [],
    images: p.images ?? [],
    // The detail's fund adds preset_amounts for the sidebar donate box (API.md); null when no fund is linked.
    fund: f ? { slug: f.slug, title: f.title, preset_amounts: f.preset_amounts } : null,
    related: all.filter((x) => x.slug !== p.slug).slice(0, 3).map((x) => programOut(x, locale)),
  };
  return ok(clean(localize(detail, locale)));
});

// --- /campaigns/ --------------------------------------------------------------------------------------
function campaignOut(c, locale, store) {
  const paid = [...store.donations.values()].filter((d) => d.campaign === c.slug && d.status === "paid");
  const raised = c.offline_raised + paid.reduce((sum, d) => sum + d.amount, 0);
  const isEnded = Boolean(c.ends_at && new Date(c.ends_at).getTime() < Date.now());
  const recent = paid
    .sort((a, b) => String(b.paid_at).localeCompare(String(a.paid_at)))
    .slice(0, 10)
    .map((d) => ({ name: d.is_anonymous ? null : d.donor_name.split(" ")[0], amount: d.amount, paid_at: d.paid_at }));

  return clean(
    localize(
      {
        slug: c.slug,
        title: c.title,
        summary: c.summary,
        body_html: toHtml(localize(c.body, locale)),
        cover: c.cover,
        goal_amount: c.goal_amount,
        raised_amount: raised,
        percent: Math.min(100, Math.round((raised * 100) / c.goal_amount)),
        donor_count: c.offline_donors + paid.length,
        monthly_options: c.monthly_options,
        highlighted_option: c.highlighted_option,
        starts_at: c.starts_at,
        ends_at: c.ends_at,
        is_ended: isEnded,
        fund: fundRef(c.fund, locale),
        recent_donors: recent,
      },
      locale,
    ),
  );
}

route("GET", "/campaigns/", ({ query, locale, store }) => {
  const list = campaignsFixture.filter((c) => !query.featured || c.is_featured);
  return ok(list.map((c) => campaignOut(c, locale, store)));
});

route("GET", "/campaigns/:slug/", ({ params, locale, store }) => {
  const c = campaignsFixture.find((x) => x.slug === params.slug);
  return c ? ok(campaignOut(c, locale, store)) : errors.notFound();
});

// --- /gallery/ ----------------------------------------------------------------------------------------
route("GET", "/gallery/", ({ query, locale }) => {
  let items = galleryFixture
    .filter((g) => !query.category || g.category === query.category)
    .filter((g) => !query.kind || g.kind === query.kind)
    .map((g) =>
      clean(
        localize(
          { id: g.id, kind: g.kind, image: g.image, youtube_id: g.youtube_id, caption: g.caption, category: categoryOf(g.category, locale) },
          locale,
        ),
      ),
    );
  const limit = Number.parseInt(query.limit ?? "", 10);
  const page = paginate(items, query.page, limit > 0 ? limit : undefined);
  return page ? ok(page) : errors.notFound();
});

// --- /posts/ and /post-categories/ --------------------------------------------------------------------
function postOut(p, locale, detail) {
  const out = {
    slug: p.slug,
    title: p.title,
    excerpt: p.excerpt,
    cover: p.cover,
    category: categoryOf(p.category, locale),
    published_at: p.published_at,
  };
  if (detail) out.body_html = toHtml(localize(p.body, locale));
  return clean(localize(out, locale));
}

const publishedPosts = () =>
  postsFixture.posts
    .filter((p) => p.published_at && new Date(p.published_at).getTime() <= Date.now())
    .sort((a, b) => b.published_at.localeCompare(a.published_at));

route("GET", "/post-categories/", ({ locale }) =>
  ok(categories.map((c) => ({ slug: c.slug, name: localize(c.name, locale) }))),
);

route("GET", "/posts/", ({ query, locale }) => {
  const list = publishedPosts().filter((p) => !query.category || p.category === query.category);
  const limit = Number.parseInt(query.limit ?? "", 10);
  const page = paginate(list.map((p) => postOut(p, locale, false)), query.page, limit > 0 ? limit : undefined);
  return page ? ok(page) : errors.notFound();
});

route("GET", "/posts/:slug/", ({ params, locale }) => {
  const all = publishedPosts();
  const p = all.find((x) => x.slug === params.slug);
  if (!p) return errors.notFound();
  const related = all.filter((x) => x.slug !== p.slug).slice(0, 3).map((x) => postOut(x, locale, false));
  return ok({ ...postOut(p, locale, true), related });
});
