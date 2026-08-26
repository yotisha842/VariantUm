/**
 * Редактор задания с поддержкой формул — точный порт из VariantUm/src/components/ui/TaskEditorField.jsx.
 * Текстовые сегменты: contentEditable span-ы.
 * Формулы: отображаются через KaTeX; редактируются через MathLive math-field с виртуальной клавиатурой.
 */
import { useState, useRef, useEffect } from "react";


export type OpenverseImage = {
  id: string;
  url: string;
  thumbnail: string;
  title: string;
  creator: string;
  license: string;
  foreign_landing_url: string;
};


export type OpenverseAttribution = {
  creator: string;
  license: string;
  source: string;
  title: string;
};


// ── OpenversePicker — пикер изображений из Openverse ─────────────────────────

export function OpenversePicker({ onSelect, onClose }: {
  onSelect: (img: OpenverseImage) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<OpenverseImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<OpenverseImage | null>(null);
  const [error, setError] = useState('');
  const [brokenThumbs, setBrokenThumbs] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  async function search() {
    if (!query.trim()) return;
    setLoading(true);
    setError('');
    setSelected(null);
    try {
      const res = await fetch(
        `https://api.openverse.org/v1/images/?q=${encodeURIComponent(query.trim())}&page_size=12&license_type=commercial,modification`
      );
      if (!res.ok) throw new Error('API error');
      const data = await res.json() as { results: OpenverseImage[] };
      setResults(data.results ?? []);
      if ((data.results ?? []).length === 0) setError('Ничего не найдено. Попробуйте другой запрос.');
    } catch {
      setError('Не удалось загрузить результаты. Проверьте подключение к интернету.');
    }
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
      <div ref={containerRef} className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden flex flex-col" style={{ maxHeight: '85vh' }}>
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
          <div>
            <h3 className="text-sm font-semibold text-gray-800">Поиск изображений в Openverse</h3>
            <p className="text-xs text-gray-400 mt-0.5">Бесплатные изображения с открытой лицензией</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 text-lg leading-none transition-colors"
          >
            ×
          </button>
        </div>

        <div className="px-5 py-3 border-b border-gray-100 flex gap-2 flex-shrink-0">
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') search(); }}
            placeholder="Введите запрос на русском или английском..."
            className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#0b8acb] focus:ring-1 focus:ring-[#0b8acb]/20"
          />
          <button
            type="button"
            onClick={search}
            disabled={loading || !query.trim()}
            className="px-4 py-1.5 text-sm bg-[#0b8acb] text-white rounded-lg hover:bg-[#029bf5] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Ищу...' : 'Искать'}
          </button>
        </div>

        <div className="px-5 py-4 overflow-y-auto flex-1 min-h-0">
          {error && !loading && (
            <p className="text-sm text-gray-400 text-center py-8">{error}</p>
          )}
          {loading && (
            <p className="text-sm text-gray-400 text-center py-8">Загружаю результаты...</p>
          )}
          {!loading && !error && results.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-8">Введите запрос для поиска изображений с открытой лицензией</p>
          )}
          {results.length > 0 && (
            <div className="grid grid-cols-4 gap-2">
              {results.map(img => {
                const thumbBroken = brokenThumbs.has(img.id);
                const thumbSrc = thumbBroken ? img.url : (img.thumbnail || img.url);
                return (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => setSelected(img)}
                    title={img.title}
                    className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all focus:outline-none ${
                      selected?.id === img.id
                        ? 'border-[#0b8acb] ring-2 ring-[#0b8acb]/30'
                        : 'border-transparent hover:border-gray-300'
                    }`}
                  >
                    {thumbSrc ? (
                      <img
                        src={thumbSrc}
                        alt={img.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        onError={() => {
                          if (!thumbBroken) {
                            setBrokenThumbs(prev => new Set(prev).add(img.id));
                          }
                        }}
                      />
                    ) : null}
                    {(thumbBroken && !img.url) || (!thumbSrc) ? (
                      <div className="absolute inset-0 bg-gray-100 flex flex-col items-center justify-center p-1 gap-1">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                        <span className="text-gray-400 text-center leading-tight" style={{ fontSize: '9px' }}>{img.title?.slice(0, 30)}</span>
                      </div>
                    ) : null}
                    {selected?.id === img.id && (
                      <div className="absolute inset-0 bg-[#0b8acb]/10 flex items-center justify-center">
                        <div className="w-6 h-6 rounded-full bg-[#0b8acb] flex items-center justify-center text-white text-xs font-bold">✓</div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between flex-shrink-0">
          <p className="text-xs text-gray-400">
            {selected ? (
              <>
                <span className="text-gray-600 font-medium">{selected.title || 'Изображение'}</span>
                {selected.creator && <> · {selected.creator}</>}
                {' · '}
                <span className="uppercase">{selected.license}</span>
              </>
            ) : (
              'Нажмите на изображение, чтобы выбрать'
            )}
          </p>
          <button
            type="button"
            onClick={() => selected && onSelect(selected)}
            disabled={!selected}
            className="px-4 py-1.5 text-sm font-semibold bg-[#22a139] text-white rounded-lg hover:bg-[#1e9231] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Выбрать
          </button>
        </div>
      </div>
    </div>
  );
}
