import { DOC_CONTENT } from "@/lib/docs-data";
import TableOfContents from "@/components/TableOfContents";
import Callout from "@/components/Callout";
import { renderMarkdownContent } from "@/lib/parse-markdown";

export default function DocsPage() {
  const doc = DOC_CONTENT["getting-started"];

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

        <Callout type="info" title="Production Ready">
          Evora uses PostgreSQL native <code className="text-[#fdba74] bg-[#18181b] border border-[#27272a] px-1.5 py-0.5 rounded font-mono text-xs sm:text-[13px]">FOR UPDATE SKIP LOCKED</code> to provide lock-free job reservation across 100+ parallel worker nodes.
        </Callout>

        <div className="mt-6">
          {renderMarkdownContent(doc.content)}
        </div>
      </article>

      <TableOfContents toc={doc.toc} />
    </div>
  );
}
