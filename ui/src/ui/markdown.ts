import DOMPurify from "dompurify";
import hljs from "highlight.js/lib/core";
import bash from "highlight.js/lib/languages/bash";
import css from "highlight.js/lib/languages/css";
import json from "highlight.js/lib/languages/json";
import python from "highlight.js/lib/languages/python";
import sql from "highlight.js/lib/languages/sql";
import typescript from "highlight.js/lib/languages/typescript";
import xml from "highlight.js/lib/languages/xml";
import yaml from "highlight.js/lib/languages/yaml";
import { marked } from "marked";
import { truncateText } from "./format.ts";

hljs.registerLanguage("typescript", typescript);
hljs.registerLanguage("javascript", typescript); // js shares TS grammar
hljs.registerLanguage("python", python);
hljs.registerLanguage("bash", bash);
hljs.registerLanguage("sh", bash);
hljs.registerLanguage("json", json);
hljs.registerLanguage("yaml", yaml);
hljs.registerLanguage("sql", sql);
hljs.registerLanguage("css", css);
hljs.registerLanguage("html", xml);
hljs.registerLanguage("xml", xml);

marked.setOptions({
  gfm: true,
  breaks: true,
});

const allowedTags = [
  "a",
  "b",
  "blockquote",
  "br",
  "button",
  "code",
  "del",
  "div",
  "em",
  "h1",
  "h2",
  "h3",
  "h4",
  "hr",
  "i",
  "input",
  "li",
  "ol",
  "p",
  "pre",
  "span",
  "strong",
  "table",
  "tbody",
  "td",
  "th",
  "thead",
  "tr",
  "ul",
  "img",
];

const allowedAttrs = [
  "checked",
  "class",
  "disabled",
  "href",
  "rel",
  "target",
  "title",
  "type",
  "start",
  "src",
  "alt",
  "data-mermaid-code",
];
const sanitizeOptions = {
  ALLOWED_TAGS: allowedTags,
  ALLOWED_ATTR: allowedAttrs,
  ALLOW_DATA_ATTR: true,
  ADD_DATA_URI_TAGS: ["img"],
};

let hooksInstalled = false;
const MARKDOWN_CHAR_LIMIT = 140_000;
const MARKDOWN_PARSE_LIMIT = 40_000;
const MARKDOWN_CACHE_LIMIT = 200;
const MARKDOWN_CACHE_MAX_CHARS = 50_000;
const markdownCache = new Map<string, string>();

function getCachedMarkdown(key: string): string | null {
  const cached = markdownCache.get(key);
  if (cached === undefined) {
    return null;
  }
  markdownCache.delete(key);
  markdownCache.set(key, cached);
  return cached;
}

function setCachedMarkdown(key: string, value: string) {
  markdownCache.set(key, value);
  if (markdownCache.size <= MARKDOWN_CACHE_LIMIT) {
    return;
  }
  const oldest = markdownCache.keys().next().value;
  if (oldest) {
    markdownCache.delete(oldest);
  }
}

function installHooks() {
  if (hooksInstalled) {
    return;
  }
  hooksInstalled = true;

  DOMPurify.addHook("afterSanitizeAttributes", (node) => {
    if (!(node instanceof HTMLAnchorElement)) {
      return;
    }
    const href = node.getAttribute("href");
    if (!href) {
      return;
    }
    node.setAttribute("rel", "noreferrer noopener");
    node.setAttribute("target", "_blank");
  });
}

export function toSanitizedMarkdownHtml(markdown: string): string {
  const input = markdown.trim();
  if (!input) {
    return "";
  }
  installHooks();
  if (input.length <= MARKDOWN_CACHE_MAX_CHARS) {
    const cached = getCachedMarkdown(input);
    if (cached !== null) {
      return cached;
    }
  }
  const truncated = truncateText(input, MARKDOWN_CHAR_LIMIT);
  const suffix = truncated.truncated
    ? `\n\n… truncated (${truncated.total} chars, showing first ${truncated.text.length}).`
    : "";
  if (truncated.text.length > MARKDOWN_PARSE_LIMIT) {
    const escaped = escapeHtml(`${truncated.text}${suffix}`);
    const html = `<pre class="code-block">${escaped}</pre>`;
    const sanitized = DOMPurify.sanitize(html, sanitizeOptions);
    if (input.length <= MARKDOWN_CACHE_MAX_CHARS) {
      setCachedMarkdown(input, sanitized);
    }
    return sanitized;
  }
  const rendered = marked.parse(`${truncated.text}${suffix}`, {
    renderer: htmlEscapeRenderer,
  }) as string;
  const sanitized = DOMPurify.sanitize(rendered, sanitizeOptions);
  if (input.length <= MARKDOWN_CACHE_MAX_CHARS) {
    setCachedMarkdown(input, sanitized);
  }
  return sanitized;
}

// Prevent raw HTML in chat messages from being rendered as formatted HTML.
// Display it as escaped text so users see the literal markup.
// Security is handled by DOMPurify, but rendering pasted HTML (e.g. error
// pages) as formatted output is confusing UX (#13937).
const htmlEscapeRenderer = new marked.Renderer();
htmlEscapeRenderer.html = ({ text }: { text: string }) => escapeHtml(text);

