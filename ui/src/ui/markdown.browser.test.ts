import { describe, it, expect } from "vitest";
import { toSanitizedMarkdownHtml } from "./markdown.ts";

describe("Mermaid rendering", () => {
  it("emits mermaid placeholder for mermaid code blocks", async () => {
    const input = "```mermaid\ngraph TD\n  A --> B\n```";
    const result = await toSanitizedMarkdownHtml(input);

    // toSanitizedMarkdownHtml returns a placeholder — the actual SVG
    // rendering happens in the DOM via the MutationObserver.
    expect(result).toContain("mermaid-placeholder");
    expect(result).toContain("data-mermaid-code");
    expect(result).not.toContain("<svg");
  });

  it("preserves mermaid code in the data attribute", async () => {
    const input = "```mermaid\ngraph TD\n  A --> B\n```";
    const result = await toSanitizedMarkdownHtml(input);

    // The code is HTML-entity-encoded in the attribute.
    expect(result).toContain("graph TD");
    expect(result).toContain("A --&gt; B");
  });

  it("does not affect non-mermaid code blocks", async () => {
    const input = '```javascript\nconsole.log("hi")\n```';
    const result = await toSanitizedMarkdownHtml(input);

    expect(result).not.toContain("mermaid-placeholder");
    expect(result).toContain("<code");
  });

  it("strips raw SVG injected outside mermaid", async () => {
    const input = '<svg onload="alert(1)"><circle cx="50" cy="50" r="40"/></svg>';
    const result = await toSanitizedMarkdownHtml(input);

    expect(result).not.toContain("<svg");
    expect(result).not.toContain("onload");
  });
});
