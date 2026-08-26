/**
 * Редактор задания с поддержкой формул — точный порт из VariantUm/src/components/ui/TaskEditorField.jsx.
 * Текстовые сегменты: contentEditable span-ы.
 * Формулы: отображаются через KaTeX; редактируются через MathLive math-field с виртуальной клавиатурой.
 */
import React, { useState, useRef, useEffect } from "react";
import 'katex/dist/katex.min.css';
import 'mathlive';
import 'mathlive/static.css';
import { RichText } from "./RichText";
import { FunctionGraphEditor } from "./FunctionGraphEditor";
import { MathFieldEl, FormulaSeg, GraphSeg, Segment, initMathLiveStyles, parseTextSegments, normalizeSegments, segmentsToText, IcoFormula, IcoCheckSave, IcoGraph, IcoImage, ImageChip, GraphChip, FormulaChip, TextSegment, fetchUrlToDataUrl, compressImage } from '../features/task-editor/parts';
import { OpenverseImage, OpenverseAttribution, OpenversePicker } from '../features/task-editor/OpenversePicker';


// ── TaskEditorField — основной компонент ─────────────────────────────────────

export interface TaskEditorFieldProps {
  text: string;
  onSave: (text: string) => void;
  onCancel: () => void;
  /** Опционально: колбэк при каждом изменении текста (для режима массового редактирования). */
  onChange?: (text: string) => void;
  isSaving?: boolean;
  saveLabel?: string;
}


