import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { projectsApi } from "../api/projects.api";
import { useAuthStore } from "../store/authStore";
import { authApi } from "../api/auth.api";
import type { Subject, TaskType } from "../types/api";
import { useTour } from "../context/TourContext";
import { buildTourFromPage } from "../tour/paths/choicePath";
import { LimitsBadge } from "../components/LimitsBadge";
import { getTopics } from '../features/generator/topics';


const LP = "'Littera Plain', sans-serif";


// ── Данные ────────────────────────────────────────────────────────────────────

const SUBJECT_LABELS = [
  'Математика', 'Русский язык', 'Физика', 'Химия', 'История',
  'География', 'Английский язык', 'Информатика', 'Литература',
  'Биология', 'Обществознание', 'Другое',
];


export const SUBJECT_VALUES: Record<string, Subject> = {
  'Математика': 'math', 'Русский язык': 'russian', 'Физика': 'physics',
  'Химия': 'chemistry', 'История': 'history', 'География': 'geography',
  'Английский язык': 'english', 'Информатика': 'informatics',
  'Литература': 'literature', 'Биология': 'biology',
  'Обществознание': 'social_studies', 'Другое': 'other',
};


const GRADES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];


const TASK_FORMATS: { id: TaskType; label: string; desc: string }[] = [
  { id: 'PROBLEM',       label: 'Задача',          desc: 'вопрос → решение → ответ' },
  { id: 'TEST',          label: 'Тест',            desc: 'вопрос + варианты ответа А)Б)В)Г)' },
  { id: 'EXERCISE',      label: 'Упражнение',      desc: 'инструкция + пример + задание' },
  { id: 'OPEN_QUESTION', label: 'Открытый вопрос', desc: 'развёрнутый ответ' },
  { id: 'MIXED',         label: 'Смешанный',       desc: 'разные форматы в одном варианте' },
];


const DIFFICULTIES = [
  { id: 1, label: 'Базовый',     desc: 'простые задания' },
  { id: 3, label: 'Средний',     desc: 'стандартная сложность' },
  { id: 5, label: 'Продвинутый', desc: 'углублённые задания' },
];


// ── Иконки ────────────────────────────────────────────────────────────────────

function IcoChevron({ open }: { open: boolean }) {
  return (
    <svg
      width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}


function IcoSparkle() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}


// ── Stepper ──────────────────────────────────────────────────────────────────

function Stepper({ value, onChange, min, max }: { value: number; onChange: (v: number) => void; min: number; max: number }) {
  return (
    <div>
      <div className="flex items-center gap-3">
        <button
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          className="w-9 h-9 rounded-xl border border-gray-300 bg-white text-gray-600 font-bold text-lg flex items-center justify-center hover:border-gray-400 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          −
        </button>
        <span className="text-2xl font-bold text-gray-800 w-8 text-center">{value}</span>
        <button
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          className="w-9 h-9 rounded-xl border border-gray-300 bg-white text-gray-600 font-bold text-lg flex items-center justify-center hover:border-gray-400 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          +
        </button>
      </div>
      <p className="text-xs text-gray-400 mt-1">от {min} до {max}</p>
    </div>
  );
}


// ── Хелперы аватара ──────────────────────────────────────────────────────────
const AVATAR_COLORS = ['#21a038', '#0b8acb', '#30b0ba', '#95c949'];

function avatarBg(name = '') {
  const code = (name.charCodeAt(0) || 0) + (name.charCodeAt(1) || 0);
  return AVATAR_COLORS[code % AVATAR_COLORS.length];
}

function getInitial(fullName: string) {
  return fullName?.trim()?.[0]?.toUpperCase() ?? '?';
}


// ── Иконки мобильной шапки ────────────────────────────────────────────────────
function MobHomeIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9L12 2L21 9V21H15V15H9V21H3V9Z" />
    </svg>
  );
}

function MobBookIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}

function MobQuestionIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" strokeWidth="2.5" />
    </svg>
  );
}


