import { describe, expect, it } from "vitest";
import { markdownToHtml } from "./markdown";

describe("markdownToHtml (mock stand-in for Django's renderer)", () => {
  it("renders paragraphs, headings, lists, notes and bold", () => {
    const md = "> Draft note\n\n## 1. Title\n\nFirst **bold** line\nsecond line\n\n- one\n- **two**\n\n### Sub";
    expect(markdownToHtml(md)).toBe(
      "<blockquote><p>Draft note</p></blockquote><h2>1. Title</h2><p>First <strong>bold</strong> line<br>second line</p>" +
        "<ul><li>one</li><li><strong>two</strong></li></ul><h3>Sub</h3>",
    );
  });

  it("escapes HTML so fixture text can't inject markup", () => {
    expect(markdownToHtml('<script>alert("x")</script> & co')).toBe("<p>&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; co</p>");
  });

  it("returns an empty string for empty input", () => {
    expect(markdownToHtml("")).toBe("");
    expect(markdownToHtml(undefined)).toBe("");
  });
});
