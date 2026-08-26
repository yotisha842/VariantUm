import { useState } from "react";
import { projectsApi } from "../../api/projects.api";
import type { ExportField, ExportLayout } from "../../types/api";
import { IcoCheck, IcoDownload, IcoX, Spinner } from './projectHelpers';


// ── Диалог экспорта (как Export.jsx) ──────────────────────────────────────────

const PRINT_FIELDS: { id: ExportField; label: string }[] = [
  { id: 'studentName', label: 'Ф.И.О. ученика' },
  { id: 'className', label: 'Класс' },
  { id: 'date', label: 'Дата' },
  { id: 'grade', label: 'Оценка' },
];


const FORMATS: { id: 'PDF' | 'DOCX'; enabled: boolean }[] = [
  { id: 'PDF', enabled: true },
  { id: 'DOCX', enabled: true },
];


const LAYOUTS: { label: string; value: ExportLayout }[] = [
  { label: 'По одному варианту на лист', value: 'ONE_PER_PAGE' },
  { label: 'Непрерывный список', value: 'CONTINUOUS' },
];


function CheckRow({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer group select-none" onClick={() => onChange(!checked)}>
      <span
        className={`w-[18px] h-[18px] rounded border flex-shrink-0 flex items-center justify-center transition-all ${
          checked ? 'bg-[#0b8acb] border-[#0b8acb]' : 'border-gray-300 bg-white group-hover:border-gray-400'
        }`}
      >
        {checked && (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <polyline points="2 5 4 7 8 3" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      <span className="text-sm text-gray-700">{label}</span>
    </label>
  );
}


export function ExportDialog({ projectId, defaultName, onClose }: { projectId: string; defaultName: string; onClose: () => void }) {
  const [fileName, setFileName] = useState(defaultName);
  const [format, setFormat] = useState<'PDF' | 'DOCX'>('PDF');
  const [layoutIdx, setLayoutIdx] = useState(0);
  const [includeAnswers, setIncludeAnswers] = useState(true);
  const [includeCriteria, setIncludeCriteria] = useState(false);
  const [showDifficulty, setShowDifficulty] = useState(false);
  const [includeKitName, setIncludeKitName] = useState(false);
  const [kitName, setKitName] = useState('');
  const [enabledFields, setEnabledFields] = useState<ExportField[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleField(id: ExportField) {
    setEnabledFields(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);
  }

  async function handleExport() {
    setLoading(true);
    setSuccess(false);
    setError(null);
    try {
      await projectsApi.exportFile(projectId, format.toLowerCase() as 'pdf' | 'docx', {
        includeFields: enabledFields,
        layout: LAYOUTS[layoutIdx].value,
        includeAnswers,
        includeCriteria,
        showDifficulty,
        kitName: includeKitName && kitName.trim() ? kitName.trim() : undefined,
      });
      setLoading(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3500);
    } catch {
      setLoading(false);
      setError('Не удалось сформировать файл. Попробуйте позже.');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[108px] pb-6 overflow-y-auto">
      {/* Затемнение */}
      <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />

      {/* Карточка модала */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 z-10 overflow-visible max-h-[calc(100vh-132px)] overflow-y-auto">
        {/* Шапка */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">Экспорт комплекта</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
          >
            <IcoX />
          </button>
        </div>

        {/* Тело */}
        <div className="px-6 py-5 space-y-5">
          {/* Название файла */}
          <div>
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-1.5">Название файла</p>
            <input
              type="text"
              value={fileName}
              onChange={e => setFileName(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 outline-none focus:border-[#0b8acb] focus:ring-2 focus:ring-[#0b8acb]/10 transition-all"
              placeholder="Введите название"
            />
          </div>

          {/* Формат */}
          <div>
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-1.5">Формат</p>
            <div className="flex gap-2">
              {FORMATS.map(f => (
                <button
                  key={f.id}
                  onClick={() => f.enabled && setFormat(f.id)}
                  disabled={!f.enabled}
                  title={f.enabled ? undefined : 'Формат пока недоступен'}
                  className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-all ${
                    !f.enabled
                      ? 'bg-gray-50 text-gray-300 border-gray-200 cursor-not-allowed'
                      : format === f.id
                        ? 'bg-[#0b8acb] text-white border-[#0b8acb]'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {f.id}
                </button>
              ))}
            </div>
          </div>

          {/* Поля для печати */}
          <div data-tour="export-header-fields">
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-1.5">Поля для печати</p>
            <div className="flex flex-wrap gap-2">
              {PRINT_FIELDS.map(field => {
                const active = enabledFields.includes(field.id);
                return (
                  <button
                    key={field.id}
                    onClick={() => toggleField(field.id)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                      active
                        ? 'bg-[#0b8acb]/10 text-[#0b8acb] border-[#0b8acb]/30'
                        : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {field.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Раскладка */}
          <div>
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-1.5">Раскладка</p>
            <div className="relative">
              <select
                value={layoutIdx}
                onChange={e => setLayoutIdx(Number(e.target.value))}
                className="w-full appearance-none px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 outline-none focus:border-[#0b8acb] focus:ring-2 focus:ring-[#0b8acb]/10 transition-all bg-white pr-9 cursor-pointer"
              >
                {LAYOUTS.map((l, i) => (
                  <option key={l.label} value={i}>{l.label}</option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </span>
            </div>
          </div>

          {/* Название комплекта */}
          <div className="space-y-2">
            <CheckRow checked={includeKitName} onChange={setIncludeKitName} label="Добавить название комплекта перед каждым вариантом" />
            {includeKitName && (
              <input
                type="text"
                value={kitName}
                onChange={e => setKitName(e.target.value)}
                placeholder="Например: Контрольная работа по русскому языку"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 outline-none focus:border-[#0b8acb] focus:ring-2 focus:ring-[#0b8acb]/10 transition-all"
              />
            )}
          </div>

          {/* Чекбоксы */}
          <div className="space-y-3 pt-1">
            <CheckRow checked={includeAnswers} onChange={setIncludeAnswers} label="Добавить раздел с ответами (для учителя)" />
            <CheckRow checked={includeCriteria} onChange={setIncludeCriteria} label="Добавить критерии оценивания" />
            <CheckRow checked={showDifficulty} onChange={setShowDifficulty} label="Показывать уровень сложности у каждого варианта" />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}
        </div>

        {/* Футер */}
        <div className="px-6 pb-5 pt-1 flex gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all"
          >
            Отмена
          </button>
          <button
            data-tour="export-download-btn"
            onClick={handleExport}
            disabled={loading}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              loading
                ? 'bg-[#0b8acb]/60 text-white cursor-not-allowed'
                : success
                  ? 'bg-[#22a139] text-white'
                  : 'bg-[#0b8acb] hover:bg-[#029bf5] text-white shadow-sm'
            }`}
          >
            {loading ? (
              <><Spinner /> Генерируется...</>
            ) : success ? (
              <><IcoCheck /> Готово!</>
            ) : (
              <><IcoDownload /> Скачать {format}</>
            )}
          </button>
        </div>

        {/* Тост */}
        {success && (
          <div className="absolute -bottom-14 left-1/2 -translate-x-1/2 flex items-center gap-2.5 px-5 py-3 bg-[#22a139] text-white text-sm font-semibold rounded-2xl shadow-lg whitespace-nowrap animate-fade-slide-up">
            <IcoCheck />
            {format}-файл готов — скачивание начнётся автоматически
          </div>
        )}
      </div>
    </div>
  );
}