// Emit mermaid code blocks as inert placeholders. The actual rendering is
// performed asynchronously by a MutationObserver installed via
// initMermaidRenderer().
// Code blocks get syntax highlighting via highlight.js and a copy button.
htmlEscapeRenderer.code = function (token: { text: string; lang?: string }) {
  const lang = (token.lang ?? "").toLowerCase().trim();

  if (lang === "mermaid") {
    const encoded = encodeMermaidAttr(token.text);
    return `<div class="mermaid-placeholder" data-mermaid-code="${encoded}"></div>`;
  }

  let highlighted: string;
  if (lang && hljs.getLanguage(lang)) {
    highlighted = hljs.highlight(token.text, { language: lang }).value;
  } else if (token.text.length < 10_000) {
    // Auto-detect for smaller snippets only (avoid perf hit on large blocks)
    highlighted = hljs.highlightAuto(token.text).value;
  } else {
    highlighted = escapeHtml(token.text);
  }

  const langLabel = lang ? escapeHtml(lang) : "";
  return (
    `<div class="code-block">` +
    `<div class="code-header">` +
    (langLabel
      ? `<span class="lang-label">${langLabel}</span>`
      : `<span class="lang-label"></span>`) +
    `<button class="code-copy-btn" type="button">Copy</button>` +
    `</div>` +
    `<pre><code class="hljs${lang ? ` language-${langLabel}` : ""}">${highlighted}</code></pre>` +
    `</div>`
  );
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Encode mermaid source for use in an HTML data-attribute value.
 *  We use URI-encoding (encodeURIComponent) because DOMPurify 3.x strips
 *  attributes whose decoded value contains `-->` (mutation-XSS guard).
 *  URI-encoding avoids this entirely since `>` becomes `%3E`. */
function encodeMermaidAttr(value: string): string {
  return encodeURIComponent(value);
}

/* ── Mermaid DOM renderer ────────────────────────────── */

function decodeMermaidAttr(value: string): string {
  return decodeURIComponent(value);
}

// Lazy-loaded mermaid instance. The library is optional — when it is not
// installed the placeholders simply stay inert.
let mermaidPromise: Promise<{
  default: {
    initialize: (cfg: object) => void;
    render: (id: string, code: string) => Promise<{ svg: string }>;
  };
}> | null = null;

function loadMermaid() {
  if (!mermaidPromise) {
    // Wrap in a variable so Rollup/Vite does not attempt static resolution.
    const specifier = "mermaid";
    mermaidPromise = import(/* @vite-ignore */ specifier);
  }
  return mermaidPromise;
}

let mermaidInitialised = false;

async function renderMermaidPlaceholder(el: Element): Promise<void> {
  const code = el.getAttribute("data-mermaid-code");
  if (!code) {
    return;
  }
  const decoded = decodeMermaidAttr(code);
  try {
    const mermaidModule = await loadMermaid();
    const mermaid = mermaidModule.default;
    if (!mermaidInitialised) {
      mermaidInitialised = true;
      const isDark = document.documentElement.dataset["theme"] !== "light";
      mermaid.initialize({
        startOnLoad: false,
        theme: isDark ? "dark" : "default",
        securityLevel: "strict",
        fontFamily: "inherit",
      });
    }
    const id = `mermaid-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    const { svg } = await mermaid.render(id, decoded);
    el.classList.remove("mermaid-placeholder");
    el.classList.add("mermaid-diagram");
    el.removeAttribute("data-mermaid-code");
    el.innerHTML = svg;
  } catch {
    el.classList.remove("mermaid-placeholder");
    el.classList.add("mermaid-error");
    el.textContent = decoded;
  }
}

function processMermaidPlaceholders(root: ParentNode = document): void {
  const placeholders = root.querySelectorAll(".mermaid-placeholder[data-mermaid-code]");
  for (const el of placeholders) {
    void renderMermaidPlaceholder(el);
  }
}

/**
 * Start a MutationObserver that watches the DOM for mermaid placeholder
 * elements and renders them asynchronously via the lazy-loaded mermaid
 * library.
 */
export function initMermaidRenderer(): void {
  // Render any placeholders already in the DOM.
  processMermaidPlaceholders();

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (!(node instanceof HTMLElement)) {
          continue;
        }
        if (
          node.classList.contains("mermaid-placeholder") &&
          node.hasAttribute("data-mermaid-code")
        ) {
          void renderMermaidPlaceholder(node);
        }
        processMermaidPlaceholders(node);
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

/* ── Code copy buttons ───────────────────────────────── */

let copyButtonsInitialised = false;

function attachCopyHandler(btn: HTMLButtonElement) {
  if (btn.dataset["copyAttached"]) {
    return;
  }
  btn.dataset["copyAttached"] = "1";
  btn.addEventListener("click", () => {
    const block = btn.closest(".code-block");
    const code = block?.querySelector("code");
    if (!code) {
      return;
    }
    const text = code.innerText;
    navigator.clipboard.writeText(text).then(
      () => {
        const original = btn.textContent;
        btn.textContent = "Copied!";
        btn.disabled = true;
        setTimeout(() => {
          btn.textContent = original;
          btn.disabled = false;
        }, 2000);
      },
      () => {
        btn.textContent = "Failed";
        setTimeout(() => {
          btn.textContent = "Copy";
        }, 1500);
      },
    );
  });
}

function processCodeCopyButtons(root: ParentNode = document): void {
  const buttons = root.querySelectorAll<HTMLButtonElement>(".code-copy-btn");
  for (const btn of buttons) {
    attachCopyHandler(btn);
  }
}

/**
 * Start a MutationObserver that watches the DOM for code-block copy buttons
 * and attaches click handlers for clipboard copy functionality.
 */
export function initCodeCopyButtons(): void {
  if (copyButtonsInitialised) {
    return;
  }
  copyButtonsInitialised = true;

  processCodeCopyButtons();

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (!(node instanceof HTMLElement)) {
          continue;
        }
        if (node.classList.contains("code-copy-btn")) {
          attachCopyHandler(node as HTMLButtonElement);
        }
        processCodeCopyButtons(node);
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}
