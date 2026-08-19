"use client";

import Link from "next/link";
import { Search, Github, Terminal, BookOpen } from "lucide-react";

interface NavbarProps {
  onOpenSearch: () => void;
}

export default function Navbar({ onOpenSearch }: NavbarProps) {
  return (
    <header className="sticky top-0 z-30 w-full bg-[#09090b]/95 backdrop-blur border-b border-borderColor">
      <div className="max-w-[96rem] mx-auto px-4 sm:px-6 lg:px-10 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 bg-brandAccent/15 border border-brandAccent/40 rounded flex items-center justify-center font-bold text-brandAccent font-mono text-base group-hover:border-brandAccent transition">
              E
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-display font-bold text-lg text-textMain tracking-wide">
                  EVORA
                </span>
                <span className="text-[10px] bg-[#181414] border border-borderColor text-brandAccent px-1.5 py-0.2 rounded font-mono font-medium">
                  WAL v1.0
                </span>
              </div>
              <span className="text-[9.5px] font-mono text-textMuted tracking-tight -mt-0.5">
                POSTGRES WORKLOAD FABRIC
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-xs font-mono ml-4">
            <Link
              href="/docs"
              className="text-textMain hover:text-brandAccent flex items-center gap-1.5 font-medium transition"
            >
              <BookOpen className="w-3.5 h-3.5 text-brandAccent" />
              <span>DOCS</span>
            </Link>
            <Link
              href="/docs/lock-mechanics"
              className="text-textMuted hover:text-textMain transition"
            >
              ARCHITECTURE
            </Link>
            <Link
              href="/docs/java-sdk"
              className="text-textMuted hover:text-textMain transition"
            >
              CLIENT SDK
            </Link>
            <Link
              href="/docs/api-reference"
              className="text-textMuted hover:text-textMain transition"
            >
              REST API
            </Link>
          </nav>
        </div>

        {/* Search & Links */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenSearch}
            className="flex items-center gap-2 bg-[#141214] border border-borderColor hover:border-brandAccent/60 text-textMuted px-3 py-1.5 rounded text-xs w-44 sm:w-60 justify-between transition font-mono"
          >
            <span className="flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-brandAccent" />
              <span>Search topics...</span>
            </span>
            <kbd className="hidden sm:inline-block bg-[#1f1b1a] border border-[#352b29] text-[#a89d96] px-1.5 py-0.5 rounded text-[10px]">
              Ctrl+K
            </kbd>
          </button>

          <a
            href="http://localhost:8080"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 bg-[#181414] border border-borderColor hover:border-brandAccent text-textMain px-3 py-1.5 rounded text-xs font-mono transition"
          >
            <Terminal className="w-3.5 h-3.5 text-stateSuccess" />
            <span>OPS CONSOLE</span>
          </a>

          <a
            href="https://github.com/jhanvi857/Evora"
            target="_blank"
            rel="noopener noreferrer"
            className="text-textMuted hover:text-textMain p-1.5 transition"
            aria-label="GitHub Repository"
          >
            <Github className="w-4 h-4" />
          </a>
        </div>
      </div>
    </header>
  );
}
