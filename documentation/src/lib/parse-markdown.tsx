import React from "react";
import CodeBlock from "@/components/CodeBlock";

interface ContentBlock {
  type: "heading2" | "heading3" | "paragraph" | "list" | "table" | "code";
  text?: string;
  id?: string;
  items?: string[];
  headers?: string[];
  rows?: string[][];
  code?: string;
  language?: string;
  filename?: string;
}

export function renderMarkdownContent(content: string): React.ReactNode[] {
  const blocks = parseContentToBlocks(content);
  return renderBlocks(blocks);
}

function parseContentToBlocks(rawContent: string): ContentBlock[] {
  const blocks: ContentBlock[] = [];
  const lines = rawContent.split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Skip empty lines
    if (line.trim().length === 0) {
      i++;
      continue;
    }

    // Skip H1 since H1 is rendered in the page header
    if (line.startsWith("# ")) {
      i++;
      continue;
    }

    // 1. Code Block
    if (line.trim().startsWith("```")) {
      const header = line.trim().replace("```", "").trim();
      let lang = "bash";
      let filename = undefined;

      if (header) {
        const parts = header.split(":");
        lang = parts[0] || "bash";
        if (parts.length > 1) {
          filename = parts.slice(1).join(":");
        }
      }

      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      blocks.push({
        type: "code",
        code: codeLines.join("\n"),
        language: lang,
        filename: filename,
      });
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

        const headers = parseRow(tableLines[0]);
        const rows = tableLines.slice(2).map(parseRow);
        blocks.push({
          type: "table",
          headers,
          rows,
        });
      }
      continue;
    }

    // 3. Heading 2 (##)
    if (line.startsWith("## ")) {
      const text = line.replace("## ", "").trim();
      const id = text.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      blocks.push({
        type: "heading2",
        text,
        id,
      });
      i++;
      continue;
    }

    // 4. Heading 3 (###)
    if (line.startsWith("### ")) {
      const text = line.replace("### ", "").trim();
      const id = text.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      blocks.push({
        type: "heading3",
        text,
        id,
      });
      i++;
      continue;
    }

    // 5. Unordered List (* or -)
    if (line.trim().startsWith("* ") || line.trim().startsWith("- ")) {
      const listItems: string[] = [];
      while (i < lines.length && (lines[i].trim().startsWith("* ") || lines[i].trim().startsWith("- "))) {
        listItems.push(lines[i].trim().replace(/^[\*\-]\s+/, ""));
        i++;
      }
      blocks.push({
        type: "list",
        items: listItems,
      });
      continue;
    }

    // 6. Regular Paragraph (Group consecutive non-empty lines together into a single paragraph)
    const paragraphLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim().length > 0 &&
      !lines[i].startsWith("#") &&
      !lines[i].trim().startsWith("```") &&
      !lines[i].trim().startsWith("|") &&
      !lines[i].trim().startsWith("* ") &&
      !lines[i].trim().startsWith("- ")
    ) {
      paragraphLines.push(lines[i].trim());
      i++;
    }

    if (paragraphLines.length > 0) {
      blocks.push({
        type: "paragraph",
        text: paragraphLines.join(" "),
      });
    }
  }

  return blocks;
}

function renderBlocks(blocks: ContentBlock[]): React.ReactNode[] {
  return blocks.map((block, idx) => {
    switch (block.type) {
      case "heading2": {
        return (
          <div key={`h2-wrap-${idx}`} className="pt-8 pb-3">
            {idx > 0 && <div className="w-full h-[1px] bg-[#282322] mb-8" />}
            <h2
              id={block.id}
              className="font-display font-bold text-2xl sm:text-3xl text-white tracking-tight leading-snug scroll-mt-24 mb-4"
            >
              {block.text}
            </h2>
          </div>
        );
      }

      case "heading3":
        return (
          <div key={`h3-wrap-${idx}`} className="mt-8 mb-4 pt-2">
            <h3
              id={block.id}
              className="font-sans font-semibold text-lg sm:text-xl text-[#f2ede4] tracking-tight leading-snug scroll-mt-20"
            >
              {block.text}
            </h3>
          </div>
        );

      case "paragraph":
        return (
          <p
            key={`p-${idx}`}
            className="text-[15px] sm:text-[15.5px] text-[#a89d96] leading-[1.9] mb-6 tracking-normal"
            dangerouslySetInnerHTML={{ __html: formatInline(block.text || "") }}
          />
        );

      case "list":
        return (
          <div key={`list-wrap-${idx}`} className="my-6 mb-8">
            <ul className="list-disc marker:text-brandAccent pl-6 space-y-3.5 text-[15px] sm:text-[15.5px] text-[#a89d96] leading-[1.85]">
              {block.items?.map((item, itemIdx) => (
                <li
                  key={itemIdx}
                  className="pl-1.5"
                  dangerouslySetInnerHTML={{ __html: formatInline(item) }}
                />
              ))}
            </ul>
          </div>
        );

      case "code":
        return (
          <div key={`code-wrap-${idx}`} className="my-8">
            <CodeBlock
              language={block.language || "bash"}
              filename={block.filename}
              code={block.code || ""}
            />
          </div>
        );

      case "table":
        return (
          <div key={`table-wrap-${idx}`} className="my-8 overflow-hidden rounded-lg border border-[#282322] bg-[#0b0a0b] shadow-md">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-[13.5px] font-mono border-collapse">
                <thead>
                  <tr className="bg-[#141214] border-b border-[#282322]">
                    {block.headers?.map((col, colIdx) => (
                      <th
                        key={colIdx}
                        className="px-4 py-3.5 font-bold text-xs uppercase tracking-wider text-brandActiveCursor"
                        dangerouslySetInnerHTML={{ __html: formatInline(col) }}
                      />
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e1919]">
                  {block.rows?.map((row, rowIdx) => (
                    <tr key={rowIdx} className="hover:bg-[#181414] transition-colors">
                      {row.map((cell, cellIdx) => (
                        <td
                          key={cellIdx}
                          className="px-4 py-3.5 text-textMain text-xs sm:text-[13px] leading-relaxed"
                          dangerouslySetInnerHTML={{ __html: formatInline(cell) }}
                        />
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      default:
        return null;
    }
  });
}

function formatInline(str: string): string {
  return str
    .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-[#e8845e] hover:underline underline-offset-4 font-medium">$1</a>')
    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-[#f2ede4] font-semibold">$1</strong>')
    .replace(/`(.*?)`/g, '<code class="text-[#e8845e] bg-[#161314] border border-[#282322] px-1.5 py-0.5 rounded font-mono text-[12.5px] font-medium">$1</code>');
}
