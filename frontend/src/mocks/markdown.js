/**
 * Tiny markdown → HTML for the mock's `body_html`, standing in for Django's markdown + sanitizer (API.md).
 * Supports what the fixtures use: paragraphs, `## ` / `### ` headings, `- ` lists, `> ` notes and `**bold**`.
 * Everything is HTML-escaped first, so fixture text can never inject markup.
 */

const escape = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const inline = (s) => escape(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

/** @param {string | null | undefined} text */
export function markdownToHtml(text) {
  const blocks = String(text ?? "")
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);

  return blocks
    .map((block) => {
      const lines = block.split("\n");
      if (block.startsWith("### ")) return `<h3>${inline(block.slice(4))}</h3>`;
      if (block.startsWith("## ")) return `<h2>${inline(block.slice(3))}</h2>`;
      if (lines.every((l) => l.startsWith("- "))) return `<ul>${lines.map((l) => `<li>${inline(l.slice(2))}</li>`).join("")}</ul>`;
      if (lines.every((l) => l.startsWith("> "))) return `<blockquote><p>${lines.map((l) => inline(l.slice(2))).join(" ")}</p></blockquote>`;
      return `<p>${lines.map(inline).join("<br>")}</p>`;
    })
    .join("");
}
