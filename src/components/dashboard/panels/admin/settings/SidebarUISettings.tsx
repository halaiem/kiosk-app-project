import { useState, useCallback, useRef } from 'react';
import Icon from '@/components/ui/icon';
import {
  useAppSettings,
  type SidebarRoleKey,
  type SidebarConfig,
  type SidebarNavItem,
  SIDEBAR_CONFIG_KEY,
  defaultSidebarConfig,
} from '@/context/AppSettingsContext';
import IconPickerModal from './IconPickerModal';

const ROLES: { key: SidebarRoleKey; label: string; icon: string }[] = [
  { key: 'dispatcher', label: 'Диспетчер', icon: 'Radio' },
  { key: 'technician', label: 'Технолог', icon: 'Wrench' },
  { key: 'admin', label: 'Администратор', icon: 'ShieldCheck' },
  { key: 'mechanic', label: 'Механик', icon: 'Settings' },
  { key: 'engineer', label: 'Инженер', icon: 'Zap' },
  { key: 'manager', label: 'Управляющий', icon: 'Briefcase' },
];

const DEFAULT_NAV: Record<SidebarRoleKey, SidebarNavItem[]> = {
  dispatcher: [
    { tab: 'overview', icon: 'LayoutDashboard', label: 'Обзор' },
    { tab: 'service_requests', icon: 'ClipboardList', label: 'Заявки' },
    { tab: 'tasks', icon: 'ListTodo', label: 'Задачи' },
    { tab: 'tasks_archive', icon: 'Archive', label: 'Архив задач' },
    { tab: 'depot_park', icon: 'Warehouse', label: 'Парк / Депо' },
    { tab: 'dash_messages', icon: 'MessagesSquare', label: 'Мессенджер' },
    { tab: 'notifications', icon: 'Bell', label: 'Уведомления' },
    { tab: 'alerts', icon: 'AlertTriangle', label: 'Тревоги' },
    { tab: 'vehicle_issues', icon: 'Truck', label: 'Проблемы ТС' },
  ],
  technician: [
    { tab: 'service_requests', icon: 'ClipboardList', label: 'Заявки' },
    { tab: 'tasks', icon: 'ListTodo', label: 'Задачи' },
    { tab: 'tasks_archive', icon: 'Archive', label: 'Архив задач' },
    { tab: 'depot_park', icon: 'Warehouse', label: 'Парк / Депо' },
    { tab: 'routes', icon: 'Route', label: 'Маршруты' },
    { tab: 'documents', icon: 'FileText', label: 'Документы' },
    { tab: 'vehicles', icon: 'Bus', label: 'Транспорт' },
    { tab: 'drivers', icon: 'Users', label: 'Водители' },
    { tab: 'schedule', icon: 'Calendar', label: 'Расписание' },
    { tab: 'daily_assignment', icon: 'ClipboardList', label: 'Наряд на день' },
    { tab: 'diagnostics', icon: 'Activity', label: 'Диагностика' },
    { tab: 'notifications', icon: 'Bell', label: 'Уведомления' },
    { tab: 'dash_messages', icon: 'MessageSquare', label: 'Сообщения' },
  ],
  admin: [
    { tab: 'users', icon: 'Users', label: 'Пользователи' },
    { tab: 'dash_messages', icon: 'MessageSquare', label: 'Сообщения' },
    { tab: 'notifications', icon: 'Bell', label: 'Уведомления' },
    { tab: 'service_requests', icon: 'ClipboardList', label: 'Заявки' },
    { tab: 'tasks', icon: 'ListTodo', label: 'Задачи' },
    { tab: 'tasks_archive', icon: 'Archive', label: 'Архив задач' },
    { tab: 'depot_park', icon: 'Warehouse', label: 'Парк / Депо' },
    { tab: 'ticket_archive', icon: 'Archive', label: 'Архив заявок' },
    { tab: 'settings', icon: 'Settings', label: 'Настройки' },
    { tab: 'diagnostic_apis', icon: 'Plug', label: 'API' },
    { tab: 'servers', icon: 'Server', label: 'Серверы' },
    { tab: 'logs', icon: 'ScrollText', label: 'Логи' },
  ],
  mechanic: [
    { tab: 'service_requests', icon: 'ClipboardList', label: 'Заявки' },
    { tab: 'tasks', icon: 'ListTodo', label: 'Задачи' },
    { tab: 'tasks_archive', icon: 'Archive', label: 'Архив задач' },
    { tab: 'depot_park', icon: 'Warehouse', label: 'Парк / Депо' },
    { tab: 'auto_diagnostics', icon: 'Activity', label: 'Диагностика' },
    { tab: 'service_log', icon: 'BookOpen', label: 'Журнал' },
    { tab: 'ts_docs', icon: 'FolderOpen', label: 'Документация ТС' },
    { tab: 'email', icon: 'Mail', label: 'Email' },
    { tab: 'notifications', icon: 'Bell', label: 'Уведомления' },
    { tab: 'dash_messages', icon: 'MessageSquare', label: 'Мессенджер' },
  ],
  engineer: [
    { tab: 'service_requests', icon: 'ClipboardList', label: 'Заявки' },
    { tab: 'tasks', icon: 'ListTodo', label: 'Задачи' },
    { tab: 'tasks_archive', icon: 'Archive', label: 'Архив задач' },
    { tab: 'documents', icon: 'FileText', label: 'Документы' },
    { tab: 'vehicles', icon: 'Bus', label: 'Транспорт' },
    { tab: 'diagnostics', icon: 'Activity', label: 'Диагностика' },
    { tab: 'depot_park', icon: 'Warehouse', label: 'Парк / Депо' },
    { tab: 'notifications', icon: 'Bell', label: 'Уведомления' },
    { tab: 'dash_messages', icon: 'MessageSquare', label: 'Сообщения' },
  ],
  manager: [
    { tab: 'service_requests', icon: 'ClipboardList', label: 'Заявки' },
    { tab: 'tasks', icon: 'ListTodo', label: 'Задачи' },
    { tab: 'tasks_archive', icon: 'Archive', label: 'Архив задач' },
    { tab: 'vehicles', icon: 'Bus', label: 'Транспорт' },
    { tab: 'drivers', icon: 'Users', label: 'Персонал' },
    { tab: 'schedule', icon: 'Calendar', label: 'Расписание' },
    { tab: 'depot_park', icon: 'Warehouse', label: 'Парк / Депо' },
    { tab: 'notifications', icon: 'Bell', label: 'Уведомления' },
    { tab: 'dash_messages', icon: 'MessageSquare', label: 'Сообщения' },
  ],
};

