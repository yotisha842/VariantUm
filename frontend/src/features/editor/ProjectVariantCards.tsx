import { useState, useEffect } from "react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { projectsApi } from "../../api/projects.api";
import { useLimitsStore } from "../../store/limitsStore";
import { RichText } from "../../components/RichText";
import { MathText } from "../../components/MathText";
import { TaskEditorField } from "../../components/TaskEditorField";
import type { Project, Variant, Task, TaskPatch } from "../../types/api";
import { IcoChevron, IcoEdit, IcoCheck, IcoRefresh, IcoFile, IcoAI, IcoTrash, IcoOrigFile, Spinner, DiffRichText, difficultyBadge, minutesLabel, refFileIsImage, refFileIsPdf } from './projectHelpers';


// ── Модал промпта ИИ ─────────────────────────────────────────────────────────

export function PromptModal({
  title, placeholder, onApply, onClose, busy, costHint,
}: {
  title: string; placeholder: string; onApply: (prompt: string) => void; onClose: () => void; busy: boolean;
  costHint?: string;
}) {
  const [prompt, setPrompt] = useState('');
  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-start justify-center pt-[108px] pb-6 overflow-y-auto" onClick={onClose}>
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-[480px] mx-4" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-800">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-4">
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Правка для всего варианта</label>
          <textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder={placeholder}
            className="w-full text-sm text-gray-700 border border-gray-200 rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:border-[#0b8acb] focus:ring-2 focus:ring-[#0b8acb]/20 transition-all"
            rows={4}
            autoFocus
          />
          {costHint && (
            <p className="text-[11px] text-gray-400 mt-2">💡 {costHint}</p>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-all"
          >
            Отмена
          </button>
          <button
            onClick={() => prompt.trim() && onApply(prompt)}
            disabled={!prompt.trim() || busy}
            className="px-4 py-2 bg-[#0b8acb] hover:bg-[#029bf5] text-white rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
          >
            {busy ? 'Применяю...' : 'Применить'}
          </button>
        </div>
      </div>
    </div>
  );
}


// ── Задание внутри карточки варианта ──────────────────────────────────────────

function TaskItem({
  index, task, baseTask, baseText, showDiff, isLast,
  isEditing, editText, onTextChange,
  isThisTaskEditing, onBeginEditThis, onSaveThis, onCancelEditThis, isSavingThis,
  onRegenerateThis, isRegeneratingThis,
  disableEditButton,
}: {
  index: number; task: Task; baseTask?: Task;
  baseText?: string;
  showDiff: boolean; isLast: boolean;
  isEditing: boolean; editText: string;
  onTextChange: (val: string) => void;
  isThisTaskEditing?: boolean;
  onBeginEditThis?: () => void;
  onSaveThis?: () => void;
  onCancelEditThis?: () => void;
  isSavingThis?: boolean;
  onRegenerateThis?: () => void;
  isRegeneratingThis?: boolean;
  disableEditButton?: boolean;
}) {
  const [hovered, setHovered] = useState(false);

  // Individual task edit mode — TaskEditorField со своим save/cancel
  if (isThisTaskEditing) {
    return (
      <div className={`px-2 py-2 ${!isLast ? 'border-b border-gray-100' : ''}`}>
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5 px-2">Задание {index}</p>
        <TaskEditorField
          text={editText}
          onSave={val => { onTextChange(val); onSaveThis?.(); }}
          onCancel={() => onCancelEditThis?.()}
          isSaving={isSavingThis}
        />
      </div>
    );
  }

  // Bulk edit mode — TaskEditorField с onChange (без кнопок сохранения — save общий на карточке)
  if (isEditing) {
    return (
      <div className={`px-2 py-2 ${!isLast ? 'border-b border-gray-100' : ''}`}>
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5 px-2">Задание {index}</p>
        <TaskEditorField
          text={editText}
          onSave={val => onTextChange(val)}
          onCancel={() => {/* handled by variant card */}}
          onChange={val => onTextChange(val)}
          saveLabel="Применить"
        />
      </div>
    );
  }

  // Read-only mode with hover action buttons
  return (
    <div
      className={`px-4 py-3 ${!isLast ? 'border-b border-gray-100' : ''} relative`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="text-sm text-gray-700 leading-relaxed">
        <span className="text-xs font-semibold text-gray-400 mr-1.5">{index}.</span>
        {showDiff
          ? <DiffRichText text={task.text} base={baseText ?? baseTask?.text} />
          : <RichText>{task.text}</RichText>}
      </div>
      {task.answer && (
        <details className="mt-2">
          <summary className="text-xs text-[#0b8acb] cursor-pointer select-none">Ответ</summary>
          <div className="mt-1.5 text-xs text-gray-600 bg-gray-50 rounded-lg p-2">
            <MathText>{task.answer}</MathText>
          </div>
        </details>
      )}
      {task.photoUrl && (
        <div className="mt-2">
          <img src={task.photoUrl} alt="фото к заданию" className="max-h-48 rounded-lg border border-gray-200 object-contain" />
        </div>
      )}
      {!disableEditButton && (onBeginEditThis || onRegenerateThis) && (
        <div
          style={{ opacity: hovered ? 1 : 0, transition: 'opacity 0.15s' }}
          className="absolute top-2.5 right-2.5 flex items-center gap-1"
        >
          {onRegenerateThis && (
            <button
              onClick={onRegenerateThis}
              disabled={isRegeneratingThis}
              className="flex items-center gap-1 px-2 py-1 border border-gray-200 rounded-lg text-[11px] text-gray-400 bg-white hover:border-gray-300 hover:text-[#0b8acb] disabled:opacity-50"
              title="Перегенерировать это задание"
            >
              {isRegeneratingThis ? <Spinner /> : <IcoRefresh />}
              {isRegeneratingThis ? '...' : 'Заново'}
            </button>
          )}
          {onBeginEditThis && (
            <button
              onClick={onBeginEditThis}
              className="flex items-center gap-1 px-2 py-1 border border-gray-200 rounded-lg text-[11px] text-gray-400 bg-white hover:border-gray-300 hover:text-gray-600"
              title="Редактировать это задание"
            >
              <IcoEdit /> Изменить
            </button>
          )}
        </div>
      )}
    </div>
  );
}


// ── Карточка варианта ─────────────────────────────────────────────────────────

export function VariantCard({
  variant, index, topicLabel, projectId, busy, setBusy, onError, baseTasks, showDiff, refText, isFirst,
}: {
  variant: Variant; index: number; topicLabel?: string | null; projectId: string;
  busy: boolean; setBusy: (b: boolean) => void; onError: (msg: string) => void;
  baseTasks?: Task[];
  showDiff: boolean;
  /** Текст эталона (FROM_REFERENCE) — используется как база для diff-подсветки ВСЕХ вариантов. */
  refText?: string;
  isFirst?: boolean;
}) {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editingTaskIdx, setEditingTaskIdx] = useState<number | null>(null);
  const [taskTexts, setTaskTexts] = useState<string[]>(variant.tasks.map(t => t.text));
  const [aiModalOpen, setAiModalOpen] = useState(false);

  const refreshLimits = useLimitsStore(s => s.refresh);
  const update = (u: Project) => { queryClient.setQueryData(['project', projectId], u); setBusy(false); refreshLimits(); };
  const fail = (msg: string) => { setBusy(false); onError(msg); };

  const saveManual = useMutation({
    mutationFn: () => {
      const tasks: TaskPatch[] = variant.tasks.map((t, i) => ({
        taskId: t.taskId,
        text: taskTexts[i],
      }));
      return projectsApi.updateVariant(projectId, variant.variantId, { tasks });
    },
    onMutate: () => setBusy(true),
    onSuccess: (u) => { update(u); setIsEditing(false); },
    onError: () => fail('Не удалось сохранить правки. Проверьте соединение.'),
  });

  const regenerate = useMutation({
    mutationFn: () => projectsApi.regenerateVariant(projectId, variant.variantId),
    onMutate: () => setBusy(true),
    onSuccess: update,
    onError: () => fail('GigaChat не смог перегенерировать вариант. Попробуйте ещё раз.'),
  });

  const aiEdit = useMutation({
    mutationFn: (prompt: string) => projectsApi.aiEditVariant(projectId, variant.variantId, { prompt }),
    onMutate: () => setBusy(true),
    onSuccess: (u) => { update(u); setAiModalOpen(false); },
    onError: () => fail('GigaChat не смог применить правку. Попробуйте переформулировать запрос.'),
  });

  const remove = useMutation({
    mutationFn: () => projectsApi.deleteVariant(projectId, variant.variantId),
    onMutate: () => setBusy(true),
    onSuccess: update,
    onError: () => fail('Не удалось удалить вариант.'),
  });

  const saveOneTask = useMutation({
    mutationFn: (idx: number) =>
      projectsApi.updateVariant(projectId, variant.variantId, {
        tasks: [{ taskId: variant.tasks[idx].taskId, text: taskTexts[idx] }],
      }),
    onMutate: () => setBusy(true),
    onSuccess: (u) => { update(u); setEditingTaskIdx(null); },
    onError: () => fail('Не удалось сохранить задание.'),
  });

  const regenerateOneTask = useMutation({
    mutationFn: (taskId: string) =>
      projectsApi.regenerateTask(projectId, variant.variantId, taskId),
    onMutate: () => setBusy(true),
    onSuccess: update,
    onError: () => fail('GigaChat не смог перегенерировать задание. Попробуйте ещё раз.'),
  });

  function beginEdit() {
    setTaskTexts(variant.tasks.map(t => t.text));
    setEditingTaskIdx(null);
    setIsEditing(true);
  }

  function beginEditTask(idx: number) {
    setTaskTexts(variant.tasks.map(t => t.text));
    setIsEditing(false);
    setEditingTaskIdx(idx);
  }

  function handleCancel() {
    setTaskTexts(variant.tasks.map(t => t.text));
    setIsEditing(false);
    setEditingTaskIdx(null);
  }

  const badge = difficultyBadge(variant.difficulty);
  const actionBtn = 'flex items-center gap-1 px-2 py-1.5 border border-gray-200 rounded-lg text-[11px] font-medium text-gray-500 whitespace-nowrap transition-all disabled:opacity-50';

  return (
    <>
      <div data-tour={isFirst ? 'compare-variant-card' : undefined} className={`border bg-white rounded-2xl overflow-hidden flex flex-col transition-all duration-200 ${
        isEditing ? 'border-[#0b8acb] shadow-md' : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
      }`}>
        {/* Шапка карточки */}
        <div className="px-4 pt-3.5 pb-2.5 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-gray-200 text-gray-600 text-xs font-bold flex items-center justify-center flex-shrink-0">
                {index}
              </span>
              {topicLabel ? (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#30b0ba]/15 text-[#30b0ba] max-w-[120px] truncate" title={topicLabel}>
                  {topicLabel}
                </span>
              ) : (
                <span className="text-sm font-medium text-gray-700">Вариант</span>
              )}
            </div>
            {badge && (
              <span data-tour={isFirst ? 'compare-difficulty-badge' : undefined} className={`text-xs font-semibold px-2.5 py-0.5 rounded-full text-white ${badge.color}`}>
                {badge.label}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 print:hidden">
            {variant.totalEstimatedMinutes
              ? minutesLabel(variant.totalEstimatedMinutes)
              : `${variant.tasks.length} ${variant.tasks.length === 1 ? 'задание' : variant.tasks.length <= 4 ? 'задания' : 'заданий'}`}
          </p>
        </div>

        {/* Задания */}
        <div className="flex-1">
          {variant.tasks.map((task, idx) => (
            <div key={task.taskId} data-tour={isFirst && idx === 0 ? 'compare-task-edit' : undefined}>
            <TaskItem
              index={idx + 1}
              task={task}
              baseTask={showDiff && !refText && baseTasks ? baseTasks[idx] : undefined}
              baseText={showDiff && refText ? refText : undefined}
              showDiff={showDiff}
              isLast={idx === variant.tasks.length - 1}
              isEditing={isEditing}
              editText={taskTexts[idx]}
              onTextChange={val => setTaskTexts(prev => prev.map((t, i) => i === idx ? val : t))}
              isThisTaskEditing={editingTaskIdx === idx}
              onBeginEditThis={() => beginEditTask(idx)}
              onSaveThis={() => saveOneTask.mutate(idx)}
              onCancelEditThis={() => setEditingTaskIdx(null)}
              isSavingThis={saveOneTask.isPending && editingTaskIdx === idx}
              onRegenerateThis={() => regenerateOneTask.mutate(task.taskId)}
              isRegeneratingThis={regenerateOneTask.isPending && regenerateOneTask.variables === task.taskId}
              disableEditButton={isEditing || editingTaskIdx !== null}
            />
            </div>
          ))}
        </div>

        {/* Футер — все действия в одну строку */}
        <div className="px-3 pb-3 pt-3 border-t border-gray-100 flex items-center gap-1 flex-shrink-0 flex-wrap">
          {isEditing ? (
            <>
              <button
                onClick={() => saveManual.mutate()}
                disabled={busy}
                className="flex items-center gap-1 px-3 py-1.5 bg-[#22a139] hover:bg-[#1e9231] text-white rounded-lg text-xs font-semibold transition-all disabled:opacity-60"
              >
                <IcoCheck /> {saveManual.isPending ? 'Сохраняю...' : 'Сохранить'}
              </button>
              <button
                onClick={handleCancel}
                disabled={busy}
                className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-500 hover:bg-gray-50 transition-all"
              >
                Отмена
              </button>
            </>
          ) : (
            <>
              <button onClick={beginEdit} disabled={busy} title="Редактировать вручную" className={`${actionBtn} hover:border-gray-300 hover:text-gray-700`}>
                <IcoEdit /> Править
              </button>
              <button data-tour={isFirst ? 'compare-edit-prompt-btn' : undefined} onClick={() => setAiModalOpen(true)} disabled={busy} title="Править с помощью ИИ" className={`${actionBtn} hover:border-gray-300 hover:text-gray-700`}>
                <IcoAI /> С ИИ
              </button>
              <button onClick={() => regenerate.mutate()} disabled={busy} title="Перегенерировать вариант" className={`${actionBtn} hover:border-gray-300 hover:text-gray-700`}>
                <IcoRefresh /> {regenerate.isPending ? '...' : 'Заново'}
              </button>
              <button
                onClick={() => { if (confirm(`Удалить вариант ${index}?`)) remove.mutate(); }}
                disabled={busy}
                title="Удалить вариант"
                className={`${actionBtn} hover:border-rose-300 hover:text-rose-500`}
              >
                <IcoTrash /> Удалить
              </button>
            </>
          )}
        </div>
      </div>

      {aiModalOpen && (
        <PromptModal
          title={`Правка с ИИ — Вариант ${index}`}
          placeholder="Например: сделать задачи проще, заменить персонажей..."
          onApply={prompt => aiEdit.mutate(prompt)}
          onClose={() => setAiModalOpen(false)}
          busy={aiEdit.isPending}
          costHint={`Спишется примерно по 0.2–0.5% за каждое из ${variant.tasks.length} заданий варианта`}
        />
      )}
    </>
  );
}


// ── Исходное задание (сворачиваемое, редактируемое) ──────────────────────────

export function OriginalTask({
  referenceText, isOpen, onToggle, onSaveText, isSavingText,
  projectId, referenceFileId, referenceFileName,
}: {
  referenceText: string | null | undefined;
  isOpen: boolean;
  onToggle: () => void;
  onSaveText?: (text: string) => void;
  isSavingText?: boolean;
  projectId?: string;
  referenceFileId?: string;
  referenceFileName?: string;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [fileBlobUrl, setFileBlobUrl] = useState<string | null>(null);
  const [fileFetching, setFileFetching] = useState(false);
  const [fileFetchFailed, setFileFetchFailed] = useState(false);

  useEffect(() => {
    if (!isOpen || !projectId || !referenceFileId || fileBlobUrl || fileFetching) return;
    setFileFetching(true);
    projectsApi.getReferenceFileBlobUrl(projectId)
      .then(url => setFileBlobUrl(url))
      .catch(() => { setFileFetchFailed(true); })
      .finally(() => setFileFetching(false));
  }, [isOpen]);

  useEffect(() => {
    return () => { if (fileBlobUrl) URL.revokeObjectURL(fileBlobUrl); };
  }, [fileBlobUrl]);

  return (
    <div className={`border rounded-2xl overflow-hidden transition-all duration-200 mb-4 ${
      isOpen ? 'border-gray-300 shadow-sm' : 'border-gray-200'
    }`}>
      <div
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={e => e.key === 'Enter' && onToggle()}
        className="w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-gray-50 transition-colors cursor-pointer select-none"
      >
        <span className="text-gray-400 flex-shrink-0"><IcoFile /></span>
        <span className="flex-1 text-sm font-medium text-gray-700">
          Исходный вариант (оригинал)
        </span>
        {referenceFileId && referenceFileName && projectId && (
          <button
            type="button"
            onClick={e => { e.stopPropagation(); projectsApi.viewReferenceFile(projectId); }}
            title={`Открыть исходный файл: ${referenceFileName}`}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs text-gray-400 hover:text-[#0b8acb] hover:bg-blue-50 transition-all flex-shrink-0 mr-1"
          >
            <IcoOrigFile /> Открыть файл
          </button>
        )}
        <span className="text-gray-400"><IcoChevron open={isOpen} /></span>
      </div>

      <div className="overflow-hidden transition-all duration-300 ease-in-out" style={{ maxHeight: isOpen ? '3600px' : '0px' }}>
        <div className="border-t border-gray-100 px-5 py-4">

          {/* Предпросмотр исходного файла */}
          {referenceFileId && referenceFileName && (
            <div className="mb-4">
              {fileFetching && (
                <div className="flex items-center gap-2 text-sm text-gray-400 py-2">
                  <span className="w-4 h-4 border-2 border-gray-200 border-t-[#0b8acb] rounded-full animate-spin flex-shrink-0" />
                  Загрузка файла…
                </div>
              )}
              {!fileFetching && fileBlobUrl && refFileIsImage(referenceFileName) && (
                <img
                  src={fileBlobUrl}
                  alt={referenceFileName}
                  className="max-w-full rounded-xl border border-gray-200 object-contain mb-2"
                  style={{ maxHeight: '600px' }}
                />
              )}
              {!fileFetching && fileBlobUrl && refFileIsPdf(referenceFileName) && (
                <embed
                  src={fileBlobUrl}
                  type="application/pdf"
                  className="w-full rounded-xl border border-gray-200 mb-2"
                  style={{ height: '600px' }}
                />
              )}
              {!fileFetching && fileBlobUrl && !refFileIsImage(referenceFileName) && !refFileIsPdf(referenceFileName) && (
                <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 rounded-xl px-4 py-3 border border-gray-100 mb-2">
                  <IcoFile />
                  <span className="truncate">{referenceFileName}</span>
                  <span className="text-gray-400 flex-shrink-0">— предпросмотр недоступен</span>
                </div>
              )}
              {!fileFetching && !fileBlobUrl && fileFetchFailed && projectId && (
                <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 rounded-xl px-4 py-3 border border-gray-100 mb-2">
                  <IcoFile />
                  <span className="truncate flex-1">{referenceFileName}</span>
                  <button
                    onClick={() => projectsApi.viewReferenceFile(projectId)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-500 hover:border-[#0b8acb] hover:text-[#0b8acb] transition-all flex-shrink-0"
                  >
                    <IcoFile /> Открыть файл
                  </button>
                </div>
              )}
              {(fileBlobUrl || fileFetchFailed) && referenceText && (
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-3 mt-2">
                  Считанный текст
                </p>
              )}
            </div>
          )}

          {isEditing ? (
            <TaskEditorField
              text={referenceText ?? ''}
              onSave={text => { onSaveText?.(text); setIsEditing(false); }}
              onCancel={() => setIsEditing(false)}
              isSaving={isSavingText}
            />
          ) : (
            <>
              {referenceText ? (
                <div className="text-sm text-gray-700 leading-relaxed mb-3">
                  <RichText>{referenceText}</RichText>
                </div>
              ) : (
                referenceFileId && (
                  <p className="text-xs text-gray-400 italic mb-3">
                    Текст не был распознан из файла
                  </p>
                )
              )}
              {onSaveText && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-500 hover:border-[#0b8acb] hover:text-[#0b8acb] transition-all"
                >
                  <IcoEdit /> Редактировать эталон
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
