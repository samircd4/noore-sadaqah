# Content Inventory — real organisation facts

Every fact the site shows about the foundation lives here first, then moves into the frontend mock fixtures
(`frontend/src/mocks/fixtures/*.json`, during frontend-first work) and from there into Django (`manage.py seed`
loads the same fixtures; afterwards staff edit it in the admin).

**Status key:** ✅ confirmed by the foundation · 🟡 placeholder from the design · ❌ missing

Nothing marked 🟡 or ❌ may go live. The foundation must fill in and confirm every `TODO`.

---

## 1. Identity

| Field | Bengali | English | Status |
|---|---|---|---|
| Name | নূরে সাদাকাহ ফাউন্ডেশন | Noore Sadaqah Foundation | ✅ |
| Short name | — | NSF (used in receipt numbers) | ✅ |
| Tagline (footer) | সাদাকাহ ও মানবসেবার মাধ্যমে সমাজে নূর ছড়ানোর বিনীত প্রয়াস। | TODO | 🟡 |
| Hero headline | সাদাকাহর আলোয় আলোকিত হোক প্রতিটি ঘর | TODO | 🟡 |
| Hero subtext | এতিম, বিধবা ও অসহায় মানুষের পাশে দাঁড়াতে নূরে সাদাকাহ ফাউন্ডেশন কাজ করছে — আপনার দান আমাদের আমানত। | TODO | 🟡 |
| Year founded | TODO (the design says "৫+ বছরের সেবা") | | ❌ |
| Logo | ✅ PNG received (`design/brand/logo-source.png`), used on the site. TODO: SVG and a one-colour version for dark backgrounds | | 🟡 |
| Favicon / app icon | Made from the logo (`frontend/src/app/icon.png`, `apple-icon.png`); redo from the SVG when it arrives | | 🟡 |
| Open Graph image | TODO: 1200×630 | | ❌ |

## 2. Legal registration (shown on /about, /transparency, receipts)

| Field | Value | Status |
|---|---|---|
| Registering authority | TODO (e.g. Department of Social Services / NGO Affairs Bureau / Joint Stock Companies (Trust/Society)) | ❌ |
| Registration number | TODO | ❌ |
| Registration date | TODO | ❌ |
| Registration certificate (PDF) | TODO: upload in the admin (Reports → registration; stored on R2) | ❌ |
| Trade licence / TIN / BIN (if any) | TODO | ❌ |
| Tax-exemption status for donors | TODO: confirm whether donations are tax-deductible. **If not, receipts must not imply they are.** | ❌ |
| Registered address | TODO | ❌ |

## 3. Contact (footer, /contact, receipts)

| Field | Value | Status |
|---|---|---|
| Office address (Bengali) | গাজীপুর, ঢাকা, বাংলাদেশ (provided 2026-11-05) | ✅ |
| Office address (English) | Gazipur, Dhaka, Bangladesh (provided 2026-11-05) | ✅ |
| Google Maps link / embed | TODO: exact office location (the sample map searches "Gazipur, Dhaka, Bangladesh") | 🟡 |
| Phone | +8801781355377 (provided 2026-11-05; also used for the phone links in the footer, menu and /contact) | ✅ |
| WhatsApp | TODO | ❌ |
| Email | info@nooresadaqah.org (confirm the mailbox exists) | 🟡 |
| Office hours | TODO | ❌ |
| Domain | nooresadaqah.org (confirm it is registered) | 🟡 |

## 4. Social links (footer)

| Network | URL | Status |
|---|---|---|
| Facebook | TODO | ❌ |
| YouTube | TODO (also used for the hero "ভিডিও দেখুন" modal) | ❌ |
| Instagram | TODO | ❌ |
| LinkedIn | TODO (the design shows "in") | ❌ |

## 5. Ways to give (donate pages, footer, receipts)

### Bank accounts (one row per account; a fund can have its own account)

| Fund | Bank | Account name | Account no. | Branch | Routing | SWIFT | Status |
|---|---|---|---|---|---|---|---|
| General / Sadaqah | TODO | TODO | TODO | TODO | TODO | TODO | ❌ |
| Zakat (separate account recommended) | TODO | | | | | | ❌ |

### Mobile banking (merchant numbers only, never personal numbers)

| Service | Number | Type (merchant / personal) | Status |
|---|---|---|---|
| bKash | TODO | must be merchant | ❌ |
| Nagad | TODO | must be merchant | ❌ |
| Rocket | TODO | | ❌ |

