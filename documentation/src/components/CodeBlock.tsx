"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

interface CodeBlockProps {
  code: string;
  language?: string;
  filename?: string;
}

export default function CodeBlock({ code, language = "java", filename }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const highlightCode = (rawCode: string) => {
    const lines = rawCode.split("\n");
    return lines.map((line, idx) => {
      if (line.trim().startsWith("//") || line.trim().startsWith("#")) {
        return (
          <div key={idx} className="text-[#695d56] italic">
            {line}
          </div>
        );
      }

      const tokens = tokenizeLine(line);
      return (
        <div key={idx} className="leading-relaxed sm:leading-6 min-h-[1.5rem]">
          {tokens}
        </div>
      );
    });
  };

  const tokenizeLine = (line: string) => {
    const regex = /(".*?"|'.*?'|\/\/.*$|#.*$|@[A-Za-z0-9_]+|\b(?:public|private|protected|class|interface|import|package|return|new|void|static|final|extends|implements|throws|if|else|for|while|try|catch|SELECT|UPDATE|SET|WHERE|FROM|ORDER|BY|ASC|DESC|LIMIT|FOR|UPDATE|SKIP|LOCKED|RETURNING|CREATE|TABLE|INDEX|IF|NOT|EXISTS|DEFAULT|PRIMARY|KEY|INT|TIMESTAMPTZ|JSONB|TEXT|UUID|const|let|var|function|async|await|export|import|from)\b|\b\d+(?:\.\d+)?\b|\b(?:true|false|null)\b)/g;

    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(line)) !== null) {
      if (match.index > lastIndex) {
        parts.push(
          <span key={lastIndex} className="text-textMain">
            {line.substring(lastIndex, match.index)}
          </span>
        );
      }

      const token = match[0];

      if (token.startsWith('"') || token.startsWith("'")) {
        // String literal -> Earthy Sage Green
        parts.push(
          <span key={match.index} className="text-stateSuccess font-medium">
            {token}
          </span>
        );
      } else if (token.startsWith("@")) {
        // Annotations -> Burnt Sienna Highlight
        parts.push(
          <span key={match.index} className="text-brandActiveCursor font-semibold">
            {token}
          </span>
        );
      } else if (token.startsWith("//") || token.startsWith("#")) {
        // Comments -> Ash Brown muted
        parts.push(
          <span key={match.index} className="text-[#695d56] italic">
            {token}
          </span>
        );
      } else if (/^\d+(?:\.\d+)?$/.test(token) || token === "true" || token === "false" || token === "null") {
        // Numbers & Booleans -> Warm Amber Rust
        parts.push(
          <span key={match.index} className="text-stateWarning font-medium">
            {token}
          </span>
        );
      } else {
        // Keywords (SQL, Java, TS) -> Terracotta / Copper
        parts.push(
          <span key={match.index} className="text-[#e29377] font-semibold">
            {token}
          </span>
        );
      }

      lastIndex = regex.lastIndex;
    }

    if (lastIndex < line.length) {
      parts.push(
        <span key={lastIndex} className="text-textMain">
          {line.substring(lastIndex)}
        </span>
      );
    }

    return parts.length > 0 ? parts : line;
  };

  return (
    <div className="my-5 rounded-lg border border-borderColor bg-[#060607] overflow-hidden shadow-sm">
      <div className="flex items-center justify-between px-4 py-2 bg-[#121010] border-b border-borderColor text-xs font-mono">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-brandAccent/70"></span>
          <span className="text-brandActiveCursor font-semibold">{filename || language}</span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 hover:text-textMain transition px-2 py-0.8 rounded bg-[#1c1817] border border-borderColor text-xs text-textMuted"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-stateSuccess" />
              <span className="text-stateSuccess font-medium">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-4 sm:p-5 text-xs sm:text-[13px] font-mono text-textMain overflow-x-auto leading-relaxed sm:leading-6 bg-[#060607]">
        <code>{highlightCode(code)}</code>
      </pre>
    </div>
  );
}
