import { renderMathHtml } from '../../utils/mathRendering';
import { useMemo } from "react";
import { RichText } from "../../components/RichText";


export const LP = "'Littera Plain', sans-serif";


// ── Хелперы аватара ──────────────────────────────────────────────────────────
const AVATAR_COLORS = ['#21a038', '#0b8acb', '#30b0ba', '#95c949'];

export function avatarBg(name = '') {
  const code = (name.charCodeAt(0) || 0) + (name.charCodeAt(1) || 0);
  return AVATAR_COLORS[code % AVATAR_COLORS.length];
}

export function getInitial(fullName: string) {
  return fullName?.trim()?.[0]?.toUpperCase() ?? '?';
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


// ── Иконки ────────────────────────────────────────────────────────────────────

export function IcoBack() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}


export function IcoChevron({ open }: { open: boolean }) {
  return (
    <svg
      width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.25s ease' }}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}


export function IcoEdit() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}


export function IcoCheck() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}


export function IcoPlus() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}


export function IcoRefresh() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 2v6h-6" />
      <path d="M21 13a9 9 0 1 1-3-7.7L21 8" />
    </svg>
  );
}


export function IcoExport() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}


export function IcoFile() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}


export function IcoAI() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}


export function IcoTrash() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}


export function IcoDiff() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="8" y1="12" x2="16" y2="12" />
      <line x1="12" y1="8" x2="12" y2="16" />
    </svg>
  );
}


export function IcoOrigFile() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}


export function IcoRescan() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 4v6h6" />
      <path d="M3.51 15a9 9 0 1 0 .49-3" />
    </svg>
  );
}


export function IcoDownload() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}


export function IcoX() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}


export function Spinner() {
  return (
    <svg
      width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
      className="animate-spin"
    >
      <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" strokeOpacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" />
    </svg>
  );
}


// ── Подсветка различий с поддержкой LaTeX-формул ─────────────────────────────

type DiffToken = { kind: 'ws' | 'formula' | 'word'; value: string };


function tokenizeForDiff(s: string): DiffToken[] {
  const result: DiffToken[] = [];
  const re = /(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$)/g;
  re.lastIndex = 0;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s)) !== null) {
    if (m.index > last) {
      for (const p of s.slice(last, m.index).split(/(\s+)/)) {
        if (p !== '') result.push({ kind: /^\s+$/.test(p) ? 'ws' : 'word', value: p });
      }
    }
    result.push({ kind: 'formula', value: m[0] });
    last = re.lastIndex;
  }
  if (last < s.length) {
    for (const p of s.slice(last).split(/(\s+)/)) {
      if (p !== '') result.push({ kind: /^\s+$/.test(p) ? 'ws' : 'word', value: p });
    }
  }
  return result;
}





export function DiffRichText({ text, base }: { text: string; base?: string }) {
  const tokens = useMemo(() => tokenizeForDiff(text), [text]);
  const baseCounts = useMemo(() => {
    const map = new Map<string, number>();
    if (!base) return map;
    for (const t of tokenizeForDiff(base)) {
      if (t.kind !== 'ws') map.set(t.value, (map.get(t.value) ?? 0) + 1);
    }
    return map;
  }, [base]);

  if (!base) return <RichText>{text}</RichText>;

  const counts = new Map(baseCounts);

  return (
    <span style={{ whiteSpace: 'pre-wrap' }}>
      {tokens.map((t, i) => {
        if (t.kind === 'ws') return <span key={i}>{t.value}</span>;

        const c = counts.get(t.value) ?? 0;
        const isNew = c === 0;
        if (c > 0) counts.set(t.value, c - 1);

        if (t.kind === 'formula') {
          const isDisplay = t.value.startsWith('$$');
          const inner = isDisplay ? t.value.slice(2, -2) : t.value.slice(1, -1);
          const html = renderMathHtml(inner, isDisplay);
          return isNew
            ? <mark key={i} className="bg-yellow-200 rounded px-0.5 inline-block align-middle">
                <span dangerouslySetInnerHTML={{ __html: html }} />
              </mark>
            : <span key={i} dangerouslySetInnerHTML={{ __html: html }} />;
        }

        return isNew
          ? <mark key={i} className="bg-yellow-200 rounded px-0.5">{t.value}</mark>
          : <span key={i}>{t.value}</span>;
      })}
    </span>
  );
}


// ── Метка сложности (число 1..5 → цветной бейдж) ──────────────────────────────

export function difficultyBadge(d?: number): { label: string; color: string } | null {
  if (!d) return null;
  if (d <= 2) return { label: 'базовый', color: 'bg-[#22a139]' };
  if (d === 3) return { label: 'средний', color: 'bg-yellow-400' };
  return { label: 'сложный', color: 'bg-rose-400' };
}


export function variantsLabel(n: number) {
  if (n === 1) return 'вариант';
  if (n >= 2 && n <= 4) return 'варианта';
  return 'вариантов';
}


export function minutesLabel(total: number): string {
  return `~${total} мин`;
}


export const SUBJECT_LABELS: Record<string, string> = {
  math: 'Математика', physics: 'Физика', chemistry: 'Химия',
  biology: 'Биология', russian: 'Русский язык', literature: 'Литература',
  english: 'Английский', history: 'История', social_studies: 'Обществознание',
  geography: 'География', informatics: 'Информатика', other: 'Другое',
};


export const TASK_TYPE_LABELS: Record<string, string> = {
  PROBLEM: 'Задачи', TEST: 'Тест', EXERCISE: 'Упражнения',
  OPEN_QUESTION: 'Открытые вопросы', MIXED: 'Смешанный',
};


// ── Хелперы предпросмотра файла ──────────────────────────────────────────────

export function refFileIsImage(fileName: string) {
  return /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName);
}

export function refFileIsPdf(fileName: string) {
  return /\.pdf$/i.test(fileName);
}