// ── Страница ─────────────────────────────────────────────────────────────────

export function FromCriteriaPage() {
  const navigate = useNavigate();
  const { user, clear } = useAuthStore();
  const { startTour, tourActive, currentStep, steps } = useTour();

  // Мобильная шапка
  const [isMobile, setIsMobile] = useState(() => (window.visualViewport?.width ?? window.innerWidth) < 768);
  const [hamburgerOpen, setHamburgerOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const upd = () => setIsMobile((window.visualViewport?.width ?? window.innerWidth) < 768);
    window.addEventListener('resize', upd);
    window.visualViewport?.addEventListener('resize', upd);
    return () => {
      window.removeEventListener('resize', upd);
      window.visualViewport?.removeEventListener('resize', upd);
    };
  }, []);

  useEffect(() => {
    const onOut = (e: Event) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onOut);
    return () => document.removeEventListener('mousedown', onOut);
  }, []);

  async function handleLogout() {
    setMenuOpen(false);
    try { await authApi.logout(); } catch { /* ignore */ }
    clear();
    navigate('/login');
  }

  function handleStartTour() {
    setHamburgerOpen(false);
    const { steps: tourSteps, phaseIndex, startStep } = buildTourFromPage('generate');
    startTour('generate', tourSteps, phaseIndex, startStep);
  }

  // Основные параметры
  const [subject, setSubject] = useState<string | null>(null);
  const [customSubject, setCustomSubject] = useState('');
  const [grade, setGrade] = useState<number | null>(null);
  const [topic, setTopic] = useState('');
  const [variantCount, setVariantCount] = useState(4);
  const [taskCount, setTaskCount] = useState(5);

  // Автодополнение тем
  const [topicFocused, setTopicFocused] = useState(false);
  const topicInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Расширенные параметры
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [format, setFormat] = useState<TaskType>('PROBLEM');
  const [difficulty, setDifficulty] = useState(3);
  const [comment, setComment] = useState('');

  const [errorMessage, setErrorMessage] = useState<string | null>(null);


  useEffect(() => {
    const activeTourId = steps[currentStep]?.tourId;
    if (activeTourId === 'generate-format-difficulty' || activeTourId === 'generate-comment') {
      setAdvancedOpen(true);
    }
  }, [tourActive, currentStep, steps]);

  const isOther = subject === 'Другое';
  const canGenerate = !!subject && !!grade && topic.trim().length > 0
    && (!isOther || customSubject.trim().length > 0);

  const effectiveCustomPrompt = [
    isOther && customSubject.trim() ? `Предмет: ${customSubject.trim()}.` : '',
    comment,
  ].filter(Boolean).join(' ') || undefined;

  // Темы для текущего предмета и класса, с фильтрацией по введённому тексту
  const allTopics = getTopics(subject, grade);
  const filteredTopics = topic.trim()
    ? allTopics.filter(t => t.toLowerCase().includes(topic.toLowerCase()))
    : allTopics;
  const showDropdown = topicFocused && (subject !== null) && (grade !== null) && filteredTopics.length > 0;

  // Закрываем дропдаун при клике вне
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        topicInputRef.current && !topicInputRef.current.contains(e.target as Node) &&
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node)
      ) {
        setTopicFocused(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const mutation = useMutation({
    mutationFn: () =>
      projectsApi.create({
        mode: 'FROM_CRITERIA',
        criteria: {
          subject: subject ? SUBJECT_VALUES[subject] : 'other',
          grade: grade ?? 9,
          topic: topic.trim(),
          taskType: format,
          tasksPerVariant: taskCount,
          targetTimeMinutes: taskCount * 8,
          difficulty,
        },
        params: {
          variantsCount: variantCount,
          difficultyGradation: 'EQUAL',
          customPrompt: effectiveCustomPrompt,
        },
      }),
    onSuccess: (project) => navigate(`/projects/${project.projectId}`),
    onError: () => setErrorMessage('Ошибка генерации. Попробуйте позже.'),
  });

  function handleGenerate() {
    if (!canGenerate || mutation.isPending) return;
    setErrorMessage(null);
    mutation.mutate();
  }

  return (
    <div>
      {/* ── Мобильная шапка ── */}
      {isMobile && (
        <>
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, height: '60px',
            background: '#fff', borderBottom: '1px solid #e5e7eb',
            display: 'flex', alignItems: 'center', padding: '0 16px',
            justifyContent: 'space-between', zIndex: 50,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                onClick={() => setHamburgerOpen(v => !v)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', flexDirection: 'column', gap: '5px' }}
                aria-label="Меню"
              >
                <span style={{ display: 'block', width: '22px', height: '2.5px', background: '#21a038', borderRadius: '2px' }} />
                <span style={{ display: 'block', width: '22px', height: '2.5px', background: '#21a038', borderRadius: '2px' }} />
                <span style={{ display: 'block', width: '22px', height: '2.5px', background: '#21a038', borderRadius: '2px' }} />
              </button>
              <img src="/logo.png" alt="ВариантУм" style={{ height: '30px', objectFit: 'contain' }} />
            </div>

            <div ref={menuRef} style={{ position: 'relative' }}>
              {user && (
                <>
                  <button
                    onClick={() => setMenuOpen(v => !v)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px',
                    }}
                  >
                    <div style={{
                      width: '32px', height: '32px', borderRadius: '50%',
                      background: avatarBg(user.fullName),
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <span style={{ fontFamily: LP, fontWeight: 400, fontSize: '14px', color: '#fff', lineHeight: 1 }}>
                        {getInitial(user.fullName)}
                      </span>
                    </div>
                    <span style={{ fontFamily: LP, fontSize: '16px', color: '#000', maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {user.fullName.split(' ')[0]}
                    </span>
                    <svg width="11" height="7" viewBox="0 0 12 7" fill="none" style={{ transition: 'transform .2s', transform: menuOpen ? 'rotate(180deg)' : 'none' }}>
                      <path d="M1 1L6 6L11 1" stroke="#333" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>

                  {menuOpen && (
                    <div style={{
                      position: 'absolute', right: 0, top: 'calc(100% + 4px)',
                      background: '#fff', border: '1px solid #e0e0e0',
                      borderRadius: '12px', boxShadow: '0 4px 16px rgba(0,0,0,.15)',
                      minWidth: '180px', zIndex: 100, overflow: 'hidden',
                    }}>
                      <div style={{ padding: '10px 14px', borderBottom: '1px solid #f0f0f0' }}>
                        <p style={{ fontFamily: LP, fontWeight: 700, fontSize: '14px', margin: 0, color: '#000' }}>{user.fullName}</p>
                        <p style={{ fontFamily: LP, fontSize: '12px', margin: '2px 0 0', color: '#888' }}>{user.email}</p>
                      </div>
                      <button onClick={handleLogout} style={{
                        width: '100%', padding: '10px 14px', background: 'none', border: 'none',
                        cursor: 'pointer', fontFamily: LP, fontSize: '14px', color: '#e53e3e', textAlign: 'left',
                      }}>
                        Выйти
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* ── Гамбургер-меню (drawer) ── */}
          {hamburgerOpen && (
            <>
              <div
                onClick={() => setHamburgerOpen(false)}
                style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.32)', zIndex: 200 }}
              />
              <div style={{
                position: 'fixed', left: 0, top: 0, bottom: 0,
                width: '62%', maxWidth: '280px',
                background: '#fff', zIndex: 201,
                display: 'flex', flexDirection: 'column',
              }}>
                <div style={{
                  height: '60px', display: 'flex', alignItems: 'center',
                  padding: '0 16px', borderBottom: '1px solid #e5e7eb', gap: '10px',
                }}>
                  <button
                    onClick={() => setHamburgerOpen(false)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', flexDirection: 'column', gap: '5px', flexShrink: 0 }}
                    aria-label="Закрыть меню"
                  >
                    <span style={{ display: 'block', width: '22px', height: '2.5px', background: '#21a038', borderRadius: '2px' }} />
                    <span style={{ display: 'block', width: '22px', height: '2.5px', background: '#21a038', borderRadius: '2px' }} />
                    <span style={{ display: 'block', width: '22px', height: '2.5px', background: '#21a038', borderRadius: '2px' }} />
                  </button>
                  <img src="/logo.png" alt="ВариантУм" style={{ height: '30px', objectFit: 'contain' }} />
                </div>
                <nav style={{ flex: 1, overflowY: 'auto' }}>
                  {[
                    { icon: <MobHomeIcon />, label: 'Главная страница', action: () => { setHamburgerOpen(false); navigate('/'); } },
                    { icon: <MobBookIcon />, label: 'Моя библиотека', action: () => { setHamburgerOpen(false); navigate('/library'); } },
                    { icon: <MobQuestionIcon />, label: 'Инструкция', action: handleStartTour },
                  ].map(({ icon, label, action }) => (
                    <button
                      key={label}
                      onClick={action}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: '16px',
                        padding: '18px 20px', background: 'none', border: 'none',
                        borderBottom: '1px solid #f0f0f0', cursor: 'pointer', textAlign: 'left',
                      }}
                    >
                      {icon}
                      <span style={{ fontFamily: LP, fontSize: '17px', color: '#000' }}>{label}</span>
                    </button>
                  ))}
                  {user && (
                    <div style={{ padding: '14px 20px', borderBottom: '1px solid #f0f0f0' }}>
                      <LimitsBadge scale={1} inlineExpand />
                    </div>
                  )}
                </nav>
              </div>
            </>
          )}
        </>
      )}

    <main className="max-w-2xl mx-auto px-6 py-8" style={{ paddingTop: isMobile ? '76px' : undefined }}>
      {/* Назад */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-5 transition-colors"
      >
        ← Назад
      </button>

      {/* Заголовок */}
      <h1 className="text-2xl font-bold text-gray-800 mb-1">Создать по критериям</h1>
      <p className="text-sm text-gray-500 mb-2">Укажите параметры — ИИ сгенерирует задания с нуля</p>
      <p style={{ fontFamily: LP, fontWeight: 400, fontSize: '16px', color: '#21A038', marginBottom: '24px' }}>
        Сервис поддерживает создание графиков и таблиц.<br />
        Генерация изображений временно недоступна, однако вы можете загрузить собственный рисунок на странице редактора.
      </p>

      {/* ── Основные параметры ─────────────────────────────────────────── */}
      <div data-tour="generate-main-params" className="bg-gray-50 border border-[#21A038] rounded-2xl p-5 mb-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Основные параметры</h2>

        {/* Предмет */}
        <div data-tour="generate-subject" className="mb-4">
          <p className="text-sm text-gray-600 mb-2">Предмет</p>
          <div className="flex flex-wrap gap-2">
            {SUBJECT_LABELS.map(s => (
              <button
                key={s}
                onClick={() => {
                  setSubject(subject === s ? null : s);
                  if (s !== 'Другое') setCustomSubject('');
                  // Сбрасываем тему при смене предмета
                  setTopic('');
                }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                  subject === s
                    ? 'bg-[#22A139] text-white border-[#22A139]'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-[#22A139] hover:text-[#22A139]'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          {subject === 'Другое' && (
            <div className="mt-3">
              <input
                type="text"
                value={customSubject}
                onChange={e => setCustomSubject(e.target.value)}
                placeholder="Укажите предмет, например: Экономика, Право, ОБЖ…"
                className="w-full px-3 py-2.5 border border-[#22A139] rounded-lg text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#22A139]/20 transition-colors bg-white"
                autoFocus
              />
            </div>
          )}
        </div>

        {/* Класс */}
        <div data-tour="generate-class" className="mb-4">
          <p className="text-sm text-gray-600 mb-2">Класс</p>
          <div className="flex flex-wrap gap-2">
            {GRADES.map(g => (
              <button
                key={g}
                onClick={() => {
                  setGrade(grade === g ? null : g);
                  setTopic(''); // Сбрасываем тему при смене класса
                }}
                className={`w-9 h-9 rounded-lg text-sm font-medium border transition-colors ${
                  grade === g
                    ? 'bg-[#22A139] text-white border-[#22A139]'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-[#22A139] hover:text-[#22A139]'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* Тема — с автодополнением */}
        <div data-tour="generate-topic" className="mb-5">
          <p className="text-sm text-gray-600 mb-2">Тема</p>
          <div className="relative">
            <input
              ref={topicInputRef}
              type="text"
              value={topic}
              onChange={e => setTopic(e.target.value)}
              onFocus={() => setTopicFocused(true)}
              placeholder={
                subject && grade
                  ? 'Начните вводить или выберите из списка ↓'
                  : 'Сначала выберите предмет и класс'
              }
              className={`w-full py-2.5 border border-gray-200 rounded-lg text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:border-[#22A139] transition-colors bg-white ${topic ? 'pl-3 pr-8' : 'px-3'}`}
            />
            {topic && (
              <button
                type="button"
                onMouseDown={e => {
                  e.preventDefault();
                  setTopic('');
                  setTopicFocused(false);
                  topicInputRef.current?.focus();
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-0.5"
                aria-label="Очистить тему"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
              </button>
            )}

            {/* Дропдаун с темами */}
            {showDropdown && (
              <div
                ref={dropdownRef}
                className="absolute z-30 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-64 overflow-y-auto"
              >
                {filteredTopics.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-gray-400">Темы не найдены</div>
                ) : (
                  filteredTopics.map(t => (
                    <button
                      key={t}
                      type="button"
                      onMouseDown={e => {
                        // Используем mousedown вместо click, чтобы не потерять фокус раньше
                        e.preventDefault();
                        setTopic(t);
                        setTopicFocused(false);
                        topicInputRef.current?.blur();
                      }}
                      className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-b-0 ${
                        topic === t ? 'text-[#22A139] font-medium bg-[#22A139]/5' : 'text-gray-700'
                      }`}
                    >
                      {t}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Подсказка под полем */}
          {subject && grade && allTopics.length > 0 && !showDropdown && !topic && (
            <p className="text-[11px] text-gray-400 mt-1.5">
              {allTopics.length} тем для {subject.toLowerCase()} {grade} класса — кликните в поле
            </p>
          )}
        </div>

        {/* Количество */}
        <div className="flex flex-col gap-5">
          <div>
            <p className="text-sm text-gray-600 mb-3">Количество вариантов</p>
            <Stepper value={variantCount} onChange={setVariantCount} min={2} max={10} />
          </div>
          <div data-tour="generate-task-count">
            <p className="text-sm text-gray-600 mb-3">Количество заданий в варианте</p>
            <Stepper value={taskCount} onChange={setTaskCount} min={1} max={10} />
          </div>
        </div>
      </div>

      {/* ── Дополнительные параметры (раскрываются) ────────────────────── */}
      <div className="border border-[#21A038] rounded-2xl overflow-hidden mb-6">
        <button
          data-tour="generate-params-link"
          onClick={() => setAdvancedOpen(o => !o)}
          className="w-full flex items-center justify-between px-5 py-4 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <span className="font-medium text-gray-700">Дополнительные параметры</span>
          <div className="flex items-center gap-2 text-gray-400">
            {!advancedOpen && (
              <span className="text-xs">
                {TASK_FORMATS.find(f => f.id === format)?.label} · {DIFFICULTIES.find(d => d.id === difficulty)?.label}
              </span>
            )}
            <IcoChevron open={advancedOpen} />
          </div>
        </button>

        {advancedOpen && (
          <div className="px-5 pb-5 border-t border-gray-100">
            {/* Формат задания + Сложность */}
            <div data-tour="generate-format-difficulty">
            <div className="mb-4 pt-4">
              <p className="text-sm text-gray-600 mb-2">Формат задания</p>
              <div className="flex flex-col gap-1.5">
                {TASK_FORMATS.map(f => (
                  <button
                    key={f.id}
                    onClick={() => setFormat(f.id)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border text-sm transition-colors bg-white ${
                      format === f.id
                        ? 'border-[#22A139] shadow-sm'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                      format === f.id ? 'border-[#22A139]' : 'border-gray-300'
                    }`}>
                      {format === f.id && <span className="w-2 h-2 rounded-full bg-[#22A139]" />}
                    </span>
                    <span className={`font-medium w-36 text-left ${format === f.id ? 'text-[#22A139]' : 'text-gray-700'}`}>
                      {f.label}
                    </span>
                    <span className="text-gray-400 text-xs">{f.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Сложность */}
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">Уровень сложности</p>
              <div className="grid grid-cols-3 gap-3">
                {DIFFICULTIES.map(d => (
                  <button
                    key={d.id}
                    onClick={() => setDifficulty(d.id)}
                    className={`flex flex-col items-start p-3 rounded-xl border bg-white transition-colors ${
                      difficulty === d.id
                        ? 'border-[#22A139] shadow-sm'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className={`w-4 h-4 rounded border-2 mb-2 flex items-center justify-center flex-shrink-0 ${
                      difficulty === d.id ? 'bg-[#22A139] border-[#22A139]' : 'border-gray-300'
                    }`}>
                      {difficulty === d.id && (
                        <svg viewBox="0 0 12 12" fill="none" className="w-2.5 h-2.5">
                          <polyline points="2 6 5 9 10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </span>
                    <span className={`text-sm font-medium ${difficulty === d.id ? 'text-[#22A139]' : 'text-gray-700'}`}>
                      {d.label}
                    </span>
                    <span className="text-xs text-gray-400 mt-0.5 text-left leading-tight">{d.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            </div>{/* /generate-format-difficulty */}

            {/* Комментарий */}
            <div data-tour="generate-comment">
              <p className="text-sm text-gray-600 mb-2">Комментарий для ИИ</p>
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="Любые пожелания: акцент на конкретные навыки, исключение тем, стиль подачи и т.д."
                rows={3}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:border-[#22A139] transition-colors resize-none bg-white"
              />
            </div>{/* /generate-comment */}
          </div>
        )}
      </div>

      {errorMessage && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm mb-4">
          {errorMessage}
        </div>
      )}

      {/* Кнопка генерации */}
      <button
        data-tour="generate-next-btn"
        onClick={handleGenerate}
        disabled={!canGenerate || mutation.isPending}
        className={`w-full flex items-center justify-center gap-2 py-3.5 font-semibold text-sm rounded-xl transition-colors ${
          canGenerate && !mutation.isPending
            ? 'bg-[#22a139] hover:bg-[#1a8a30] text-white'
            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
        }`}
      >
        <IcoSparkle />
        {mutation.isPending ? 'Генерирую...' : 'Сгенерировать задания'}
      </button>

      {!canGenerate && (
        <p className="text-xs text-gray-400 text-center mt-2">
          Укажите предмет, класс и тему, чтобы продолжить
        </p>
      )}
      {mutation.isPending && (
        <div className="flex flex-col items-center gap-2 mt-3">
          <div className="flex gap-1.5">
            <span className="w-2 h-2 bg-[#0b8acb] rounded-full animate-bounce [animation-delay:-0.3s]" />
            <span className="w-2 h-2 bg-[#0b8acb] rounded-full animate-bounce [animation-delay:-0.15s]" />
            <span className="w-2 h-2 bg-[#0b8acb] rounded-full animate-bounce" />
          </div>
          <p className="text-sm text-gray-400">
            GigaChat генерирует задания — это займёт 10–30 секунд...
          </p>
        </div>
      )}
    </main>
    </div>
  );
}
