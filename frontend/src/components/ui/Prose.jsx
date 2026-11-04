/**
 * The only place that renders HTML from the API (frontend/CLAUDE.md rule 13). `html` is `body_html`, rendered from
 * markdown and sanitized by Django (API.md); never pass any other HTML here.
 * Bengali body text: 16px, line-height ≥ 1.6 (RESPONSIVE.md §5).
 * @param {{ html: string, className?: string }} props
 */
export default function Prose({ html, className = "" }) {
  return (
    <div
      className={[
        "min-w-0 text-base leading-relaxed break-words text-em-900/85 sm:text-lg",
        "[&_p]:mt-4 [&_p:first-child]:mt-0",
        "[&_h2]:mt-8 [&_h2]:font-head [&_h2]:text-xl [&_h2]:leading-snug [&_h2]:font-bold [&_h2]:text-em-900 sm:[&_h2]:text-2xl",
        "[&_h3]:mt-6 [&_h3]:font-head [&_h3]:text-lg [&_h3]:font-bold [&_h3]:text-em-900",
        "[&_ul]:mt-4 [&_ul]:list-disc [&_ul]:ps-6 [&_ol]:mt-4 [&_ol]:list-decimal [&_ol]:ps-6 [&_li]:mt-1",
        "[&_a]:font-semibold [&_a]:text-em-700 [&_a]:underline [&_a]:underline-offset-4 hover:[&_a]:text-em-500",
        "[&_blockquote]:mt-4 [&_blockquote]:border-s-4 [&_blockquote]:border-gold-500 [&_blockquote]:ps-4",
        "[&_img]:mt-4 [&_img]:h-auto [&_img]:w-full [&_img]:rounded-lg",
        className,
      ].join(" ")}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
