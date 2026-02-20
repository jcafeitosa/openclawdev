/**
 * MarkdownRenderer Component
 * Simple markdown rendering for chat messages
 * Supports bold, italic, code blocks, lists, and more
 */

import { motion } from "framer-motion";
import { Copy, Check } from "lucide-react";
import { memo } from "react";
import { useState } from "react";
import { GlassCardPro } from "./GlassCardPro";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export const MarkdownRenderer = memo(function MarkdownRenderer({
  content,
  className = "",
}: MarkdownRendererProps) {
  // For now, render as plain text with basic formatting
  // In production, integrate with remark/rehype
  return (
    <div className={`prose dark:prose-invert prose-sm max-w-none ${className}`}>
      <MarkdownContent content={content} />
    </div>
  );
});

function MarkdownContent({ content }: { content: string }) {
  // Simple markdown parsing
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code blocks (triple backticks)
    if (line.startsWith("```")) {
      const lang = line.slice(3).trim() || "text";
      let code = "";
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        code += lines[i] + "\n";
        i++;
      }
      elements.push(<CodeBlock key={`code-${elements.length}`} code={code} language={lang} />);
      i++; // Skip closing ```
    }
    // Headers
    else if (line.startsWith("#")) {
      const level = line.match(/^#+/)?.[0].length || 1;
      const text = line.slice(level).trim();
      const Tag = `h${Math.min(level + 1, 6)}` as any;
      elements.push(
        <Tag
          key={`heading-${elements.length}`}
          className={`font-bold my-2 ${
            level === 1
              ? "text-2xl"
              : level === 2
                ? "text-xl"
                : level === 3
                  ? "text-lg"
                  : "text-base"
          }`}
        >
          {renderInlineMarkdown(text)}
        </Tag>,
      );
    }
    // Blockquotes
    else if (line.startsWith(">")) {
      const quote = line.slice(1).trim();
      elements.push(
        <blockquote
          key={`quote-${elements.length}`}
          className="pl-4 border-l-4 border-blue-500 italic dark:text-slate-300 light:text-slate-700 my-2"
        >
          {renderInlineMarkdown(quote)}
        </blockquote>,
      );
    }
    // Lists
    else if (line.match(/^[-*+]\s/) || line.match(/^\d+\.\s/)) {
      const isOrdered = line.match(/^\d+\.\s/);
      let listItems = [];
      while (i < lines.length && lines[i].match(/^[-*+]\s|^\d+\.\s/)) {
        const item = lines[i].replace(/^[-*+]\s|^\d+\.\s/, "").trim();
        listItems.push(item);
        i++;
      }
      const Tag = isOrdered ? "ol" : "ul";
      elements.push(
        <Tag key={`list-${elements.length}`} className="list-inside my-2">
          {listItems.map((item, idx) => (
            <li key={idx}>{renderInlineMarkdown(item)}</li>
          ))}
        </Tag>,
      );
      continue;
    }
    // Paragraphs
    else if (line.trim()) {
      elements.push(
        <p key={`para-${elements.length}`} className="my-2 leading-relaxed">
          {renderInlineMarkdown(line)}
        </p>,
      );
    }

    i++;
  }

  return <>{elements}</>;
}

function renderInlineMarkdown(text: string): React.ReactNode {
  // Split by code blocks first
  const parts = text.split(/(`[^`]+`)/g);

  return parts.map((part, idx) => {
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={idx}
          className="px-2 py-1 rounded dark:bg-slate-800 light:bg-slate-100 dark:text-blue-400 light:text-blue-600 font-mono text-sm"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    // Bold **text**
    const boldParts = part.split(/(\*\*[^*]+\*\*)/g);
    return boldParts.map((boldPart, bidx) => {
      if (boldPart.startsWith("**") && boldPart.endsWith("**")) {
        return <strong key={`${idx}-${bidx}`}>{boldPart.slice(2, -2)}</strong>;
      }

      // Italic *text* or _text_
      const italicParts = boldPart.split(/(\*[^*]+\*|_[^_]+_)/g);
      return italicParts.map((italicPart, iidx) => {
        if (
          (italicPart.startsWith("*") && italicPart.endsWith("*")) ||
          (italicPart.startsWith("_") && italicPart.endsWith("_"))
        ) {
          return <em key={`${idx}-${bidx}-${iidx}`}>{italicPart.slice(1, -1)}</em>;
        }

        // Links [text](url)
        const linkParts = italicPart.split(/(\[[^\]]+\]\([^)]+\))/g);
        return linkParts.map((linkPart, lidx) => {
          const linkMatch = linkPart.match(/\[([^\]]+)\]\(([^)]+)\)/);
          if (linkMatch) {
            return (
              <a
                key={`${idx}-${bidx}-${iidx}-${lidx}`}
                href={linkMatch[2]}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:text-blue-600 underline"
              >
                {linkMatch[1]}
              </a>
            );
          }
          return linkPart;
        });
      });
    });
  });
}

interface CodeBlockProps {
  code: string;
  language: string;
}

const CodeBlock = memo(function CodeBlock({ code, language }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="my-4 overflow-hidden rounded-lg"
    >
      <GlassCardPro
        blur="sm"
        opacity="lg"
        surface="primary"
        border
        shadow="lg"
        hover="none"
        className="overflow-hidden"
      >
        <div className="flex items-center justify-between px-4 py-2 dark:bg-slate-900 light:bg-slate-100 border-b border-white/10">
          <span className="text-xs font-mono dark:text-slate-400 light:text-slate-600">
            {language}
          </span>
          <motion.button
            onClick={handleCopy}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className={`
                px-2 py-1
                rounded
                text-xs font-medium
                transition-all duration-200
                flex items-center gap-1
                ${
                  copied
                    ? "dark:bg-green-600 light:bg-green-500 text-white"
                    : "dark:bg-slate-700 light:bg-slate-300 dark:text-slate-300 light:text-slate-700 hover:dark:bg-slate-600 hover:light:bg-slate-400"
                }
              `}
          >
            {copied ? (
              <>
                <Check className="w-3 h-3" /> Copied
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" /> Copy
              </>
            )}
          </motion.button>
        </div>
        <pre className="overflow-x-auto p-4 font-mono text-sm dark:text-slate-100 light:text-slate-900 leading-relaxed">
          {code}
        </pre>
      </GlassCardPro>
    </motion.div>
  );
});
