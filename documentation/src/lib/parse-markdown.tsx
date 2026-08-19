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
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      elements.push(
        <div key={`code-wrap-${keyIndex++}`} className="my-6 sm:my-7">
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
          <div key={`table-${keyIndex++}`} className="my-7 overflow-x-auto rounded-lg border border-borderColor bg-[#0b0a0b]">
            <table className="w-full text-left text-xs sm:text-sm font-mono border-collapse">
              <thead>
                <tr className="bg-[#141214] border-b border-borderColor">
                  {headerCols.map((col, colIdx) => (
                    <th
                      key={colIdx}
                      className="px-4 py-3 font-semibold text-xs uppercase tracking-wider text-brandActiveCursor"
                      dangerouslySetInnerHTML={{ __html: formatInline(col) }}
                    />
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e1919]">
                {bodyRows.map((row, rowIdx) => (
                  <tr key={rowIdx} className="hover:bg-[#181414] transition-colors">
                    {row.map((cell, cellIdx) => (
                      <td
                        key={cellIdx}
                        className="px-4 py-3 text-textMain text-xs sm:text-[13px] leading-relaxed"
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
    if (line.startsWith("# ")) {
      const text = line.replace("# ", "").trim();
      elements.push(
        <h1 key={`h1-${keyIndex++}`} className="font-display font-bold text-2xl sm:text-3xl text-textMain mt-8 mb-4 tracking-tight">
          {text}
        </h1>
      );
      i++;
      continue;
    }

    if (line.startsWith("## ")) {
      const text = line.replace("## ", "").trim();
      const id = text.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      elements.push(
        <h2 key={`h2-${keyIndex++}`} id={id} className="font-display font-semibold text-xl sm:text-2xl text-textMain mt-12 mb-3.5 pt-4 pb-2 border-b border-borderColor tracking-tight">
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
        <h3 key={`h3-${keyIndex++}`} id={id} className="font-sans font-semibold text-base sm:text-lg text-textMain mt-8 mb-2.5 tracking-tight">
          {text}
        </h3>
      );
      i++;
      continue;
    }

    // 4. Bullet lists
    if (line.trim().startsWith("* ") || line.trim().startsWith("- ")) {
      const listItems: string[] = [];
      while (i < lines.length && (lines[i].trim().startsWith("* ") || lines[i].trim().startsWith("- "))) {
        listItems.push(lines[i].trim().replace(/^[\*\-]\s+/, ""));
        i++;
      }
      elements.push(
        <ul key={`ul-${keyIndex++}`} className="list-disc pl-5 space-y-2 my-5 text-sm sm:text-[14.5px] text-textMuted leading-relaxed">
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
        <p key={`p-${keyIndex++}`} className="text-sm sm:text-[14.5px] text-textMuted leading-relaxed sm:leading-7 my-4" dangerouslySetInnerHTML={{ __html: formatInline(line) }} />
      );
    }

    i++;
  }

  return elements;
}

function formatInline(str: string): string {
  return str
    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-textMain font-semibold">$1</strong>')
    .replace(/`(.*?)`/g, '<code class="text-brandActiveCursor bg-[#161314] border border-borderColor px-1.5 py-0.5 rounded font-mono text-xs font-normal">$1</code>');
}
