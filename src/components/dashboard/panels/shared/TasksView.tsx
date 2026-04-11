import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import Icon from '@/components/ui/icon';
import func2url from '../../../../../backend/func2url.json';

const API_URL = func2url.tasks;
const TOKEN_KEY = 'dashboard_token';

type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
type TaskStatus = 'new' | 'in_progress' | 'review' | 'done' | 'cancelled';
type TaskCategory = 'transport' | 'staff' | 'depot' | 'docs' | 'repair' | 'other';

export interface Task {
  id: number;
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  category: TaskCategory;
  is_archived: boolean;
  lifetime_hours: number | null;
  assignee_user_id: number | null;
  created_by_user_id: number;
  creator_name: string;
  creator_role: string;
  assignee_name: string | null;
  assignee_role: string | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  comment_count: number;
}

interface TaskComment {
  id: number;
  message: string;
  created_at: string;
  user_name: string;
  user_role: string;
}

export interface StaffUser {
  id: number;
  full_name: string;
  role: string;
}

export const PRIORITY_STYLES: Record<TaskPriority, string> = {
  low: 'bg-slate-500/15 text-slate-500',
  medium: 'bg-blue-500/15 text-blue-500',
  high: 'bg-amber-500/15 text-amber-500',
  urgent: 'bg-red-500/15 text-red-500',
};
export const PRIORITY_LABELS: Record<TaskPriority, string> = { low: 'Низкий', medium: 'Средний', high: 'Высокий', urgent: 'Срочно' };
export const PRIORITY_ICONS: Record<TaskPriority, string> = { low: 'ArrowDown', medium: 'ArrowRight', high: 'ArrowUp', urgent: 'AlertTriangle' };

export const STATUS_STYLES: Record<TaskStatus, string> = {
  new: 'bg-blue-500/15 text-blue-500',
  in_progress: 'bg-amber-500/15 text-amber-500',
  review: 'bg-purple-500/15 text-purple-500',
  done: 'bg-green-500/15 text-green-500',
  cancelled: 'bg-slate-500/15 text-slate-400',
};
export const STATUS_LABELS: Record<TaskStatus, string> = { new: 'Новая', in_progress: 'В работе', review: 'На проверке', done: 'Выполнена', cancelled: 'Отменена' };

export const CATEGORY_LABELS: Record<TaskCategory, string> = { transport: 'Транспорт', staff: 'Персонал', depot: 'Депо / Парк', docs: 'Документы', repair: 'Ремонт', other: 'Прочее' };
export const CATEGORY_ICONS: Record<TaskCategory, string> = { transport: 'Bus', staff: 'Users', depot: 'Warehouse', docs: 'FileText', repair: 'Wrench', other: 'MoreHorizontal' };

export const ROLE_LABELS: Record<string, string> = {
  admin: 'Администратор', dispatcher: 'Диспетчер', technician: 'Технолог',
  mechanic: 'Механик', engineer: 'Инженер', manager: 'Управляющий',
};

const STATUSES: TaskStatus[] = ['new', 'in_progress', 'review', 'done', 'cancelled'];

export function getToken(): string | null { return localStorage.getItem(TOKEN_KEY); }
export function hdrs(): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  const t = getToken(); if (t) h['X-Dashboard-Token'] = t;
  return h;
}

