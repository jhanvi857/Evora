"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DOC_NAVIGATION } from "@/lib/docs-data";

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 shrink-0 hidden lg:block border-r border-[#27272a] py-8 pr-6 pl-2 bg-[#0a0a0c] sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto">
      <div className="space-y-7">
        {DOC_NAVIGATION.map((cat, idx) => (
          <div key={idx} className="space-y-2">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 font-mono px-3">
              {cat.category}
            </h4>
            <ul className="space-y-1">
              {cat.items.map((item) => {
                const href = `/docs/${item.slug}`;
                const isActive = pathname === href || (pathname === "/docs" && item.slug === "getting-started");
                return (
                  <li key={item.slug}>
                    <Link
                      href={href}
                      className={`block text-xs font-medium px-3 py-1.5 rounded-md transition ${
                        isActive
                          ? "bg-[#1c1c21] text-orange-400 font-semibold border-l-2 border-orange-500"
                          : "text-zinc-400 hover:text-zinc-100 hover:bg-[#121215]"
                      }`}
                    >
                      {item.title}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </aside>
  );
}