export function TaskEditorField({ text, onSave, onCancel, onChange, isSaving, saveLabel = 'Сохранить' }: TaskEditorFieldProps) {
  const [segments, setSegments] = useState<Segment[]>(() => normalizeSegments(parseTextSegments(text)));
  const [editingFormulaIdx, setEditingFormulaIdx] = useState<number | null>(null);
  const [editingGraphIdx, setEditingGraphIdx] = useState<number | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showGraphInsertEditor, setShowGraphInsertEditor] = useState(false);
  const [showImageMenu, setShowImageMenu] = useState(false);
  const [showOpenversePicker, setShowOpenversePicker] = useState(false);
  const [openverseAttribution, setOpenverseAttribution] = useState<OpenverseAttribution | null>(null);
  const mathFieldRef = useRef<MathFieldEl>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const imageMenuRef = useRef<HTMLDivElement>(null);
  const focusedSegRef = useRef<{ idx: number; node: HTMLSpanElement } | null>(null);
  const latestSegmentsRef = useRef<Segment[]>(segments);
  latestSegmentsRef.current = segments;

  useEffect(() => {
    initMathLiveStyles();
  }, []);

  useEffect(() => {
    if (!showImageMenu) return;
    function handleClick(e: MouseEvent) {
      if (imageMenuRef.current && !imageMenuRef.current.contains(e.target as Node)) {
        setShowImageMenu(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setShowImageMenu(false);
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [showImageMenu]);

  // Уведомляем onChange при каждом изменении сегментов
  useEffect(() => {
    onChange?.(segmentsToText(segments));

  }, [segments]);

  function handleOpenFormula(idx: number) {
    setEditingFormulaIdx(idx);
    setTimeout(() => {
      if (mathFieldRef.current) {
        mathFieldRef.current.value = (segments[idx] as FormulaSeg).content;
        mathFieldRef.current.focus();
      }
    }, 50);
  }

  function handleOpenGraph(idx: number) {
    setEditingGraphIdx(idx);
  }

  function handleInsertFormula() {
    const sel = window.getSelection();
    let insertIdx: number | null = null;
    let textBefore = '';
    let textAfter = '';

    if (focusedSegRef.current !== null) {
      const { idx, node } = focusedSegRef.current;
      if (sel && sel.rangeCount > 0 && node.contains(sel.getRangeAt(0).startContainer)) {
        try {
          const range = sel.getRangeAt(0);
          const beforeRange = document.createRange();
          beforeRange.setStart(node, 0);
          beforeRange.setEnd(range.startContainer, range.startOffset);
          textBefore = beforeRange.toString();
          textAfter = (node.innerText || '').slice(textBefore.length);
        } catch {
          textBefore = node.innerText || '';
          textAfter = '';
        }
      } else {
        textBefore = node.innerText || '';
        textAfter = '';
      }
      insertIdx = idx;
    }

    const segs = latestSegmentsRef.current;
    let newSegs: Segment[];
    let formulaIdx: number;

    if (insertIdx !== null) {
      newSegs = normalizeSegments([
        ...segs.slice(0, insertIdx),
        { type: 'text', content: textBefore },
        { type: 'formula', content: '' },
        { type: 'text', content: textAfter },
        ...segs.slice(insertIdx + 1),
      ]);
      formulaIdx = insertIdx + 1;
    } else {
      const lastIdx = segs.length - 1;
      const insertAt = lastIdx >= 0 && segs[lastIdx].type === 'text' ? lastIdx : segs.length;
      formulaIdx = insertAt;
      newSegs = normalizeSegments([
        ...segs.slice(0, insertAt),
        { type: 'formula', content: '' },
        ...segs.slice(insertAt),
      ]);
    }

    setSegments(newSegs);
    setEditingFormulaIdx(formulaIdx);
    setTimeout(() => {
      if (mathFieldRef.current) {
        mathFieldRef.current.value = '';
        mathFieldRef.current.focus();
      }
    }, 50);
  }

  function handleApplyFormula() {
    if (editingFormulaIdx === null || !mathFieldRef.current) return;
    const latex = mathFieldRef.current.value;
    if (latex.trim() === '') {
      setSegments(prev => normalizeSegments(prev.filter((_, i) => i !== editingFormulaIdx)));
    } else {
      setSegments(prev =>
        normalizeSegments(prev.map((s, i) => (i === editingFormulaIdx ? { ...s, content: latex } : s)))
      );
    }
    setEditingFormulaIdx(null);
  }

  function handleCancelFormula() {
    if (editingFormulaIdx !== null) {
      const seg = segments[editingFormulaIdx];
      if (seg && 'content' in seg && seg.content === '') {
        setSegments(prev => normalizeSegments(prev.filter((_, i) => i !== editingFormulaIdx)));
        setEditingFormulaIdx(null);
        return;
      }
    }
    setEditingFormulaIdx(null);
  }

  function handleUpdateGraph(newConfig: GraphSeg['config']) {
    if (editingGraphIdx !== null) {
      setSegments(prev =>
        normalizeSegments(prev.map((s, i) => (i === editingGraphIdx ? { type: 'graph', config: newConfig } : s)))
      );
    }
    setEditingGraphIdx(null);
  }

  function handleCancelGraph() {
    setEditingGraphIdx(null);
  }

  function handleTextChange(idx: number, val: string) {
    setSegments(prev => prev.map((s, i) => (i === idx ? { ...s, content: val } : s)));
  }

  async function handleInsertImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    const dataUrl = await compressImage(file);
    if (!dataUrl) return;
    const segs = latestSegmentsRef.current;
    setSegments(normalizeSegments([...segs, { type: 'image', dataUrl }]));
  }

  function handleRemoveImage(idx: number) {
    setSegments(prev => normalizeSegments(prev.filter((_, i) => i !== idx)));
  }

  async function handleInsertOpenverseImage(img: OpenverseImage) {
    setShowOpenversePicker(false);
    setOpenverseAttribution({
      creator: img.creator,
      license: img.license,
      source: img.foreign_landing_url,
      title: img.title,
    });
    const rawUrl = img.thumbnail || img.url;
    const dataUrl = await fetchUrlToDataUrl(rawUrl);
    const segs = latestSegmentsRef.current;
    setSegments(normalizeSegments([...segs, { type: 'image', dataUrl: dataUrl ?? rawUrl }]));
  }

  return (
    <div className="flex flex-col gap-3 bg-blue-50/30 rounded-xl px-3 py-3">
      {/* Заголовок + кнопки тулбара */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-xs font-semibold text-gray-500">
          Редактирование{' '}
          <span className="font-normal text-gray-400">— нажмите на формулу для её изменения</span>
        </p>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            type="button"
            onClick={handleInsertFormula}
            disabled={editingFormulaIdx !== null || editingGraphIdx !== null || showGraphInsertEditor}
            className="flex items-center gap-1 px-2.5 py-1 border border-[#0b8acb]/40 rounded-lg text-xs text-[#0b8acb] hover:bg-[#0b8acb]/10 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <IcoFormula /> Формула
          </button>
          <button
            type="button"
            onClick={() => setShowGraphInsertEditor(v => !v)}
            disabled={editingFormulaIdx !== null || editingGraphIdx !== null}
            className={`flex items-center gap-1 px-2.5 py-1 border rounded-lg text-xs transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
              showGraphInsertEditor
                ? 'border-indigo-400 bg-indigo-50 text-indigo-700'
                : 'border-indigo-300/60 text-indigo-600 hover:bg-indigo-50'
            }`}
          >
            <IcoGraph /> График
          </button>
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleInsertImage}
          />
          <div ref={imageMenuRef} className="relative">
            <button
              type="button"
              onClick={() => setShowImageMenu(v => !v)}
              disabled={editingFormulaIdx !== null || editingGraphIdx !== null}
              className={`flex items-center gap-1 px-2.5 py-1 border rounded-lg text-xs disabled:opacity-40 disabled:cursor-not-allowed transition-all ${
                showImageMenu
                  ? 'border-emerald-400 bg-emerald-50 text-emerald-800'
                  : 'border-emerald-300/60 text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              <IcoImage /> Изображение
            </button>
            {showImageMenu && (
              <div className="absolute right-0 top-full mt-1 z-30 bg-white border border-gray-200 rounded-xl shadow-lg py-1 w-52">
                <button
                  type="button"
                  onClick={() => { setShowImageMenu(false); imageInputRef.current?.click(); }}
                  className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  Загрузить с устройства
                </button>
                <button
                  type="button"
                  onClick={() => { setShowImageMenu(false); setShowOpenversePicker(true); }}
                  className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  Найти в Openverse
                  <span className="ml-auto text-gray-400 font-normal">CC</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Единое поле редактирования: текст + формулы */}
      <div
        className="border border-[#0b8acb] rounded-xl px-3 py-2.5 bg-white text-sm text-gray-700 leading-relaxed min-h-[60px] cursor-text"
        onClick={e => {
          if (e.target === e.currentTarget) {
            const editables = (e.currentTarget as HTMLElement).querySelectorAll<HTMLSpanElement>('[contenteditable]');
            if (editables.length > 0) {
              const last = editables[editables.length - 1];
              last.focus();
              try {
                const range = document.createRange();
                const sel = window.getSelection();
                range.selectNodeContents(last);
                range.collapse(false);
                sel?.removeAllRanges();
                sel?.addRange(range);
              } catch { /* ignore */ }
            }
          }
        }}
      >
        {segments.map((seg, idx) =>
          seg.type === 'formula' ? (
            <FormulaChip
              key={idx}
              latex={seg.content}
              isActive={editingFormulaIdx === idx}
              onClick={() => handleOpenFormula(idx)}
            />
          ) : seg.type === 'graph' ? (
            <GraphChip
              key={idx}
              config={seg.config}
              isActive={editingGraphIdx === idx}
              onClick={() => handleOpenGraph(idx)}
            />
          ) : seg.type === 'image' ? (
            <ImageChip
              key={idx}
              dataUrl={seg.dataUrl}
              onRemove={() => handleRemoveImage(idx)}
            />
          ) : (
            <TextSegment
              key={idx}
              value={seg.content}
              onChange={val => handleTextChange(idx, val)}
              onFocus={node => { focusedSegRef.current = { idx, node }; }}
            />
          )
        )}
      </div>

      {/* Редактор для добавления нового графика */}
      {showGraphInsertEditor && (
        <FunctionGraphEditor
          onInsert={(cfg) => {
            const segs = latestSegmentsRef.current;
            const config = JSON.parse(cfg.split('[ФУНКЦИЯ: ')[1].slice(0, -1)) as GraphSeg['config'];
            const newSegs: Segment[] = [...segs, { type: 'graph', config }];
            setSegments(normalizeSegments(newSegs));
            setShowGraphInsertEditor(false);
          }}
          onCancel={() => setShowGraphInsertEditor(false)}
        />
      )}

      {/* Редактор для изменения существующего графика */}
      {editingGraphIdx !== null && segments[editingGraphIdx]?.type === 'graph' && (
        <FunctionGraphEditor
          initialConfig={(segments[editingGraphIdx] as GraphSeg).config}
          onInsert={(marker) => {
            const cfg = JSON.parse(marker.split('[ФУНКЦИЯ: ')[1].slice(0, -1)) as GraphSeg['config'];
            handleUpdateGraph(cfg);
          }}
          onCancel={handleCancelGraph}
        />
      )}

      {/* Конструктор формулы — показывается при редактировании формулы */}
      {editingFormulaIdx !== null && (
        <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
          <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <IcoFormula />
              <span className="text-xs font-semibold text-gray-700">Конструктор формулы</span>
            </div>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={handleCancelFormula}
                className="px-2 py-1 text-xs text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleApplyFormula}
                className="px-2.5 py-1 text-xs font-semibold text-white bg-[#0b8acb] hover:bg-[#029bf5] rounded-lg transition-colors"
              >
                Применить
              </button>
            </div>
          </div>
          <div className="p-3">
            {React.createElement('math-field', {
              ref: mathFieldRef,
              style: {
                width: '100%',
                fontSize: '1.15em',
                border: 'none',
                outline: 'none',
                minHeight: '52px',
                display: 'block',
                '--hue': '198',
                '--keyboard-background': '#ffffff',
                '--keycap-background': '#f8fafc',
                '--keycap-text': '#374151',
              },
            })}
          </div>
          <div className="px-3 pb-2">
            <p className="text-xs text-gray-400">
              Используйте панель инструментов или клавиатуру для ввода дробей, корней, интегралов и других символов.
            </p>
          </div>
        </div>
      )}

      {/* Предпросмотр — показывает таблицы и формулы как они будут выглядеть */}
      {showPreview && (
        <div className="border border-slate-200 rounded-xl px-3 py-2.5 bg-white">
          <div className="text-xs font-semibold text-slate-400 mb-1.5">Предпросмотр</div>
          <RichText className="text-sm text-gray-700 leading-relaxed">
            {segmentsToText(segments)}
          </RichText>
        </div>
      )}

      {/* Кнопки сохранения */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onSave(segmentsToText(segments))}
          disabled={isSaving || editingFormulaIdx !== null || editingGraphIdx !== null}
          className="flex items-center gap-1 px-3 py-1.5 bg-[#22a139] hover:bg-[#1e9231] text-white rounded-lg text-xs font-semibold transition-all disabled:opacity-60"
        >
          <IcoCheckSave /> {isSaving ? 'Сохраняю...' : saveLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isSaving || editingFormulaIdx !== null || editingGraphIdx !== null}
          className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-500 hover:bg-gray-50 transition-all disabled:opacity-40"
        >
          Отмена
        </button>
        <button
          type="button"
          onClick={() => setShowPreview(p => !p)}
          disabled={editingFormulaIdx !== null || editingGraphIdx !== null}
          className={`ml-auto flex items-center gap-1 px-2.5 py-1.5 border rounded-lg text-xs transition-all disabled:opacity-40 ${
            showPreview
              ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
              : 'border-gray-200 text-gray-500 hover:bg-gray-50'
          }`}
        >
          {showPreview ? 'Скрыть предпросмотр' : 'Предпросмотр'}
        </button>
      </div>

      {/* Блок атрибуции для изображений из Openverse */}
      {openverseAttribution && (
        <div className="flex items-start gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
          <svg className="flex-shrink-0 mt-0.5" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <span>
            Источник: {openverseAttribution.title && <>{openverseAttribution.title} · </>}
            {openverseAttribution.creator && <>Автор: {openverseAttribution.creator} · </>}
            Лицензия: <span className="font-semibold uppercase">{openverseAttribution.license}</span>
            {' · '}
            <a
              href={openverseAttribution.source}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-amber-900"
            >
              Страница источника
            </a>
          </span>
          <button
            type="button"
            onClick={() => setOpenverseAttribution(null)}
            className="ml-auto flex-shrink-0 text-amber-500 hover:text-amber-700"
            title="Скрыть"
          >
            ×
          </button>
        </div>
      )}

      {/* Пикер Openverse */}
      {showOpenversePicker && (
        <OpenversePicker
          onSelect={handleInsertOpenverseImage}
          onClose={() => setShowOpenversePicker(false)}
        />
      )}
    </div>
  );
}
