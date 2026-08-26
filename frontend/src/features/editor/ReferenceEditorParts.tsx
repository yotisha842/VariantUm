import { useState, useEffect } from "react";
import { RichText } from "../../components/RichText";
import { MathText } from "../../components/MathText";
import { TaskEditorField } from "../../components/TaskEditorField";
import { VariationOption, difficultyBadge, KitTask, makePreviewText } from './referenceModel';


export const LP = "'Littera Plain', sans-serif";


// ── Иконки ─────────────────────────────────────────────────────────────────────

export function IcoChevron({ open }: { open: boolean }) {
  return (
    <svg
      width="20" height="20" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}


export function IcoBack() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}


export function IcoSparkle() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}


function IcoTrash() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}


function IcoCheck() {
  return (
    <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
      <polyline points="2 5 4 7 8 3" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}


function IcoFile() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}


function IcoPencil() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
    </svg>
  );
}


export function IcoShield() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}


// ── Иконки мобильной шапки ────────────────────────────────────────────────────
export function MobHomeIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9L12 2L21 9V21H15V15H9V21H3V9Z" />
    </svg>
  );
}

export function MobBookIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}

export function MobQuestionIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" strokeWidth="2.5" />
    </svg>
  );
}


// Хелперы аватара
const AVATAR_COLORS = ['#21a038', '#0b8acb', '#30b0ba', '#95c949'];

export function avatarBg(name = '') {
  const code = (name.charCodeAt(0) || 0) + (name.charCodeAt(1) || 0);
  return AVATAR_COLORS[code % AVATAR_COLORS.length];
}

export function getInitial(fullName: string) {
  return fullName?.trim()?.[0]?.toUpperCase() ?? '?';
}


// ── Общие подкомпоненты ──────────────────────────────────────────────────────

export function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${checked ? 'bg-[#0b8acb]' : 'bg-gray-300'}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${checked ? 'translate-x-5' : 'translate-x-0'}`}
      />
    </button>
  );
}


export function CheckboxOption({ option, onToggle, isLast }: { option: VariationOption; onToggle: (id: string) => void; isLast: boolean }) {
  return (
    <label
      className={`flex items-start gap-3 py-3 cursor-pointer hover:bg-gray-50 px-2 -mx-2 rounded-xl transition-colors ${!isLast ? 'border-b border-gray-100' : ''}`}
    >
      <div className="relative flex-shrink-0 mt-0.5">
        <input type="checkbox" checked={option.checked} onChange={() => onToggle(option.id)} className="sr-only" />
        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${option.checked ? 'bg-[#0b8acb] border-[#0b8acb]' : 'bg-white border-gray-300'}`}>
          {option.checked && <IcoCheck />}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800">{option.label}</p>
        <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{option.desc}</p>
      </div>
    </label>
  );
}


// ── Предпросмотр исходных файлов ─────────────────────────────────────────────

function fileIsImage(file: File) {
  return file.type.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(file.name);
}

function fileIsPdf(file: File) {
  return file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
}


