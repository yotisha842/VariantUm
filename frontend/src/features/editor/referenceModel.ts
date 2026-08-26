import { type SplitTask } from "../../api/analyze.api";
import type { VariationType } from "../../types/api";


// ── Константы ─────────────────────────────────────────────────────────────────

export type VariationOption = { id: string; label: string; desc: string; checked: boolean };


export const PRESETS: { id: string; title: string; desc: string; options: string[] }[] = [
  {
    id: 'standard',
    title: 'Стандарт',
    desc: 'Самый распространённый выбор — меняются числа и ситуация, структура сохраняется',
    options: ['numbers', 'context'],
  },
  {
    id: 'numbers_only',
    title: 'Только числа и имена',
    desc: 'Меняются только цифровые значения и имена, остальное остаётся как в оригинале',
    options: ['numbers', 'names'],
  },
  {
    id: 'full',
    title: 'Полная вариация',
    desc: 'Меняются числа, имена, контекст и формулировки — варианты максимально непохожи',
    options: ['numbers', 'names', 'context', 'order', 'synonyms'],
  },
];


export const DEFAULT_VARIATION_OPTIONS: VariationOption[] = [
  { id: 'numbers', label: 'Числа и величины', desc: 'Расстояние, скорости, время — с проверкой корректности ответов', checked: true },
  { id: 'names', label: 'Имена и названия', desc: 'Название городов, имена участников', checked: false },
  { id: 'context', label: 'Контекст ситуации', desc: 'Велосипедист → поезда / пешеходы / лодки — структура сохраняется', checked: true },
  { id: 'order', label: 'Порядок условий', desc: 'Перестановка данных внутри условия — осторожно, влияет на восприятие сложности', checked: false },
  { id: 'synonyms', label: 'Синонимы формулировок', desc: 'Перефразировать ключевые части условия', checked: false },
];


export const OPTION_TO_VARIATION: Record<string, VariationType> = {
  numbers: 'NUMBERS', names: 'NAMES', context: 'CONTEXT', order: 'ORDER', synonyms: 'LEXIS',
};


export const SUBJECT_LABELS: Record<string, string> = {
  math: 'Математика', physics: 'Физика', chemistry: 'Химия',
  biology: 'Биология', russian: 'Русский язык', literature: 'Литература',
  english: 'Английский', history: 'История', social_studies: 'Обществознание',
  geography: 'География', informatics: 'Информатика', other: 'Другое',
};


export const KNOWN_SUBJECTS = new Set(Object.keys(SUBJECT_LABELS));


export const TASK_TYPE_LABELS: Record<string, string> = {
  PROBLEM: 'Задачи', TEST: 'Тест', EXERCISE: 'Упражнения', OPEN_QUESTION: 'Открытый вопрос',
};

export const KNOWN_TASK_TYPES = new Set(Object.keys(TASK_TYPE_LABELS));


export function difficultyBadge(d?: number): { label: string; color: string } {
  if (!d || d <= 2) return { label: 'базовый', color: 'bg-[#22a139]' };
  if (d === 3) return { label: 'средний', color: 'bg-yellow-400' };
  return { label: 'сложный', color: 'bg-rose-400' };
}


// ── Тип задачи комплекта ──────────────────────────────────────────────────────

export type KitTask = {
  id: number;
  fullText: string;
  answer?: string | null;
  variationOptions: VariationOption[];
  complexity: string;
};


/**
 * Убирает строки-метаданные с начала текста (шапка варианта/работы).
 * Типичные примеры: "К-10 В-1", "Вариант 2", "Тема. Обобщение...", "9 класс" и т.п.
 */
