# SEO & Analytics

## Metadata (every page)

- `generateMetadata` in each page: title `{page title} | নূরে সাদাকাহ ফাউন্ডেশন` (`| Noore Sadaqah Foundation` on `/en`),
  description from the content (first 155 characters of the summary), Open Graph and Twitter card.
- `metadataBase` = `NEXT_PUBLIC_SITE_URL`.
- OG image: the page's cover photo (1200×630 crop through `next/image` loader or a stored crop); fallback `public/og.png`.
- `alternates`: `canonical` for the current language plus `languages: { bn: "/…", en: "/en/…", "x-default": "/…" }`.
- Donation result pages (`/donate/checkout`, `/success`, `/failed`), `/login` and `/account/*`: `robots: { index: false }`.

## Structured data (JSON-LD)

- Home: `NGO` (or `Organization`) with name in both languages, logo, address, phone, `sameAs` social links.
- `/news/[slug]`: `NewsArticle` with date, image, author = the foundation.
- `/programs/[slug]`, `/campaigns/[slug]`: `WebPage`; don't invent `DonateAction` fields Google doesn't use.
- Contact/footer data comes from `GET /site/`; no hard-coded values.

## Sitemap and robots

- `src/app/sitemap.js` builds both language versions of every public page, programs, campaigns, news posts, using the API.
  Revalidate every hour.
- `src/app/robots.js`: allow everything except `/account`, `/donate/checkout`, `/donate/success`, `/donate/failed`, `/login`;
  link the sitemap. **Staging:** `Disallow: /` and the `X-Robots-Tag: noindex` header (Nginx), plus basic auth.

## Analytics (only with consent)

- Cookie banner (`CookieBanner`, text in POLICIES.md): "গ্রহণ করুন" / "শুধু প্রয়োজনীয়". Choice stored in a
  `ns_consent` cookie (6 months).
- GA4 (`NEXT_PUBLIC_GA_ID`) and Meta Pixel (`NEXT_PUBLIC_META_PIXEL_ID`) load **only after "গ্রহণ করুন"**. Without
  consent no third-party script loads.
- Events: `donate_start` (form submitted: fund, amount band, method), `donate_success` (on the success page when PAID:
  fund, amount), `monthly_start`, `volunteer_submit`, `newsletter_submit`. **No names, phones, emails or donation ids
  in any event.**
- Add the analytics domains to the CSP only when consent is given (SECURITY.md §8), or allow them in CSP and rely on
  not loading the script; pick one and test it.

## Core Web Vitals

Google ranks on mobile performance. Targets and how to meet them: RESPONSIVE.md §12. Watch the field data in
Search Console → Core Web Vitals after launch.

## Search Console

At launch: verify the domain (DNS TXT on Cloudflare), submit `sitemap.xml`, check both languages are indexed after a week.