The footer shows logos for every method the live gateways carry: bKash, Nagad, Rocket, upay, tap, Visa, Mastercard,
American Express, DBBL Nexus, UnionPay (`frontend/src/lib/payment-methods.js`; the files are placeholders until the
official logos are added, see `frontend/public/payments/README.md`). Only show the methods that really work at launch:
confirm the list with the SSLCommerz account.

### Payment gateway accounts

| Gateway | Merchant ID / Store ID | Application status | Date applied |
|---|---|---|---|
| SSLCommerz | (goes in `.env`, not here) | TODO | TODO |
| bKash Tokenized Checkout (PGW) | (goes in `.env`, not here) | TODO | TODO |

## 6. People (/about)

| Name | Role (Bengali) | Role (English) | Photo | Short bio | Status |
|---|---|---|---|---|---|
| TODO | চেয়ারম্যান | Chairman | TODO | TODO | ❌ |
| TODO | সাধারণ সম্পাদক | General Secretary | | | ❌ |
| TODO | কোষাধ্যক্ষ | Treasurer | | | ❌ |
| TODO | শরীয়াহ উপদেষ্টা | Shariah Advisor (signs off ZAKAT_POLICY.md) | | | ❌ |

Ask each person for consent before publishing their photo.

## 7. Story and mission (/about)

- **Our story** (3–5 paragraphs, Bengali): TODO
- **Mission** (1 sentence): TODO
- **Vision** (1 sentence): TODO
- **Principles**: the about section has 3 value cards; TODO confirm their final text:
  1. 🛡️ TODO (e.g. আমানতদারিতা — trustworthiness)
  2. 🤝 TODO (e.g. স্বচ্ছতা — transparency)
  3. 📖 TODO (e.g. শরীয়াহ অনুসরণ — following Shariah)
- **Promotional video** (YouTube ID): TODO

## 8. Impact numbers (home stats, SiteSetting `stats`)

Every number needs a source the foundation can defend if a donor asks.

| Label | Value in design | Real value | As of | Source | Status |
|---|---|---|---|---|---|
| উপকারভোগী পরিবার | 12,500+ | TODO | TODO | TODO | 🟡 |
| খাদ্য প্যাকেট | 50,000+ | TODO | | | 🟡 |
| এতিম শিশু | 3,200+ | TODO | | | 🟡 |
| রোপণকৃত গাছ | 100,000+ | TODO | | | 🟡 |

## 9. Funds (seed `Fund`)

| slug | titleBn | Zakat eligible | Recurring allowed | Min amount | Presets | Status |
|---|---|---|---|---|---|---|
| sadaqah | সাদাকাহ | no | yes | 10 | 100, 200, 500, 1000 | 🟡 |
| zakat | যাকাত | **yes** | yes | 10 | 100, 200, 500, 1000 | 🟡 |
| fitra | ফিতরা | no | **no** (once a year) | TODO: per-person rate, see ZAKAT_POLICY.md | TODO | 🟡 |
| orphan | এতিম সহায়তা | TODO: ask the scholar | yes | 10 | 500, 1000, 2000 | 🟡 |

Each fund also needs: `summary_bn` (1–2 sentences), `body_bn` (story), a cover photo and its bank account.

## 10. Programs (seed `Program`)

| slug | badgeBn | titleBn | summaryBn (from design) | Linked fund | Status |
|---|---|---|---|---|---|
| food | খাদ্য | খাদ্য সহায়তা | রমযান, ঈদ ও প্রাকৃতিক দুর্যোগে বিপন্ন ও অসহায় পরিবারগুলোর মাঝে পুষ্টিকর খাদ্যসামগ্রী বিতরণ। | sadaqah | 🟡 |
| education | শিক্ষা | এতিম ও শিক্ষা সেবা | সুবিধাবঞ্চিত শিশু ও এতিমদের শিক্ষাবৃত্তি, বিনামূল্যে বই, পোশাক ও মাসিক ভরণপোষণ প্রদান। | orphan | 🟡 |
| water | পানি | বিশুদ্ধ পানি প্রকল্প | নলকূপ স্থাপন ও গভীর সুপেয় পানির ব্যবস্থা — নিরবচ্ছিন্ন সাদাকায়ে জারিয়ার উত্তম সুযোগ। | sadaqah | 🟡 |
| health | স্বাস্থ্য | চিকিৎসা সহায়তা | দরিদ্র রোগীর জরুরী চিকিৎসা খরচ বহন ও বিনামূল্যে বিশেষজ্ঞ মেডিকেল ক্যাম্প পরিচালনা। | sadaqah | 🟡 |
| trees | পরিবেশ | বৃক্ষরোপণ কর্মসূচি | পরিবেশ রক্ষা ও সওয়াবের আশায় ফলদ ও ঔষধি গাছ লাগিয়ে দীর্ঘমেয়াদী কল্যাণ ত্বরান্বিত করা। | sadaqah | 🟡 |
| mosque | দ্বীন | মসজিদ ও মাদ্রাসা সহায়তা | দ্বীনি শিক্ষার প্রসার এবং আল্লাহর ঘর মসজিদ ও মাদ্রাসার অবকাঠামো নির্মাণ ও সংস্কার কাজ। | sadaqah | 🟡 |

