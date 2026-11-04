# Responsive & Mobile Spec

Most donors will open the site on a phone, often a budget Android on a slow mobile connection, and often inside the
Facebook, Messenger or WhatsApp in-app browser. **The phone layout is the main layout.** This doc is the rulebook;
DESIGN_SYSTEM.md has the tokens, HOME_PAGE.md / PAGES.md the content. Decisions: DECISIONS.md D14.

**Minimum width: 320px, and it must look right there, not just "not break".**

## 1. Principles

1. **Mobile-first classes.** Unprefixed classes are the phone layout; add `sm:` / `md:` / `lg:` for bigger screens.
   Never design at 1440 and "squeeze down".
2. **Build and check the phone layout first** for every component, then widen.
3. **Phones are slow.** Every kilobyte of JavaScript, font and image costs real time on 3G/4G (§12).
4. **Fingers, not mice.** Nothing depends on hover; every target is big enough to tap (§6).
5. **Bengali needs vertical room.** Vowel signs and conjuncts clip with tight line-heights (§5).

## 2. Widths, devices and browsers

| Test width | Represents |
|---|---|
| **320** | Oldest/smallest phones (minimum supported) |
| **360** | Most budget Android phones in Bangladesh |
| **375 / 390** | iPhone SE / standard iPhones |
| **414** | Large phones |
| 640×360 | Phone in landscape |
| **768** | Small tablet, large phone landscape |
| 1024 | Tablet landscape / small laptop (desktop nav appears) |
| 1280 | Laptop |
| **1440** | Desktop (the design reference width) |

Bold widths are checked for **every** component and page; the others once per phase.

Browsers to test: Chrome for Android, **Samsung Internet**, iOS Safari, and the **Facebook, Messenger and WhatsApp
in-app browsers** (open a shared link there). The donation redirect to SSLCommerz/bKash and back must work inside an
in-app browser (QA_CHECKLIST.md §4–5).

## 3. Breakpoints

Tailwind defaults; no custom breakpoints.

| Prefix | From | What typically changes |
|---|---|---|
| (none) | 0 | Single column, drawer menu, sticky donate bar, stacked forms, tables as cards |
| `sm:` | 640 | 2-column grids, side-by-side buttons, language switch back in the header, header Donate button visible |
| `md:` | 768 | Tables become real tables, 3–4 column galleries/news |
| `lg:` | 1024 | Desktop nav replaces the drawer, sticky donate bar hidden, 12-column page layouts with sticky sidebars |
| `xl:` | 1280 | Wider footer (5 columns), more white space |

## 4. Layout rules

- Page gutter `px-4` (16px) on phones; containers `max-w-7xl mx-auto px-4` as in the design.
- **No fixed widths over 288px** (320 − 2 × 16). Use `w-full`, `max-w-*`, `flex-1`, `min-w-0`.
- Flex and grid children that hold text get `min-w-0` (otherwise long words push the layout wider).
- Long emails, URLs, transaction IDs and receipt numbers: `break-words` (or `break-all` for IDs).
- Images and media keep their ratio with `aspect-*` or `fill` + a sized parent; never a fixed pixel height that
  crops text on phones.
- **No horizontal scroll** on any page: `document.documentElement.scrollWidth === window.innerWidth` at 320 (tested, §17).
  Never hide an overflow bug with `overflow-x: hidden` on `html`/`body`; find the element that is too wide.
- Exceptions that scroll sideways on purpose: Tabs (§15), category filter chips. They scroll inside their own
  container, with `overflow-x-auto`, `snap-x` and a fade at the edge.
- Vertical rhythm on phones: sections `py-12` (design `py-14 lg:py-20` is fine), cards `p-5`.

## 5. Bengali typography on small screens

