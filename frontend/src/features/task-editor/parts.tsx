import { renderMathHtml } from '../../utils/mathRendering';
/**
 * Редактор задания с поддержкой формул — точный порт из VariantUm/src/components/ui/TaskEditorField.jsx.
 * Текстовые сегменты: contentEditable span-ы.
 * Формулы: отображаются через KaTeX; редактируются через MathLive math-field с виртуальной клавиатурой.
 */
import React, { useRef, useEffect } from "react";


// ── Типы ──────────────────────────────────────────────────────────────────────

export interface MathFieldEl extends HTMLElement {
  value: string;
  focus(): void;
}


type TextSeg = { type: 'text'; content: string };

export type FormulaSeg = { type: 'formula'; content: string };

export type GraphSeg = { type: 'graph'; config: { fn: string; xMin: number; xMax: number; yMin?: number; yMax?: number } };

type ImageSeg = { type: 'image'; dataUrl: string };

export type Segment = TextSeg | FormulaSeg | GraphSeg | ImageSeg;


// ── Глобальное объявление math-field ──────────────────────────────────────────

declare global {

  namespace JSX {
    interface IntrinsicElements {
      'math-field': React.HTMLAttributes<HTMLElement> & {
        ref?: React.Ref<MathFieldEl>;
        style?: React.CSSProperties;
        value?: string;
      };
    }
  }
}


// ── Стили виртуальной клавиатуры (вызывается один раз) ───────────────────────

export function initMathLiveStyles() {
  if (typeof window === 'undefined') return;
  const STYLE_ID = 'ml-style-overrides';
  if (document.getElementById(STYLE_ID)) return;
  const s = document.createElement('style');
  s.id = STYLE_ID;
  s.textContent = `
    math-field::part(menu-toggle) { display: none !important; }
    math-field {
      --selection-background-color-focused: rgba(11,138,203,0.18) !important;
      --selection-color-focused: #0b6a9e !important;
      --caret-color: #0b8acb !important;
      --contains-highlight-background-color: rgba(11,138,203,0.1) !important;
    }
    .ML__focused .ML__selected,
    .ML__selected { background: rgba(11,138,203,0.18) !important; }
    .ML__caret { border-color: #0b8acb !important; }
    .ML__keyboard {
      --keyboard-background: #ffffff !important;
      --keyboard-toolbar-background: #f8fafc !important;
      --keyboard-toolbar-text: #374151 !important;
      --keyboard-background-border: #e5e7eb !important;
      --keycap-background: #f8fafc !important;
      --keycap-background-hover: #e5f3fa !important;
      --keycap-background-pressed: #c5e4f5 !important;
      --keycap-text: #374151 !important;
      --keycap-secondary-text: #6b7280 !important;
      border-top: 1px solid #e5e7eb !important;
      box-shadow: 0 -2px 12px rgba(0,0,0,0.06) !important;
    }
    .ML__keyboard .keycap,
    .ML__keyboard [class~="keycap"] {
      background: #f8fafc !important;
      color: #374151 !important;
      border-color: #e2e8f0 !important;
    }
    .ML__keyboard .action {
      background: #dde3ea !important;
      color: #374151 !important;
    }
    .ML__keyboard .action svg,
    .ML__keyboard .action .ML__svg-glyph { fill: #374151 !important; }
    .ML__keyboard .action.accept-suggestion,
    .ML__keyboard .action[data-command*="commit"],
    .ML__keyboard .action[data-command*="accept"] {
      background: #0b8acb !important;
      color: #ffffff !important;
    }
    .ML__keyboard .action.accept-suggestion svg,
    .ML__keyboard .action[data-command*="commit"] svg,
    .ML__keyboard .action.accept-suggestion .ML__svg-glyph,
    .ML__keyboard .action[data-command*="commit"] .ML__svg-glyph { fill: #ffffff !important; }
    .ML__keyboard .fnbutton, .ML__keyboard .bigfnbutton {
      background: #dde3ea !important;
      color: #374151 !important;
    }
    .ML__keyboard-toolbar, .keyboard-toolbar {
      background: #f8fafc !important;
      border-bottom: 1px solid #e5e7eb !important;
    }
    .ML__keyboard-toolbar .tab, .keyboard-toolbar .tab { color: #6b7280 !important; }
    .ML__keyboard-toolbar .tab.selected, .keyboard-toolbar .tab.selected {
      color: #0b8acb !important;
      border-bottom-color: #0b8acb !important;
    }
  `;
  document.head.appendChild(s);
}


