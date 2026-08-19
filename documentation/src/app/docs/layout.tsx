"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import SearchModal from "@/components/SearchModal";

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  return (
    <div className="min-h-screen bg-bgBase text-textMain flex flex-col antialiased">
      <Navbar onOpenSearch={() => setIsSearchOpen(true)} />
      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />

      <div className="flex-1 w-full max-w-[96rem] mx-auto flex">
        <Sidebar />
        <main className="flex-1 min-w-0 py-8 px-6 sm:px-10 lg:px-14">
          {children}
        </main>
      </div>
    </div>
  );
}
