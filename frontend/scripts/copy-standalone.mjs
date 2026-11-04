// After `next build` with output: "standalone", copy the static assets the standalone server
// doesn't include on its own (docs/DEPLOYMENT.md). Used by `npm run build:standalone`.
import { cpSync, existsSync } from "node:fs";

const root = new URL("..", import.meta.url);
const standalone = new URL(".next/standalone/", root);

if (!existsSync(standalone)) {
  console.error("No .next/standalone folder. Run `next build` with output: \"standalone\" first.");
  process.exit(1);
}

// In a monorepo, Next nests the app under its folder name inside standalone/.
const appDir = existsSync(new URL("frontend/server.js", standalone)) ? new URL("frontend/", standalone) : standalone;

cpSync(new URL(".next/static/", root), new URL(".next/static/", appDir), { recursive: true });
if (existsSync(new URL("public/", root))) {
  cpSync(new URL("public/", root), new URL("public/", appDir), { recursive: true });
}
console.log(`Copied .next/static and public/ into ${appDir.pathname}`);
