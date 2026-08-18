"use client";

import Link from "next/link";
import { Search, Github, Terminal, BookOpen } from "lucide-react";

interface NavbarProps {
  onOpenSearch: () => void;
}

export default function Navbar({ onOpenSearch }: NavbarProps) {
  return (
    <header className="sticky top-0 z-30 w-full bg-[#0a0a0c] border-b border-[#27272a]">
      <div className="max-w-[96rem] mx-auto px-4 sm:px-6 lg:px-10 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brandPrimary rounded flex items-center justify-center font-bold text-white font-mono text-lg">
              E
            </div>
            <span className="font-display font-bold text-xl text-white tracking-wide">
              EVORA
            </span>
            <span className="text-xs bg-[#18181b] border border-[#27272a] text-zinc-400 px-2 py-0.5 rounded font-mono">
              v1.0.0
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-5 text-sm">
            <Link
              href="/docs"
              className="text-zinc-200 hover:text-white flex items-center gap-1.5 font-medium transition"
            >
              <BookOpen className="w-4 h-4 text-orange-500" />
              Documentation
            </Link>
            <Link
              href="/docs/api-reference"
              className="text-zinc-400 hover:text-white transition"
            >
              API Reference
            </Link>
            <Link
              href="/docs/java-sdk"
              className="text-zinc-400 hover:text-white transition"
            >
              Java SDK
            </Link>
          </nav>
        </div>

        {/* Search & Links */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenSearch}
            className="flex items-center gap-2 bg-[#121215] border border-[#27272a] hover:border-zinc-500 text-zinc-400 px-3 py-1.5 rounded-md text-xs sm:text-sm w-44 sm:w-64 justify-between transition"
          >
            <span className="flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-zinc-400" />
              <span>Search docs...</span>
            </span>
            <kbd className="hidden sm:inline-block bg-[#18181b] border border-[#27272a] text-zinc-400 px-1.5 py-0.5 rounded text-[10px] font-mono">
              Ctrl+K
            </kbd>
          </button>

          <a
            href="http://localhost:8080"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 bg-[#18181b] border border-[#27272a] hover:border-zinc-500 text-zinc-300 hover:text-white px-3 py-1.5 rounded-md text-xs font-semibold transition"
          >
            <Terminal className="w-3.5 h-3.5 text-emerald-400" />
            Console
          </a>

          <a
            href="https://github.com/jhanvi857/Evora"
            target="_blank"
            rel="noopener noreferrer"
            className="text-zinc-400 hover:text-white p-1.5 transition"
            aria-label="GitHub Repository"
          >
            <Github className="w-5 h-5" />
          </a>
        </div>
      </div>
    </header>
  );
}
