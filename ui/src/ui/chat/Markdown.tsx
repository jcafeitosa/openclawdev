import React from "react";

interface MarkdownProps {
  content: string;
}

/**
 * 📝 Enhanced Markdown Component
 * Placeholder for high-quality markdown rendering (React version)
 */
export const Markdown: React.FC<MarkdownProps> = ({ content }) => {
  return (
    <div className="prose prose-slate max-w-none prose-p:leading-relaxed prose-pre:bg-slate-900 prose-pre:text-slate-100">
      {content}
    </div>
  );
};
