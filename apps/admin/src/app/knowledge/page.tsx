"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

interface Article {
  id: string;
  title: string;
  slug: string;
  category: string;
  content: string;
  tags: string[];
  updatedAt: string;
}

export default function KnowledgeBasePage() {
  const router = useRouter();
  const [articles, setArticles] = useState<Article[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("");
  const [seeding, setSeeding] = useState(false);

  const fetchArticles = useCallback(async () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (activeCategory) params.set("category", activeCategory);
    const res = await fetch(`/api/knowledge?${params}`);
    const data = await res.json();
    setArticles(data.articles || []);
    setCategories(data.categories || []);
    setLoading(false);
  }, [search, activeCategory]);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  async function handleSeed() {
    setSeeding(true);
    await fetch("/api/knowledge/seed", { method: "POST" });
    await fetchArticles();
    setSeeding(false);
  }

  // Group articles by category
  const grouped = articles.reduce<Record<string, Article[]>>((acc, a) => {
    if (!acc[a.category]) acc[a.category] = [];
    acc[a.category].push(a);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#01358d]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Knowledge Base</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Learn how to use every feature in Leads Portal</p>
        </div>
        <div className="flex gap-2">
          {articles.length === 0 && (
            <button onClick={handleSeed} disabled={seeding} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition">
              {seeding ? "Loading Articles..." : "Load Default Articles"}
            </button>
          )}
          <button onClick={() => router.push("/knowledge/new")} className="bg-[#01358d] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#012a70] transition">
            + New Article
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-4">
        <div className="flex gap-3 items-center">
          <div className="flex-1 relative">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search articles..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700 outline-none focus:ring-2 focus:ring-[#01358d]"
            />
          </div>
        </div>

        {/* Category filter */}
        {categories.length > 0 && (
          <div className="flex gap-2 mt-3 flex-wrap">
            <button
              onClick={() => setActiveCategory("")}
              className={`px-3 py-1 rounded-full text-xs font-medium transition ${!activeCategory ? "bg-[#01358d] text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"}`}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(activeCategory === cat ? "" : cat)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition ${activeCategory === cat ? "bg-[#01358d] text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"}`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Articles grouped by category */}
      {articles.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700">
          <p className="text-gray-400 text-lg mb-2">No articles found</p>
          <p className="text-gray-400 text-sm">
            {search ? "Try a different search term." : "Click \"Load Default Articles\" to populate the Knowledge Base."}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([category, catArticles]) => (
            <div key={category}>
              <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">{category}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {catArticles.map((article) => (
                  <div
                    key={article.id}
                    onClick={() => router.push(`/knowledge/${article.slug}`)}
                    className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-5 hover:shadow-md hover:border-[#01358d]/30 transition cursor-pointer"
                  >
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">{article.title}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                      {article.content.replace(/^#+ .+$/gm, "").replace(/[#*`\[\]]/g, "").trim().slice(0, 120)}...
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