For each program, also collect: full description, 3–5 goals, beneficiaries, working areas (districts), duration,
5–10 photos, impact by year (`[{year, metric, value}]`) and 3–5 FAQs.

> Zakat may only fund programs whose recipients are eligible for zakat. Never link the zakat
> fund to the mosque program or the tree-planting program without the scholar's approval.

## 11. Campaign (seed `Campaign`)

| Field | Value | Status |
|---|---|---|
| Title | একজন এতিমের মুখে হাসি ফোটান | 🟡 |
| Summary | মাত্র মাসিক ১,০০০ টাকায় একজন এতিমের খাবার, পড়াশোনা ও চিকিৎসার দায়িত্ব নিন। | 🟡 |
| Goal | 500,000 | 🟡 |
| Raised in design | 320,000. **Real value comes from PAID donations; seed any offline amount as an offline Donation.** | 🟡 |
| Monthly options | 500 / 1000 (highlighted) / 2000 | 🟡 |
| Dates | TODO | ❌ |
| Fund | orphan | 🟡 |

## 12. Quote band (SiteSetting `quote`)

- Text: সাদাকাহ সম্পদ কমায় না — বরং বরকত বাড়ায়।
- Source: হাদীসের মর্মার্থ · সহীহ মুসলিম. TODO: have the Shariah advisor confirm the wording and the reference (hadith number).

## 13. Photos and media

- All design photos are Unsplash placeholders. TODO: real photos for hero (2000px wide), each program (≥1200px), gallery (≥30 to start) and news covers.
- Do not show the faces of beneficiaries, especially orphans and women, without written consent. Prefer photos that keep their dignity (no close-ups of suffering).
- Each photo needs a Bengali `alt` text describing it (CLAUDE.md rule 13).

## 14. News (seed `Post`)

The 3 posts in the design are samples (October 2026: ত্রাণ, শিক্ষা, স্বাস্থ্য). TODO: 3–6 real posts with date, category, cover photo, excerpt and body.
Categories: ত্রাণ, শিক্ষা, স্বাস্থ্য, TODO (add more as needed).

## 15. Transparency documents (/transparency)

| Document | Year | File | Status |
|---|---|---|---|
| Annual report | TODO | TODO | ❌ |
| Audit report (by whom) | TODO | TODO | ❌ |
| Fund-wise spending summary | TODO | from the database after launch | ❌ |
| Registration certificate | — | see §2 | ❌ |

## 16. Accounts and services to buy (in the foundation's name)

Nothing here is bought yet. Use the foundation's email as the account owner and keep logins in the foundation's
password manager (DEPLOYMENT.md "What to buy").

| Item | Provider | Owner (person) | Account email | Status |
|---|---|---|---|---|
| Domain `nooresadaqah.org` | TODO | TODO | TODO | ❌ |
| DNS | Cloudflare | | | ❌ |
| VPS (2 vCPU / 8 GB) | Hostinger | | | ❌ |
| Object storage | Cloudflare R2 | | | ❌ |
| SMS gateway + BTRC masked sender ID | TODO | | | ❌ |
| Email sending | Resend / SMTP | | | ❌ |
| Mailbox `info@` | TODO (Google Workspace for Nonprofits?) | | | ❌ |
| Password manager (shared vault) | TODO (Bitwarden Organizations, 1Password …) | | | ❌ |
| Uptime monitor, Sentry | Better Stack / UptimeRobot, Sentry | | | ❌ |
| SSLCommerz merchant | SSLCommerz | | | 🟡 applied |
| bKash PGW merchant (+ recurring product?) | bKash | | | 🟡 applied |
