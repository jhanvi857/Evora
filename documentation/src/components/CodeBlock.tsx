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
      // Comment line
      if (line.trim().startsWith("//") || line.trim().startsWith("#")) {
        return (
          <div key={idx} className="text-zinc-500 italic">
            {line}
          </div>
        );
      }

      // Syntax token replacement for Java, SQL, JSON, Bash, TS
      const tokens = tokenizeLine(line);

      return (
        <div key={idx} className="leading-relaxed sm:leading-6 min-h-[1.5rem]">
          {tokens}
        </div>
      );
    });
  };

  const tokenizeLine = (line: string) => {
    // Regex tokenizer matching strings, comments, annotations, keywords, numbers, methods
    const regex = /(".*?"|'.*?'|\/\/.*$|#.*$|@[A-Za-z0-9_]+|\b(?:public|private|protected|class|interface|import|package|return|new|void|static|final|extends|implements|throws|if|else|for|while|try|catch|SELECT|UPDATE|SET|WHERE|FROM|ORDER|BY|ASC|DESC|LIMIT|FOR|UPDATE|SKIP|LOCKED|RETURNING|CREATE|TABLE|INDEX|IF|NOT|EXISTS|DEFAULT|PRIMARY|KEY|INT|TIMESTAMPTZ|JSONB|TEXT|UUID|const|let|var|function|async|await|export|import|from)\b|\b\d+(?:\.\d+)?\b|\b(?:true|false|null)\b)/g;

    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(line)) !== null) {
      if (match.index > lastIndex) {
        parts.push(
          <span key={lastIndex} className="text-zinc-200">
            {line.substring(lastIndex, match.index)}
          </span>
        );
      }

      const token = match[0];

      if (token.startsWith('"') || token.startsWith("'")) {
        // String literal -> Vibrant Emerald Green
        parts.push(
          <span key={match.index} className="text-emerald-400 font-medium">
            {token}
          </span>
        );
      } else if (token.startsWith("@")) {
        // Annotations -> Vibrant Yellow
        parts.push(
          <span key={match.index} className="text-yellow-300 font-semibold">
            {token}
          </span>
        );
      } else if (token.startsWith("//") || token.startsWith("#")) {
        // Inline comments -> Muted Gray
        parts.push(
          <span key={match.index} className="text-zinc-500 italic">
            {token}
          </span>
        );
      } else if (/^\d+(?:\.\d+)?$/.test(token) || token === "true" || token === "false" || token === "null") {
        // Numbers & Booleans -> Sunset Orange
        parts.push(
          <span key={match.index} className="text-orange-400 font-medium">
            {token}
          </span>
        );
      } else {
        // Keywords -> Soft Purple/Magenta
        parts.push(
          <span key={match.index} className="text-purple-400 font-semibold">
            {token}
          </span>
        );
      }

      lastIndex = regex.lastIndex;
    }

    if (lastIndex < line.length) {
      parts.push(
        <span key={lastIndex} className="text-zinc-200">
          {line.substring(lastIndex)}
        </span>
      );
    }

    return parts.length > 0 ? parts : line;
  };

  return (
    <div className="my-5 rounded-lg border border-[#27272a] bg-[#050507] overflow-hidden shadow-sm">
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#121215] border-b border-[#27272a] text-xs text-zinc-400 font-mono">
        <span className="text-orange-400 font-semibold">{filename || language}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 hover:text-white transition px-2.5 py-1 rounded bg-[#1c1c21] border border-[#27272a] text-xs"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400 font-medium">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-zinc-400" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-4 sm:p-5 text-xs sm:text-[13.5px] font-mono text-zinc-200 overflow-x-auto leading-relaxed sm:leading-6 bg-[#050507]">
        <code>{highlightCode(code)}</code>
      </pre>
    </div>
  );
}
