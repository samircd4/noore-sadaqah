# Design System

The look of the site comes from the home page design in `design/reference/home.html`.
The tokens live in **`design/tokens.css`** (Tailwind v4). Change a color there and nowhere else.
`design/tailwind.config.js` is a **reference copy** for Tailwind v3 / the CDN only (it lets `home.html` render); the build
doesn't use it. If a token changes, update it too so `home.html` still matches.
The Django admin (Unfold) uses the same emerald scale as its primary color (ADMIN.md), and receipt/email templates use
the same hex values, copied from `tokens.css`.

## Color palette

### Emerald (`em`) — brand primary

| Token | Hex | Use |
|---|---|---|
| `em-50` | `#EAF6F0` | Value-card background (About section) |
| `em-100` | `#CDE9DC` | Value-card border |
| `em-500` | `#1F8A63` | Amount chips, hover state of dark buttons |
| `em-600` | `#16704F` | Footer top border |
| `em-700` | `#0F5A3F` | Primary dark button, stat numbers, links |
| `em-800` | `#0B4631` | Secondary dark button ("আমাদের সম্পর্কে জানুন") |
| `em-900` | `#072E20` | Header background (`/90`), section headings |
| `em-950` | `#041C13` | Body text, text on gold, photo overlays |

### Sand (`sand`) — warm neutrals

| Token | Hex | Use |
|---|---|---|
| `sand-50` | `#FBF8F2` | Page background |
| `sand-100` | `#F5EEDF` | Alternate section background (Programs); light text on dark |
| `sand-200` | `#EADFC8` | Card borders; footer text |
| `sand-300` | `#DCCBA6` | Spare, for stronger borders |

### Gold (`gold`) — accent and calls to action

| Token | Hex | Use |
|---|---|---|
| `gold-400` | `#F4D27A` | Hover on gold buttons; highlighted word on dark ("আলোকিত") |
| `gold-500` | `#D6A83F` | Donate buttons, quick-donate panel, badges, focus ring |
| `gold-600` | `#B88725` | Eyebrow labels ("— আমাদের কার্যক্রম") on light backgrounds |

### Contrast rules (checked, WCAG AA needs 4.5:1 for body text)

| Pair | Ratio | Verdict |
|---|---|---|
| `em-950` on `gold-500` | 8.1 | ✅ Use for all text on gold |
| white on `gold-500` | 2.2 | ❌ Too faint. The design uses it on the quick-donate heading, the header Donate icon area, footer subscribe button and campaign buttons; switch those to `text-em-950` |
| white on `em-700` | 8.2 | ✅ |
| white on `em-500` | 4.3 | ⚠️ OK for bold buttons (large text), not for small body text |
| `em-950` on `sand-50` | 16.8 | ✅ |
| `gold-600` on `sand-50` | 3.0 | ⚠️ Only for bold, small-caps eyebrow labels, never paragraphs |
| `text-blue-800` on `gold-500` | 4.0 | ⚠️ Use `text-em-950 underline` for links inside the gold panel |

## Typography

| Role | Font | Tailwind |
|---|---|---|
| Body, forms, buttons | Noto Sans Bengali 400/500/600/700 | `font-sans` (default) |
| Headings, numbers, logo | Noto Serif Bengali 500–800 | `font-head` |

Load both from Google Fonts (in Next.js use `next/font/google` with `subsets: ["bengali", "latin"]`).

Heading scale used in the design:

- Hero `h1`: `font-head text-4xl sm:text-5xl lg:text-7xl font-extrabold leading-[1.2]`
- Section `h2`: `font-head text-3xl sm:text-4xl lg:text-5xl font-bold text-em-900`
- Card `h3`: `font-head text-xl` (news) or `text-2xl` (program cards) `font-bold`
- Eyebrow: `text-gold-600 font-bold tracking-widest text-sm` with a leading "— "
- Body: `text-lg text-em-900/80 leading-relaxed`

## Shape, spacing, elevation

- **Radius:** `rounded-lg` on everything (buttons, cards, inputs, badges). No pills, no sharp corners.
- **Container:** `max-w-7xl mx-auto px-4` (quick-donate panel uses `max-w-6xl`).
- **Section padding:** `py-14 lg:py-20` (light sections), `py-16 lg:py-20` (banners).
- **Card shadow:** `shadow-card` → `hover:shadow-card-hover` with `hover:-translate-y-1`.
- **Grid gaps:** `gap-6`.

## Reusable patterns (build these as components)

| Pattern | Classes (from the design) |
|---|---|
| Gold CTA button | `px-7 py-3.5 rounded-lg bg-gold-500 hover:bg-gold-400 text-em-950 font-bold transition` |
| Dark button | `px-7 py-3 rounded-lg bg-em-800 hover:bg-em-700 text-white font-semibold transition` |
| Ghost button (on dark) | `px-7 py-3.5 rounded-lg border border-white/40 hover:bg-white/10 font-semibold` |
| Glass chip (on photo) | `px-5 py-1.5 rounded-lg bg-white/10 backdrop-blur border border-white/25` |
| Badge | `px-3 py-1 rounded-lg bg-gold-500/90 text-em-950 text-xs font-bold` |
| Stat card | `p-5 rounded-lg bg-white border border-sand-200 text-center shadow-sm` + number in `font-head text-4xl font-extrabold text-em-700` (alternate `text-gold-600`) |
| Section header | Eyebrow + `h2`, centered (`text-center max-w-2xl mx-auto`) or split with a "সব দেখুন →" link |
| Photo card | Background image + `--overlay-card` + text pinned to bottom (`flex flex-col justify-end`) |
| Progress bar | Track `h-3 rounded-lg bg-white/20`, fill `bg-gold-500` with `width: {percent}%` |
| Input | `h-[42px] w-full rounded-lg border border-sand-300 bg-white px-3 text-em-950 placeholder:text-em-900/50 focus:border-gold-600` (the design uses `gray-*` / `yellow-*` here; those are replaced by palette tokens) |
| Input error | No `red-*` (not in the palette). Use `border-gold-600` + an error line below in `text-em-950 font-semibold` with an alert icon. If a red error color is truly wanted, add it to `tokens.css` first (CLAUDE.md rule 4) |
| Empty state, pagination, accordion, tabs, page hero | See `PAGES.md` → "Shared page parts" |

## Photo overlays

Defined as CSS variables in `tokens.css`. Always put text on photos over one of these:

- `--overlay-hero` — hero (dark top and bottom, lighter middle)
- `--overlay-banner` — flat 78% emerald (campaign banner)
- `--overlay-card` — transparent → dark at the bottom (program cards)
- `--overlay-footer` — diagonal emerald (footer)
- `--overlay-gold` — 50% gold (quote band)

## Icons

The design mixes Font Awesome 5, emoji (🛡️ 🤝 📖 🔥 📍) and text glyphs (☪ ▶ f in).
Pick **one** icon set for the build: `lucide-react` is recommended (tree-shaken, works with Tailwind).
Keep ☪ only if it is the real logo; replace it with an SVG logo file when you have one.

## Language

- Default language Bengali (`<html lang="bn">`), English as a second locale (the header has বাং / EN).
- Use Bengali digits for display (`১২,৫০০`) via `Intl.NumberFormat("bn-BD")`. Never store them; store plain numbers.
- Currency: `৳` before the amount.
