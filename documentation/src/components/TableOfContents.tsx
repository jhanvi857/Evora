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
    <div className="w-64 shrink-0 hidden xl:block py-7 pl-6 border-l border-borderColor text-xs space-y-4 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto">
      {/* Highlighted TOC Header */}
      <div className="flex items-center gap-2 px-2.5 py-1 bg-[#141214] border border-[#2a2321] rounded">
        <span className="w-1.5 h-1.5 rounded-full bg-brandAccent"></span>
        <h4 className="font-mono uppercase text-[10.5px] text-[#f2ede4] font-bold tracking-wider">
          ON THIS PAGE
        </h4>
      </div>

      <ul className="space-y-2 text-[#9a8d85] font-sans pl-1">
        {toc.map((item) => (
          <li
            key={item.id}
            style={{ paddingLeft: `${(item.level - 2) * 0.75}rem` }}
          >
            <a
              href={`#${item.id}`}
              className="hover:text-brandActiveCursor hover:underline transition line-clamp-1 block leading-normal text-xs"
            >
              {item.text}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
