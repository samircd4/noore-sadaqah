# Home Page Spec

**The home page (`/`) is `design/reference/home.html`.** That file is the approved design.
When building `frontend/src/app/[locale]/page.jsx`, reproduce it section by section, as components, with the
hard-coded text moved into data. Every section loads through `src/lib/api.js`: the mock fixtures during frontend
phases F1–F5, Django afterwards, with the same shapes (`API.md`; endpoint per section in PAGES.md "Where each page
gets its data"). The seed content below goes into the fixtures.

## Section map

| # | Section | Anchor | Component | Data it needs |
|---|---|---|---|---|
| 1 | Fixed header: logo, nav, বাং/EN switch, Donate button, mobile menu | — | `components/layout/Header.jsx` | nav links |
| 2 | Hero: Bismillah chip, headline, subtext, two buttons | — | `components/home/Hero.jsx` | — (static) |
| 3 | Quick-donate panel (gold, overlaps the hero bottom) | `#donate` | `components/donate/QuickDonate.jsx` (client) | active funds, preset amounts |
| 4 | Stats: 4 numbers | — | `components/home/Stats.jsx` | `siteSettings.stats` |
| 5 | About: photo collage, "৫+ বছরের সেবা" badge, 3 value cards, button | `#about` | `components/home/AboutPreview.jsx` | — |
| 6 | Programs: 6 photo cards | `#programs` | `components/home/Programs.jsx` + `ProgramCard.jsx` | programs (featured) |
| 7 | Campaign banner: title, progress bar, 3 monthly amounts | — | `components/home/CampaignBanner.jsx` | one featured campaign (raised, goal) |
| 8 | Gallery: 6-tile mosaic + "সব ছবি দেখুন" | `#gallery` | `components/home/GalleryMosaic.jsx` | latest 6 photos |
| 9 | Quote band (gold) | — | `components/home/QuoteBand.jsx` | quote text + source |
| 10 | News: 3 cards | `#news` | `components/home/LatestNews.jsx` + `NewsCard.jsx` | latest 3 posts |
| 11 | Volunteer CTA | — | `components/home/VolunteerCta.jsx` | — |
| 12 | Footer: logo, social, links, contact, newsletter, payment methods | `#contact` | `components/layout/Footer.jsx` | site settings |

Header and Footer go in `src/app/[locale]/layout.jsx` so every page gets them.

## Content currently in the design (seed data)

**Funds (quick-donate select):** সাদাকাহ, যাকাত, ফিতরা, এতিম সহায়তা
**Preset amounts:** ৳100, ৳200, ৳500 (selected by default), ৳1000, plus a free amount box

**Stats:** ১২,৫০০+ উপকারভোগী পরিবার · ৫০,০০০+ খাদ্য প্যাকেট · ৩,২০০+ এতিম শিশু · ১ লক্ষ+ রোপণকৃত গাছ

**Programs (badge → title):**
1. খাদ্য → খাদ্য সহায়তা
2. শিক্ষা → এতিম ও শিক্ষা সেবা
3. পানি → বিশুদ্ধ পানি প্রকল্প
4. স্বাস্থ্য → চিকিৎসা সহায়তা
5. পরিবেশ → বৃক্ষরোপণ কর্মসূচি
6. দ্বীন → মসজিদ ও মাদ্রাসা সহায়তা

**Campaign:** একজন এতিমের মুখে হাসি ফোটান — raised ৳৩,২০,০০০ of ৳৫,০০,০০০ (64%), monthly options ৫০০ / ১০০০ (highlighted) / ২০০০

**News:** 3 sample posts dated October 2026 (ত্রাণ, শিক্ষা, স্বাস্থ্য)

**Footer contact:** ঢাকা, বাংলাদেশ · +880 1XXX-XXXXXX (placeholder) · info@nooresadaqah.org

All photos are Unsplash placeholders. Replace them with the foundation's own photos before launch.

## Fixes to make while converting (keep the look, fix the behaviour)

1. **Mobile menu does nothing.** The ☰ button needs a client component that opens a drawer with the same nav links and the Donate button.
2. **Nav links are `#anchors`.** On the home page keep anchors for About/Programs/Gallery; point "সংবাদ" to `/news`, "যোগাযোগ" to `/contact`, "দান করুন" to `/donate` once those pages exist.
3. **Quick-donate panel overlaps on phones.** It is `absolute -bottom-[120px]`; on small screens the stacked form is taller than 120px and covers the stats. On phones put it in normal flow under the hero (at most a small `-mt-8` overlap) and keep the `absolute` overlap only from `lg:`; adjust the stats padding to match. Phone layout of the panel: RESPONSIVE.md §14 row 3. Test at 320px.
4. **Amount chips are not wired.** Make them a radio group: clicking a chip sets the amount input; the selected chip uses `bg-em-700`, others `bg-em-500`. Amount input should be `inputMode="numeric"`, min ৳10.
5. **Form fields have no `name`, `id` or label link.** Add `htmlFor`/`id`, `name`, `required`, and `type="tel"` for mobile with BD number validation (`01XXXXXXXXX`).
6. **Low-contrast text on gold** (see DESIGN_SYSTEM.md): quick-donate heading, campaign/volunteer gold buttons and footer subscribe button use white on gold. Switch to `text-em-950`.
7. **`pt-22` on `<body>`**: valid in Tailwind v4 (which we use), but the hero already sits under the fixed header. Check whether it adds an unwanted gap; keep or remove it to match the design.
8. **Video button** ("▶ ভিডিও দেখুন") links to `#about`. Make it open a modal with a YouTube embed.
9. **Images as CSS backgrounds** (`.pc-food`, `.g1` …). Use `next/image` with `fill` + `object-cover` and an overlay `div`, so images are optimised and get `alt` text.
10. **Icons** are mixed (Font Awesome, emoji, letters). Use one icon set.
11. **Remove the Tailwind CDN script and the inline `tailwind.config`.** Tokens come from `design/tokens.css`.
12. **Newsletter input** needs a `<form>`, `type="email"` and a server action (→ `POST /subscribers/`).
13. **Off-palette colors in the design.** The বাং/EN switch uses `bg-[#d6a83f] text-white`, `text-black` and `hover:bg-blue-50`; the quick-donate fields use `gray-*`, `yellow-700` and `text-black`; the panel uses `bg-[#d6a83f]`. Replace them with tokens: `bg-gold-500 text-em-950`, `hover:bg-sand-100`, the Input pattern from DESIGN_SYSTEM.md, and `text-em-950`. Also translate the English "Or" (→ "অথবা", I18N.md).
14. **More off-palette colors** not covered above: the water program card (`.pc-water`) uses
    `linear-gradient(135deg, #2b7fa8, #072e20)` (a blue), and the header Donate icon uses `text-black`. Use the
    standard `--overlay-card` over the photo for the water card, and `text-em-950` for the icon.

15. **Sticky donate bar on phones** (design addition, DECISIONS.md D14): `MobileDonateBar` below `lg`, with the
    hide rules in RESPONSIVE.md §9.
16. **The header doesn't fit on phones.** Logo + name + বাং/EN switch + menu button inside `px-6` is about 450px
    wide. Use the phone header in RESPONSIVE.md §8 (`h-16`, smaller name, switch and Donate moved into the drawer below `sm`).
17. **Other phone problems in the design:** quick-donate labels use `text-red-500` for the `*` (off-palette: use
    `text-em-950` or drop the star and mark optional fields instead); social icons are 40px (use 44px); footer links
    are small tap targets; the campaign's three `text-3xl` amount cards don't fit at 320px; `.bg-parallax` uses
    `background-attachment: fixed` (only from `lg:`). Fixes for each: RESPONSIVE.md §6, §11, §14.

Every section's phone layout (320 / 768 / 1440) is in **RESPONSIVE.md §14**; build each section from that table.

## Built in F1: small changes beyond the fix list

All 17 fixes are applied. These visual details also differ from `home.html`, each for a reason:

| Where | Change | Why |
|---|---|---|
| Hero headline | `leading-[1.3]`; `lg:text-6xl xl:text-7xl`; text container `xl:max-w-6xl` | Bengali conjuncts need the line height; "সাদাকাহর" is longer than the design's sample word, so the first line must still fit on two lines |
| Header at 1024–1279 | Nav `text-base`, tighter padding | Six Bengali nav items + switch + Donate don't fit at 1024 with the design's sizes |
| Stats | Gold numbers use `gold-600` | `gold-500` on white is 2.2:1 (DESIGN_SYSTEM.md "Stat card") |
| About badge, campaign badge | `text-em-950` on gold | CLAUDE.md rule 5 |
| Quote band | Dark `em-950` text plus an extra light gold wash | White on gold fails contrast (rule 5) |
| Volunteer banner | Emerald gradient from the palette | The design's overlay used off-palette greens and left the white text hard to read |
| Gallery mosaic | Tile 5 spans two rows | The design leaves an empty cell in the 4×3 grid |
| Campaign "parallax" | Only from `lg` | `background-attachment: fixed` doesn't work on iOS (RESPONSIVE.md §11) |
| Icons | lucide-react; social links keep the design's "f", ▶, "in" glyphs | lucide 1.x has no brand icons |
| Quick-donate amounts | Bengali digits (৳১০০) instead of "৳ 100" | CLAUDE.md rule 7 |
| Fund list in quick-donate | Fitra hidden while `zakat_enabled` is false | The fitra form needs ZAKAT_POLICY.md sign-off |
| Program cards (F2, owner request) | "বিস্তারিত →" is a gold button-style label (`bg-gold-500 text-em-950`) in the bottom-right corner, always visible; the whole card stays one link | The design showed it only on hover, which phones can't do (RESPONSIVE.md §6: no hover-only content) |
| News cards (F2, owner request) | The whole card is clickable (pointer cursor, hover lift) through the "পড়ুন" link's stretched `::after`; still one link per card | Matches the program cards; a bigger tap target on phones |

Until phase F3, "দান করুন" links scroll to the quick-donate panel (`DONATE_HREF` in `src/lib/nav.js`), and submitting the
panel goes to `/donate/checkout`, which doesn't exist yet. The video modal shows "শীঘ্রই" until `promo_video.youtube_id`
is set (CONTENT.md §7).

## Acceptance checklist

- [ ] At 1440px the page looks like `design/reference/home.html` opened in a browser
- [ ] At **320**, 375 and 768px nothing overlaps or clips, no horizontal scroll, mobile menu works, sticky donate bar follows its hide rules
- [ ] Quick-donate submits fund + name + mobile + amount and goes to the checkout step (mock gateway from F3, real gateways from B2)
- [ ] Stats, programs, campaign, gallery and news come from data, not hard-coded JSX
- [ ] Lighthouse: Accessibility ≥ 95, Performance ≥ 85 on mobile
