"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DOC_NAVIGATION } from "@/lib/docs-data";

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-72 shrink-0 hidden lg:block border-r border-borderColor py-7 pr-5 pl-3 bg-[#09090b] sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto">
      {/* Monospace Metadata Header Tag */}
      <div className="px-3 mb-6 pb-3 border-b border-[#241f1e] text-[10px] font-mono text-[#8f837c] flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-brandAccent animate-pulse"></span>
          <span>SCHEMA: EVORA_V1</span>
        </span>
        <span className="bg-[#1c1817] border border-borderColor text-brandActiveCursor px-1.5 py-0.5 rounded font-bold">
          WAL_INDEX: OK
        </span>
      </div>

      <div className="space-y-6">
        {DOC_NAVIGATION.map((cat, idx) => {
          const tierNumber = String(idx + 1).padStart(2, "0");
          return (
            <div key={idx} className="space-y-2">
              {/* Highlighted Sidebar Category Header */}
              <div className="flex items-center gap-2 px-2 py-1 bg-[#141214] border border-[#2a2321] rounded shadow-xs">
                <span className="bg-brandAccent/20 border border-brandAccent/40 text-brandActiveCursor font-mono text-[9px] font-bold px-1.5 py-0.2 rounded shrink-0">
                  T-{tierNumber}
                </span>
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#f2ede4] font-mono truncate">
                  {cat.category}
                </h4>
              </div>

              {/* Child Nav Items */}
              <ul className="space-y-1 pl-1">
                {cat.items.map((item) => {
                  const href = `/docs/${item.slug}`;
                  const isActive = pathname === href || (pathname === "/docs" && item.slug === "lock-mechanics");
                  return (
                    <li key={item.slug}>
                      <Link
                        href={href}
                        className={`block text-xs font-medium px-3 py-1.5 rounded transition font-sans ${
                          isActive
                            ? "bg-[#1f1a18] text-brandActiveCursor font-semibold border-l-2 border-brandAccent shadow-sm"
                            : "text-[#a89d96] hover:text-[#f2ede4] hover:bg-[#141214]"
                        }`}
                      >
                        {item.title}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
