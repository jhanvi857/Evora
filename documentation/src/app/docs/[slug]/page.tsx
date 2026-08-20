import { notFound } from "next/navigation";
import { DOC_CONTENT } from "@/lib/docs-data";
import TableOfContents from "@/components/TableOfContents";
import Callout from "@/components/Callout";
import { renderMarkdownContent } from "@/lib/parse-markdown";

interface DocSlugPageProps {
  params: {
    slug: string;
  };
}

export function generateStaticParams() {
  return Object.keys(DOC_CONTENT).map((slug) => ({ slug }));
}

export default function DocSlugPage({ params }: DocSlugPageProps) {
  const doc = DOC_CONTENT[params.slug];

  if (!doc) {
    notFound();
  }

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

        {/* Contextual Callouts */}
        {params.slug === "lock-mechanics" && (
          <Callout type="warning" title="PostgreSQL Lock-Free Guarantee">
            Combining <code className="text-brandActiveCursor bg-[#141214] border border-borderColor px-1.5 py-0.5 rounded font-mono text-xs">FOR UPDATE SKIP LOCKED</code> with the partial index <code className="text-brandActiveCursor bg-[#141214] border border-borderColor px-1.5 py-0.5 rounded font-mono text-xs">idx_jobs_poll</code> guarantees zero thread contention across any number of parallel workers.
          </Callout>
        )}

        {params.slug === "transactional-outbox" && (
          <Callout type="info" title="Dual-Write Immunity">
            Enqueuing via <code className="text-brandActiveCursor bg-[#141214] border border-borderColor px-1.5 py-0.5 rounded font-mono text-xs">transactional_outbox</code> inside your business SQL transaction guarantees that background tasks never get dropped if an external broker fails.
          </Callout>
        )}

        {params.slug === "sweeper-leases" && (
          <Callout type="info" title="Background Lease Monitoring">
            The <code className="text-brandActiveCursor bg-[#141214] border border-borderColor px-1.5 py-0.5 rounded font-mono text-xs">VisibilityTimeoutSweeper</code> runs every 10 seconds to recover hanging jobs from crashed worker nodes.
          </Callout>
        )}

        {params.slug === "spring-boot" && (
          <Callout type="success" title="Spring Boot Production Lifecycle">
            Specify <code className="text-brandActiveCursor bg-[#141214] border border-borderColor px-1.5 py-0.5 rounded font-mono text-xs">destroyMethod = &quot;stop&quot;</code> on <code className="text-brandActiveCursor bg-[#141214] border border-borderColor px-1.5 py-0.5 rounded font-mono text-xs">EvoraWorker</code> beans for clean rolling deployment drains.
          </Callout>
        )}

        {/* Structured Body Content */}
        <div className="mt-8">
          {renderMarkdownContent(doc.content)}
        </div>
      </article>

      <TableOfContents toc={doc.toc} />
    </div>
  );
}
