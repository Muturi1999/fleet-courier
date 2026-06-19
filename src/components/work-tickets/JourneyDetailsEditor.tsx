"use client";

import { useRef } from "react";
import { IconList, IconListNumbers, IconTextWrap } from "@tabler/icons-react";

type JourneyDetailsEditorProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

function insertAtCursor(
  textarea: HTMLTextAreaElement,
  current: string,
  insertText: string,
  onChange: (value: string) => void,
) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const before = current.slice(0, start);
  const after = current.slice(end);
  const needsNewline = before.length > 0 && !before.endsWith("\n");
  const text = (needsNewline ? `${before}\n${insertText}` : `${before}${insertText}`) + after;
  onChange(text);
  const pos = (needsNewline ? before.length + 1 : before.length) + insertText.length;
  requestAnimationFrame(() => {
    textarea.focus();
    textarea.setSelectionRange(pos, pos);
  });
}

export function JourneyDetailsEditor({ value, onChange, placeholder }: JourneyDetailsEditorProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const format = (kind: "bullet" | "number" | "paragraph") => {
    const el = ref.current;
    if (!el) return;
    if (kind === "bullet") insertAtCursor(el, value, "• ", onChange);
    else if (kind === "number") insertAtCursor(el, value, "1. ", onChange);
    else onChange(value ? `${value}\n\n` : "");
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          className="btn-secondary btn-sm"
          title="Insert bullet point"
          onClick={() => format("bullet")}
        >
          <IconList size={14} /> Bullets
        </button>
        <button
          type="button"
          className="btn-secondary btn-sm"
          title="Insert numbered line"
          onClick={() => format("number")}
        >
          <IconListNumbers size={14} /> Numbered
        </button>
        <button
          type="button"
          className="btn-secondary btn-sm"
          title="New paragraph"
          onClick={() => format("paragraph")}
        >
          <IconTextWrap size={14} /> Paragraph
        </button>
      </div>
      <textarea
        ref={ref}
        className="field-input min-h-[140px] w-full resize-y leading-relaxed"
        rows={6}
        value={value}
        placeholder={
          placeholder ??
          "Describe this leg of the journey — routes, stops, collections. Use Bullets or Numbered for lists."
        }
        onChange={(e) => onChange(e.target.value)}
      />
      <p className="text-[11px] text-fleet-gray-400">
        Line breaks and bullet characters are preserved on the printed work ticket.
      </p>
    </div>
  );
}