// ── Парсинг текста на сегменты ─────────────────────────────────────────────

export function parseTextSegments(raw: string): Segment[] {
  const parts: Segment[] = [];
  const graphRegex = /\[ФУНКЦИЯ:\s*(\{[^\]]*\})\s*\]/g;
  const formulaRegex = /\$([^$]+)\$/g;
  const imageRegex = /\[ИЗОБРАЖЕНИЕ:\s*([^\]]+?)\s*\]/g;

  // Собираем все маркеры (графиков, формул, изображений) с их позициями
  type Token = { type: 'graph' | 'formula' | 'image'; index: number; end: number; content: string };
  const tokens: Token[] = [];

  let m: RegExpExecArray | null;
  graphRegex.lastIndex = 0;
  while ((m = graphRegex.exec(raw)) !== null) {
    tokens.push({ type: 'graph', index: m.index, end: graphRegex.lastIndex, content: m[1] });
  }

  formulaRegex.lastIndex = 0;
  while ((m = formulaRegex.exec(raw)) !== null) {
    tokens.push({ type: 'formula', index: m.index, end: formulaRegex.lastIndex, content: m[1] });
  }

  imageRegex.lastIndex = 0;
  while ((m = imageRegex.exec(raw)) !== null) {
    tokens.push({ type: 'image', index: m.index, end: imageRegex.lastIndex, content: m[1] });
  }

  tokens.sort((a, b) => a.index - b.index);

  let lastIndex = 0;
  for (const tok of tokens) {
    if (tok.index > lastIndex) {
      parts.push({ type: 'text', content: raw.slice(lastIndex, tok.index) });
    }
    if (tok.type === 'formula') {
      parts.push({ type: 'formula', content: tok.content });
    } else if (tok.type === 'image') {
      parts.push({ type: 'image', dataUrl: tok.content });
    } else {
      try {
        const cfg = JSON.parse(tok.content) as { fn?: string; xMin?: number; xMax?: number; yMin?: number; yMax?: number };
        if (cfg.fn && cfg.fn.length > 0 && cfg.fn.length < 200) {
          parts.push({ type: 'graph', config: { fn: cfg.fn, xMin: cfg.xMin ?? -5, xMax: cfg.xMax ?? 5, yMin: cfg.yMin, yMax: cfg.yMax } });
        }
      } catch { /* skip invalid graph */ }
    }
    lastIndex = tok.end;
  }
  if (lastIndex < raw.length) {
    parts.push({ type: 'text', content: raw.slice(lastIndex) });
  }

  return parts.length ? parts : [{ type: 'text', content: raw }];
}


export function normalizeSegments(segs: Segment[]): Segment[] {
  if (segs.length === 0 || segs[segs.length - 1].type !== 'text') {
    return [...segs, { type: 'text', content: '' }];
  }
  return segs;
}


export function segmentsToText(segs: Segment[]): string {
  return segs
    .filter(s => {
      if (s.type === 'formula') return s.content.trim() !== '';
      return true;
    })
    .map(s => {
      if (s.type === 'formula') return `$${s.content}$`;
      if (s.type === 'graph') {
        const cfg = s.config;
        const json = JSON.stringify({ fn: cfg.fn, xMin: cfg.xMin, xMax: cfg.xMax, ...(cfg.yMin != null && { yMin: cfg.yMin }), ...(cfg.yMax != null && { yMax: cfg.yMax }) });
        return `[ФУНКЦИЯ: ${json}]`;
      }
      if (s.type === 'image') return `[ИЗОБРАЖЕНИЕ: ${s.dataUrl}]`;
      return s.content;
    })
    .join('');
}





// ── Иконки ────────────────────────────────────────────────────────────────────

