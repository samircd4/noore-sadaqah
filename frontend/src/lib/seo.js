/**
 * Page metadata as docs/SEO_ANALYTICS.md "Metadata" describes: title (the layout adds "| site name"),
 * a description of at most 155 characters, canonical + language alternates, Open Graph and Twitter card.
 * Pure module: the caller passes the locale and the translated text.
 */

const DESCRIPTION_MAX = 155;

/**
 * Shortens text to 155 characters at a word boundary, with an ellipsis when cut.
 * @param {string | undefined | null} text
 */
export function shortDescription(text) {
  const clean = String(text ?? "").replace(/\s+/g, " ").trim();
  if (clean.length <= DESCRIPTION_MAX) return clean;
  const cut = clean.slice(0, DESCRIPTION_MAX - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 80 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

/**
 * Plain text from sanitized API HTML (`body_html`), for meta descriptions: tags removed, the basic entities decoded.
 * @param {string | undefined | null} html
 */
export function textFromHtml(html) {
  return String(html ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * The URL of a page in one language: Bengali has no prefix, English lives under /en (I18N.md).
 * @param {string} path  e.g. "/programs/water" ("/" for home)
 * @param {"bn" | "en"} locale
 */
export function localizedPath(path, locale) {
  if (locale === "bn") return path;
  return path === "/" ? "/en" : `/en${path}`;
}

/**
 * @param {object} options
 * @param {string} options.path         page path without the language prefix, e.g. "/programs"
 * @param {"bn" | "en"} options.locale
 * @param {string} options.title        page title only; the layout's title template adds the site name
 * @param {string} [options.description]
 * @param {{ url: string, width?: number, height?: number, alt?: string } | null} [options.image] cover photo for OG
 * @returns {import("next").Metadata}
 */
export function pageMetadata({ path, locale, title, description, image = null }) {
  const desc = shortDescription(description);
  const images = image ? [{ url: image.url, width: image.width, height: image.height, alt: image.alt }] : undefined;
  return {
    title,
    description: desc || undefined,
    alternates: {
      canonical: localizedPath(path, locale),
      languages: { bn: localizedPath(path, "bn"), en: localizedPath(path, "en"), "x-default": localizedPath(path, "bn") },
    },
    openGraph: {
      title,
      description: desc || undefined,
      url: localizedPath(path, locale),
      locale: locale === "en" ? "en_US" : "bn_BD",
      type: "website",
      images,
    },
    twitter: { card: images ? "summary_large_image" : "summary", title, description: desc || undefined, images },
  };
}