| Element | Phone | From `sm`/`lg` | Rule |
|---|---|---|---|
| Body text | `text-base` (16px), `leading-relaxed` (1.625) | `text-lg` where the design uses it | Body text never below 16px; line-height ≥ 1.6 |
| Small text (captions, meta) | `text-sm` (14px), `leading-6` | same | Not for paragraphs; never below 13px |
| Section `h2` | `text-[1.75rem]` at 320, `text-3xl` from 360 | `sm:text-4xl lg:text-5xl` | `leading-snug` (1.375) minimum |
| Hero `h1` | `text-[2rem]` at 320, `text-4xl` from 360 | `sm:text-5xl lg:text-7xl` | Max 4 lines at 320; line-height ≥ 1.3 (the design's `leading-[1.2]` may clip conjuncts: check ক্ষ, ন্ত, র্থ, স্ব and raise to `leading-[1.3]` if they touch) |
| Buttons | `text-base font-bold` | | Label never wraps to 3 lines; shorten the label instead |

- Use `min-[360px]:` for the 320→360 step (e.g. `text-[2rem] min-[360px]:text-4xl`).
- Never truncate a heading with an ellipsis; summaries may use `line-clamp-3` on cards.
- Numbers in Bengali digits (`bnNumber`) are wider than Latin ones: test stat numbers and amounts at 320.
- The English version (`/en`) is usually shorter; always test the Bengali version first.

## 6. Touch targets

- **Every tappable element is at least 44 × 44px**, with at least 8px between neighbours. Small icons get padding
  (`p-2.5` on a 24px icon) rather than a bigger icon.
- Applies to: amount chips, pagination, close (×) buttons, social icons (design is 40px: use `w-11 h-11`), language
  switch, menu items, accordion headers, gallery arrows, checkbox and radio rows (the whole row is the label).
- Footer and menu link lists: `py-2` per link (design `space-y-2 text-sm` gives targets that are too small).
- Nothing important appears only on hover. Tooltips (zakat calculator help) open on tap and close on outside tap.
- Hover effects (`hover:scale-…`, `hover:-translate-y-1`) are fine as decoration; wrap them in `hover:` only, never
  as the only way to reveal content.

## 7. Forms on phones

- One column below `sm`. Labels above inputs, help text and errors below (DESIGN_SYSTEM.md "Input error").
- **Inputs are 44px tall (`h-11`) with 16px text**: smaller text makes iOS zoom the page on focus.
- Right keyboard for each field:

| Field | Attributes |
|---|---|
| Mobile | `type="tel" inputMode="tel" autoComplete="tel-national"` |
| Amount, people count | `type="text" inputMode="numeric" pattern="[0-9০-৯]*"` (accepts Bengali digits) |
| Email | `type="email" inputMode="email" autoComplete="email"` |
| Name | `autoComplete="name"` |
| OTP | `inputMode="numeric" autoComplete="one-time-code" maxLength={6}` |

- Submit buttons are full width below `sm` (`w-full sm:w-auto`).
- On a failed submit, focus and scroll to the first field with an error (`scrollIntoView({block: "center"})`) so the
  keyboard doesn't hide it.
- No layout jump when the keyboard opens: don't use `100vh` for form pages; use `min-h-dvh`.
- The donate form puts the **form first** on phones and the fund story after it (PAGES.md).

## 8. Header and mobile menu

The design's header doesn't fit on phones: logo + "Noore Sadaqah / Foundation" + বাং/EN switch + menu button
inside `px-6` is about 450px. Phone header:

| Width | Header contents | Height |
|---|---|---|
| < 640 | Logo mark (40px) + name (smaller: `text-base`, second line `text-xs tracking-[0.3em]`) · menu button (44px). Language switch and Donate move into the drawer; Donate also lives in the sticky bar (§9) | `h-16` (64px), `px-4` |
| 640–1023 | Logo + name · language switch · Donate button · menu button | `h-20` (80px) |
| ≥ 1024 | Design as-is: logo · nav · switch · Donate | `h-20` |

- Content offset matches the header height (`pt-16 sm:pt-20`, or the hero padding accounts for it).
- **Drawer** (`MobileMenu`, client): slides in from the right, full height
  `h-dvh`, `max-w-xs w-[85vw]`, `bg-em-900`; contains the nav links (44px rows), language switch, the Donate button
  (gold), contact phone. Focus trap, body scroll lock, closes on Esc, on outside tap, on link tap and on route
  change; `aria-expanded` on the button; respects safe areas.

## 9. Sticky donate bar (phones and tablets)

Design addition, approved (DECISIONS.md D14). Component `MobileDonateBar` (client), in the layout.

- Shown **below `lg`** only (`lg:hidden`).
- Fixed to the bottom, full width, `bg-gold-500 text-em-950 font-bold`, height 56px plus
  `padding-bottom: env(safe-area-inset-bottom)`; one button "দান করুন" with the hand-heart icon → `/donate`.
  Optional second, smaller link "মাসিক দাতা হোন" → `/get-involved?tab=monthly` (foundation to decide; off by default).
- **Hidden when:** on `/donate/*`, `/zakat-calculator`, `/login`, `/account/*`; while the home quick-donate panel or
  the footer is on screen (IntersectionObserver); while the drawer, a modal or the lightbox is open; while the cookie
  banner is showing; while an input has focus (the keyboard is open).
- Slides in/out (`translate-y`), no layout shift; respects `prefers-reduced-motion`.
- The layout adds `pb-[calc(56px+env(safe-area-inset-bottom))] lg:pb-0` to `<main>` so the bar never covers content.
- Tracked as the analytics event `donate_start` source `sticky_bar` (SEO_ANALYTICS.md).

## 10. Fixed layers (z-index scale)

Only these values (variables in `design/tokens.css`; use `z-(--z-header)` etc. in Tailwind v4):

| Layer | Token | Value |
|---|---|---|
| Quick-donate panel overlapping the hero (desktop only) | `--z-raised` | 10 |
| Fixed header | `--z-header` | 40 |
| Sticky donate bar | `--z-sticky-bar` | 40 |
| Drawer + its backdrop | `--z-drawer` | 50 |
| Modal, lightbox, video modal | `--z-modal` | 60 |
| Cookie banner | `--z-banner` | 70 |
| Toasts | `--z-toast` | 80 |

## 11. Viewport, iOS and Android details

- `export const viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#072E20" }`
  in the root layout (`#072E20` = `em-900`). JavaScript can't read the CSS token here, so this is the **only** hex
  allowed in frontend code: define it once in `src/lib/theme.js` with a comment pointing to `tokens.css`, and exclude
  that file from the palette grep (QA §1). **Never** set `maximumScale` or `userScalable: false`.
- Use `dvh`/`svh` instead of `vh` for full-height elements (mobile address bars change `vh`).
- Fixed bars respect `env(safe-area-inset-*)` (iPhone notch and home indicator).
- `background-attachment: fixed` (design `.bg-parallax`, campaign banner) is ignored by iOS and janky on Android:
  use it only from `lg:` up; on phones the background scrolls normally.
- `backdrop-blur` (header, glass chips) is expensive on low-end Android: keep it on the header only; the glass chips
  on phones use a solid `bg-em-950/60` instead.
- Tap highlight: `-webkit-tap-highlight-color: transparent` plus a visible `active:` state.

## 12. Images, fonts and performance

**Budgets** (Lighthouse mobile profile, mid-range Android, slow 4G), checked on home, `/donate/[fund]`, `/programs/[slug]`:

| Metric | Budget |
|---|---|
| Largest Contentful Paint | ≤ 2.5 s |
| Cumulative Layout Shift | ≤ 0.1 |
| Interaction to Next Paint | ≤ 200 ms |
| JavaScript per page (gzipped) | ≤ 150 KB |
| Total page weight on first load | ≤ 1.5 MB (home), ≤ 800 KB (others) |

**Images** (`next/image` everywhere; `sizes` is **required**):

| Component | `sizes` | Notes |
|---|---|---|
| Hero | `100vw` | `priority`; on phones `object-position` keeps faces/subject in frame; ≤ 200 KB at 800w |
| PageHero | `100vw` | `priority` |
| ProgramCard / FundCard | `(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw` | |
| NewsCard | `(min-width: 768px) 33vw, 100vw` | |
| Gallery mosaic, large tile | `(min-width: 768px) 50vw, 100vw` | |
| Gallery mosaic, small tile / gallery grid | `(min-width: 768px) 25vw, 50vw` | |
| About collage | `(min-width: 1024px) 40vw, 100vw` | |
| Person card | `(min-width: 1024px) 25vw, 50vw` | |
| Lightbox | `100vw` | Load the full image only when opened |

- Everything below the first screen lazy-loads (the `next/image` default).
- **YouTube and Google Maps are tap-to-load facades**: a thumbnail/static image with a play/"ম্যাপ দেখুন" button; the
  iframe loads only on tap. No autoplay video anywhere.
- Fonts: `next/font/google` with `subsets: ["bengali", "latin"]`, `display: "swap"`, and **only the weights used**
  (Sans 400/600/700, Serif 700/800). Preload the body font only.
- Animations: CSS only, `transform`/`opacity`; everything wrapped in `motion-safe:`.
- No client component where a server component works (ARCHITECTURE.md rule 8); no heavy libraries for small effects
  (carousels, lightbox: write small ones, or use a library under 10 KB gzipped).

## 13. Tables and data on phones

Every table becomes a **stack of cards below `md`** (`hidden md:table` + `md:hidden` card list, both from the same data):
program impact by year, `/account` donations, `/transparency` totals and reports. A card shows the most important
value large (amount), the rest as label/value rows. Never make a table scroll sideways on phones.

## 14. Home page, section by section

Reference: `design/reference/home.html`. "320" means the phone layout (320–639).

| # | Section | 320 (phone) | 768 | 1440 |
|---|---|---|---|---|
| 1 | Header | §8 phone header, `h-16`, drawer | logo, switch, Donate, menu | design |
| 2 | Hero | `pt-24 pb-16` (design `pt-32 pb-32` is too tall), h1 per §5, buttons stacked full width, Bismillah chip may wrap to 2 lines | buttons side by side | design |
| 3 | Quick-donate | **In normal flow** under the hero, `-mt-8` overlap at most (HOME_PAGE fix 3); fields stacked; amount chips in a **2×2 grid**, free amount on its own row (full width), submit full width; heading `text-xl` | 3 fields in a row, chips in one row | design (`absolute` overlap) |
| 4 | Stats | 2×2 grid, numbers `text-3xl`, labels may wrap to 2 lines; `pt-8` (no 120px gap, since the panel isn't absolute) | 2×2 | 4 in a row |
| 5 | About | Collage first, full width, the small overlapping photo stays inside the gutter (design uses `-right-4`, which can overflow: use `right-2`); "৫+ বছরের সেবা" badge inside the photo; 3 value cards stacked | value cards 3 in a row | design |
| 6 | Programs | 1 column; cards `min-h-80` instead of fixed `h-96`, so long titles never clip | 2 columns | 3 columns |
| 7 | Campaign banner | Text first, then progress bar, then the 3 monthly options as **3 compact cards** (`p-3`, amount `text-2xl`, label `text-xs`; they must fit at 320: about 85px each) or a vertical list below 360; buttons stacked full width; no fixed background (§11) | options beside the text from `lg` | design |
| 8 | Gallery mosaic | 2 columns, `auto-rows-[120px]` (design 170px), large tile `col-span-2 row-span-2`; 4 tiles on phones instead of 6 | 4 columns, 170px | design |
| 9 | Quote band | `text-2xl`, `px-4`, source on its own line | | design |
| 10 | News | 1 column, horizontal-scroll is **not** used; 3 cards stacked (or 2 + "সব সংবাদ" link) | 3 columns from `md` | design |
| 11 | Volunteer CTA | `px-5 py-10`, buttons stacked full width | | design |
| 12 | Footer | 1 column: logo + tagline, then contact, then links in **2 columns** (লিংক / সহযোগিতা side by side), newsletter full width, payment logos wrap; social icons 44px; bottom padding for the sticky bar | 2 columns | 5 columns (`xl`) |

## 15. Other pages on phones

| Page | Phone layout |
|---|---|
| PageHero (all pages) | `py-14`, h1 `text-[1.75rem] min-[360px]:text-3xl`, breadcrumb one line with `truncate` on the last item only |
| `/about` | Story text then photos; mission/vision cards stacked; board grid 2 columns; registration card full width with full-width download button |
| `/programs` | 1 column of cards |
| `/programs/[slug]` | Sidebar (info + donate box) comes **right after the hero summary**, not at the end; not sticky on phones; goals list; gallery strip scrolls sideways (snap) with visible next item; impact table → cards (§13); FAQ accordion full width |
| `/campaigns/[slug]` | Progress card first; monthly options stacked or 3 compact cards (as home §14.7); story; recent donors as a simple list |
| `/donate` | Fund cards 1 column; bank and merchant numbers as cards with a 44px copy button each |
| `/donate/[fund]` | **Form first**, fund story after; one-time/monthly toggle full width (two 50% buttons); chips 2×2; checkboxes as full-width 44px rows; payment method as two large radio cards |
| `/donate/checkout` | Summary card full width; buttons stacked, "পেমেন্ট করুন" on top |
| `/donate/success`, `/failed` | Single centered column; receipt and share buttons full width |
| `/zakat-calculator` | One column of inputs; the **result bar sticks to the bottom** (above safe area, replaces the sticky donate bar) showing the live total and "এই পরিমাণ দান করুন" |
| `/get-involved` | Tabs scroll sideways if needed (`snap-x`); volunteer form one column; district select is a native `<select>` (good on phones) |
| `/news` | Category chips scroll sideways; cards 1 column; pagination shows prev / current of total / next on phones (not every page number) |
| `/news/[slug]` | Prose `text-base leading-relaxed`; images full width; share buttons in one row of 44px icons |
| `/gallery` | 2-column grid; lightbox full screen with swipe left/right, swipe down to close, close button 44px in the top corner, caption at the bottom |
| `/contact` | Info (tap-to-call `tel:`, WhatsApp `https://wa.me/`, `mailto:`) **before** the form; map as a tap-to-load facade |
| `/transparency` | Totals and reports as cards (§13) |
| `/privacy`, `/terms`, `/refund-policy` | Prose, `text-base`, headings `text-xl` |
| `/login` | Card full width with `px-4`; OTP field one input with `autocomplete="one-time-code"` (not 6 boxes, which break autofill on many Android phones) |
| `/account` | Summary cards 1 column (or 2 from 360 if they fit); donations as cards (§13) |
| `/account/recurring` | One card per plan; actions as full-width buttons; confirm dialogs as bottom sheets |
| Cookie banner | Bottom sheet, buttons side by side 50/50, above the sticky bar (§10) |
| Not found / error | Centered, buttons stacked |

## 16. Accessibility on phones

- Works with browser text size at 200% and Android "Font size: Largest": no clipped or overlapping text (layouts use
  `rem`, not fixed pixel heights around text).
- Landscape phone (640×360): header still `h-16`, drawer scrolls, modals fit.
- TalkBack / VoiceOver: drawer and modals announce, trap focus and return focus on close; the sticky bar is a normal link.
- Focus ring (gold) visible on all controls also on touch-keyboard navigation.

## 17. How to test

- **While building:** Chrome DevTools device mode at 320 / 375 / 768 / 1440 (add 320 as a custom device).
- **Automated (TESTING.md):** Playwright projects at 320, 375, 768, 1440; each public page: no horizontal scroll,
  no console errors, axe without serious violations, sticky bar hidden on the routes in §9.
- **Lighthouse mobile** for the budgets in §12.
- **Real devices before each phase is merged:** one budget Android (Chrome + Samsung Internet), one iPhone (Safari),
  and opening a link from Facebook Messenger or WhatsApp. Use the staging URL or a tunnel (`cloudflared`).

## 18. Definition of done (every component and page)

- [ ] Built mobile-first; checked at **320, 375, 768, 1440**
- [ ] No horizontal scroll; nothing overlaps; nothing clipped (Bengali conjuncts included)
- [ ] Touch targets ≥ 44px; no hover-only content
- [ ] Forms: right keyboard, 16px inputs, errors visible above the keyboard
- [ ] Images have `sizes` and Bengali `alt`; nothing heavy loads before it's needed
- [ ] Sticky bar, header, drawer and modals don't cover content or each other