export function IcoFormula() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="5" x2="5" y2="19" />
      <circle cx="6.5" cy="6.5" r="2.5" />
      <circle cx="17.5" cy="17.5" r="2.5" />
    </svg>
  );
}


export function IcoCheckSave() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}


export function IcoGraph() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}


export function IcoImage() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  );
}


// ── ImageChip — отображение изображения как миниатюры ─────────────────────────

export function ImageChip({ dataUrl, onRemove }: { dataUrl: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center align-middle mx-0.5 relative group" style={{ verticalAlign: 'middle' }}>
      <img src={dataUrl} alt="" className="rounded border border-gray-200" style={{ maxHeight: 56, maxWidth: 104 }} />
      <button
        type="button"
        onClick={onRemove}
        title="Удалить изображение"
        className="absolute -top-1.5 -right-1.5 hidden group-hover:flex w-4 h-4 items-center justify-center rounded-full bg-red-500 text-white leading-none text-xs font-bold"
      >
        ×
      </button>
    </span>
  );
}


// ── GraphChip — отображение графика как компактного чипа ────────────────────

export function GraphChip({
  config,
  isActive,
  onClick,
}: {
  config: { fn: string; xMin: number; xMax: number };
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Нажмите для редактирования графика"
      className={`inline-flex items-center align-middle cursor-pointer rounded px-2 mx-0.5 py-1 transition-all gap-1 ${
        isActive
          ? 'bg-[#6366f1]/15 ring-1 ring-[#6366f1]'
          : 'bg-gray-100 hover:bg-[#6366f1]/10 hover:ring-1 hover:ring-[#6366f1]/40'
      }`}
    >
      <IcoGraph />
      <span className="text-xs font-semibold text-gray-700 leading-none">y = {config.fn}</span>
    </button>
  );
}


// ── FormulaChip — отображение формулы как кнопки ─────────────────────────────

export function FormulaChip({ latex, isActive, onClick }: { latex: string; isActive: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Нажмите для редактирования формулы"
      dangerouslySetInnerHTML={{ __html: renderMathHtml(latex || '\\square') }}
      className={`inline-flex items-center align-middle cursor-pointer rounded px-1 mx-0.5 transition-all ${
        isActive
          ? 'bg-[#0b8acb]/15 ring-1 ring-[#0b8acb]'
          : 'bg-gray-100 hover:bg-[#0b8acb]/10 hover:ring-1 hover:ring-[#0b8acb]/40'
      }`}
    />
  );
}


// ── TextSegment — редактируемый текстовый фрагмент ───────────────────────────

export function TextSegment({
  value,
  onChange,
  onFocus,
  autoFocusEnd,
}: {
  value: string;
  onChange: (val: string) => void;
  onFocus?: (node: HTMLSpanElement) => void;
  autoFocusEnd?: boolean;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const isEditingRef = useRef(false);

  useEffect(() => {
    if (ref.current && !isEditingRef.current) {
      ref.current.innerText = value;
    }
  }, [value]);

  useEffect(() => {
    if (autoFocusEnd && ref.current) {
      ref.current.focus();
      try {
        const range = document.createRange();
        const sel = window.getSelection();
        range.selectNodeContents(ref.current);
        range.collapse(false);
        sel?.removeAllRanges();
        sel?.addRange(range);
      } catch { /* ignore */ }
    }

  }, []);

  return (
    <span
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      onFocus={() => {
        isEditingRef.current = true;
        if (ref.current) onFocus?.(ref.current);
      }}
      onBlur={e => {
        isEditingRef.current = false;
        onChange((e.target as HTMLSpanElement).innerText);
      }}
      className="outline-none"
      style={{ whiteSpace: 'pre-wrap' }}
    />
  );
}


export async function fetchUrlToDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}


export function compressImage(file: File): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const MAX = 800;
      let { width, height } = img;
      if (width > MAX || height > MAX) {
        if (width > height) { height = Math.round(height * MAX / width); width = MAX; }
        else { width = Math.round(width * MAX / height); height = MAX; }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.75));
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(''); };
    img.src = url;
  });
}
