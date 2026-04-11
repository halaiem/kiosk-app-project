import { useState, useMemo, useCallback } from 'react';
import Icon from '@/components/ui/icon';

type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
type TaskStatus = 'new' | 'in_progress' | 'review' | 'done' | 'cancelled';
type TaskCategory = 'transport' | 'staff' | 'depot' | 'docs' | 'repair' | 'other';

interface Task {
  id: string;
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  category: TaskCategory;
  assignee: string;
  assigneeRole: string;
  createdAt: string;
  dueDate: string;
  comments: number;
  attachments: number;
}

const PRIORITY_STYLES: Record<TaskPriority, string> = {
  low: 'bg-slate-500/15 text-slate-500',
  medium: 'bg-blue-500/15 text-blue-500',
  high: 'bg-amber-500/15 text-amber-500',
  urgent: 'bg-red-500/15 text-red-500',
};

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: 'Низкий',
  medium: 'Средний',
  high: 'Высокий',
  urgent: 'Срочно',
};

const PRIORITY_ICONS: Record<TaskPriority, string> = {
  low: 'ArrowDown',
  medium: 'ArrowRight',
  high: 'ArrowUp',
  urgent: 'AlertTriangle',
};

const STATUS_STYLES: Record<TaskStatus, string> = {
  new: 'bg-blue-500/15 text-blue-500',
  in_progress: 'bg-amber-500/15 text-amber-500',
  review: 'bg-purple-500/15 text-purple-500',
  done: 'bg-green-500/15 text-green-500',
  cancelled: 'bg-slate-500/15 text-slate-400',
};

const STATUS_LABELS: Record<TaskStatus, string> = {
  new: 'Новая',
  in_progress: 'В работе',
  review: 'На проверке',
  done: 'Выполнена',
  cancelled: 'Отменена',
};

const CATEGORY_LABELS: Record<TaskCategory, string> = {
  transport: 'Транспорт',
  staff: 'Персонал',
  depot: 'Депо / Парк',
  docs: 'Документы',
  repair: 'Ремонт',
  other: 'Прочее',
};

const CATEGORY_ICONS: Record<TaskCategory, string> = {
  transport: 'Bus',
  staff: 'Users',
  depot: 'Warehouse',
  docs: 'FileText',
  repair: 'Wrench',
  other: 'MoreHorizontal',
};

const STATUSES: TaskStatus[] = ['new', 'in_progress', 'review', 'done', 'cancelled'];

