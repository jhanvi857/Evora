"use client";

interface TocItem {
  id: string;
  text: string;
  level: number;
}

interface TableOfContentsProps {
  toc: TocItem[];
}

export default function TableOfContents({ toc }: TableOfContentsProps) {
  if (!toc || toc.length === 0) return null;

  return (
    <div className="w-64 shrink-0 hidden xl:block py-8 pl-8 border-l border-[#27272a] text-xs space-y-3 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto">
      <h4 className="font-mono uppercase text-[11px] text-zinc-500 font-bold tracking-wider mb-3">
        On this page
      </h4>
      <ul className="space-y-2 text-zinc-400">
        {toc.map((item) => (
          <li
            key={item.id}
            style={{ paddingLeft: `${(item.level - 2) * 0.75}rem` }}
          >
            <a
              href={`#${item.id}`}
              className="hover:text-orange-400 transition line-clamp-1 block leading-normal text-xs"
            >
              {item.text}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
