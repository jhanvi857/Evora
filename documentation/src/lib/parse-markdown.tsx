import React from "react";
import CodeBlock from "@/components/CodeBlock";

export function renderMarkdownContent(content: string): React.ReactNode[] {
  const elements: React.ReactNode[] = [];
  const lines = content.split("\n");

  let i = 0;
  let keyIndex = 0;

  while (i < lines.length) {
    const line = lines[i];

    // 1. Code Block parsing
    if (line.trim().startsWith("```")) {
      const lang = line.trim().replace("```", "").trim() || "bash";
      const codeLines: String[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      elements.push(
        <div key={`code-wrap-${keyIndex++}`} className="my-7 sm:my-8">
          <CodeBlock
            language={lang}
            code={codeLines.join("\n")}
          />
        </div>
      );
      continue;
    }

    // 2. Table parsing (starts with |)
    if (line.trim().startsWith("|")) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        tableLines.push(lines[i]);
        i++;
      }

      if (tableLines.length >= 2) {
        const parseRow = (r: string) =>
          r
            .split("|")
            .map((c) => c.trim())
            .filter((c, idx, arr) => idx > 0 && idx < arr.length - 1);

        const headerCols = parseRow(tableLines[0]);
        const bodyRows = tableLines.slice(2).map(parseRow);

        elements.push(
          <div key={`table-${keyIndex++}`} className="my-8 overflow-x-auto">
            <table className="w-full text-left text-sm border-separate border-spacing-y-2.5">
              <thead>
                <tr>
                  {headerCols.map((col, colIdx) => (
                    <th
                      key={colIdx}
                      className="px-5 py-3 font-semibold font-mono text-xs uppercase tracking-wider text-orange-400 border-b border-[#27272a] pb-3"
                      dangerouslySetInnerHTML={{ __html: formatInline(col) }}
                    />
                  ))}
                </tr>
              </thead>
              <tbody>
                {bodyRows.map((row, rowIdx) => (
                  <tr key={rowIdx} className="bg-[#121215] hover:bg-[#1c1c21] transition-colors">
                    {row.map((cell, cellIdx) => (
                      <td
                        key={cellIdx}
                        className={`px-5 py-4 text-zinc-200 text-sm sm:text-[15px] leading-relaxed border-y border-[#27272a] ${
                          cellIdx === 0 ? "border-l rounded-l-xl" : ""
                        } ${
                          cellIdx === row.length - 1 ? "border-r rounded-r-xl" : ""
                        }`}
                        dangerouslySetInnerHTML={{ __html: formatInline(cell) }}
                      />
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      continue;
    }

    // 3. Headings
    if (line.startsWith("## ")) {
      const text = line.replace("## ", "").trim();
      const id = text.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      elements.push(
        <h2 key={`h2-${keyIndex++}`} id={id} className="font-display font-bold text-xl sm:text-2xl text-white mt-12 sm:mt-14 mb-4 pt-6 pb-3 border-b border-[#27272a] tracking-tight">
          {text}
        </h2>
      );
      i++;
      continue;
    }

    if (line.startsWith("### ")) {
      const text = line.replace("### ", "").trim();
      const id = text.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      elements.push(
        <h3 key={`h3-${keyIndex++}`} id={id} className="font-display font-semibold text-lg sm:text-xl text-zinc-100 mt-8 sm:mt-10 mb-3 pt-2 tracking-tight">
          {text}
        </h3>
      );
      i++;
      continue;
    }

    // 4. Bullet lists
    if (line.trim().startsWith("- ")) {
      const listItems: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("- ")) {
        listItems.push(lines[i].trim().replace("- ", ""));
        i++;
      }
      elements.push(
        <ul key={`ul-${keyIndex++}`} className="list-disc pl-6 space-y-2.5 my-5 sm:my-6 text-sm sm:text-base text-zinc-300 leading-relaxed sm:leading-7">
          {listItems.map((item, itemIdx) => (
            <li key={itemIdx} className="pl-1" dangerouslySetInnerHTML={{ __html: formatInline(item) }} />
          ))}
        </ul>
      );
      continue;
    }

    // 5. Paragraph
    if (line.trim().length > 0 && !line.startsWith("#")) {
      elements.push(
        <p key={`p-${keyIndex++}`} className="text-sm sm:text-base text-zinc-300 leading-relaxed sm:leading-7 my-5 sm:my-6" dangerouslySetInnerHTML={{ __html: formatInline(line) }} />
      );
    }

    i++;
  }

  return elements;
}

function formatInline(str: string): string {
  return str
    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
    .replace(/`(.*?)`/g, '<code class="text-[#fdba74] bg-[#18181b] border border-[#27272a] px-1.5 py-0.5 rounded font-mono text-xs sm:text-[13px] font-normal">$1</code>');
}
