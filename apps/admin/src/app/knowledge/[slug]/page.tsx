"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

interface Article {
  id: string;
  title: string;
  slug: string;
  content: string;
  category: string;
  tags: string[];
  createdBy: string | null;
  updatedAt: string;
}

function renderMarkdown(md: string): string {
  return md
    // Headers
    .replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold text-gray-900 dark:text-white mt-6 mb-2">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold text-gray-900 dark:text-white mt-8 mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold text-[#01358d] dark:text-blue-400 mb-4">$1</h1>')
    // Bold & italic
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-sm text-pink-600 dark:text-pink-400">$1</code>')
    // Tables
    .replace(/^\|(.+)\|$/gm, (match) => {
      const cells = match.split('|').filter(Boolean).map(c => c.trim());
      if (cells.every(c => /^[-:]+$/.test(c))) return ''; // separator row
      const isHeader = match.includes('---');
      const tag = isHeader ? 'th' : 'td';
      const cellClass = isHeader
        ? 'px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700'
        : 'px-3 py-2 text-sm text-gray-700 dark:text-gray-300 border-t border-gray-100 dark:border-gray-700';
      return `<tr>${cells.map(c => `<${tag} class="${cellClass}">${c}</${tag}>`).join('')}</tr>`;
    })
    // Wrap table rows
    .replace(/(<tr>.*<\/tr>\n?)+/g, (match) => `<table class="w-full border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden mb-4">${match}</table>`)
    // Lists
    .replace(/^- (.+)$/gm, '<li class="text-gray-700 dark:text-gray-300 ml-4 list-disc">$1</li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li class="text-gray-700 dark:text-gray-300 ml-4 list-decimal">$2</li>')
    // Paragraphs
    .replace(/^(?!<[hltuo])((?!<).+)$/gm, '<p class="text-gray-700 dark:text-gray-300 mb-3 leading-relaxed">$1</p>')
    // Clean up empty paragraphs
    .replace(/<p class="[^"]*"><\/p>/g, '');
}

export default function ArticleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch(`/api/knowledge/${params.slug}`)
      .then((r) => r.ok ? r.json() : null)
      .then(setArticle)
      .finally(() => setLoading(false));
  }, [params.slug]);

  function handleCopyLink() {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleDelete() {
    if (!article || !confirm(`Delete "${article.title}"?`)) return;
    await fetch(`/api/knowledge/${article.id}`, { method: "DELETE" });
    router.push("/knowledge");
  }

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#01358d]" /></div>;
  if (!article) return <div className="text-center py-20"><p className="text-gray-400 text-lg">Article not found</p><button onClick={() => router.push("/knowledge")} className="text-[#01358d] text-sm mt-2 hover:underline">Back to Knowledge Base</button></div>;

  return (
    <div className="max-w-4xl">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className="text-xs bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 px-2.5 py-1 rounded-full font-medium">{article.category}</span>
          <span className="text-xs text-gray-400">Updated {new Date(article.updatedAt).toLocaleDateString()}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyLink}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
            {copied ? "Copied!" : "Share Link"}
          </button>
          <button onClick={() => router.push(`/knowledge/new?editId=${article.id}`)} className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
            Edit
          </button>
          <button onClick={handleDelete} className="px-3 py-1.5 border border-red-300 dark:border-red-700 rounded-lg text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition">
            Delete
          </button>
        </div>
      </div>

      {/* Article content */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-8 md:p-10">
        <div dangerouslySetInnerHTML={{ __html: renderMarkdown(article.content) }} />
      </div>

      {/* Footer */}
      <div className="mt-6 flex items-center justify-between">
        <button onClick={() => router.push("/knowledge")} className="text-sm text-gray-500 hover:text-[#01358d] dark:hover:text-blue-400 transition">
          &larr; Back to Knowledge Base
        </button>
        {article.createdBy && (
          <span className="text-xs text-gray-400">Written by {article.createdBy}</span>
        )}
      </div>
    </div>
  );
}
