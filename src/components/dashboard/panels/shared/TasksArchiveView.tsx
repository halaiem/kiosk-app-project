import { useState, useCallback, useEffect, useRef } from 'react';
import Icon from '@/components/ui/icon';
import { type Task, PRIORITY_STYLES, PRIORITY_LABELS, PRIORITY_ICONS, STATUS_STYLES, STATUS_LABELS, CATEGORY_LABELS, CATEGORY_ICONS, ROLE_LABELS, hdrs, formatDate, formatDateTime, exportCSV, exportExcel, exportWord, printTasks } from './TasksView';
import func2url from '../../../../../backend/func2url.json';

const API_URL = func2url.tasks;

interface TasksArchiveViewProps {
  currentUserId?: number;
}

export default function TasksArchiveView({ currentUserId }: TasksArchiveViewProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (exportRef.current && !exportRef.current.contains(e.target as Node)) setShowExportMenu(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const loadTasks = useCallback(async () => {
    setLoading(true); setError('');
    const params = new URLSearchParams({ action: 'list', archived: 'true' });
    if (search.trim()) params.set('search', search.trim());
    try {
      const res = await fetch(`${API_URL}?${params}`, { headers: hdrs() });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setTasks(data.tasks || []);
    } catch { setError('Ошибка загрузки архива'); }
    setLoading(false);
  }, [search]);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  const handleRestore = useCallback(async (ids: number[]) => {
    setRestoring(true);
    try {
      const res = await fetch(`${API_URL}?action=archive`, { method: 'POST', headers: hdrs(), body: JSON.stringify({ ids, archive: false }) });
      if (!res.ok) throw new Error();
      setSelected(new Set()); await loadTasks();
    } catch { setError('Ошибка восстановления'); }
    setRestoring(false);
  }, [loadTasks]);

  const handleDelete = useCallback(async (ids: number[]) => {
    if (!confirm(`Удалить ${ids.length} задач(и) из архива навсегда?`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`${API_URL}?action=delete`, { method: 'POST', headers: hdrs(), body: JSON.stringify({ ids }) });
      if (!res.ok) throw new Error();
      setSelected(new Set()); await loadTasks();
    } catch { setError('Ошибка удаления'); }
    setDeleting(false);
  }, [loadTasks]);

  const toggleSelect = (id: number) => setSelected(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const toggleSelectAll = () => setSelected(selected.size === tasks.length && tasks.length > 0 ? new Set() : new Set(tasks.map(t => t.id)));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Icon name="Archive" size={20} className="text-amber-500" />Архив задач
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">Выполненные и архивированные задачи</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {selected.size > 0 && (
            <>
              <button onClick={() => handleRestore(Array.from(selected))} disabled={restoring}
                className="px-3 py-1.5 rounded-lg text-sm font-medium bg-green-500/15 text-green-500 hover:bg-green-500/25 disabled:opacity-50 transition-all">
                <Icon name="RotateCcw" size={14} className="inline mr-1.5" />{restoring ? '...' : `Восстановить (${selected.size})`}
              </button>
              <button onClick={() => handleDelete(Array.from(selected))} disabled={deleting}
                className="px-3 py-1.5 rounded-lg text-sm font-medium bg-red-500/15 text-red-500 hover:bg-red-500/25 disabled:opacity-50 transition-all">
                <Icon name="Trash2" size={14} className="inline mr-1.5" />{deleting ? '...' : `Удалить (${selected.size})`}
              </button>
            </>
          )}
          <div className="relative" ref={exportRef}>
            <button onClick={() => setShowExportMenu(!showExportMenu)}
              className="px-3 py-1.5 rounded-lg text-sm font-medium bg-muted text-muted-foreground hover:bg-muted/80 transition-all">
              <Icon name="Download" size={14} className="inline mr-1.5" />Экспорт
            </button>
            {showExportMenu && (
              <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-xl shadow-lg z-50 py-1 min-w-[160px]">
                {[
                  { label: 'Печать', icon: 'Printer', fn: () => printTasks(tasks) },
                  { label: 'Excel (.xls)', icon: 'FileSpreadsheet', fn: () => exportExcel(tasks) },
                  { label: 'Word (.doc)', icon: 'FileText', fn: () => exportWord(tasks) },
                  { label: 'CSV', icon: 'File', fn: () => exportCSV(tasks) },
                ].map(item => (
                  <button key={item.label} onClick={() => { item.fn(); setShowExportMenu(false); }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 flex items-center gap-2">
                    <Icon name={item.icon} size={14} />{item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="relative">
        <Icon name="Search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input className="w-full pl-9 pr-3 py-2 rounded-lg bg-muted border border-border text-sm" placeholder="Поиск в архиве..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {error && <div className="text-red-500 text-sm py-2">{error}</div>}

      {loading ? <div className="text-center text-muted-foreground text-sm py-12">Загрузка архива...</div> : (
        <div className="space-y-1">
          {tasks.length > 0 && (
            <div className="flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground">
              <input type="checkbox" checked={selected.size === tasks.length && tasks.length > 0} onChange={toggleSelectAll} className="w-3.5 h-3.5 rounded accent-primary cursor-pointer" />
              <span>{selected.size > 0 ? `Выбрано: ${selected.size}` : 'Выбрать все'}</span>
              <span className="ml-auto">Всего в архиве: {tasks.length}</span>
            </div>
          )}
          {tasks.map(task => (
            <div key={task.id} className={`flex items-center gap-2 p-3 rounded-xl border transition-all ${selected.has(task.id) ? 'border-amber-500/30 bg-amber-500/5' : 'border-border bg-card hover:bg-muted/40'}`}>
              <input type="checkbox" checked={selected.has(task.id)} onClick={() => toggleSelect(task.id)} onChange={() => {}} className="w-4 h-4 rounded accent-primary cursor-pointer shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-3">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${PRIORITY_STYLES[task.priority]} opacity-60`}>
                    <Icon name={PRIORITY_ICONS[task.priority]} size={13} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm text-muted-foreground line-through">{task.title}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${STATUS_STYLES[task.status]}`}>{STATUS_LABELS[task.status]}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1"><Icon name={CATEGORY_ICONS[task.category]} size={10} />{CATEGORY_LABELS[task.category]}</span>
                      <span className="flex items-center gap-1"><Icon name="User" size={10} />{task.assignee_name || '—'}</span>
                      <span className="flex items-center gap-1"><Icon name="UserPen" size={10} />{task.creator_name}</span>
                      {task.completed_at && <span className="flex items-center gap-1"><Icon name="CheckCircle" size={10} />завершено {formatDate(task.completed_at)}</span>}
                      <span className="flex items-center gap-1"><Icon name="Calendar" size={10} />создано {formatDate(task.created_at)}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-0.5 shrink-0">
                <button onClick={() => printTasks([task])} title="Печать"
                  className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all">
                  <Icon name="Printer" size={13} />
                </button>
                <button onClick={() => handleRestore([task.id])} title="Восстановить задачу"
                  className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-green-500 hover:bg-green-500/10 transition-all">
                  <Icon name="RotateCcw" size={13} />
                </button>
                <button onClick={() => handleDelete([task.id])} title="Удалить навсегда"
                  className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-all">
                  <Icon name="Trash2" size={13} />
                </button>
              </div>
            </div>
          ))}
          {tasks.length === 0 && (
            <div className="text-center py-16">
              <Icon name="Archive" size={40} className="mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground text-sm">Архив пуст</p>
              <p className="text-muted-foreground/60 text-xs mt-1">Выполненные задачи будут здесь</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
