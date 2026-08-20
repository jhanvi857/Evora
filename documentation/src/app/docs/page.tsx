import { DOC_CONTENT } from "@/lib/docs-data";
import TableOfContents from "@/components/TableOfContents";
import Callout from "@/components/Callout";
import { renderMarkdownContent } from "@/lib/parse-markdown";

export default function DocsPage() {
  const doc = DOC_CONTENT["lock-mechanics"];

  return (
    <div className="flex gap-10 lg:gap-14">
      <article className="flex-1 min-w-0 max-w-4xl">
        {/* Clean Breadcrumb Bar */}
        <div className="mb-8 pb-3 border-b border-[#211d1c] text-[11px] font-mono text-[#8f837c] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-brandActiveCursor font-semibold">SYS_CORE</span>
            <span className="text-[#473b37]">/</span>
            <span>{doc.category.toUpperCase()}</span>
            <span className="text-[#473b37]">/</span>
            <span className="text-textMain">{doc.slug.toUpperCase()}</span>
          </div>
          <span className="hidden sm:inline-block text-[#524540]">STATUS: VERIFIED</span>
        </div>

        {/* Document Header */}
        <div className="mb-10 border-b border-borderColor pb-8">
          <span className="text-xs font-mono text-brandActiveCursor uppercase tracking-wider font-semibold">
            {doc.category}
          </span>
          <h1 className="text-3xl sm:text-4xl font-bold font-display text-white mt-2 tracking-tight leading-tight">
            {doc.title}
          </h1>
          <p className="text-[#a89d96] text-base sm:text-lg mt-3.5 leading-[1.8] font-sans">
            {doc.description}
          </p>
        </div>

        <Callout type="warning" title="PostgreSQL Lock-Free Guarantee">
          Combining <code className="text-brandActiveCursor bg-[#141214] border border-borderColor px-1.5 py-0.5 rounded font-mono text-xs">FOR UPDATE SKIP LOCKED</code> with the partial index <code className="text-brandActiveCursor bg-[#141214] border border-borderColor px-1.5 py-0.5 rounded font-mono text-xs">idx_jobs_poll</code> guarantees zero thread contention across any number of parallel workers.
        </Callout>

        {/* Structured Body Content */}
        <div className="mt-8">
          {renderMarkdownContent(doc.content)}
        </div>
      </article>

      <TableOfContents toc={doc.toc} />
    </div>
  );
}
