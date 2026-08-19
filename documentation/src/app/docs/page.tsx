import { DOC_CONTENT } from "@/lib/docs-data";
import TableOfContents from "@/components/TableOfContents";
import Callout from "@/components/Callout";
import { renderMarkdownContent } from "@/lib/parse-markdown";

export default function DocsPage() {
  const doc = DOC_CONTENT["lock-mechanics"];

  return (
    <div className="flex gap-8 lg:gap-12">
      <article className="flex-1 min-w-0">
        {/* Technical Monospace Breadcrumb Bar */}
        <div className="mb-6 pb-2 border-b border-[#211d1c] text-[10.5px] font-mono text-textMuted flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-brandActiveCursor">SYS_CORE</span>
            <span>//</span>
            <span>{doc.category.toUpperCase()}</span>
            <span>//</span>
            <span className="text-textMain">{doc.slug.toUpperCase()}</span>
          </div>
          <span className="hidden sm:inline-block text-[#524540]">STATUS: VERIFIED</span>
        </div>

        <div className="mb-8 border-b border-borderColor pb-6">
          <span className="text-xs font-mono text-brandActiveCursor uppercase tracking-wider font-semibold">
            {doc.category}
          </span>
          <h1 className="text-3xl sm:text-4xl font-bold font-display text-white mt-1.5 tracking-tight">
            {doc.title}
          </h1>
          <p className="text-textMuted text-sm sm:text-base mt-2.5 leading-relaxed font-sans">{doc.description}</p>
        </div>

        <Callout type="warning" title="PostgreSQL Lock-Free Guarantee">
          Combining <code className="text-brandActiveCursor bg-[#141214] border border-borderColor px-1 py-0.5 rounded font-mono text-xs">FOR UPDATE SKIP LOCKED</code> with the partial index <code className="text-brandActiveCursor bg-[#141214] border border-borderColor px-1 py-0.5 rounded font-mono text-xs">idx_jobs_poll</code> guarantees zero thread contention across any number of parallel workers.
        </Callout>

        <div className="mt-6">
          {renderMarkdownContent(doc.content)}
        </div>
      </article>

      <TableOfContents toc={doc.toc} />
    </div>
  );
}
