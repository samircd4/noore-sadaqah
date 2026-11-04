// Fails if frontend code uses colors outside the palette (CLAUDE.md rule 4, QA_CHECKLIST.md §1):
// raw hex values, or Tailwind's blue-*, yellow-*, gray-* (and their cousins) for brand UI.
// src/lib/theme.js holds the one allowed hex (docs/RESPONSIVE.md §11).
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const SRC = fileURLToPath(new URL("../src", import.meta.url));
const ALLOWED_FILES = new Set(["lib/theme.js"]);
const HEX = /#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?\b/g;
const OFF_PALETTE = /\b(?:bg|text|border|ring|fill|stroke|from|to|via|outline|decoration|divide|placeholder|accent|caret|shadow)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/g;

function* files(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* files(path);
    else if (/\.(jsx?|mjs|css)$/.test(name) && !/\.test\.js$/.test(name)) yield path;
  }
}

const problems = [];
for (const path of files(SRC)) {
  const rel = relative(SRC, path).replaceAll("\\", "/");
  if (ALLOWED_FILES.has(rel)) continue;
  readFileSync(path, "utf8").split("\n").forEach((line, i) => {
    // Ignore URL fragments such as href="#about" (the hex pattern needs a word boundary after 3 or 6 hex digits,
    // so "#about" or "#donate" don't match; a fragment that is pure hex, like "#add", would need renaming).
    const code = line.replace(/&#x?[0-9a-f]+;/gi, ""); // HTML entities
    for (const hit of [...(code.match(HEX) || []), ...(code.match(OFF_PALETTE) || [])]) {
      problems.push(`${rel}:${i + 1}: ${hit}`);
    }
  });
}

if (problems.length > 0) {
  console.error(problems.join("\n"));
  console.error(`\nPalette check failed: ${problems.length} off-palette color(s). Use em-*, sand-*, gold-* from design/tokens.css.`);
  process.exit(1);
}
console.log("Palette check passed.");
