import { useState, useRef, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useTour } from "../context/TourContext";
import { buildTourFromPage } from "../tour/paths/choicePath";
import { TOUR_MOCK_PROJECT } from "../tour/tourMockData";
import { projectsApi } from "../api/projects.api";
import { useAuthStore } from "../store/authStore";
import { useLimitsStore } from "../store/limitsStore";
import { authApi } from "../api/auth.api";
import { LimitsBadge } from "../components/LimitsBadge";
import { HistoryPanel } from "../components/HistoryPanel";
import { FormExportDialog } from "../features/exporter/FormExportDialog";
import { LP, avatarBg, getInitial, MobHomeIcon, MobBookIcon, MobQuestionIcon, IcoBack, IcoPlus, IcoExport, IcoFile, IcoAI, IcoDiff, IcoOrigFile, IcoRescan, variantsLabel, SUBJECT_LABELS, TASK_TYPE_LABELS } from '../features/editor/projectHelpers';
import { PromptModal, VariantCard, OriginalTask } from '../features/editor/ProjectVariantCards';
import { ExportDialog } from '../features/editor/ProjectExportDialog';


// ── Страница ──────────────────────────────────────────────────────────────────

export function ProjectEditorPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { tourActive, steps, currentStep, startTour } = useTour();
  const { user, clear } = useAuthStore();
  const refreshLimits = useLimitsStore(s => s.refresh);

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
    const { steps: tourSteps, phaseIndex, startStep } = buildTourFromPage('project');
    startTour('project', tourSteps, phaseIndex, startStep);
  }

  const [isOriginalOpen, setIsOriginalOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [aiAllOpen, setAiAllOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showDiff, setShowDiff] = useState(false);
  const [fileDownloading, setFileDownloading] = useState(false);
  const [fileViewing, setFileViewing] = useState(false);

  const reparseRef = useMutation({
    mutationFn: () => projectsApi.reparseReference(projectId!),
    onMutate: () => { setBusy(true); setErrorMsg(null); },
    onSuccess: u => { queryClient.setQueryData(['project', projectId], u); setBusy(false); },
    onError: () => showError('Не удалось распознать файл повторно. Возможно, файл недоступен или сервис занят — попробуйте позже.'),
  });

  // Авто-открываем модал экспорта, когда тур на него указывает
  useEffect(() => {
    if (!tourActive || !steps.length || currentStep >= steps.length) return;
    if (steps[currentStep]?.openExportModal) {
      setExportOpen(true);
    }
  }, [tourActive, currentStep, steps]);

  // Авто-открываем/закрываем модал онлайн-формы во время тура
  useEffect(() => {
    if (!tourActive || !steps.length || currentStep >= steps.length) return;
    const step = steps[currentStep];
    if (step?.openFormModal) {
      setFormOpen(true);
    } else if (step?.tourId && !step.tourId.startsWith('form-')) {
      setFormOpen(false);
    }
  }, [tourActive, currentStep, steps]);

  const isTourMode = !projectId;

  const { data: project, isLoading, isError } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectsApi.get(projectId!),
    enabled: !!projectId,
    refetchInterval: q => (q.state.data?.status === 'GENERATING' ? 3000 : false),
  });

  // В тур-моде используем мок-проект вместо API
  const effectiveProject = isTourMode ? TOUR_MOCK_PROJECT : project;

  const showError = (msg: string) => { setErrorMsg(msg); setBusy(false); };

  const retryGeneration = useMutation({
    mutationFn: () => projectsApi.retryGeneration(projectId!),
    onMutate: () => { setBusy(true); setErrorMsg(null); },
    onSuccess: u => { queryClient.setQueryData(['project', projectId], u); setBusy(false); refreshLimits(); },
    onError: () => { setBusy(false); showError('GigaChat не смог сгенерировать задания. Попробуйте ещё раз или уменьшите число вариантов.'); },
  });

  const aiEditAll = useMutation({
    mutationFn: (prompt: string) => projectsApi.aiEditAll(projectId!, { prompt }),
    onMutate: () => { setBusy(true); setErrorMsg(null); },
    onSuccess: u => { queryClient.setQueryData(['project', projectId], u); setBusy(false); setAiAllOpen(false); refreshLimits(); },
    onError: () => showError('GigaChat не смог применить правку ко всему комплекту. Попробуйте уменьшить запрос или правьте варианты по одному.'),
  });

  const addVariant = useMutation({
    mutationFn: () => projectsApi.addVariant(projectId!),
    onMutate: () => { setBusy(true); setErrorMsg(null); },
    onSuccess: u => { queryClient.setQueryData(['project', projectId], u); setBusy(false); refreshLimits(); },
    onError: () => showError('Не удалось добавить вариант. Попробуйте ещё раз.'),
  });

  const updateRefText = useMutation({
    mutationFn: (text: string) => projectsApi.updateReferenceText(projectId!, text),
    onMutate: () => { setBusy(true); setErrorMsg(null); },
    onSuccess: u => { queryClient.setQueryData(['project', projectId], u); setBusy(false); },
    onError: () => showError('Не удалось сохранить эталонный текст. Проверьте соединение.'),
  });

  if (!isTourMode && isLoading) {
    return (
      <main className="max-w-5xl mx-auto px-6 py-8 text-center text-gray-400">
        Загрузка проекта...
      </main>
    );
  }

  if (!isTourMode && (isError || !project)) {
    return (
      <main className="max-w-5xl mx-auto px-6 py-8 text-center">
        <p className="text-red-500 mb-4">Не удалось загрузить проект</p>
        <Link to="/library" className="px-5 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl text-sm font-semibold transition-colors">
          В библиотеку
        </Link>
      </main>
    );
  }

  const subjectLabel = effectiveProject!.subject ? (SUBJECT_LABELS[effectiveProject!.subject] ?? effectiveProject!.subject) : null;

  // Короткая тема для плашки на карточках вариантов
  const topicShort = effectiveProject!.topic ? effectiveProject!.topic.trim().split(/\s+/).slice(0, 2).join(' ') : null;

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
              <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex' }}>
                <img src="/logo.png" alt="ВариантУм" style={{ height: '30px', objectFit: 'contain' }} />
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {user && <LimitsBadge scale={0.9} />}
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
                  <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex' }}>
                    <img src="/logo.png" alt="ВариантУм" style={{ height: '30px', objectFit: 'contain' }} />
                  </button>
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

    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8" style={{ paddingTop: isMobile ? '76px' : undefined }}>
      {/* Хлебная крошка */}
      <Link
        to="/library"
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors"
      >
        <IcoBack /> В библиотеку
      </Link>

      {/* Заголовок */}
      <div className="flex flex-col gap-2 mb-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Сравнение вариантов</h1>
          <p className="text-sm text-gray-400 mt-1">Проверьте комплект вариантов</p>
        </div>
        {effectiveProject!.status === 'READY' && effectiveProject!.variants.length > 0 && (
          <div className="flex gap-2 flex-shrink-0 self-start sm:mt-1">
            <button
              data-tour="compare-export-btn"
              onClick={() => setExportOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#22a139] hover:bg-[#1a8a30] text-white rounded-xl text-sm font-semibold transition-all"
            >
              <IcoExport /> Экспорт
            </button>
            <button
              data-tour={tourActive ? 'compare-online-form' : undefined}
              onClick={() => { if (!tourActive) setFormOpen(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-[#0b8acb] hover:bg-[#029bf5] text-white rounded-xl text-sm font-semibold transition-all"
              title="Создать онлайн-форму для сдачи работы учениками"
            >
              🔗 Онлайн-форма
            </button>
          </div>
        )}
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 mt-4 sm:mt-5 mb-4 sm:mb-5">
        <div className="border border-gray-200 rounded-2xl px-3 sm:px-5 py-3 sm:py-4">
          <p className="text-sm sm:text-2xl font-bold text-gray-800 truncate">{subjectLabel ?? '—'}</p>
          <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5">{effectiveProject!.grade ? `${effectiveProject!.grade} класс` : 'класс не указан'}</p>
        </div>
        <div className="border border-gray-200 rounded-2xl px-3 sm:px-5 py-3 sm:py-4">
          <p className="text-sm sm:text-2xl font-bold text-gray-800">{effectiveProject!.variants.length} {variantsLabel(effectiveProject!.variants.length)}</p>
          <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5">в комплекте</p>
        </div>
        <div className="border border-gray-200 rounded-2xl px-3 sm:px-5 py-3 sm:py-4">
          <p className="text-sm sm:text-2xl font-bold text-gray-800 truncate">{TASK_TYPE_LABELS[effectiveProject!.variants[0]?.tasks[0]?.taskType ?? ''] ?? '—'}</p>
          <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5">тип заданий</p>
        </div>
      </div>

      {/* Ошибка операции */}
      {errorMsg && (
        <div className="mb-4 rounded-xl px-4 py-3 text-sm flex items-start gap-2 border bg-red-50 text-red-700 border-red-200">
          <span>⚠️</span>
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="ml-auto text-red-400 hover:text-red-600 font-bold">×</button>
        </div>
      )}

      {/* Состояние генерации */}
      {effectiveProject!.status === 'GENERATING' && (
        <div className="text-center py-16 text-gray-500">
          <div className="text-4xl mb-3">⏳</div>
          <p>GigaChat генерирует задания...</p>
          <p className="text-sm text-gray-400 mt-1">Страница обновляется автоматически</p>
        </div>
      )}

      {/* Состояние ошибки генерации */}
      {effectiveProject!.status === 'FAILED' && (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">❌</div>
          <p className="text-red-600 font-semibold mb-1">Ошибка при генерации</p>
          <p className="text-gray-500 text-sm mb-5">
            GigaChat не смог сгенерировать задания. Попробуйте ещё раз или уменьшите число вариантов.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            {projectId && (
              <button
                onClick={() => retryGeneration.mutate()}
                disabled={retryGeneration.isPending}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#22a139] hover:bg-[#1a8a30] disabled:opacity-60 text-white rounded-xl text-sm font-semibold transition-colors"
              >
                {retryGeneration.isPending ? (
                  <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Генерирую...</>
                ) : 'Попробовать снова'}
              </button>
            )}
            <Link
              to={effectiveProject!.mode === 'FROM_REFERENCE' ? '/upload' : '/generate'}
              className="inline-block px-5 py-2.5 border border-gray-300 hover:bg-gray-50 text-gray-600 rounded-xl text-sm font-semibold transition-colors"
            >
              Создать новый
            </Link>
          </div>
        </div>
      )}

      {/* Готовые варианты */}
      {effectiveProject!.status === 'READY' && effectiveProject!.variants.length > 0 && (
        <>
          {/* Панель действий */}
          <div className="flex items-center gap-2 sm:gap-3 mb-4 flex-wrap">
            <button
              onClick={() => addVariant.mutate()}
              disabled={busy}
              className="flex items-center gap-1.5 px-4 py-2 border border-gray-300 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 hover:border-gray-400 transition-all disabled:opacity-60"
            >
              <IcoPlus /> {addVariant.isPending ? 'Добавляю...' : 'Добавить вариант'}
            </button>
            <button
              onClick={() => setAiAllOpen(true)}
              disabled={busy}
              className="flex items-center gap-1.5 px-4 py-2 border border-gray-300 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 hover:border-gray-400 transition-all disabled:opacity-60"
            >
              <IcoAI /> Править все варианты промптом
            </button>
            {/* Переключатель подсветки различий */}
            <button
              onClick={() => setShowDiff(v => !v)}
              title={showDiff ? 'Отключить подсветку различий' : 'Показать различия между вариантами'}
              className={`flex items-center gap-1.5 px-4 py-2 border rounded-xl text-sm font-semibold transition-all ${
                showDiff
                  ? 'bg-yellow-50 border-yellow-300 text-yellow-700 hover:bg-yellow-100'
                  : 'border-gray-300 text-gray-600 hover:bg-gray-50 hover:border-gray-400'
              }`}
            >
              <IcoDiff />
              {showDiff ? 'Различия вкл.' : 'Различия'}
            </button>
            {/* История версий с откатом */}
            {!isTourMode && (
              <button
                onClick={() => setHistoryOpen(true)}
                title="История изменений и откат к предыдущей версии"
                className="flex items-center gap-1.5 px-4 py-2 border border-gray-300 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 hover:border-gray-400 transition-all"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 3v5h5" />
                  <path d="M3.05 13A9 9 0 1 0 6 5.3L3 8" />
                  <path d="M12 7v5l4 2" />
                </svg>
                История
              </button>
            )}
            {/* Кнопки исходного файла: Открыть + Скачать + Распознать заново (только не в тур-режиме) */}
            {!isTourMode && effectiveProject!.referenceFileId && effectiveProject!.referenceFileName && (
              <>
                <button
                  onClick={async () => {
                    setFileViewing(true);
                    try {
                      await projectsApi.viewReferenceFile(projectId!);
                    } catch { /* ignore */ }
                    setFileViewing(false);
                  }}
                  disabled={fileViewing}
                  title={`Открыть в браузере: ${effectiveProject!.referenceFileName}`}
                  className="flex items-center gap-1.5 px-4 py-2 border border-gray-300 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 hover:border-gray-400 transition-all disabled:opacity-60"
                >
                  <IcoFile />
                  {fileViewing ? 'Открываю...' : 'Открыть исходник'}
                </button>
                <button
                  onClick={async () => {
                    setFileDownloading(true);
                    try {
                      await projectsApi.downloadReferenceFile(projectId!, effectiveProject!.referenceFileName!);
                    } catch { /* ignore */ }
                    setFileDownloading(false);
                  }}
                  disabled={fileDownloading}
                  title={`Скачать: ${effectiveProject!.referenceFileName}`}
                  className="flex items-center gap-1.5 px-4 py-2 border border-gray-300 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 hover:border-gray-400 transition-all disabled:opacity-60"
                >
                  <IcoOrigFile />
                  {fileDownloading ? 'Скачиваю...' : 'Скачать исходник'}
                </button>
                <button
                  onClick={() => {
                    if (confirm('Нейросеть заново прочитает загруженный файл и обновит текст эталона. Текущий текст будет заменён. Продолжить?')) {
                      reparseRef.mutate();
                    }
                  }}
                  disabled={busy || reparseRef.isPending}
                  title="Повторно распознать текст из загруженного файла"
                  className="flex items-center gap-1.5 px-4 py-2 border border-gray-300 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 hover:border-gray-400 transition-all disabled:opacity-60"
                >
                  <IcoRescan />
                  {reparseRef.isPending ? 'Распознаю...' : 'Распознать файл заново'}
                </button>
              </>
            )}
          </div>

          {/* Исходное задание */}
          {effectiveProject!.mode === 'FROM_REFERENCE' && (effectiveProject!.referenceText || effectiveProject!.referenceFileId) && (
            <div data-tour="compare-original">
              <OriginalTask
                referenceText={effectiveProject!.referenceText}
                isOpen={isOriginalOpen}
                onToggle={() => setIsOriginalOpen(v => !v)}
                onSaveText={isTourMode ? undefined : text => updateRefText.mutate(text)}
                isSavingText={updateRefText.isPending}
                projectId={projectId}
                referenceFileId={effectiveProject!.referenceFileId}
                referenceFileName={effectiveProject!.referenceFileName}
              />
            </div>
          )}

          {/* Сетка вариантов */}
          <div id="variants-grid" className="grid grid-cols-1 gap-4 mb-8 items-start sm:grid-cols-2">
            {effectiveProject!.variants.map((variant, idx) => (
              <VariantCard
                key={variant.variantId}
                variant={variant}
                index={idx + 1}
                topicLabel={topicShort}
                projectId={projectId ?? 'tour-mock'}
                busy={busy}
                setBusy={setBusy}
                onError={showError}
                baseTasks={effectiveProject!.variants[0]?.tasks}
                showDiff={showDiff}
                isFirst={idx === 0}
                refText={
                  showDiff && effectiveProject!.mode === 'FROM_REFERENCE' && effectiveProject!.referenceText
                    ? effectiveProject!.referenceText
                    : undefined
                }
              />
            ))}
          </div>

          {/* Кнопка экспорта снизу */}
          <div className="flex justify-center pb-6">
            <button
              onClick={() => setExportOpen(true)}
              className="flex items-center gap-2 px-10 py-3 bg-[#22a139] hover:bg-[#1a8a30] text-white rounded-xl text-sm font-semibold transition-all"
            >
              <IcoExport /> Экспорт комплекта
            </button>
          </div>
        </>
      )}

      {effectiveProject!.status === 'READY' && effectiveProject!.variants.length === 0 && (
        <div className="text-center py-12 text-gray-400">Варианты не найдены</div>
      )}

      {/* Глобальный оверлей */}
      {busy && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/20 pointer-events-none">
          <div className="bg-white rounded-2xl shadow-lg px-6 py-4 flex items-center gap-3">
            <div className="animate-spin h-5 w-5 border-2 border-[#22a139] border-t-transparent rounded-full" />
            <span className="text-sm text-gray-600">GigaChat обрабатывает запрос...</span>
          </div>
        </div>
      )}

      {/* Модал экспорта */}
      {exportOpen && (
        <ExportDialog
          projectId={projectId ?? 'tour-mock'}
          defaultName={effectiveProject!.title || 'Комплект'}
          onClose={() => setExportOpen(false)}
        />
      )}

      {/* Модал онлайн-формы */}
      {formOpen && (projectId || isTourMode) && (
        <FormExportDialog
          projectId={projectId ?? 'tour-mock'}
          onClose={() => setFormOpen(false)}
          tourMode={isTourMode}
        />
      )}

      {/* Модал правки всех вариантов */}
      {aiAllOpen && (
        <PromptModal
          title="Правка всех вариантов промптом"
          placeholder="Например: упростить формулировки, изменить тему задач..."
          onApply={prompt => aiEditAll.mutate(prompt)}
          onClose={() => setAiAllOpen(false)}
          busy={aiEditAll.isPending}
          costHint="Спишется примерно по 0.2–0.5% за каждое задание во всех вариантах"
        />
      )}

      {/* Панель истории версий с откатом */}
      {historyOpen && projectId && (
        <HistoryPanel
          projectId={projectId}
          onClose={() => setHistoryOpen(false)}
          onRestored={(p) => { queryClient.setQueryData(['project', projectId], p); refreshLimits(); }}
        />
      )}
    </main>
    </div>
  );
}