export function formatDate(d: string | null): string {
  if (!d) return '—';
  const date = new Date(d);
  return `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()}`;
}
export function formatDateTime(d: string): string {
  const date = new Date(d);
  return `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}
export function isOverdue(dueDate: string | null, status: TaskStatus): boolean {
  if (!dueDate || status === 'done' || status === 'cancelled') return false;
  return new Date(dueDate) < new Date();
}

function getLifetimeStatus(task: Task): { label: string; color: string } | null {
  if (!task.lifetime_hours) return null;
  const elapsed = (Date.now() - new Date(task.created_at).getTime()) / 3600000;
  const remaining = task.lifetime_hours - elapsed;
  if (remaining <= 0) return { label: 'Истекло', color: 'text-red-500' };
  if (remaining < 2) return { label: `< 2ч`, color: 'text-red-500' };
  if (remaining < task.lifetime_hours * 0.25) return { label: `${Math.round(remaining)}ч осталось`, color: 'text-amber-500' };
  return { label: `${Math.round(remaining)}ч из ${task.lifetime_hours}ч`, color: 'text-muted-foreground' };
}

export function exportCSV(tasks: Task[]) {
  const header = 'ID;Название;Приоритет;Статус;Категория;Исполнитель;Создал;Срок;Создано\n';
  const rows = tasks.map(t => `${t.id};"${t.title}";"${PRIORITY_LABELS[t.priority]}";"${STATUS_LABELS[t.status]}";"${CATEGORY_LABELS[t.category]}";"${t.assignee_name || '—'}";"${t.creator_name}";"${formatDate(t.due_date)}";"${formatDate(t.created_at)}"`).join('\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['\uFEFF' + header + rows], { type: 'text/csv;charset=utf-8' })); a.download = `tasks_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
}
export function exportExcel(tasks: Task[]) {
  const header = '<tr><th>ID</th><th>Название</th><th>Приоритет</th><th>Статус</th><th>Категория</th><th>Исполнитель</th><th>Создал</th><th>Срок</th></tr>';
  const rows = tasks.map(t => `<tr><td>${t.id}</td><td>${t.title}</td><td>${PRIORITY_LABELS[t.priority]}</td><td>${STATUS_LABELS[t.status]}</td><td>${CATEGORY_LABELS[t.category]}</td><td>${t.assignee_name || '—'}</td><td>${t.creator_name}</td><td>${formatDate(t.due_date)}</td></tr>`).join('');
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="UTF-8"></head><body><table border="1">${header}${rows}</table></body></html>`;
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([html], { type: 'application/vnd.ms-excel' })); a.download = `tasks_${new Date().toISOString().slice(0, 10)}.xls`; a.click();
}
export function exportWord(tasks: Task[]) {
  const rows = tasks.map(t => `<tr><td>${t.id}</td><td>${t.title}</td><td>${PRIORITY_LABELS[t.priority]}</td><td>${STATUS_LABELS[t.status]}</td><td>${t.assignee_name || '—'}</td><td>${formatDate(t.due_date)}</td></tr>`).join('');
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="UTF-8"><style>table{border-collapse:collapse;width:100%}td,th{border:1px solid #ccc;padding:6px;font-size:11pt}th{background:#f0f0f0;font-weight:bold}</style></head><body><h2>Задачи — ${new Date().toLocaleDateString('ru')}</h2><table><tr><th>ID</th><th>Название</th><th>Приоритет</th><th>Статус</th><th>Исполнитель</th><th>Срок</th></tr>${rows}</table></body></html>`;
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([html], { type: 'application/msword' })); a.download = `tasks_${new Date().toISOString().slice(0, 10)}.doc`; a.click();
}
export function printTasks(tasks: Task[]) {
  const rows = tasks.map(t => `<tr><td>${t.id}</td><td>${t.title}</td><td>${PRIORITY_LABELS[t.priority]}</td><td>${STATUS_LABELS[t.status]}</td><td>${CATEGORY_LABELS[t.category]}</td><td>${t.assignee_name || '—'}</td><td>${formatDate(t.due_date)}</td></tr>`).join('');
  const w = window.open('', '_blank'); if (!w) return;
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Задачи</title><style>body{font-family:Arial;padding:20px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ccc;padding:6px;font-size:11px}th{background:#f5f5f5;font-weight:600}@media print{button{display:none}}</style></head><body><h2>Задачи — ${new Date().toLocaleDateString('ru')}</h2><table><tr><th>ID</th><th>Название</th><th>Приоритет</th><th>Статус</th><th>Категория</th><th>Исполнитель</th><th>Срок</th></tr>${rows}</table><br><button onclick="window.print()">Печать</button></body></html>`);
  w.document.close(); setTimeout(() => w.print(), 300);
}

interface TaskActionsProps {
  task: Task;
  onStatusChange: (id: number, s: TaskStatus) => void;
  onArchive: (ids: number[]) => void;
  onDelete: (ids: number[]) => void;
  onSelect: (task: Task) => void;
}

export function TaskActions({ task, onStatusChange, onArchive, onDelete, onSelect }: TaskActionsProps) {
  const isDone = task.status === 'done';
  return (
    <div className="flex items-center gap-0.5 shrink-0">
      <button onClick={(e) => { e.stopPropagation(); onSelect(task); }} title="Просмотр / редактировать"
        className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-blue-500 hover:bg-blue-500/10 transition-all">
        <Icon name="Eye" size={13} />
      </button>
      <button onClick={(e) => { e.stopPropagation(); printTasks([task]); }} title="Печать"
        className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all">
        <Icon name="Printer" size={13} />
      </button>
      <button onClick={(e) => { e.stopPropagation(); exportExcel([task]); }} title="Экспорт Excel"
        className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-green-500 hover:bg-green-500/10 transition-all">
        <Icon name="FileSpreadsheet" size={13} />
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); if (isDone) onArchive([task.id]); }}
        title={isDone ? 'В архив' : 'Доступно только для выполненных задач'}
        className={`w-7 h-7 rounded-md flex items-center justify-center transition-all ${isDone ? 'text-amber-500 hover:bg-amber-500/10 cursor-pointer' : 'text-muted-foreground/25 cursor-not-allowed'}`}>
        <Icon name="Archive" size={13} />
      </button>
      <button onClick={(e) => { e.stopPropagation(); if (confirm('Удалить задачу?')) onDelete([task.id]); }} title="Удалить"
        className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-all">
        <Icon name="Trash2" size={13} />
      </button>
    </div>
  );
}

