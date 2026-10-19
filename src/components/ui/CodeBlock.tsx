"use client";

import { Check, Copy } from "lucide-react";
import { useState, type ReactNode } from "react";

const KEYWORDS = new Set(
  "abstract as async await bool break case catch class const continue default do else enum false finally for foreach if in init internal is new null out override private protected public readonly record ref return sealed static string switch this throw true try typeof using var void when while with yield export import from function let type interface".split(" "),
);

/** Tiny tokenizer: comments, strings, keywords, types and numbers. Enough for short snippets, no dependency. */
function highlight(code: string): ReactNode[] {
  const pattern = /(\/\/\/?[^\n]*|#[^\n]*$)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`[^`]*`)|\b(\d+(?:\.\d+)?)\b|\b([A-Za-z_][A-Za-z0-9_]*)\b/gm;
  const out: ReactNode[] = [];
  let last = 0;
  let key = 0;
  for (const match of code.matchAll(pattern)) {
    const [text, comment, str, num, word] = match;
    if (match.index! > last) out.push(code.slice(last, match.index));
    let className: string | undefined;
    if (comment) className = "text-muted italic";
    else if (str) className = "text-[#7ee0a1]";
    else if (num) className = "text-[#f5b56b]";
    else if (word && KEYWORDS.has(word)) className = "text-accent";
    else if (word && /^[A-Z]/.test(word)) className = "text-[#c9b6ff]";
    out.push(className ? <span key={key++} className={className}>{text}</span> : text);
    last = match.index! + text.length;
  }
  out.push(code.slice(last));
  return out;
}

export function CodeBlock({ code, label, copyable = true }: { code: string; label?: string; copyable?: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-background">
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <span className="font-mono text-[11px] text-muted">{label}</span>
        {copyable && (
          <button
            type="button"
            onClick={async () => {
              await navigator.clipboard.writeText(code);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
            aria-label={copied ? "Copied" : "Copy code"}
            className="inline-flex items-center gap-1 text-[11px] text-muted transition hover:text-hover"
          >
            {copied ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
            {copied ? "Copied" : "Copy"}
          </button>
        )}
      </div>
      <pre className="overflow-x-auto p-4 font-mono text-[12.5px] leading-relaxed" tabIndex={0}>
        <code>{highlight(code)}</code>
      </pre>
    </div>
  );
}