const MOCK_TASKS: Task[] = [
  {
    id: 't1', title: 'Провести ТО-2 для трамваев депо №1',
    description: 'Необходимо провести плановое техобслуживание для 12 вагонов, срок — до конца месяца.',
    priority: 'high', status: 'in_progress', category: 'repair',
    assignee: 'Петров А.С.', assigneeRole: 'engineer', createdAt: '2026-04-10', dueDate: '2026-04-25',
    comments: 3, attachments: 1,
  },
  {
    id: 't2', title: 'Составить график отпусков водителей на лето',
    description: 'Согласовать с профсоюзом и утвердить график отпусков на июнь-август.',
    priority: 'medium', status: 'new', category: 'staff',
    assignee: 'Сидорова Е.В.', assigneeRole: 'manager', createdAt: '2026-04-09', dueDate: '2026-04-20',
    comments: 0, attachments: 0,
  },
  {
    id: 't3', title: 'Заменить контактную сеть на участке пр. Космонавтов',
    description: 'Износ контактного провода превышает 40%. Требуется замена на участке 2.3 км.',
    priority: 'urgent', status: 'new', category: 'repair',
    assignee: 'Абрамов К.Л.', assigneeRole: 'engineer', createdAt: '2026-04-11', dueDate: '2026-04-15',
    comments: 5, attachments: 3,
  },
  {
    id: 't4', title: 'Закупка запчастей для электробусов',
    description: 'Подготовить спецификацию и заявку на закупку тяговых батарей для 8 электробусов.',
    priority: 'high', status: 'review', category: 'transport',
    assignee: 'Орлов Д.В.', assigneeRole: 'manager', createdAt: '2026-04-08', dueDate: '2026-04-18',
    comments: 7, attachments: 2,
  },
  {
    id: 't5', title: 'Обновить документацию по маршрутам №12, 15',
    description: 'Внести изменения согласно новой схеме движения, утверждённой 05.04.2026.',
    priority: 'medium', status: 'in_progress', category: 'docs',
    assignee: 'Морозова Е.В.', assigneeRole: 'dispatcher', createdAt: '2026-04-07', dueDate: '2026-04-14',
    comments: 2, attachments: 4,
  },
  {
    id: 't6', title: 'Проверить системы пожаротушения в депо №1',
    description: 'Ежеквартальная проверка систем противопожарной безопасности.',
    priority: 'high', status: 'done', category: 'depot',
    assignee: 'Козлов А.П.', assigneeRole: 'manager', createdAt: '2026-04-01', dueDate: '2026-04-10',
    comments: 1, attachments: 1,
  },
  {
    id: 't7', title: 'Организовать обучение новых водителей',
    description: 'Набрать группу из 10 стажёров, составить график обучения на 3 недели.',
    priority: 'medium', status: 'new', category: 'staff',
    assignee: 'Семёнова Т.Д.', assigneeRole: 'manager', createdAt: '2026-04-11', dueDate: '2026-04-30',
    comments: 0, attachments: 0,
  },
  {
    id: 't8', title: 'Диагностика электрооборудования троллейбусов',
    description: 'Плановая проверка тяговых двигателей и силовых блоков для 15 единиц.',
    priority: 'medium', status: 'in_progress', category: 'transport',
    assignee: 'Петров А.С.', assigneeRole: 'engineer', createdAt: '2026-04-06', dueDate: '2026-04-16',
    comments: 4, attachments: 2,
  },
  {
    id: 't9', title: 'Подготовить отчёт по расходу ГСМ за Q1',
    description: 'Свести данные по всем паркам и предоставить руководству.',
    priority: 'low', status: 'done', category: 'docs',
    assignee: 'Тимофеева Н.Г.', assigneeRole: 'technician', createdAt: '2026-04-02', dueDate: '2026-04-08',
    comments: 1, attachments: 1,
  },
  {
    id: 't10', title: 'Ремонт ворот бокса №4 в парке №3',
    description: 'Автоматические ворота не закрываются полностью. Требуется замена привода.',
    priority: 'medium', status: 'cancelled', category: 'depot',
    assignee: 'Романов В.П.', assigneeRole: 'mechanic', createdAt: '2026-04-05', dueDate: '2026-04-12',
    comments: 2, attachments: 0,
  },
];