interface TasksViewProps { currentUserId?: number; }

export default function TasksView({ currentUserId }: TasksViewProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<TaskCategory | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | 'all'>('all');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'board'>('list');

  const [showCreate, setShowCreate] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [savingComment, setSavingComment] = useState(false);

  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPriority, setNewPriority] = useState<TaskPriority>('medium');
  const [newCategory, setNewCategory] = useState<TaskCategory>('other');
  const [newAssignee, setNewAssignee] = useState<number | ''>('');
  const [newDue, setNewDue] = useState('');
  const [newLifetime, setNewLifetime] = useState('');
  const [saving, setSaving] = useState(false);

  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (exportRef.current && !exportRef.current.contains(e.target as Node)) setShowExportMenu(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const loadTasks = useCallback(async () => {
    setLoading(true); setError('');
    const params = new URLSearchParams({ action: 'list' });
    if (statusFilter !== 'all') params.set('status', statusFilter);
    if (categoryFilter !== 'all') params.set('category', categoryFilter);
    if (priorityFilter !== 'all') params.set('priority', priorityFilter);
    if (search.trim()) params.set('search', search.trim());
    try {
      const res = await fetch(`${API_URL}?${params}`, { headers: hdrs() });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setTasks(data.tasks || []); setCounts(data.counts || {});
    } catch { setError('Ошибка загрузки задач'); }
    setLoading(false);
  }, [statusFilter, categoryFilter, priorityFilter, search]);

  const loadUsers = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}?action=users`, { headers: hdrs() });
      if (res.ok) { const d = await res.json(); setUsers(d.users || []); }
    } catch { /* */ }
  }, []);

  useEffect(() => { loadTasks(); }, [loadTasks]);
  useEffect(() => { loadUsers(); }, [loadUsers]);

  const loadComments = useCallback(async (taskId: number) => {
    setCommentsLoading(true);
    try {
      const res = await fetch(`${API_URL}?action=comments&task_id=${taskId}`, { headers: hdrs() });
      if (res.ok) { const d = await res.json(); setComments(d.comments || []); }
    } catch { setComments([]); }
    setCommentsLoading(false);
  }, []);

  const handleSelectTask = useCallback((task: Task | null) => {
    setSelectedTask(task); setNewComment('');
    if (task) loadComments(task.id); else setComments([]);
  }, [loadComments]);

  const handleCreate = useCallback(async () => {
    if (!newTitle.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}?action=create`, {
        method: 'POST', headers: hdrs(),
        body: JSON.stringify({ title: newTitle, description: newDesc, priority: newPriority, category: newCategory, assignee_user_id: newAssignee || null, due_date: newDue || null, lifetime_hours: newLifetime ? parseInt(newLifetime) : null }),
      });
      if (!res.ok) throw new Error();
      setNewTitle(''); setNewDesc(''); setNewPriority('medium'); setNewCategory('other'); setNewAssignee(''); setNewDue(''); setNewLifetime('');
      setShowCreate(false); await loadTasks();
    } catch { setError('Ошибка создания задачи'); }
    setSaving(false);
  }, [newTitle, newDesc, newPriority, newCategory, newAssignee, newDue, newLifetime, loadTasks]);

  const handleStatusChange = useCallback(async (taskId: number, newStatus: TaskStatus) => {
    try {
      const res = await fetch(`${API_URL}?action=update`, { method: 'PUT', headers: hdrs(), body: JSON.stringify({ id: taskId, status: newStatus }) });
      if (!res.ok) throw new Error();
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
      setSelectedTask(prev => prev && prev.id === taskId ? { ...prev, status: newStatus } : prev);
      loadTasks();
    } catch { setError('Ошибка обновления'); }
  }, [loadTasks]);

  const handleArchive = useCallback(async (ids: number[]) => {
    setArchiving(true);
    try {
      const res = await fetch(`${API_URL}?action=archive`, { method: 'POST', headers: hdrs(), body: JSON.stringify({ ids, archive: true }) });
      if (!res.ok) throw new Error();
      setSelected(new Set());
      if (selectedTask && ids.includes(selectedTask.id)) setSelectedTask(null);
      await loadTasks();
    } catch { setError('Ошибка архивации'); }
    setArchiving(false);
  }, [selectedTask, loadTasks]);

  const handleDelete = useCallback(async (ids: number[]) => {
    if (!confirm(`Удалить ${ids.length} задач(и)?`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`${API_URL}?action=delete`, { method: 'POST', headers: hdrs(), body: JSON.stringify({ ids }) });
      if (!res.ok) throw new Error();
      setSelected(new Set());
      if (selectedTask && ids.includes(selectedTask.id)) setSelectedTask(null);
      await loadTasks();
    } catch { setError('Ошибка удаления'); }
    setDeleting(false);
  }, [selectedTask, loadTasks]);

  const handleAddComment = useCallback(async () => {
    if (!selectedTask || !newComment.trim()) return;
    setSavingComment(true);
    try {
      const res = await fetch(`${API_URL}?action=add_comment`, { method: 'POST', headers: hdrs(), body: JSON.stringify({ task_id: selectedTask.id, message: newComment.trim() }) });
      if (!res.ok) throw new Error();
      setNewComment(''); await loadComments(selectedTask.id);
      setTasks(prev => prev.map(t => t.id === selectedTask.id ? { ...t, comment_count: t.comment_count + 1 } : t));
      setSelectedTask(prev => prev ? { ...prev, comment_count: prev.comment_count + 1 } : prev);
    } catch { /* */ }
    setSavingComment(false);
  }, [selectedTask, newComment, loadComments]);

  const toggleSelect = useCallback((id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelected(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }, []);
  const toggleSelectAll = useCallback(() => {
    setSelected(selected.size === tasks.length && tasks.length > 0 ? new Set() : new Set(tasks.map(t => t.id)));
  }, [selected, tasks]);

  const selectedDone = useMemo(() => Array.from(selected).filter(id => tasks.find(t => t.id === id)?.status === 'done'), [selected, tasks]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-bold">Задачи</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Управление задачами и поручениями</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {selected.size > 0 && (
            <>
              {selectedDone.length > 0 && (
                <button onClick={() => handleArchive(selectedDone)} disabled={archiving}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium bg-amber-500/15 text-amber-500 hover:bg-amber-500/25 disabled:opacity-50 transition-all">
                  <Icon name="Archive" size={14} className="inline mr-1.5" />{archiving ? '...' : `Архив (${selectedDone.length})`}
                </button>
              )}
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
          <button onClick={() => setViewMode('list')} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
            <Icon name="List" size={14} className="inline mr-1.5" />Список
          </button>
          <button onClick={() => setViewMode('board')} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${viewMode === 'board' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
            <Icon name="Columns3" size={14} className="inline mr-1.5" />Доска
          </button>
          <button onClick={() => setShowCreate(!showCreate)} className="px-3 py-1.5 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-all">
            <Icon name="Plus" size={14} className="inline mr-1.5" />Создать
          </button>
        </div>
      </div>

      <div className="flex gap-1.5 flex-wrap">
        {(['all', ...STATUSES] as const).map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${statusFilter === s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
            {s === 'all' ? 'Все' : STATUS_LABELS[s]} ({counts[s] || 0})
          </button>
        ))}
      </div>

      {showCreate && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <h3 className="font-semibold text-sm">Новая задача</h3>
          <input className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm" placeholder="Название задачи..." value={newTitle} onChange={e => setNewTitle(e.target.value)} />
          <textarea className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm resize-none" rows={2} placeholder="Описание..." value={newDesc} onChange={e => setNewDesc(e.target.value)} />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            <select className="px-3 py-2 rounded-lg bg-muted border border-border text-sm" value={newPriority} onChange={e => setNewPriority(e.target.value as TaskPriority)}>
              {Object.entries(PRIORITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select className="px-3 py-2 rounded-lg bg-muted border border-border text-sm" value={newCategory} onChange={e => setNewCategory(e.target.value as TaskCategory)}>
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select className="px-3 py-2 rounded-lg bg-muted border border-border text-sm" value={newAssignee} onChange={e => setNewAssignee(e.target.value ? Number(e.target.value) : '')}>
              <option value="">Исполнитель...</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.full_name} ({ROLE_LABELS[u.role] || u.role})</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Срок исполнения</label>
              <input type="date" className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm" value={newDue} onChange={e => setNewDue(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Время жизни (часов)</label>
              <input type="number" min={1} placeholder="напр. 24" className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm" value={newLifetime} onChange={e => setNewLifetime(e.target.value)} />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowCreate(false)} className="px-4 py-1.5 rounded-lg text-sm bg-muted hover:bg-muted/80">Отмена</button>
            <button onClick={handleCreate} disabled={!newTitle.trim() || saving} className="px-4 py-1.5 rounded-lg text-sm bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
              {saving ? 'Создание...' : 'Создать'}
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Icon name="Search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input className="w-full pl-9 pr-3 py-2 rounded-lg bg-muted border border-border text-sm" placeholder="Поиск задачи..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="px-3 py-2 rounded-lg bg-muted border border-border text-sm" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value as TaskCategory | 'all')}>
          <option value="all">Все категории</option>
          {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select className="px-3 py-2 rounded-lg bg-muted border border-border text-sm" value={priorityFilter} onChange={e => setPriorityFilter(e.target.value as TaskPriority | 'all')}>
          <option value="all">Все приоритеты</option>
          {Object.entries(PRIORITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {error && <div className="text-red-500 text-sm py-2">{error}</div>}

      {loading ? <div className="text-center text-muted-foreground text-sm py-12">Загрузка...</div>
        : viewMode === 'list' ? (
          <div className="space-y-1">
            {tasks.length > 0 && (
              <div className="flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground">
                <input type="checkbox" checked={selected.size === tasks.length && tasks.length > 0} onChange={toggleSelectAll} className="w-3.5 h-3.5 rounded accent-primary cursor-pointer" />
                <span>{selected.size > 0 ? `Выбрано: ${selected.size}` : 'Выбрать все'}</span>
              </div>
            )}
            {tasks.map(task => {
              const lt = getLifetimeStatus(task);
              return (
                <div key={task.id} className={`flex items-center gap-2 p-3 rounded-xl border transition-all ${task.id === selectedTask?.id ? 'border-primary bg-primary/5' : selected.has(task.id) ? 'border-primary/30 bg-primary/5' : 'border-border bg-card hover:bg-muted/40'}`}>
                  <input type="checkbox" checked={selected.has(task.id)} onClick={e => toggleSelect(task.id, e)} onChange={() => {}} className="w-4 h-4 rounded accent-primary cursor-pointer shrink-0" />
                  <button className="flex-1 text-left min-w-0" onClick={() => handleSelectTask(task.id === selectedTask?.id ? null : task)}>
                    <div className="flex items-start gap-3">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${PRIORITY_STYLES[task.priority]}`}>
                        <Icon name={PRIORITY_ICONS[task.priority]} size={13} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`font-medium text-sm ${task.status === 'cancelled' ? 'line-through text-muted-foreground' : ''}`}>{task.title}</span>
                          {isOverdue(task.due_date, task.status) && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-500 font-medium">Просрочено</span>}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                          <span className={`px-2 py-0.5 rounded-full ${STATUS_STYLES[task.status]}`}>{STATUS_LABELS[task.status]}</span>
                          <span className="flex items-center gap-1"><Icon name="User" size={10} />{task.assignee_name || 'Не назначен'}</span>
                          <span className="flex items-center gap-1"><Icon name="Calendar" size={10} />до {formatDate(task.due_date)}</span>
                          {lt && <span className={`flex items-center gap-1 ${lt.color}`}><Icon name="Clock" size={10} />{lt.label}</span>}
                          {task.comment_count > 0 && <span className="flex items-center gap-1"><Icon name="MessageSquare" size={10} />{task.comment_count}</span>}
                        </div>
                      </div>
                    </div>
                  </button>
                  <TaskActions task={task} onStatusChange={handleStatusChange} onArchive={handleArchive} onDelete={handleDelete} onSelect={handleSelectTask} />
                </div>
              );
            })}
            {tasks.length === 0 && <div className="text-center text-muted-foreground text-sm py-12">Задачи не найдены</div>}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {(['new', 'in_progress', 'review', 'done'] as TaskStatus[]).map(status => {
              const col = tasks.filter(t => t.status === status);
              return (
                <div key={status} className="space-y-2">
                  <div className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg ${STATUS_STYLES[status]}`}>{STATUS_LABELS[status]} ({col.length})</div>
                  {col.map(task => (
                    <div key={task.id} className={`relative p-3 rounded-xl border cursor-pointer transition-all ${selected.has(task.id) ? 'border-primary/40 bg-primary/5' : 'border-border bg-card hover:bg-muted/50'}`}>
                      <input type="checkbox" checked={selected.has(task.id)} onClick={e => toggleSelect(task.id, e)} onChange={() => {}} className="absolute top-2 left-2 w-3.5 h-3.5 rounded accent-primary cursor-pointer z-10" />
                      <div className="pl-5" onClick={() => handleSelectTask(task)}>
                        <div className="flex items-center gap-1.5 mb-1"><span className={`w-2 h-2 rounded-full ${PRIORITY_STYLES[task.priority].split(' ')[0]}`} /><span className="text-xs text-muted-foreground">{PRIORITY_LABELS[task.priority]}</span></div>
                        <div className="text-sm font-medium mb-1 line-clamp-2">{task.title}</div>
                        <div className="text-xs text-muted-foreground truncate"><Icon name="User" size={10} className="inline mr-1" />{task.assignee_name || '—'}</div>
                      </div>
                      <div className="flex items-center justify-end gap-0.5 mt-2 border-t border-border/50 pt-2">
                        <button onClick={(e) => { e.stopPropagation(); handleSelectTask(task); }} className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-blue-500 hover:bg-blue-500/10"><Icon name="Eye" size={12} /></button>
                        <button onClick={(e) => { e.stopPropagation(); printTasks([task]); }} className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60"><Icon name="Printer" size={12} /></button>
                        <button onClick={(e) => { e.stopPropagation(); if (task.status === 'done') handleArchive([task.id]); }} disabled={task.status !== 'done'} className={`w-6 h-6 rounded flex items-center justify-center transition-all ${task.status === 'done' ? 'text-amber-500 hover:bg-amber-500/10' : 'text-muted-foreground/25 cursor-not-allowed'}`}><Icon name="Archive" size={12} /></button>
                        <button onClick={(e) => { e.stopPropagation(); if (confirm('Удалить?')) handleDelete([task.id]); }} className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-500/10"><Icon name="Trash2" size={12} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}

      {selectedTask && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${PRIORITY_STYLES[selectedTask.priority]}`}>
                <Icon name={PRIORITY_ICONS[selectedTask.priority]} size={20} />
              </div>
              <div>
                <h3 className="font-bold text-lg">{selectedTask.title}</h3>
                <p className="text-sm text-muted-foreground">{CATEGORY_LABELS[selectedTask.category]}</p>
              </div>
            </div>
            <button onClick={() => handleSelectTask(null)} className="text-muted-foreground hover:text-foreground"><Icon name="X" size={18} /></button>
          </div>

          {selectedTask.description && <p className="text-sm text-muted-foreground">{selectedTask.description}</p>}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="text-xs text-muted-foreground mb-1">Статус</div>
              <select className="w-full bg-transparent text-sm font-medium border-none outline-none cursor-pointer" value={selectedTask.status} onChange={e => handleStatusChange(selectedTask.id, e.target.value as TaskStatus)}>
                {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
              </select>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="text-xs text-muted-foreground">Приоритет</div>
              <div className="font-medium text-sm mt-1">{PRIORITY_LABELS[selectedTask.priority]}</div>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="text-xs text-muted-foreground">Исполнитель</div>
              <div className="font-medium text-sm mt-1">{selectedTask.assignee_name || 'Не назначен'}</div>
              {selectedTask.assignee_role && <div className="text-xs text-muted-foreground">{ROLE_LABELS[selectedTask.assignee_role] || selectedTask.assignee_role}</div>}
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="text-xs text-muted-foreground">Срок исполнения</div>
              <div className={`font-medium text-sm mt-1 ${isOverdue(selectedTask.due_date, selectedTask.status) ? 'text-red-500' : ''}`}>{formatDate(selectedTask.due_date)}</div>
            </div>
          </div>

          {selectedTask.lifetime_hours && (
            <div className="flex items-center gap-3 bg-muted/50 rounded-lg p-3">
              <Icon name="Clock" size={16} className="text-muted-foreground shrink-0" />
              <div>
                <div className="text-xs text-muted-foreground">Время жизни задачи</div>
                <div className={`font-medium text-sm ${getLifetimeStatus(selectedTask)?.color || ''}`}>
                  {getLifetimeStatus(selectedTask)?.label || `${selectedTask.lifetime_hours}ч`}
                  <span className="text-muted-foreground font-normal ml-2">из {selectedTask.lifetime_hours}ч</span>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>Создал: {selectedTask.creator_name}</span>
            <span>Создано: {formatDateTime(selectedTask.created_at)}</span>
            {selectedTask.completed_at && <span>Завершено: {formatDateTime(selectedTask.completed_at)}</span>}
          </div>

          <div className="border-t border-border pt-4">
            <h4 className="font-semibold text-sm mb-3 flex items-center gap-2"><Icon name="MessageSquare" size={14} />Комментарии ({selectedTask.comment_count})</h4>
            {commentsLoading ? <div className="text-xs text-muted-foreground py-3">Загрузка...</div> : (
              <div className="space-y-2 max-h-60 overflow-auto">
                {comments.map(c => (
                  <div key={c.id} className="flex gap-2.5 p-2.5 bg-muted/30 rounded-lg">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-[10px] font-bold text-primary">{c.user_name.split(' ').map((w: string) => w[0]).join('').slice(0, 2)}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-medium">{c.user_name}</span>
                        <span className="text-muted-foreground">{ROLE_LABELS[c.user_role] || c.user_role}</span>
                        <span className="text-muted-foreground ml-auto">{formatDateTime(c.created_at)}</span>
                      </div>
                      <p className="text-sm mt-0.5">{c.message}</p>
                    </div>
                  </div>
                ))}
                {comments.length === 0 && <div className="text-xs text-muted-foreground py-2">Комментариев пока нет</div>}
              </div>
            )}
            <div className="flex gap-2 mt-3">
              <input className="flex-1 px-3 py-2 rounded-lg bg-muted border border-border text-sm" placeholder="Написать комментарий..." value={newComment} onChange={e => setNewComment(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleAddComment()} />
              <button onClick={handleAddComment} disabled={!newComment.trim() || savingComment} className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90 disabled:opacity-50">
                <Icon name="Send" size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