const PATTERNS = [
  { key: 'dots', label: 'Точки', svg: `url("data:image/svg+xml,%3Csvg width='20' height='20' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='10' cy='10' r='2' fill='%23COLOR'/%3E%3C/svg%3E")` },
  { key: 'grid', label: 'Сетка', svg: `url("data:image/svg+xml,%3Csvg width='20' height='20' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h20v1H0zM0 0h1v20H0z' fill='%23COLOR'/%3E%3C/svg%3E")` },
  { key: 'diagonal', label: 'Диагональ', svg: `url("data:image/svg+xml,%3Csvg width='20' height='20' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 20L20 0' stroke='%23COLOR' stroke-width='1'/%3E%3C/svg%3E")` },
  { key: 'crosshatch', label: 'Перекрестие', svg: `url("data:image/svg+xml,%3Csvg width='20' height='20' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 10h20M10 0v20' stroke='%23COLOR' stroke-width='0.5'/%3E%3C/svg%3E")` },
  { key: 'waves', label: 'Волны', svg: `url("data:image/svg+xml,%3Csvg width='40' height='12' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 6 Q10 0 20 6 T40 6' stroke='%23COLOR' stroke-width='1' fill='none'/%3E%3C/svg%3E")` },
  { key: 'hexagons', label: 'Шестигранники', svg: `url("data:image/svg+xml,%3Csvg width='24' height='28' xmlns='http://www.w3.org/2000/svg'%3E%3Cpolygon points='12,1 23,7 23,21 12,27 1,21 1,7' stroke='%23COLOR' stroke-width='0.8' fill='none'/%3E%3C/svg%3E")` },
];

function Slider({ label, value, min, max, step = 1, unit = '', onChange }: {
  label: string; value: number; min: number; max: number; step?: number; unit?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value}{unit}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full accent-primary cursor-pointer" />
      <div className="flex justify-between text-[10px] text-muted-foreground/50">
        <span>{min}{unit}</span><span>{max}{unit}</span>
      </div>
    </div>
  );
}

