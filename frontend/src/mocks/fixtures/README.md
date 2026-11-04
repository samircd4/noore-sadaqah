# Mock fixtures

JSON content served by `../handlers.js` while `API_MODE` is `mock` or `static`.

- One file per endpoint group: `site.json`, `funds.json`, `programs.json`, `campaigns.json`, `posts.json`,
  `gallery.json`, `people.json`, `reports.json`, `jobs.json`, `transparency.json` (added from F1 on).
- Shapes follow `docs/API.md` exactly, except that translatable text is stored as `{ "bn": "…", "en": "…" }`;
  the handlers resolve it by language, as Django will.
- Content comes from `docs/HOME_PAGE.md` and `docs/CONTENT.md`. Placeholder (🟡) values stay marked as placeholders.
- Django's `manage.py seed` loads these files later, and a backend contract test compares Django's responses with them.
