"""Markdown typed in the admin → safe HTML for `body_html` (API.md: rendered and sanitized on the server)."""

import markdown as md
import nh3

ALLOWED_TAGS = {
    "p", "br", "hr", "h2", "h3", "h4", "strong", "em", "b", "i", "ul", "ol", "li", "blockquote",
    "a", "table", "thead", "tbody", "tr", "th", "td", "code", "pre",
}  # fmt: skip
ALLOWED_ATTRIBUTES = {"a": {"href", "title"}}


def to_html(text):
    """Staff markdown → HTML that keeps only the tags above. Raw HTML in the text is stripped, not trusted."""
    html = md.markdown(text or "", extensions=["tables", "sane_lists"])
    return nh3.clean(
        html,
        tags=ALLOWED_TAGS,
        attributes=ALLOWED_ATTRIBUTES,
        url_schemes={"http", "https", "mailto", "tel"},
        link_rel="noopener noreferrer",
    )
