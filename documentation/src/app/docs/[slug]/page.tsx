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
    <div className="flex gap-8 lg:gap-12">
      <article className="flex-1 min-w-0">
        <div className="mb-8 border-b border-[#27272a] pb-6">
          <span className="text-xs font-mono text-brandPrimary uppercase tracking-wider font-semibold">
            {doc.category}
          </span>
          <h1 className="text-3xl sm:text-4xl font-bold font-display text-white mt-1.5 tracking-tight">
            {doc.title}
          </h1>
          <p className="text-zinc-300 text-base sm:text-lg mt-3 leading-relaxed">{doc.description}</p>
        </div>

        {params.slug === "lock-mechanics" && (
          <Callout type="warning" title="Idempotency Guarantee">
            Enforcing a UNIQUE constraint on <code className="text-[#fdba74] bg-[#18181b] border border-[#27272a] px-1.5 py-0.5 rounded font-mono text-xs sm:text-[13px]">idempotency_key</code> guarantees exact-once processing. Duplicate submissions safely return the existing record.
          </Callout>
        )}

        {params.slug === "sweeper" && (
          <Callout type="info" title="Background Lease Monitoring">
            The VisibilityTimeoutSweeper runs every 10 seconds to recover jobs from worker nodes that crashed without renewing their lease.
          </Callout>
        )}

        {params.slug === "spring-boot" && (
          <Callout type="success" title="Spring Boot Ready">
            Specify <code className="text-[#fdba74] bg-[#18181b] border border-[#27272a] px-1.5 py-0.5 rounded font-mono text-xs sm:text-[13px]">destroyMethod = &quot;stop&quot;</code> on worker beans for clean application shutdown.
          </Callout>
        )}

        <div className="mt-6">
          {renderMarkdownContent(doc.content)}
        </div>
      </article>

      <TableOfContents toc={doc.toc} />
    </div>
  );
}
