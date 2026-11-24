/**
 * POST /internal/revalidate: Django calls this after staff save content in the admin (ARCHITECTURE.md
 * "Revalidation"). Body `{ "tags": ["funds", "programs"] }`, header `X-Revalidate-Secret`.
 * Nginx blocks /internal/ from the internet; the secret is the second lock. Excluded from the proxy matcher.
 */

import { timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";

/** The cache tags apiGet() uses (docs/API.md); anything else is ignored. */
const KNOWN_TAGS = new Set([
  "site", "funds", "programs", "campaigns", "posts", "gallery", "people", "reports", "jobs", "pages", "transparency",
]);

/** Compares without leaking how many characters matched. */
function sameSecret(given, expected) {
  const a = Buffer.from(String(given ?? ""));
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request) {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret || !sameSecret(request.headers.get("x-revalidate-secret"), secret)) {
    return Response.json({ error: { code: "forbidden" } }, { status: 403 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: { code: "validation" } }, { status: 400 });
  }
  const tags = Array.isArray(body?.tags) ? body.tags.filter((tag) => KNOWN_TAGS.has(tag)) : [];

  // "max": visitors keep getting the old page while the new one is built in the background.
  for (const tag of tags) revalidateTag(tag, "max");
  return Response.json({ revalidated: tags });
}
