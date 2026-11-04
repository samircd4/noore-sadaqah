# Frontend: Next.js 16

The public website of নূরে সাদাকাহ ফাউন্ডেশন. Rules for working here: [CLAUDE.md](CLAUDE.md) (and the root `../CLAUDE.md`).
Build plan: `../docs/ROADMAP.md` (phases F0–F5).

## Run it

```bash
cp .env.example .env.local     # API_MODE=mock: works without any backend
npm install
npm run dev                    # http://localhost:3000 (Bengali) and http://localhost:3000/en
```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run lint` | ESLint |
| `npm run test` | Vitest unit tests (`src/**/*.test.js`) |
| `npm run i18n:check` | `messages/bn.json` and `messages/en.json` have the same keys |
| `npm run check:palette` | No colors outside `design/tokens.css` |
| `npm run build` | Production build (`API_MODE=mock` needs `ALLOW_MOCK_IN_PRODUCTION=1`) |
| `npm run build:standalone` | Build + copy static files for the VPS (`../docs/DEPLOYMENT.md`) |

## Where things are

| Path | Purpose |
|---|---|
| `src/app/[locale]/` | Pages; `layout.js` loads the fonts and the language |
| `src/proxy.js` | Locale routing (later also `/account` protection) |
| `src/i18n/` | next-intl routing, request config, locale-aware navigation |
| `src/lib/api.js` | The only door to the backend: `apiGet()` (cached content) and `apiRequest()` |
| `src/lib/api-mode.js` | Mock / static / live decision |
| `src/lib/format.js` | `bnNumber`, `taka`, `bnDate`, `shortNumber`, `toLatinDigits` |
| `src/mocks/` | The mock API: fixtures, handlers, in-memory store |
| `messages/` | UI labels in Bengali and English |