function stripHeader(text: string): string {
  const lines = text.split('\n');
  let start = 0;
  // Шапочные строки: К-10 В-1, Вариант 2, Тема. ..., 9 класс, разделители ---
  const headerRe = new RegExp(
    '^(?:' +
    '[КкKk][-–—]\\d+\\s*[Вв][-–—]\\d+' +  // К-10 В-1
    '|(?:Вариант|Контрольная|Работа|Класс|Дата|ФИО|Ф\\.И\\.О\\.)\\s*[\\d.:]*' + // Вариант 1
    '|Тема\\.?\\s.{0,80}' +                                     // Тема. Обобщение...
    '|\\d{1,2}\\s*класс' +                                      // 9 класс
    '|[А-ЯЁ]{1,5}[-–—]\\d+' +                       // К-10, В-3
    '|[\\s—–=_-]{3,}' +                               // ---
    ')$',
    'i'
  );
  // Убираем заголовочные строки в начале (максимум первые 6 строк)
  while (start < Math.min(lines.length, 6)) {
    const trimmed = lines[start].trim();
    if (!trimmed || headerRe.test(trimmed)) {
      start++;
    } else {
      break;
    }
  }
  return lines.slice(start).join('\n').trim();
}


/**
 * Убирает строки с ответами/решениями в конце текста задачи.
 * Учитель нередко вставляет текст вместе с ответами — при генерации они не нужны.
 */
export function stripAnswerLines(taskText: string): string {
  const lines = taskText.split('\n');
  const answerRe = /^[ \t]*(?:Ответ|Ответы|Решение|Решения|Правильный ответ)[:.)\s]/i;
  // Убираем строки-ответы С КОНЦА (не больше 5 строк, чтобы не съесть условие)
  let end = lines.length;
  let stripped = 0;
  while (end > 0 && stripped < 5) {
    const line = lines[end - 1].trim();
    if (!line || answerRe.test(line)) {
      end--;
      stripped++;
    } else {
      break;
    }
  }
  const result = lines.slice(0, end).join('\n').trim();
  return result.length > 10 ? result : taskText; // не трогаем, если удалили почти всё
}


/** Создаёт KitTask из текста и (опционально) ответа. */
export function makeTask(id: number, fullText: string, answer?: string | null): KitTask {
  return {
    id,
    fullText,
    answer: answer && answer.trim() ? answer.trim() : null,
    variationOptions: DEFAULT_VARIATION_OPTIONS.map(o => ({ ...o })),
    complexity: 'Как есть',
  };
}


/** Превращает результат LLM-разбиения в список задач редактора. */
export function tasksFromSplit(split: SplitTask[]): KitTask[] {
  return split
    .filter(t => t.text && t.text.trim())
    .map((t, i) => makeTask(i + 1, t.text.trim(), t.answer));
}


/**
 * Запасное разбиение БЕЗ нейросети (если LLM-разбиение недоступно).
 * Делит ТОЛЬКО по пустым строкам — этот способ не путает варианты ответа теста
 * (1) 2) 3) 4)) с отдельными заданиями. Если абзацев меньше двух — одно задание целиком.
 */
export function fallbackSplit(referenceText: string): KitTask[] {
  const text = stripHeader(referenceText.trim());
  if (!text) return [];

  const paragraphs = text.split(/\n[ \t]*\n/).map(s => s.trim()).filter(s => s.length > 20);
  if (paragraphs.length >= 2) {
    return paragraphs.map((p, i) => makeTask(i + 1, stripAnswerLines(p)));
  }
  return [makeTask(1, stripAnswerLines(text))];
}


/**
 * Простая эвристика определения предмета и класса по ключевым словам текста.
 * Используется как резервный вариант, если LLM-анализ недоступен или вернул «other».
 */