export default function SidebarUISettings() {
  const { settings, updateSidebarConfig } = useAppSettings();
  const [role, setRole] = useState<SidebarRoleKey>('dispatcher');
  const [saved, setSaved] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const patternSvgRef = useRef<HTMLInputElement>(null);
  const overlayImgRef = useRef<HTMLInputElement>(null);
  // Icon picker
  const [iconPickerTab, setIconPickerTab] = useState<string | null>(null); // tab key being edited

  const configKey = SIDEBAR_CONFIG_KEY[role] as keyof typeof settings;
  const cfg = settings[configKey] as SidebarConfig;

  const upd = useCallback((patch: Partial<SidebarConfig>) => {
    updateSidebarConfig(role, patch);
    setSaved(false);
  }, [role, updateSidebarConfig]);

  const save = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };
  const reset = () => { updateSidebarConfig(role, defaultSidebarConfig()); };

  const getNavItems = (): SidebarNavItem[] => {
    if (cfg.navOrder && cfg.navOrder.length > 0) return cfg.navOrder;
    return DEFAULT_NAV[role].map(item => ({ ...item }));
  };
  const navItems = getNavItems();

  const initNav = () => {
    if (!cfg.navOrder || cfg.navOrder.length === 0) {
      upd({ navOrder: DEFAULT_NAV[role].map(item => ({ ...item })) });
    }
  };

  const toggleNavItem = (tab: string) => {
    initNav();
    const items = getNavItems();
    upd({ navOrder: items.map(i => i.tab === tab ? { ...i, hidden: !i.hidden } : i) });
  };

  const handleDragStart = (i: number) => { initNav(); setDragIndex(i); };
  const handleDragOver = (e: React.DragEvent, i: number) => { e.preventDefault(); setDragOver(i); };
  const handleDrop = (i: number) => {
    if (dragIndex === null || dragIndex === i) { setDragIndex(null); setDragOver(null); return; }
    const items = [...getNavItems()];
    const [moved] = items.splice(dragIndex, 1);
    items.splice(i, 0, moved);
    upd({ navOrder: items });
    setDragIndex(null); setDragOver(null);
  };

  const changeNavIcon = (tab: string, iconName: string) => {
    initNav();
    const items = getNavItems();
    upd({ navOrder: items.map(i => i.tab === tab ? { ...i, icon: iconName } : i) });
  };

  const readFile = (file: File): Promise<string> => new Promise((res, rej) => {
    const r = new FileReader(); r.onload = () => res(r.result as string); r.onerror = rej; r.readAsDataURL(file);
  });

  const patternCss = cfg.bgPattern && !cfg.bgPattern.startsWith('data:')
    ? (PATTERNS.find(p => p.key === cfg.bgPattern)?.svg.replace('%23COLOR', cfg.bgPatternColor.replace('#', '')) ?? null)
    : null;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-base">Настройка Sidebar UI</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Размеры, порядок разделов, фон — для каждой роли отдельно</p>
        </div>
        <div className="flex gap-2">
          <button onClick={reset} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-muted text-muted-foreground hover:text-foreground transition-colors">
            Сбросить
          </button>
          <button onClick={save} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center gap-1.5">
            <Icon name={saved ? 'Check' : 'Save'} size={13} />{saved ? 'Сохранено!' : 'Сохранить'}
          </button>
        </div>
      </div>

      {/* Role selector */}
      <div className="flex gap-1.5 flex-wrap">
        {ROLES.map(r => (
          <button key={r.key} onClick={() => setRole(r.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${role === r.key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>
            <Icon name={r.icon} size={13} />{r.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* LEFT: Dimensions */}
        <div className="space-y-4">
          <div className="bg-muted/30 rounded-xl p-4 space-y-4 border border-border">
            <h4 className="text-sm font-semibold flex items-center gap-2"><Icon name="Ruler" size={14} />Размеры</h4>
            <Slider label="Ширина sidebar" value={cfg.width} min={180} max={320} unit="px" onChange={v => upd({ width: v })} />
            <Slider label="Высота Header" value={cfg.headerHeight} min={48} max={120} unit="px" onChange={v => upd({ headerHeight: v })} />
            <Slider label="Высота Footer" value={cfg.footerHeight} min={80} max={240} unit="px" onChange={v => upd({ footerHeight: v })} />
            <Slider label="Размер логотипа" value={cfg.logoSize} min={20} max={64} unit="px" onChange={v => upd({ logoSize: v })} />
          </div>

          <div className="bg-muted/30 rounded-xl p-4 space-y-4 border border-border">
            <h4 className="text-sm font-semibold flex items-center gap-2"><Icon name="AlignLeft" size={14} />Навигация</h4>
            <Slider label="Высота пункта меню" value={cfg.navItemHeight} min={28} max={56} unit="px" onChange={v => upd({ navItemHeight: v })} />
            <Slider label="Размер шрифта" value={cfg.navFontSize} min={10} max={18} unit="px" onChange={v => upd({ navFontSize: v })} />
          </div>
        </div>

        {/* CENTER: Pattern + Overlay */}
        <div className="space-y-4">

          {/* Pattern block */}
          <div className="bg-muted/30 rounded-xl p-4 space-y-4 border border-border">
            <h4 className="text-sm font-semibold flex items-center gap-2"><Icon name="Grid3x3" size={14} />Паттерн фона</h4>
            <div className="grid grid-cols-3 gap-1.5">
              <button onClick={() => upd({ bgPattern: null })}
                className={`py-1.5 rounded-lg text-[10px] border transition-all ${!cfg.bgPattern ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-muted/50 text-muted-foreground hover:border-primary/50'}`}>
                Нет
              </button>
              {PATTERNS.map(p => (
                <button key={p.key} onClick={() => upd({ bgPattern: p.key })}
                  className={`py-1.5 rounded-lg text-[10px] border transition-all ${cfg.bgPattern === p.key ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-muted/50 text-muted-foreground hover:border-primary/50'}`}>
                  {p.label}
                </button>
              ))}
              {/* SVG custom pattern */}
              <button
                onClick={() => patternSvgRef.current?.click()}
                className={`py-1.5 rounded-lg text-[10px] border transition-all flex items-center justify-center gap-1 ${cfg.bgPattern?.startsWith('data:') ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-muted/50 text-muted-foreground hover:border-primary/50'}`}>
                <Icon name="Upload" size={10} />SVG
              </button>
              <input ref={patternSvgRef} type="file" accept=".svg,image/svg+xml" className="hidden"
                onChange={async e => {
                  const f = e.target.files?.[0]; e.target.value = '';
                  if (!f) return;
                  upd({ bgPattern: await readFile(f) });
                }} />
            </div>
            {/* Custom SVG preview */}
            {cfg.bgPattern?.startsWith('data:') && (
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded border border-border overflow-hidden bg-muted/50"
                  style={{ backgroundImage: `url(${cfg.bgPattern})`, backgroundSize: '20px', backgroundRepeat: 'repeat' }} />
                <span className="text-xs text-muted-foreground flex-1">Свой SVG-паттерн</span>
                <button onClick={() => upd({ bgPattern: null })} className="w-7 h-7 rounded bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-500/20">
                  <Icon name="X" size={12} />
                </button>
              </div>
            )}
            {cfg.bgPattern && (
              <>
                {!cfg.bgPattern.startsWith('data:') && (
                  <div className="flex items-center gap-3">
                    <label className="text-xs text-muted-foreground">Цвет паттерна</label>
                    <input type="color" value={cfg.bgPatternColor} onChange={e => upd({ bgPatternColor: e.target.value })}
                      className="w-8 h-8 rounded-lg cursor-pointer border border-border" />
                  </div>
                )}
                <Slider label="Масштаб паттерна" value={Math.round(cfg.bgPatternScale * 100)} min={25} max={300} unit="%" onChange={v => upd({ bgPatternScale: v / 100 })} />
                <Slider label="Прозрачность" value={Math.round(cfg.bgPatternOpacity * 100)} min={0} max={100} unit="%" onChange={v => upd({ bgPatternOpacity: v / 100 })} />
              </>
            )}
          </div>

          {/* Overlay / second logo block */}
          <div className="bg-muted/30 rounded-xl p-4 space-y-4 border border-border">
            <h4 className="text-sm font-semibold flex items-center gap-2"><Icon name="Layers" size={14} />Второй логотип / оверлей</h4>
            <p className="text-[11px] text-muted-foreground leading-relaxed">SVG или изображение поверх sidebar. Можно двигать по горизонтали и вертикали.</p>
            <div className="flex items-center gap-2">
              <button onClick={() => overlayImgRef.current?.click()}
                className="flex-1 py-2 rounded-lg border border-dashed border-border text-xs text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors flex items-center justify-center gap-2">
                <Icon name="Upload" size={13} />Загрузить SVG / картинку
              </button>
              {cfg.overlayImage && (
                <button onClick={() => upd({ overlayImage: null })} title="Удалить"
                  className="w-8 h-8 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 flex items-center justify-center">
                  <Icon name="X" size={13} />
                </button>
              )}
            </div>
            <input ref={overlayImgRef} type="file" accept="image/*,.svg" className="hidden"
              onChange={async e => {
                const f = e.target.files?.[0]; e.target.value = '';
                if (!f) return;
                upd({ overlayImage: await readFile(f) });
              }} />
            {cfg.overlayImage && (
              <div className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg border border-border">
                <img src={cfg.overlayImage} alt="" className="w-10 h-10 object-contain" />
                <span className="text-xs text-muted-foreground">Загружено</span>
              </div>
            )}
            {cfg.overlayImage && (
              <>
                <Slider label="Размер" value={cfg.overlaySize ?? 80} min={20} max={240} unit="px" onChange={v => upd({ overlaySize: v })} />
                <Slider label="Позиция X (лево ↔ право)" value={cfg.overlayX ?? 50} min={0} max={100} unit="%" onChange={v => upd({ overlayX: v })} />
                <Slider label="Позиция Y (верх ↕ низ)" value={cfg.overlayY ?? 50} min={0} max={100} unit="%" onChange={v => upd({ overlayY: v })} />
                <Slider label="Прозрачность" value={Math.round((cfg.overlayOpacity ?? 0.15) * 100)} min={0} max={100} unit="%" onChange={v => upd({ overlayOpacity: v / 100 })} />
              </>
            )}
          </div>
        </div>

        {/* RIGHT: Nav order */}
        <div className="space-y-4">
          <div className="bg-muted/30 rounded-xl p-4 border border-border">
            <h4 className="text-sm font-semibold flex items-center gap-2 mb-1"><Icon name="GripVertical" size={14} />Порядок разделов</h4>
            <p className="text-xs text-muted-foreground mb-3">
              Перетащите — порядок. <Icon name="Pencil" size={10} className="inline mx-0.5" /> — иконка.
              <Icon name="Eye" size={10} className="inline mx-0.5" /> — скрыть/показать.
            </p>
            <div className="space-y-1 max-h-[420px] overflow-y-auto">
              {navItems.map((item, i) => (
                <div key={item.tab}
                  draggable
                  onDragStart={() => handleDragStart(i)}
                  onDragOver={e => handleDragOver(e, i)}
                  onDrop={() => handleDrop(i)}
                  className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border cursor-grab active:cursor-grabbing transition-all select-none ${
                    dragOver === i ? 'border-primary bg-primary/10' :
                    item.hidden ? 'border-border/50 bg-muted/20 opacity-40' :
                    'border-border bg-muted/40 hover:bg-muted/60'
                  }`}>
                  <Icon name="GripVertical" size={11} className="text-muted-foreground shrink-0" />

                  {/* Icon button — click to change */}
                  <button
                    onClick={e => { e.stopPropagation(); setIconPickerTab(item.tab); }}
                    title="Изменить иконку"
                    className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 transition-all group relative
                      ${item.hidden ? 'text-muted-foreground/50' : 'text-muted-foreground hover:text-primary hover:bg-primary/10'}`}>
                    <Icon name={item.icon} size={13} />
                    {/* pencil badge on hover */}
                    <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-primary text-white hidden group-hover:flex items-center justify-center">
                      <Icon name="Pencil" size={7} />
                    </span>
                  </button>

                  <span className={`flex-1 text-xs min-w-0 truncate ${item.hidden ? 'line-through text-muted-foreground/50' : ''}`}>
                    {item.label}
                  </span>

                  {/* Hide/show */}
                  <button onClick={() => toggleNavItem(item.tab)} title={item.hidden ? 'Показать' : 'Скрыть'}
                    className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors shrink-0">
                    <Icon name={item.hidden ? 'EyeOff' : 'Eye'} size={12} />
                  </button>
                </div>
              ))}
            </div>
            <button onClick={() => upd({ navOrder: [] })} className="mt-2 w-full py-1.5 rounded-lg text-[10px] text-muted-foreground hover:text-foreground bg-muted/30 hover:bg-muted/50 transition-colors">
              Сбросить порядок и иконки
            </button>
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="bg-muted/30 rounded-xl p-4 border border-border">
        <h4 className="text-sm font-semibold mb-3 flex items-center gap-2"><Icon name="Eye" size={14} />Предпросмотр Sidebar</h4>
        <div className="flex justify-center">
          <div className="relative overflow-hidden rounded-xl border border-border shadow-lg"
            style={{
              width: Math.min(cfg.width, 280),
              minHeight: 400,
              backgroundColor: 'hsl(var(--sidebar-background))',
              color: 'hsl(var(--sidebar-foreground))',
            }}>
            {/* BG image */}
            {cfg.bgImage && (
              <div className="absolute inset-0 pointer-events-none"
                style={{
                  backgroundImage: `url(${cfg.bgImage})`,
                  backgroundSize: `${cfg.bgImageScale * 100}%`,
                  backgroundPosition: 'center',
                  opacity: cfg.bgImageOpacity,
                  zIndex: 0,
                }} />
            )}
            {/* BG pattern */}
            {(patternCss || cfg.bgPattern?.startsWith('data:')) && (
              <div className="absolute inset-0 pointer-events-none"
                style={cfg.bgPattern?.startsWith('data:') ? {
                  backgroundImage: `url(${cfg.bgPattern})`,
                  backgroundSize: `${cfg.bgPatternScale * 20}px`,
                  backgroundRepeat: 'repeat',
                  opacity: cfg.bgPatternOpacity,
                  zIndex: 1,
                } : {
                  backgroundImage: patternCss!,
                  backgroundSize: `${cfg.bgPatternScale * 20}px`,
                  opacity: cfg.bgPatternOpacity,
                  zIndex: 1,
                }} />
            )}
            {/* Overlay image */}
            {cfg.overlayImage && (
              <div className="absolute pointer-events-none"
                style={{
                  left: `${cfg.overlayX ?? 50}%`,
                  top: `${cfg.overlayY ?? 50}%`,
                  transform: 'translate(-50%, -50%)',
                  width: cfg.overlaySize ?? 80,
                  height: cfg.overlaySize ?? 80,
                  opacity: cfg.overlayOpacity ?? 0.15,
                  zIndex: 2,
                }}>
                <img src={cfg.overlayImage} alt="" className="w-full h-full object-contain" />
              </div>
            )}
            {/* Header */}
            <div className="relative z-10 px-3 flex items-center gap-2.5 border-b border-white/10"
              style={{ height: cfg.headerHeight }}>
              <div className="rounded-lg bg-primary/20 flex items-center justify-center shrink-0"
                style={{ width: cfg.logoSize, height: cfg.logoSize }}>
                <Icon name="Building2" size={Math.max(12, cfg.logoSize * 0.5)} className="text-primary" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold truncate opacity-90">ИРИДА</div>
                <div className="text-[9px] opacity-50 truncate">Управляющий</div>
              </div>
            </div>
            {/* Nav items */}
            <div className="relative z-10 px-1.5 py-1 space-y-0.5 flex-1">
              {navItems.filter(i => !i.hidden).slice(0, 7).map((item, idx) => (
                <div key={item.tab}
                  className={`flex items-center gap-2 px-2 rounded-lg ${idx === 0 ? 'bg-white/15' : 'opacity-60'}`}
                  style={{ height: cfg.navItemHeight, fontSize: cfg.navFontSize }}>
                  <Icon name={item.icon} size={Math.min(16, cfg.navFontSize + 3)} />
                  <span className="truncate">{item.label}</span>
                </div>
              ))}
            </div>
            {/* Footer */}
            <div className="relative z-10 border-t border-white/10 px-1.5 py-1 space-y-0.5"
              style={{ minHeight: cfg.footerHeight / 2 }}>
              {['Голосование', 'Обновить', 'Тема', 'Выйти'].map((label, i) => (
                <div key={label} className="flex items-center gap-2 px-2 opacity-50 rounded-lg"
                  style={{ height: cfg.navItemHeight * 0.85, fontSize: cfg.navFontSize - 1 }}>
                  <Icon name={['Star', 'RefreshCw', 'Sun', 'LogOut'][i]} size={Math.min(14, cfg.navFontSize + 2)} />
                  <span className="truncate">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Icon picker modal */}
      <IconPickerModal
        open={iconPickerTab !== null}
        onClose={() => setIconPickerTab(null)}
        selected={iconPickerTab ? (navItems.find(i => i.tab === iconPickerTab)?.icon ?? '') : ''}
        onSelect={iconName => {
          if (iconPickerTab) changeNavIcon(iconPickerTab, iconName);
        }}
      />
    </div>
  );
}