"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Search, X, BookOpen, ArrowRight } from "lucide-react";
import { DOC_CONTENT } from "@/lib/docs-data";

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [query, setQuery] = useState("");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        if (isOpen) onClose();
        else setQuery("");
      }
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const results = Object.values(DOC_CONTENT).filter((doc) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      doc.title.toLowerCase().includes(q) ||
      doc.description.toLowerCase().includes(q) ||
      doc.content.toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-start justify-center pt-20 px-4">
      <div className="bg-[#121215] border border-[#27272a] rounded-lg w-full max-w-xl shadow-2xl overflow-hidden">
        {/* Search Header */}
        <div className="flex items-center px-4 border-b border-[#27272a]">
          <Search className="w-4 h-4 text-zinc-400 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search documentation topics, API routes, SDK..."
            className="w-full bg-transparent text-white px-3 py-3 text-sm focus:outline-none placeholder-zinc-500 font-sans"
            autoFocus
          />
          <button onClick={onClose} className="text-zinc-500 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 divide-y divide-[#18181b]">
          {results.length === 0 ? (
            <p className="p-4 text-center text-xs text-zinc-500">
              No documentation matches found for &quot;{query}&quot;
            </p>
          ) : (
            results.map((doc) => (
              <Link
                key={doc.id}
                href={`/docs/${doc.slug}`}
                onClick={onClose}
                className="group flex items-center justify-between p-3 rounded hover:bg-[#1c1c21] transition"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-3.5 h-3.5 text-brandPrimary" />
                    <span className="text-sm font-medium text-zinc-200 group-hover:text-white">
                      {doc.title}
                    </span>
                    <span className="text-[10px] bg-[#18181b] border border-[#27272a] text-zinc-400 px-1.5 py-0.5 rounded font-mono">
                      {doc.category}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-1 line-clamp-1">
                    {doc.description}
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-brandPrimary opacity-0 group-hover:opacity-100 transition" />
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