export function SourceFilesPreview({ files }: { files: File[] }) {
  const [open, setOpen] = useState(false);
  const [urls, setUrls] = useState<string[]>([]);

  useEffect(() => {
    const created = files.map(f => URL.createObjectURL(f));
    setUrls(created);
    return () => { created.forEach(u => URL.revokeObjectURL(u)); };
  }, [files]);

  if (!files.length) return null;

  const title = files.length === 1
    ? `Исходный файл — ${files[0].name}`
    : `Исходные файлы (${files.length})`;

  return (
    <div className="border border-gray-200 rounded-2xl overflow-hidden mb-4">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-gray-50 transition-colors"
      >
        <span className="text-gray-400 flex-shrink-0"><IcoFile /></span>
        <span className="flex-1 text-sm font-medium text-gray-700 truncate">{title}</span>
        <span className="text-gray-400 ml-2"><IcoChevron open={open} /></span>
      </button>
      <div
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{ maxHeight: open ? '1400px' : '0px' }}
      >
        <div className="border-t border-gray-100 px-5 py-4 flex flex-col gap-4">
          {files.map((file, i) => {
            const url = urls[i];
            if (!url) return null;
            return (
              <div key={i}>
                {files.length > 1 && (
                  <p className="text-xs text-gray-500 mb-2 font-medium">{file.name}</p>
                )}
                {fileIsImage(file) ? (
                  <img
                    src={url}
                    alt={file.name}
                    className="max-w-full rounded-xl border border-gray-200 object-contain"
                    style={{ maxHeight: '600px' }}
                  />
                ) : fileIsPdf(file) ? (
                  <embed
                    src={url}
                    type="application/pdf"
                    className="w-full rounded-xl border border-gray-200"
                    style={{ height: '600px' }}
                  />
                ) : (
                  <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
                    <IcoFile />
                    <span className="truncate">{file.name}</span>
                    <span className="text-gray-400 flex-shrink-0">— предпросмотр недоступен</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}


// ── Строка задачи ───────────────────────────────────────────────────────────────

export function TaskRow({
  task, index, tag, difficulty, isOpen, onToggle, onDelete, onChangeText, tourTarget,
}: {
  task: KitTask; index: number; tag: string | null; difficulty?: number;
  isOpen: boolean; onToggle: () => void; onDelete: (id: number) => void; onChangeText: (id: number, text: string) => void;
  tourTarget?: boolean;
}) {
  const [complexity, setComplexity] = useState(task.complexity);
  const [variationOptions, setVariationOptions] = useState(task.variationOptions);
  const [isEditing, setIsEditing] = useState(false);
  const [preEditText, setPreEditText] = useState('');

  function toggleVariation(optId: string) {
    setVariationOptions(prev => prev.map(o => o.id === optId ? { ...o, checked: !o.checked } : o));
  }

  const previewText = makePreviewText(task.fullText);
  const diff = difficultyBadge(difficulty);

  return (
    <div className={`border rounded-2xl overflow-hidden transition-shadow ${isOpen ? 'border-gray-300 shadow-sm' : 'border-gray-200'}`}>
      {/* Свёрнутая строка */}
      <button
        data-tour={tourTarget ? 'editor-first-task' : undefined}
        onClick={onToggle}
        className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-gray-50 transition-colors"
      >
        <span className="w-8 h-8 rounded-full bg-gray-200 text-gray-600 text-sm font-semibold flex items-center justify-center flex-shrink-0">
          {index + 1}
        </span>
        <span className="flex-1 text-sm text-gray-700 min-w-0 overflow-hidden" style={{ whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
          <MathText style={{ whiteSpace: 'nowrap' }}>{previewText}</MathText>
        </span>
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          {tag && (
            <span className="px-3 py-1 rounded-full text-white text-xs font-semibold bg-[#30b0ba] max-w-[140px] truncate">
              {tag}
            </span>
          )}
          <span className={`px-3 py-1 rounded-full text-white text-xs font-semibold ${diff.color}`}>
            {diff.label}
          </span>
          <span className="text-gray-400 ml-1"><IcoChevron open={isOpen} /></span>
        </div>
      </button>

      {/* Развёрнутое содержимое */}
      {isOpen && (
        <div className="px-5 pb-5 border-t border-gray-100">
          {/* Редактируемый полный текст */}
          <div className="mt-4 mb-4">
            {isEditing ? (
              <TaskEditorField
                text={preEditText}
                onSave={val => { onChangeText(task.id, val); setIsEditing(false); }}
                onCancel={() => { onChangeText(task.id, preEditText); setIsEditing(false); }}
                onChange={val => onChangeText(task.id, val)}
              />
            ) : (
              <div
                onClick={() => { setPreEditText(task.fullText); setIsEditing(true); }}
                className="relative border border-gray-200 hover:border-gray-300 rounded-xl cursor-text transition-all"
              >
                <span className="absolute top-3 right-3 text-gray-300 pointer-events-none">
                  <IcoPencil />
                </span>
                <div className="text-sm text-gray-700 leading-relaxed px-4 py-3 pr-9 min-h-[72px]">
                  <RichText>{task.fullText}</RichText>
                </div>
              </div>
            )}
          </div>

          {/* Ответ из исходника (если был распознан) */}
          {task.answer && (
            <div className="mb-4 flex items-start gap-2 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide mt-0.5 flex-shrink-0">Ответ</span>
              <div className="text-sm text-gray-600 leading-relaxed min-w-0">
                <RichText>{task.answer}</RichText>
              </div>
            </div>
          )}

          {/* Что менять в вариантах */}
          <div className="mb-4" data-tour={tourTarget ? 'editor-task-variation-options' : undefined}>
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-1">
              Что менять в вариантах
            </p>
            <p className="text-xs text-gray-400 mb-2">Скорректируйте галочки при необходимости</p>
            <div className="flex flex-col">
              {variationOptions.map((opt, idx) => (
                <CheckboxOption
                  key={opt.id}
                  option={opt}
                  onToggle={toggleVariation}
                  isLast={idx === variationOptions.length - 1}
                />
              ))}
            </div>
          </div>

          {/* Сложность */}
          <div className="mb-5" data-tour={tourTarget ? 'editor-task-complexity' : undefined}>
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-2">
              Сложность
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { key: 'Упростить', prefix: '↓', desc: 'Целые числа, меньше шагов, округлённые ответы' },
                { key: 'Как есть', prefix: '·', desc: 'Задача без изменений, как сгенерировано' },
                { key: 'Усложнить', prefix: '↑', desc: 'Дроби, нецелые данные, дополнительное условие' },
              ].map(({ key, prefix, desc }) => (
                <button
                  key={key}
                  onClick={() => setComplexity(key)}
                  className={`py-3 px-3 rounded-xl border text-left transition-all ${
                    complexity === key
                      ? 'bg-[#0b8acb] border-[#0b8acb] text-white'
                      : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'
                  }`}
                >
                  <p className="text-xs font-semibold mb-1">{prefix} {key}</p>
                  <p className={`text-[10px] leading-snug ${complexity === key ? 'text-white/75' : 'text-gray-400'}`}>
                    {desc}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Действия */}
          <div className="flex gap-3">
            <button
              onClick={() => onDelete(task.id)}
              className="flex items-center gap-2 px-4 py-2.5 border border-red-200 rounded-xl text-sm font-semibold text-red-500 hover:bg-red-50 hover:border-red-300 transition-all"
            >
              <IcoTrash /> Удалить задачу
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
