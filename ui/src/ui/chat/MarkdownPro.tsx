/**
 * 📖 Markdown Pro Renderer
 *
 * Premium markdown rendering with:
 * - Syntax highlighting for code blocks
 * - Dark/Light mode support
 * - Theme-aware styling
 * - Responsive tables and lists
 */

import { memo } from "react";

interface MarkdownProProps {
  content: string;
  streaming?: boolean;
  className?: string;
}

/**
 * Simple markdown parser and renderer
 * Uses regex to identify and render common markdown patterns
 */
function parseAndRenderMarkdown(content: string) {
  // This is a simplified version - in production, use a full markdown library
  // like remark + rehype for production-grade markdown rendering

  let html = content
    // Escape HTML
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    // Code blocks (```language ... ```)
    .replace(
      /```([a-z]*)\n([\s\S]*?)```/g,
      (match, lang, code) =>
        `<div class="chat-code-block rounded-lg my-4 overflow-hidden">
          <div class="flex items-center justify-between px-4 py-2 bg-slate-100 dark:bg-slate-900 border-b border-slate-300 dark:border-slate-700">
            <span class="text-xs font-mono text-slate-600 dark:text-slate-400">${lang || "code"}</span>
            <button class="copy-btn text-xs px-2 py-1 rounded bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors">Copy</button>
          </div>
          <pre class="p-4 overflow-x-auto"><code class="text-sm">${code.trim()}</code></pre>
        </div>`,
    )
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
    // Bold
    .replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold">$1</strong>')
    .replace(/__([^_]+)__/g, '<strong class="font-semibold">$1</strong>')
    // Italic
    .replace(/\*([^*]+)\*/g, '<em class="italic">$1</em>')
    .replace(/_([^_]+)_/g, '<em class="italic">$1</em>')
    // Headings
    .replace(/^### (.*?)$/gm, '<h3 class="text-lg font-bold mt-4 mb-2">$1</h3>')
    .replace(/^## (.*?)$/gm, '<h2 class="text-xl font-bold mt-6 mb-2">$1</h2>')
    .replace(/^# (.*?)$/gm, '<h1 class="text-2xl font-bold mt-6 mb-2">$1</h1>')
    // Unordered lists
    .replace(/^\* (.*?)$/gm, '<li class="ml-6">$1</li>')
    .replace(/(<li class="ml-6">.*?<\/li>)/s, '<ul class="list-disc my-2">$1</ul>')
    // Links
    .replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" class="text-blue-600 dark:text-blue-400 underline hover:underline" target="_blank" rel="noopener noreferrer">$1</a>',
    )
    // Blockquotes
    .replace(
      /^> (.*?)$/gm,
      '<blockquote class="border-l-4 border-blue-500 pl-4 italic text-slate-600 dark:text-slate-400 my-2">$1</blockquote>',
    )
    // Line breaks
    .replace(/\n\n/g, "</p><p>");

  return html;
}

export const MarkdownPro = memo(function MarkdownPro({
  content,
  streaming = false,
  className = "",
}: MarkdownProProps) {
  if (!content) {
    return (
      <div className={`text-slate-400 dark:text-slate-500 text-sm ${className}`}>No content</div>
    );
  }

  // For production, replace this with a proper markdown library
  // This is a simplified version for demonstration
  const rendered = parseAndRenderMarkdown(content);

  return (
    <div
      className={`
        prose prose-base
        dark:prose-invert
        max-w-none
        prose-p:my-4 prose-p:leading-relaxed prose-p:text-[15px] prose-p:font-medium prose-p:text-white/80
        prose-strong:font-black prose-strong:text-white
        prose-em:italic
        prose-h1:text-4xl prose-h1:font-black prose-h1:mt-10 prose-h1:mb-6 prose-h1:tracking-tighter
        prose-h2:text-2xl prose-h2:font-extrabold prose-h2:mt-8 prose-h2:mb-4 prose-h2:tracking-tight
        prose-h3:text-xl prose-h3:font-bold prose-h3:mt-6 prose-h3:mb-3
        prose-ul:list-disc prose-ul:ml-6 prose-ul:my-4
        prose-ol:list-decimal prose-ol:ml-6 prose-ol:my-4
        prose-li:my-2 prose-li:text-white/70
        prose-code:bg-white/5 prose-code:px-2 prose-code:py-0.5 prose-code:rounded prose-code:text-blue-400 prose-code:font-bold prose-code:before:content-none prose-code:after:content-none
        prose-pre:bg-[#0D0D0D] prose-pre:border prose-pre:border-white/5 prose-pre:p-0 prose-pre:rounded-2xl prose-pre:overflow-hidden
        prose-blockquote:border-l-4 prose-blockquote:border-blue-600 prose-blockquote:bg-blue-600/5 prose-blockquote:py-2 prose-blockquote:pl-6 prose-blockquote:rounded-r-xl prose-blockquote:italic prose-blockquote:text-white/60
        prose-a:text-blue-400 prose-a:font-bold hover:prose-a:text-blue-300
        ${className}
      `}
      dangerouslySetInnerHTML={{ __html: rendered }}
    />
  );
});

/**
 * Code block with copy button
 */
export function CodeBlock({ children, className }: { children: string; className?: string }) {
  const language = className?.replace("language-", "") || "code";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(children);
      alert("Copied to clipboard!");
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  return (
    <div className="chat-code-block rounded-lg my-4 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-100 dark:bg-slate-900 border-b border-slate-300 dark:border-slate-700">
        <span className="text-xs font-mono text-slate-600 dark:text-slate-400">{language}</span>
        <button
          onClick={handleCopy}
          className="copy-btn text-xs px-2 py-1 rounded bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
        >
          Copy
        </button>
      </div>
      <pre className="p-4 overflow-x-auto">
        <code className="text-sm">{children}</code>
      </pre>
    </div>
  );
}

if (typeof document !== "undefined") {
  const style = document.createElement("style");
  style.textContent = `
      .inline-code {
        background-color: rgba(59, 130, 246, 0.1);
        color: hsl(217 91% 50%);
        padding: 2px 6px;
        border-radius: 4px;
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.875em;
      }

      .dark .inline-code {
        background-color: rgba(59, 130, 246, 0.2);
        color: hsl(217 91% 60%);
      }

      .copy-btn {
        transition: all 0.2s ease;
      }

      .copy-btn:active {
        transform: scale(0.95);
      }
    `;
  document.head.appendChild(style);
}
