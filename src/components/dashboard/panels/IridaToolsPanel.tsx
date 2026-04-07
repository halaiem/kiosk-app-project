import React, { useState, useRef, useEffect } from 'react';
import Icon from '@/components/ui/icon';
import type { IridaToolsTab } from '@/types/dashboard';

interface IridaToolsPanelProps {
  tab: IridaToolsTab;
}

// ── Placeholder ───────────────────────────────────────────────────────────────
function PlaceholderSection({ title, icon, description }: { title: string; icon: string; description: string }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">{title}</h2>
        <p className="text-muted-foreground mt-1">{description}</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-5 flex flex-col gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Icon name={icon} className="w-5 h-5 text-primary" />
            </div>
            <div className="h-3 bg-muted rounded w-2/3" />
            <div className="h-2 bg-muted rounded w-full" />
            <div className="h-2 bg-muted rounded w-4/5" />
          </div>
        ))}
      </div>
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Icon name={icon} className="w-5 h-5 text-primary" />
          <span className="font-semibold text-foreground">{title}</span>
          <span className="ml-auto text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">В разработке</span>
        </div>
        <div className="space-y-2">
          {[80, 60, 90, 45].map((w, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-2 bg-muted rounded flex-1">
                <div className="h-2 bg-primary/40 rounded" style={{ width: `${w}%` }} />
              </div>
              <span className="text-xs text-muted-foreground w-8">{w}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Logs Section ──────────────────────────────────────────────────────────────
const MOCK_LOGS = [
  { time: '2026-04-07 14:32:11', level: 'INFO',  source: 'irida-core',    msg: 'Система запущена успешно' },
  { time: '2026-04-07 14:32:15', level: 'INFO',  source: 'db',            msg: 'Подключение к базе данных установлено' },
  { time: '2026-04-07 14:33:02', level: 'WARN',  source: 'auth',          msg: 'Неудачная попытка входа: неверный пароль' },
  { time: '2026-04-07 14:34:18', level: 'INFO',  source: 'irida-core',    msg: 'Пользователь tp-tds авторизован' },
  { time: '2026-04-07 14:35:00', level: 'INFO',  source: 'scheduler',     msg: 'Задача синхронизации запущена' },
  { time: '2026-04-07 14:35:04', level: 'ERROR', source: 'scheduler',     msg: 'Ошибка подключения к внешнему API: timeout' },
  { time: '2026-04-07 14:35:05', level: 'WARN',  source: 'scheduler',     msg: 'Повтор запроса (1/3)...' },
  { time: '2026-04-07 14:35:09', level: 'INFO',  source: 'scheduler',     msg: 'Синхронизация завершена успешно' },
  { time: '2026-04-07 14:36:44', level: 'INFO',  source: 'ui',            msg: 'Загружен модуль UI-дизайн' },
  { time: '2026-04-07 14:37:01', level: 'DEBUG', source: 'network',       msg: 'Ping 8.8.8.8 — 12ms' },
  { time: '2026-04-07 14:37:33', level: 'INFO',  source: 'irida-core',    msg: 'Конфигурация обновлена' },
  { time: '2026-04-07 14:38:50', level: 'ERROR', source: 'db',            msg: 'Медленный запрос (>2s): SELECT * FROM logs' },
];

const LEVEL_COLORS: Record<string, string> = {
  INFO:  'text-green-400',
  WARN:  'text-yellow-400',
  ERROR: 'text-red-400',
  DEBUG: 'text-blue-400',
};

function LogsSection() {
  const [filter, setFilter] = useState<'ALL' | 'INFO' | 'WARN' | 'ERROR' | 'DEBUG'>('ALL');
  const [search, setSearch] = useState('');

  const filtered = MOCK_LOGS.filter((l) => {
    if (filter !== 'ALL' && l.level !== filter) return false;
    if (search && !l.msg.toLowerCase().includes(search.toLowerCase()) && !l.source.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Логи</h2>
        <p className="text-muted-foreground mt-1">Системные журналы событий платформы ИРИДА</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск по логам..."
          className="h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring flex-1 min-w-48"
        />
        {(['ALL', 'INFO', 'WARN', 'ERROR', 'DEBUG'] as const).map((l) => (
          <button
            key={l}
            onClick={() => setFilter(l)}
            className={`h-9 px-3 rounded-lg text-xs font-semibold border transition-colors ${
              filter === l
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-card text-muted-foreground border-border hover:bg-muted'
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      <div className="bg-[#0d1117] rounded-xl border border-border overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2 border-b border-border/50 bg-[#161b22]">
          <div className="w-3 h-3 rounded-full bg-red-500/70" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
          <div className="w-3 h-3 rounded-full bg-green-500/70" />
          <span className="ml-2 text-xs text-white/30 font-mono">system.log</span>
          <span className="ml-auto text-xs text-white/30">{filtered.length} записей</span>
        </div>
        <div className="overflow-y-auto max-h-[calc(100vh-320px)] p-4 space-y-1 font-mono text-xs">
          {filtered.length === 0 ? (
            <div className="text-white/30 text-center py-8">Записи не найдены</div>
          ) : (
            filtered.map((log, i) => (
              <div key={i} className="flex gap-3 hover:bg-white/5 rounded px-1 py-0.5">
                <span className="text-white/30 shrink-0">{log.time}</span>
                <span className={`font-bold w-12 shrink-0 ${LEVEL_COLORS[log.level]}`}>{log.level}</span>
                <span className="text-purple-400 shrink-0 w-24 truncate">[{log.source}]</span>
                <span className="text-white/80">{log.msg}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ── Terminal Section ──────────────────────────────────────────────────────────

// Все файлы проекта
const PROJECT_FILES: string[] = [
  'src/App.tsx', 'src/App.css', 'src/index.css', 'src/main.tsx', 'src/vite-env.d.ts',
  'src/api/dashboardApi.ts', 'src/api/diagnosticsApi.ts', 'src/api/driverApi.ts', 'src/api/transcribeApi.ts',
  'src/types/dashboard.ts', 'src/types/kiosk.ts',
  'src/pages/Dashboard.tsx', 'src/pages/Docs.tsx', 'src/pages/Index.tsx', 'src/pages/NotFound.tsx',
  'src/context/AppSettingsContext.tsx',
  'src/hooks/use-toast.ts', 'src/hooks/use-mobile.tsx', 'src/hooks/useAutoClose.ts',
  'src/hooks/useDashboardAuth.ts', 'src/hooks/useDashboardData.ts', 'src/hooks/useKioskState.ts',
  'src/hooks/useNewMessageNotifier.ts', 'src/hooks/useSessionTimeout.ts', 'src/hooks/useVirtualKeyboard.ts',
  'src/lib/kioskSound.ts', 'src/lib/offlineQueue.ts', 'src/lib/supabase.ts', 'src/lib/utils.ts', 'src/lib/vehicleIconConfig.ts',
  'src/components/ui/accordion.tsx', 'src/components/ui/alert-dialog.tsx', 'src/components/ui/alert.tsx',
  'src/components/ui/avatar.tsx', 'src/components/ui/badge.tsx', 'src/components/ui/button.tsx',
  'src/components/ui/card.tsx', 'src/components/ui/checkbox.tsx', 'src/components/ui/dialog.tsx',
  'src/components/ui/dropdown-menu.tsx', 'src/components/ui/form.tsx', 'src/components/ui/icon.tsx',
  'src/components/ui/input.tsx', 'src/components/ui/label.tsx', 'src/components/ui/popover.tsx',
  'src/components/ui/progress.tsx', 'src/components/ui/scroll-area.tsx', 'src/components/ui/select.tsx',
  'src/components/ui/separator.tsx', 'src/components/ui/sheet.tsx', 'src/components/ui/sidebar.tsx',
  'src/components/ui/skeleton.tsx', 'src/components/ui/slider.tsx', 'src/components/ui/sonner.tsx',
  'src/components/ui/switch.tsx', 'src/components/ui/table.tsx', 'src/components/ui/tabs.tsx',
  'src/components/ui/textarea.tsx', 'src/components/ui/toast.tsx', 'src/components/ui/toaster.tsx',
  'src/components/ui/tooltip.tsx',
  'src/components/kiosk/BreakModal.tsx', 'src/components/kiosk/DispatcherAlert.tsx',
  'src/components/kiosk/EndShiftModal.tsx', 'src/components/kiosk/GoodbyeScreen.tsx',
  'src/components/kiosk/IntervalWidget.tsx', 'src/components/kiosk/KeyboardInputOverlay.tsx',
  'src/components/kiosk/KioskUnlockModal.tsx', 'src/components/kiosk/LoginLoadingScreen.tsx',
  'src/components/kiosk/LoginPage.tsx', 'src/components/kiosk/MainPage.tsx',
  'src/components/kiosk/MapWidget.tsx', 'src/components/kiosk/Messenger.tsx',
  'src/components/kiosk/NewDocsScreen.tsx', 'src/components/kiosk/NotificationOverlay.tsx',
  'src/components/kiosk/RouteStops.tsx', 'src/components/kiosk/SessionWarningModal.tsx',
  'src/components/kiosk/SidebarHeader.tsx', 'src/components/kiosk/SidebarMenu.tsx',
  'src/components/kiosk/SidebarNav.tsx', 'src/components/kiosk/SidebarSections.tsx',
  'src/components/kiosk/SosModal.tsx', 'src/components/kiosk/SupportModals.tsx',
  'src/components/kiosk/VehicleDiagnosticsModal.tsx', 'src/components/kiosk/VehicleStatusWidget.tsx',
  'src/components/kiosk/WeatherWidget.tsx', 'src/components/kiosk/WelcomeScreen.tsx',
  'src/components/kiosk/sidebar/SidebarProfile.tsx', 'src/components/kiosk/sidebar/SidebarSettings.tsx',
  'src/components/kiosk/sidebar/SidebarSupportPopups.tsx',
  'src/components/docs/DocsAgentOrder.tsx', 'src/components/docs/DocsDashboard.tsx',
  'src/components/docs/DocsHeader.tsx', 'src/components/docs/DocsKiosk.tsx',
  'src/components/dashboard/CriticalAlertPopup.tsx', 'src/components/dashboard/DashboardLogin.tsx',
  'src/components/dashboard/DashboardSidebar.tsx', 'src/components/dashboard/MapControls.tsx',
  'src/components/dashboard/MapVehicleCard.tsx', 'src/components/dashboard/ReportButton.tsx',
  'src/components/dashboard/panels/AdminPanel.tsx', 'src/components/dashboard/panels/DispatcherPanel.tsx',
  'src/components/dashboard/panels/IridaToolsPanel.tsx', 'src/components/dashboard/panels/TechnicianPanel.tsx',
  'src/components/dashboard/panels/admin/AdminVehiclesView.tsx',
  'src/components/dashboard/panels/admin/DiagnosticApisView.tsx',
  'src/components/dashboard/panels/admin/LogsView.tsx', 'src/components/dashboard/panels/admin/ServersView.tsx',
  'src/components/dashboard/panels/admin/SettingsView.tsx', 'src/components/dashboard/panels/admin/UsersView.tsx',
  'src/components/dashboard/panels/admin/VehicleFormModal.tsx', 'src/components/dashboard/panels/admin/VehicleViewModal.tsx',
  'src/components/dashboard/panels/admin/VehiclesTable.tsx', 'src/components/dashboard/panels/admin/vehicleConstants.ts',
  'src/components/dashboard/panels/admin/diagnostic-apis/AddApiForm.tsx',
  'src/components/dashboard/panels/admin/diagnostic-apis/ApiTable.tsx',
  'src/components/dashboard/panels/admin/diagnostic-apis/SummaryCards.tsx',
  'src/components/dashboard/panels/admin/settings/FontSettingsBlock.tsx',
  'src/components/dashboard/panels/admin/settings/InterfaceSettingsView.tsx',
  'src/components/dashboard/panels/admin/settings/SystemSettingsView.tsx',
  'src/components/dashboard/panels/admin/settings/Toggle.tsx',
  'src/components/dashboard/panels/admin/settings/VehicleIconSettings.tsx',
  'src/components/dashboard/panels/technician/AssignmentFormRows.tsx',
  'src/components/dashboard/panels/technician/AssignmentPrintForm.tsx',
  'src/components/dashboard/panels/technician/AssignmentResultsPanel.tsx',
  'src/components/dashboard/panels/technician/AssignmentToolbar.tsx',
  'src/components/dashboard/panels/technician/DriverCreateModal.tsx',
  'src/components/dashboard/panels/technician/DriverDetailModal.tsx',
  'src/components/dashboard/panels/technician/DriverEditModal.tsx',
  'src/components/dashboard/panels/technician/ExistingAssignmentsTable.tsx',
  'src/components/dashboard/panels/technician/TechDailyAssignment.tsx',
  'src/components/dashboard/panels/technician/TechDiagnosticsView.tsx',
  'src/components/dashboard/panels/technician/TechDocuments.tsx',
  'src/components/dashboard/panels/technician/TechDriversView.tsx',
  'src/components/dashboard/panels/technician/TechRoutes.tsx',
  'src/components/dashboard/panels/technician/TechSchedule.tsx',
  'src/components/dashboard/panels/technician/TechVDConstants.ts',
  'src/components/dashboard/panels/technician/TechVehiclesDrivers.tsx',
  'src/components/dashboard/panels/technician/TechVehiclesView.tsx',
  'src/components/dashboard/panels/technician/assignment-shared.tsx',
  'src/components/dashboard/panels/technician/diagnostics/DiagnosticsSummaryCards.tsx',
  'src/components/dashboard/panels/technician/diagnostics/DiagnosticsToolbar.tsx',
  'src/components/dashboard/panels/technician/diagnostics/DiagnosticsVehicleCard.tsx',
  'src/components/dashboard/panels/technician/schedule/ScheduleFormModal.tsx',
  'src/components/dashboard/panels/technician/schedule/ScheduleSummaryCards.tsx',
  'src/components/dashboard/panels/technician/schedule/ScheduleTable.tsx',
  'src/components/dashboard/panels/dispatcher/DispatcherAlertsNotif.tsx',
  'src/components/dashboard/panels/dispatcher/DispatcherMessages.tsx',
  'src/components/dashboard/panels/dispatcher/DispatcherOverview.tsx',
  'src/components/dashboard/panels/dispatcher/DispatcherOverviewMap.tsx',
  'src/components/dashboard/panels/dispatcher/VehicleIssuesView.tsx',
  'src/components/dashboard/panels/dispatcher/messages/ChatPopup.tsx',
  'src/components/dashboard/panels/dispatcher/messages/MessagesFullView.tsx',
  'src/components/dashboard/panels/dispatcher/messages/MiniMessenger.tsx',
];

function getFileIcon(path: string): string {
  if (path.endsWith('.tsx')) return 'FileCode2';
  if (path.endsWith('.ts')) return 'FileCode';
  if (path.endsWith('.css')) return 'FileType';
  if (path.endsWith('.json')) return 'Braces';
  if (path.endsWith('.yaml') || path.endsWith('.yml')) return 'FileText';
  return 'File';
}

function getFileLang(path: string): string {
  if (path.endsWith('.tsx') || path.endsWith('.ts')) return 'TypeScript';
  if (path.endsWith('.css')) return 'CSS';
  if (path.endsWith('.json')) return 'JSON';
  if (path.endsWith('.yaml') || path.endsWith('.yml')) return 'YAML';
  return 'Text';
}

// Строим дерево папок из списка файлов
function buildTree(files: string[]): Record<string, string[]> {
  const tree: Record<string, string[]> = {};
  for (const f of files) {
    const parts = f.split('/');
    const dir = parts.slice(0, -1).join('/');
    if (!tree[dir]) tree[dir] = [];
    tree[dir].push(f);
  }
  return tree;
}

function TerminalSection() {
  const [search, setSearch] = useState('');
  const [openDirs, setOpenDirs] = useState<Set<string>>(new Set(['src', 'src/components', 'src/pages', 'src/hooks']));
  const [openTabs, setOpenTabs] = useState<string[]>(['src/App.tsx']);
  const [activeTab, setActiveTab] = useState('src/App.tsx');
  const [fileContents, setFileContents] = useState<Record<string, string>>({
    'src/App.tsx': `import { QueryClient, QueryClientProvider } from "@tanstack/react-query";\nimport { BrowserRouter, Routes, Route } from "react-router-dom";\nimport { Toaster } from "@/components/ui/toaster";\nimport { Sonner } from "@/components/ui/sonner";\nimport { TooltipProvider } from "@/components/ui/tooltip";\nimport { AppSettingsProvider } from "@/context/AppSettingsContext";\nimport Index from "@/pages/Index";\nimport Dashboard from "@/pages/Dashboard";\nimport Docs from "@/pages/Docs";\nimport NotFound from "@/pages/NotFound";\n\nconst queryClient = new QueryClient();\n\nconst App = () => (\n  <QueryClientProvider client={queryClient}>\n    <AppSettingsProvider>\n      <TooltipProvider>\n        <Toaster />\n        <Sonner />\n        <BrowserRouter>\n          <Routes>\n            <Route path="/" element={<Index />} />\n            <Route path="/docs" element={<Docs />} />\n            <Route path="/dashboard" element={<Dashboard />} />\n            <Route path="*" element={<NotFound />} />\n          </Routes>\n        </BrowserRouter>\n      </TooltipProvider>\n    </AppSettingsProvider>\n  </QueryClientProvider>\n);\n\nexport default App;`,
  });
  const [output, setOutput] = useState<string[]>([
    '> Irida Terminal v2.1.0',
    `> Загружено ${PROJECT_FILES.length} файлов проекта`,
    '> Выберите файл в дереве слева для редактирования',
  ]);
  const [saving, setSaving] = useState(false);
  const [sidebarWidth] = useState(240);
  const outputRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const tree = buildTree(PROJECT_FILES);
  const allDirs = [...new Set(Object.keys(tree))].sort();

  // Фильтрация
  const filteredFiles = search.trim()
    ? PROJECT_FILES.filter((f) => f.toLowerCase().includes(search.toLowerCase()))
    : null;

  const getContent = (path: string) => {
    if (fileContents[path]) return fileContents[path];
    return `// ${path}\n// Файл загружен из проекта ИРИДА\n// Редактируйте код здесь\n`;
  };

  const openFile = (path: string) => {
    if (!openTabs.includes(path)) setOpenTabs((t) => [...t, path]);
    setActiveTab(path);
    if (!fileContents[path]) {
      setFileContents((c) => ({ ...c, [path]: getContent(path) }));
    }
    const now = new Date().toLocaleTimeString();
    setOutput((prev) => [...prev, ``, `> [${now}] Открыт: ${path}`]);
  };

  const closeTab = (path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const idx = openTabs.indexOf(path);
    const newTabs = openTabs.filter((t) => t !== path);
    setOpenTabs(newTabs);
    if (activeTab === path) {
      setActiveTab(newTabs[Math.max(0, idx - 1)] || '');
    }
  };

  const toggleDir = (dir: string) => {
    setOpenDirs((prev) => {
      const next = new Set(prev);
      if (next.has(dir)) next.delete(dir);
      else next.add(dir);
      return next;
    });
  };

  const handleSave = () => {
    if (!activeTab) return;
    setSaving(true);
    const now = new Date().toLocaleTimeString();
    setTimeout(() => {
      setOutput((prev) => [
        ...prev, ``,
        `> [${now}] Сохранение ${activeTab}...`,
        `> ✓ Файл сохранён успешно`,
      ]);
      setSaving(false);
    }, 600);
  };

  const handleTabKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const ta = textareaRef.current;
      if (!ta || !activeTab) return;
      const val = fileContents[activeTab] || '';
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const next = val.substring(0, start) + '  ' + val.substring(end);
      setFileContents((c) => ({ ...c, [activeTab]: next }));
      setTimeout(() => { ta.selectionStart = ta.selectionEnd = start + 2; }, 0);
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      handleSave();
    }
  };

  useEffect(() => {
    if (outputRef.current) outputRef.current.scrollTop = outputRef.current.scrollHeight;
  }, [output]);

  const currentCode = activeTab ? (fileContents[activeTab] ?? getContent(activeTab)) : '';

  // Дерево папок рендер
  const renderTree = () => {
    const topDirs = [...new Set(allDirs.map((d) => d.split('/')[0]))].filter(Boolean);
    const renderDir = (dir: string, depth = 0): React.ReactNode => {
      const children = allDirs.filter((d) => {
        const parts = d.split('/');
        const parentParts = dir.split('/');
        return parts.length === parentParts.length + 1 && d.startsWith(dir + '/');
      });
      const files = tree[dir] || [];
      const isOpen = openDirs.has(dir);
      const name = dir.split('/').pop();
      return (
        <div key={dir}>
          <button
            onClick={() => toggleDir(dir)}
            className="w-full flex items-center gap-1.5 py-0.5 px-2 hover:bg-white/5 rounded text-left group"
            style={{ paddingLeft: `${8 + depth * 12}px` }}
          >
            <Icon name={isOpen ? 'ChevronDown' : 'ChevronRight'} className="w-3 h-3 text-white/30 shrink-0" />
            <Icon name="Folder" className="w-3.5 h-3.5 text-yellow-400/70 shrink-0" />
            <span className="text-xs text-white/60 truncate">{name}</span>
          </button>
          {isOpen && (
            <>
              {files.map((f) => {
                const fname = f.split('/').pop();
                return (
                  <button
                    key={f}
                    onClick={() => openFile(f)}
                    className={`w-full flex items-center gap-1.5 py-0.5 hover:bg-white/5 rounded text-left ${activeTab === f ? 'bg-white/10' : ''}`}
                    style={{ paddingLeft: `${20 + depth * 12}px` }}
                  >
                    <Icon name={getFileIcon(f)} className="w-3 h-3 text-blue-400/70 shrink-0" />
                    <span className={`text-xs truncate ${activeTab === f ? 'text-white' : 'text-white/50'}`}>{fname}</span>
                  </button>
                );
              })}
              {children.map((c) => renderDir(c, depth + 1))}
            </>
          )}
        </div>
      );
    };
    return topDirs.map((d) => renderDir(d));
  };

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 88px)' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3 shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Терминал</h2>
          <p className="text-muted-foreground text-sm mt-0.5">Файловый менеджер и редактор кода проекта</p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab && (
            <>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded font-mono">{getFileLang(activeTab)}</span>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors font-medium"
              >
                <Icon name={saving ? 'Loader' : 'Save'} className={`w-3.5 h-3.5 ${saving ? 'animate-spin' : ''}`} />
                {saving ? 'Сохранение...' : 'Сохранить'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* IDE */}
      <div className="flex-1 bg-[#0d1117] rounded-xl border border-border overflow-hidden flex" style={{ minHeight: 0 }}>

        {/* File tree sidebar */}
        <div className="flex flex-col bg-[#161b22] border-r border-white/10 shrink-0" style={{ width: sidebarWidth }}>
          {/* Search */}
          <div className="p-2 border-b border-white/10 shrink-0">
            <div className="flex items-center gap-1.5 bg-black/30 rounded px-2 py-1">
              <Icon name="Search" className="w-3 h-3 text-white/30 shrink-0" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Поиск файлов..."
                className="bg-transparent text-xs text-white/70 placeholder:text-white/25 focus:outline-none flex-1 min-w-0"
              />
              {search && (
                <button onClick={() => setSearch('')} className="text-white/30 hover:text-white/60">
                  <Icon name="X" className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Explorer label */}
          <div className="px-3 py-1.5 shrink-0">
            <span className="text-[10px] text-white/25 uppercase tracking-wider font-semibold">
              {search ? `Результаты (${filteredFiles?.length ?? 0})` : `Проект (${PROJECT_FILES.length} файлов)`}
            </span>
          </div>

          {/* Tree or search results */}
          <div className="flex-1 overflow-y-auto py-1">
            {filteredFiles ? (
              filteredFiles.length === 0 ? (
                <div className="text-xs text-white/25 px-4 py-3">Ничего не найдено</div>
              ) : (
                filteredFiles.map((f) => {
                  const fname = f.split('/').pop();
                  return (
                    <button
                      key={f}
                      onClick={() => openFile(f)}
                      className={`w-full flex items-center gap-1.5 py-1 px-3 hover:bg-white/5 text-left ${activeTab === f ? 'bg-white/10' : ''}`}
                    >
                      <Icon name={getFileIcon(f)} className="w-3 h-3 text-blue-400/70 shrink-0" />
                      <div className="min-w-0">
                        <div className={`text-xs truncate ${activeTab === f ? 'text-white' : 'text-white/60'}`}>{fname}</div>
                        <div className="text-[10px] text-white/25 truncate">{f.replace(`/${fname}`, '')}</div>
                      </div>
                    </button>
                  );
                })
              )
            ) : (
              renderTree()
            )}
          </div>
        </div>

        {/* Editor area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Tabs */}
          {openTabs.length > 0 && (
            <div className="flex bg-[#1c2128] border-b border-white/10 overflow-x-auto shrink-0">
              {openTabs.map((t) => {
                const fname = t.split('/').pop();
                return (
                  <div
                    key={t}
                    onClick={() => setActiveTab(t)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 border-r border-white/10 cursor-pointer shrink-0 group ${
                      activeTab === t ? 'bg-[#0d1117] text-white' : 'text-white/40 hover:text-white/70 hover:bg-white/5'
                    }`}
                  >
                    <Icon name={getFileIcon(t)} className="w-3 h-3 shrink-0" />
                    <span className="text-xs font-mono">{fname}</span>
                    <button
                      onClick={(e) => closeTab(t, e)}
                      className="w-3.5 h-3.5 flex items-center justify-center rounded hover:bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity ml-0.5"
                    >
                      <Icon name="X" className="w-2.5 h-2.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Editor + console */}
          {activeTab ? (
            <div className="flex flex-1 overflow-hidden">
              {/* Code */}
              <div className="flex flex-1 overflow-hidden">
                <div className="py-3 px-2 text-right select-none shrink-0 bg-[#0d1117] border-r border-white/5">
                  {currentCode.split('\n').map((_, i) => (
                    <div key={i} className="text-[11px] text-white/15 font-mono leading-5">{i + 1}</div>
                  ))}
                </div>
                <textarea
                  ref={textareaRef}
                  value={currentCode}
                  onChange={(e) => setFileContents((c) => ({ ...c, [activeTab]: e.target.value }))}
                  onKeyDown={handleTabKey}
                  spellCheck={false}
                  className="flex-1 resize-none bg-[#0d1117] text-green-300 font-mono text-xs leading-5 p-3 pl-2 focus:outline-none overflow-auto"
                />
              </div>

              {/* Console */}
              <div className="w-64 flex flex-col shrink-0 bg-[#0a0e13] border-l border-white/10">
                <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 shrink-0">
                  <span className="text-[10px] text-white/30 font-mono uppercase">Консоль</span>
                  <button onClick={() => setOutput(['> Консоль очищена.'])} className="text-white/20 hover:text-white/50">
                    <Icon name="Trash2" className="w-3 h-3" />
                  </button>
                </div>
                <div ref={outputRef} className="flex-1 overflow-y-auto p-2 space-y-0.5">
                  {output.map((line, i) => (
                    <div key={i} className={`text-[11px] font-mono leading-5 ${
                      line.includes('✓') ? 'text-green-400' :
                      line.includes('Ошибка') ? 'text-red-400' :
                      line.startsWith('>') ? 'text-white/50' : 'text-white/15'
                    }`}>
                      {line || '\u00A0'}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Icon name="FolderOpen" className="w-12 h-12 text-white/10 mx-auto mb-3" />
                <p className="text-white/30 text-sm">Выберите файл для редактирования</p>
                <p className="text-white/15 text-xs mt-1">или используйте поиск</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Panel ────────────────────────────────────────────────────────────────
export default function IridaToolsPanel({ tab }: IridaToolsPanelProps) {
  if (tab === 'it_logs') return <LogsSection />;
  if (tab === 'terminal') return <TerminalSection />;

  const SECTIONS: Record<Exclude<IridaToolsTab, 'it_logs' | 'terminal'>, { title: string; icon: string; description: string }> = {
    cities: {
      title: 'Города',
      icon: 'Building2',
      description: 'Управление городами и регионами присутствия системы ИРИДА',
    },
    it_settings: {
      title: 'Настройки',
      icon: 'Settings2',
      description: 'Системные настройки и конфигурация платформы',
    },
    ui_design: {
      title: 'UI-дизайн',
      icon: 'Palette',
      description: 'Управление интерфейсом, темами и визуальными компонентами',
    },
    software: {
      title: 'ПО',
      icon: 'Package',
      description: 'Управление программным обеспечением, версиями и обновлениями',
    },
    connection: {
      title: 'Подключение',
      icon: 'Wifi',
      description: 'Настройка сетевых подключений и каналов передачи данных',
    },
    server: {
      title: 'Сервер',
      icon: 'Server',
      description: 'Мониторинг и управление серверной инфраструктурой',
    },
    equipment: {
      title: 'Оборудование',
      icon: 'Cpu',
      description: 'Учёт и управление оборудованием на объектах',
    },
    instructions: {
      title: 'Инструкции',
      icon: 'BookOpen',
      description: 'Техническая документация и инструкции по эксплуатации',
    },
  };

  const section = SECTIONS[tab as Exclude<IridaToolsTab, 'it_logs' | 'terminal'>];

  return (
    <PlaceholderSection
      title={section.title}
      icon={section.icon}
      description={section.description}
    />
  );
}