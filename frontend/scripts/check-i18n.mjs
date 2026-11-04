// Fails if messages/bn.json and messages/en.json don't have exactly the same keys,
// or if a value is empty. Run with `npm run i18n:check` (also in CI). See docs/I18N.md.
import { readFileSync } from "node:fs";

const load = (locale) => JSON.parse(readFileSync(new URL(`../messages/${locale}.json`, import.meta.url), "utf8"));

/** @returns {Map<string, unknown>} flattened "a.b.c" → value */
function flatten(obj, prefix = "", out = new Map()) {
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) flatten(value, path, out);
    else out.set(path, value);
  }
  return out;
}

const bn = flatten(load("bn"));
const en = flatten(load("en"));
const problems = [];

for (const key of bn.keys()) if (!en.has(key)) problems.push(`missing in en.json: ${key}`);
for (const key of en.keys()) if (!bn.has(key)) problems.push(`missing in bn.json: ${key}`);
for (const [locale, map] of [["bn", bn], ["en", en]]) {
  for (const [key, value] of map) {
    if (typeof value !== "string" || value.trim() === "") problems.push(`empty value in ${locale}.json: ${key}`);
    else if (key.split(".").length > 3) problems.push(`key nested too deep in ${locale}.json: ${key}`);
  }
}

if (problems.length > 0) {
  console.error(problems.join("\n"));
  console.error(`\ni18n check failed: ${problems.length} problem(s).`);
  process.exit(1);
}
console.log(`i18n check passed: ${bn.size} keys in both languages.`);