function formatDate(d: string): string {
  const date = new Date(d);
  const day = String(date.getDate()).padStart(2, '0');
  const mon = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}.${mon}`;
}

function isOverdue(dueDate: string, status: TaskStatus): boolean {
  if (status === 'done' || status === 'cancelled') return false;
  return new Date(dueDate) < new Date();
}

interface TasksViewProps {
  currentUserId?: number;
}

export default function TasksView({ currentUserId }: TasksViewProps) {
  const [tasks, setTasks] = useState<Task[]>(MOCK_TASKS);
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<TaskCategory | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | 'all'>('all');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'board'>('list');
  const [showCreate, setShowCreate] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPriority, setNewPriority] = useState<TaskPriority>('medium');
  const [newCategory, setNewCategory] = useState<TaskCategory>('other');
  const [newAssignee, setNewAssignee] = useState('');
  const [newDue, setNewDue] = useState('');

  const filtered = useMemo(() => {
    let list = tasks;
    if (statusFilter !== 'all') list = list.filter(t => t.status === statusFilter);
    if (categoryFilter !== 'all') list = list.filter(t => t.category === categoryFilter);
    if (priorityFilter !== 'all') list = list.filter(t => t.priority === priorityFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(t =>
        t.title.toLowerCase().includes(q) ||
        t.assignee.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q)
      );
    }
    return list;
  }, [tasks, statusFilter, categoryFilter, priorityFilter, search]);

  const statusCounts = useMemo(() => {
    const c: Record<string, number> = { all: tasks.length };
    STATUSES.forEach(s => { c[s] = tasks.filter(t => t.status === s).length; });
    return c;
  }, [tasks]);

  const handleCreate = useCallback(() => {
    if (!newTitle.trim()) return;
    const task: Task = {
      id: `t${Date.now()}`,
      title: newTitle,
      description: newDesc,
      priority: newPriority,
      status: 'new',
      category: newCategory,
      assignee: newAssignee || 'Не назначен',
      assigneeRole: 'manager',
      createdAt: new Date().toISOString().split('T')[0],
      dueDate: newDue || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      comments: 0,
      attachments: 0,
    };
    setTasks(prev => [task, ...prev]);
    setNewTitle(''); setNewDesc(''); setNewPriority('medium');
    setNewCategory('other'); setNewAssignee(''); setNewDue('');
    setShowCreate(false);
  }, [newTitle, newDesc, newPriority, newCategory, newAssignee, newDue]);

  const handleStatusChange = useCallback((taskId: string, newStatus: TaskStatus) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    setSelectedTask(prev => prev && prev.id === taskId ? { ...prev, status: newStatus } : prev);
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Задачи</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Управление задачами и поручениями</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
          >
            <Icon name="List" size={14} className="inline mr-1.5" />Список
          </button>
          <button
            onClick={() => setViewMode('board')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${viewMode === 'board' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
          >
            <Icon name="Columns3" size={14} className="inline mr-1.5" />Доска
          </button>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="px-3 py-1.5 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-all"
          >
            <Icon name="Plus" size={14} className="inline mr-1.5" />Создать
          </button>
        </div>
      </div>

      <div className="flex gap-1.5 flex-wrap">
        {(['all', ...STATUSES] as const).map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${statusFilter === s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
          >
            {s === 'all' ? 'Все' : STATUS_LABELS[s]} ({statusCounts[s] || 0})
          </button>
        ))}
      </div>

      {showCreate && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <h3 className="font-semibold text-sm">Новая задача</h3>
          <input
            className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm"
            placeholder="Название задачи..."
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
          />
          <textarea
            className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm resize-none"
            rows={2}
            placeholder="Описание..."
            value={newDesc}
            onChange={e => setNewDesc(e.target.value)}
          />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <select
              className="px-3 py-2 rounded-lg bg-muted border border-border text-sm"
              value={newPriority}
              onChange={e => setNewPriority(e.target.value as TaskPriority)}
            >
              {Object.entries(PRIORITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select
              className="px-3 py-2 rounded-lg bg-muted border border-border text-sm"
              value={newCategory}
              onChange={e => setNewCategory(e.target.value as TaskCategory)}
            >
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <input
              className="px-3 py-2 rounded-lg bg-muted border border-border text-sm"
              placeholder="Исполнитель..."
              value={newAssignee}
              onChange={e => setNewAssignee(e.target.value)}
            />
            <input
              type="date"
              className="px-3 py-2 rounded-lg bg-muted border border-border text-sm"
              value={newDue}
              onChange={e => setNewDue(e.target.value)}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowCreate(false)} className="px-4 py-1.5 rounded-lg text-sm bg-muted hover:bg-muted/80">Отмена</button>
            <button onClick={handleCreate} className="px-4 py-1.5 rounded-lg text-sm bg-primary text-primary-foreground hover:bg-primary/90" disabled={!newTitle.trim()}>Создать</button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Icon name="Search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-muted border border-border text-sm"
            placeholder="Поиск задачи..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="px-3 py-2 rounded-lg bg-muted border border-border text-sm"
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value as TaskCategory | 'all')}
        >
          <option value="all">Все категории</option>
          {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select
          className="px-3 py-2 rounded-lg bg-muted border border-border text-sm"
          value={priorityFilter}
          onChange={e => setPriorityFilter(e.target.value as TaskPriority | 'all')}
        >
          <option value="all">Все приоритеты</option>
          {Object.entries(PRIORITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {viewMode === 'list' ? (
        <div className="space-y-2">
          {filtered.map(task => (
            <button
              key={task.id}
              onClick={() => setSelectedTask(task.id === selectedTask?.id ? null : task)}
              className={`w-full text-left p-4 rounded-xl border transition-all ${task.id === selectedTask?.id ? 'border-primary bg-primary/5' : 'border-border bg-card hover:bg-muted/50'}`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${PRIORITY_STYLES[task.priority]}`}>
                  <Icon name={PRIORITY_ICONS[task.priority]} size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`font-medium text-sm ${task.status === 'cancelled' ? 'line-through text-muted-foreground' : ''}`}>
                      {task.title}
                    </span>
                    {isOverdue(task.dueDate, task.status) && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-500 font-medium">Просрочено</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground flex-wrap">
                    <span className={`px-2 py-0.5 rounded-full ${STATUS_STYLES[task.status]}`}>{STATUS_LABELS[task.status]}</span>
                    <span className="flex items-center gap-1">
                      <Icon name={CATEGORY_ICONS[task.category]} size={11} />{CATEGORY_LABELS[task.category]}
                    </span>
                    <span className="flex items-center gap-1">
                      <Icon name="User" size={11} />{task.assignee}
                    </span>
                    <span className="flex items-center gap-1">
                      <Icon name="Calendar" size={11} />до {formatDate(task.dueDate)}
                    </span>
                    {task.comments > 0 && (
                      <span className="flex items-center gap-1"><Icon name="MessageSquare" size={11} />{task.comments}</span>
                    )}
                    {task.attachments > 0 && (
                      <span className="flex items-center gap-1"><Icon name="Paperclip" size={11} />{task.attachments}</span>
                    )}
                  </div>
                </div>
              </div>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="text-center text-muted-foreground text-sm py-12">Задачи не найдены</div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {(['new', 'in_progress', 'review', 'done'] as TaskStatus[]).map(status => {
            const col = filtered.filter(t => t.status === status);
            return (
              <div key={status} className="space-y-2">
                <div className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg ${STATUS_STYLES[status]}`}>
                  {STATUS_LABELS[status]} ({col.length})
                </div>
                {col.map(task => (
                  <button
                    key={task.id}
                    onClick={() => setSelectedTask(task)}
                    className="w-full text-left p-3 rounded-xl border border-border bg-card hover:bg-muted/50 transition-all"
                  >
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className={`w-2 h-2 rounded-full ${PRIORITY_STYLES[task.priority].split(' ')[0]}`} />
                      <span className="text-xs text-muted-foreground">{PRIORITY_LABELS[task.priority]}</span>
                    </div>
                    <div className="text-sm font-medium mb-2 line-clamp-2">{task.title}</div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Icon name={CATEGORY_ICONS[task.category]} size={10} />{CATEGORY_LABELS[task.category]}
                      </span>
                      <span>до {formatDate(task.dueDate)}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 truncate">
                      <Icon name="User" size={10} className="inline mr-1" />{task.assignee}
                    </div>
                  </button>
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
            <button onClick={() => setSelectedTask(null)} className="text-muted-foreground hover:text-foreground">
              <Icon name="X" size={18} />
            </button>
          </div>

          <p className="text-sm text-muted-foreground">{selectedTask.description}</p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="text-xs text-muted-foreground">Статус</div>
              <select
                className="mt-1 w-full bg-transparent text-sm font-medium border-none outline-none"
                value={selectedTask.status}
                onChange={e => handleStatusChange(selectedTask.id, e.target.value as TaskStatus)}
              >
                {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
              </select>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="text-xs text-muted-foreground">Приоритет</div>
              <div className="font-medium text-sm mt-1 flex items-center gap-1.5">
                <Icon name={PRIORITY_ICONS[selectedTask.priority]} size={13} className={PRIORITY_STYLES[selectedTask.priority].split(' ')[1]} />
                {PRIORITY_LABELS[selectedTask.priority]}
              </div>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="text-xs text-muted-foreground">Исполнитель</div>
              <div className="font-medium text-sm mt-1">{selectedTask.assignee}</div>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="text-xs text-muted-foreground">Срок</div>
              <div className={`font-medium text-sm mt-1 ${isOverdue(selectedTask.dueDate, selectedTask.status) ? 'text-red-500' : ''}`}>
                {formatDate(selectedTask.dueDate)}
                {isOverdue(selectedTask.dueDate, selectedTask.status) && ' (просрочено)'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>Создано: {formatDate(selectedTask.createdAt)}</span>
            {selectedTask.comments > 0 && <span><Icon name="MessageSquare" size={12} className="inline mr-1" />{selectedTask.comments} комментариев</span>}
            {selectedTask.attachments > 0 && <span><Icon name="Paperclip" size={12} className="inline mr-1" />{selectedTask.attachments} вложений</span>}
          </div>
        </div>
      )}
    </div>
  );
}
