import Link from "next/link";
import { Terminal, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-bgBase text-textMain flex flex-col items-center justify-center p-6 text-center">
      <div className="bg-[#141214] border border-borderColor p-8 rounded-xl max-w-md w-full shadow-2xl">
        <div className="w-10 h-10 bg-[#1c1817] border border-borderColor rounded flex items-center justify-center text-brandActiveCursor mx-auto mb-4 font-mono">
          <Terminal className="w-5 h-5" />
        </div>
        <div className="text-[11px] font-mono text-brandActiveCursor uppercase tracking-wider mb-2 font-semibold">
          ERROR 404 — TUPLE_NOT_FOUND
        </div>
        <h1 className="font-display text-2xl font-bold text-white mb-2">
          Topic Not in WAL Index
        </h1>
        <p className="text-textMuted text-xs leading-relaxed mb-6 font-sans">
          The requested documentation page or section could not be located in the current database schema.
        </p>
        <Link
          href="/docs"
          className="inline-flex items-center gap-2 bg-brandAccent hover:bg-brandAccentHover text-white font-bold px-4 py-2.5 rounded text-xs font-mono transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>RETURN TO ARCHITECTURE DOCS</span>
        </Link>
      </div>
    </div>
  );
}