export function detectSubjectHeuristic(text: string): { subject: string; grade: number | null } {
  const t = text.toLowerCase();

  let subject = 'other';
  if (/тригоно|алгебр|геометр|прямоугол|уравнение|формул[аыу]|площадь|периметр|дробь|числа?|десятичн|целых|корень|квадрат|функци|график|парабол|вектор|логарифм|производн|интеграл|вероятност/.test(t)) {
    subject = 'math';
  } else if (/физик|сила|масса|ускорен|напряжен|электр|ток|тел[оа]|движение|импульс|энергия|теплот|кинетическ|потенциальн|мощность|работ[аы]/.test(t)) {
    subject = 'physics';
  } else if (/хими|молекул|атом|реакци|вещество|элемент|валентн|кислот|щелочь|реагент|ионн|оксид|соль/.test(t)) {
    subject = 'chemistry';
  } else if (/биолог|клетк|организм|растени[ея]|животн|вирус|бактери|генетик|экосистем|белок|фермент|фотосинтез/.test(t)) {
    subject = 'biology';
  } else if (/орфограф|пунктуаци|части речи|подлежащ|сказуемое|предложени[ея]|суффикс|приставк|существительн|прилагательн|глаго[лк]|наречи|местоимен/.test(t)) {
    subject = 'russian';
  } else if (/история|историч|война|государств|революци|царь|век\b|период|событи[ея]|СССР|российск/.test(t)) {
    subject = 'history';
  } else if (/информатик|программ|алгоритм|компьютер|данные|массив|переменн|цикл|условие|функци.*языке|код|python|pascal/.test(t)) {
    subject = 'informatics';
  } else if (/географи|климат|рельеф|карт[аы]|материк|страна|река|горы|океан|континент/.test(t)) {
    subject = 'geography';
  } else if (/обществозна|общество|право|гражданин|конституц|экономика|рынок|государственн|демократи/.test(t)) {
    subject = 'social_studies';
  } else if (/литератур|произведение|герой|автор|стихотворен|роман|повесть|рассказ|поэт|писател/.test(t)) {
    subject = 'literature';
  }

  // Определение класса: «9 класс», «9 кл.», «К-10», «В-3  10 кл», «(10 класс)»
  let grade: number | null = null;
  const gradeMatch = /(?:^|\s|\()(\d{1,2})\s*(?:класс|кл[\s.)])/.exec(text);
  if (gradeMatch) {
    const g = parseInt(gradeMatch[1], 10);
    if (g >= 1 && g <= 11) grade = g;
  }
  if (!grade) {
    // Паттерн типа «К-10» или «В-9»
    const headerMatch = /[КкKk][-–—](\d{1,2})/.exec(text);
    if (headerMatch) {
      const g = parseInt(headerMatch[1], 10);
      if (g >= 1 && g <= 11) grade = g;
    }
  }

  return { subject, grade };
}


/**
 * Подготавливает текст для однострочного превью: убирает блочные формулы ($$...$$),
 * сворачивает переносы строк в пробелы, обрезает до лимита без разрыва инлайн-формул.
 */
export function makePreviewText(text: string, rawLimit = 300): string {
  const cleaned = text.replace(/\$\$[\s\S]*?\$\$/g, '').replace(/\s+/g, ' ').trim();
  if (cleaned.length <= rawLimit) return cleaned;
  let inFormula = false;
  for (let i = 0; i < cleaned.length; i++) {
    if (cleaned[i] === '$') inFormula = !inFormula;
    if (!inFormula && i >= rawLimit) return cleaned.slice(0, i).trimEnd() + '…';
  }
  return cleaned.slice(0, rawLimit).trimEnd() + '…';
}


/**
 * Эвристика определения типа задания по тексту.
 * Используется как резервный вариант, если LLM-анализ недоступен или вернул неверный результат.
 */
export function detectTaskTypeHeuristic(text: string): string {
  const t = text.toLowerCase();
  const markers = (t.match(/(?:^|\n)\s*[а-гa-d]\)\s/gim) ?? []).length;
  if (markers >= 3) return 'TEST';
  if (/(?:^|\n)(?:объясн|опиш|охарактериз|дайте?\s+определение|что\s+такое|почему|как\s+вы\s+думаете)/im.test(t)) return 'OPEN_QUESTION';
  if (/^(?:решите?|найдите?|вычислите?|упростите?|раскройте?\s+скобки|разложите?\s+на\s+множители|выполните?)\s+\S/im.test(t.trim())) return 'EXERCISE';
  return 'PROBLEM';
}


/** Обрезает тему до 1-2 коротких слов для плашки. */
export function shortenTopic(topic: string): string {
  const words = topic.trim().split(/\s+/);
  // Берём первые слова суммарной длиной ≤ 15 символов
  let result = '';
  for (const w of words) {
    const next = result ? result + ' ' + w : w;
    if (next.length > 15) break;
    result = next;
  }
  return result || words[0]?.slice(0, 15) || topic;
}
