import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Highlight, themes } from 'prism-react-renderer';
import JSZip from 'jszip';
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

type PrismLang = 'tsx' | 'typescript' | 'css' | 'json' | 'yaml' | 'markup';

function getPrismLang(path: string): PrismLang {
  if (path.endsWith('.tsx')) return 'tsx';
  if (path.endsWith('.ts')) return 'typescript';
  if (path.endsWith('.css')) return 'css';
  if (path.endsWith('.json')) return 'json';
  if (path.endsWith('.yaml') || path.endsWith('.yml')) return 'yaml';
  return 'markup';
}

// Редактор с подсветкой синтаксиса
interface CodeEditorProps {
  code: string;
  language: PrismLang;
  onChange: (val: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
}

function CodeEditor({ code, language, onChange, onKeyDown, textareaRef }: CodeEditorProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const syncScroll = useCallback(() => {
    const ta = textareaRef.current;
    const pre = scrollRef.current;
    if (ta && pre) {
      pre.scrollTop = ta.scrollTop;
      pre.scrollLeft = ta.scrollLeft;
    }
  }, [textareaRef]);

  const lines = code.split('\n');

  return (
    <div className="flex flex-1 overflow-hidden font-mono text-xs leading-5">
      {/* Line numbers */}
      <div className="py-3 px-2 text-right select-none shrink-0 bg-[#0d1117] border-r border-white/5 min-w-[40px]">
        {lines.map((_, i) => (
          <div key={i} className="text-white/15 leading-5">{i + 1}</div>
        ))}
      </div>

      {/* Highlighted + textarea overlay */}
      <div className="flex-1 relative overflow-hidden">
        {/* Highlighted code (behind) */}
        <div
          ref={scrollRef}
          className="absolute inset-0 overflow-auto pointer-events-none"
          aria-hidden="true"
        >
          <Highlight theme={themes.vsDark} code={code.endsWith('\n') ? code + ' ' : code} language={language}>
            {({ style, tokens, getLineProps, getTokenProps }) => (
              <pre
                style={{ ...style, background: 'transparent', margin: 0, padding: '12px 8px', minWidth: '100%' }}
                className="leading-5"
              >
                {tokens.map((line, i) => (
                  <div key={i} {...getLineProps({ line })}>
                    {line.map((token, key) => (
                      <span key={key} {...getTokenProps({ token })} />
                    ))}
                  </div>
                ))}
              </pre>
            )}
          </Highlight>
        </div>

        {/* Editable textarea (on top, transparent text) */}
        <textarea
          ref={textareaRef}
          value={code}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          onScroll={syncScroll}
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          className="absolute inset-0 w-full h-full resize-none bg-transparent caret-white font-mono text-xs leading-5 focus:outline-none overflow-auto"
          style={{
            color: 'transparent',
            padding: '12px 8px',
            caretColor: '#e2e8f0',
          }}
        />
      </div>
    </div>
  );
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

const IRIDA_FILES_URL = 'https://functions.poehali.dev/9a4d89c3-efbe-40ea-baaf-e6b9153785d3';

const sourceFiles = import.meta.glob('/src/**/*.{ts,tsx,css,json}', { query: '?raw', import: 'default', eager: false }) as Record<string, () => Promise<string>>;

function TerminalSection() {
  const [search, setSearch] = useState('');
  const [openDirs, setOpenDirs] = useState<Set<string>>(new Set(['src', 'src/components', 'src/pages', 'src/hooks']));
  const [openTabs, setOpenTabs] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('');
  const [fileContents, setFileContents] = useState<Record<string, string>>({});
  const [loadingFile, setLoadingFile] = useState<string | null>(null);
  const [customFiles, setCustomFiles] = useState<string[]>([]);
  const [showNewFile, setShowNewFile] = useState(false);
  const [newFilePath, setNewFilePath] = useState('src/');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [renamingFile, setRenamingFile] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const renameInputRef = useRef<HTMLInputElement>(null);
  const [customDirs, setCustomDirs] = useState<string[]>([]);
  const [newFolderParent, setNewFolderParent] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const newFolderInputRef = useRef<HTMLInputElement>(null);
  const [renamingDir, setRenamingDir] = useState<string | null>(null);
  const [renameDirValue, setRenameDirValue] = useState('');
  const renameDirInputRef = useRef<HTMLInputElement>(null);
  const [dragFile, setDragFile] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [output, setOutput] = useState<string[]>([
    '> Irida Terminal v2.1.0',
    `> ${PROJECT_FILES.length} файлов проекта`,
    '> Выберите файл — содержимое загрузится с сервера',
  ]);
  const [saving, setSaving] = useState(false);
  const [sidebarWidth] = useState(240);
  const outputRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const newFileInputRef = useRef<HTMLInputElement>(null);

  const allFiles = [...new Set([...PROJECT_FILES, ...customFiles])].sort();
  const tree = buildTree(allFiles);
  const allDirs = [...new Set([...Object.keys(tree), ...customDirs])].sort();

  const filteredFiles = search.trim()
    ? allFiles.filter((f) => f.toLowerCase().includes(search.toLowerCase()))
    : null;

  const fetchFileContent = useCallback(async (path: string) => {
    setLoadingFile(path);
    const now = new Date().toLocaleTimeString();
    setOutput((prev) => [...prev, ``, `> [${now}] Загружаю ${path}...`]);
    try {
      const res = await fetch(`${IRIDA_FILES_URL}?action=read&path=${encodeURIComponent(path)}`);
      const data = await res.json();
      if (res.ok && data.content !== undefined) {
        setFileContents((c) => ({ ...c, [path]: data.content }));
        setOutput((prev) => [...prev, `> ✓ Файл загружен (${data.content.length} символов)`]);
      } else {
        setFileContents((c) => ({ ...c, [path]: `// ${path}\n// Файл ещё не загружен в базу данных\n// Нажмите Ctrl+S чтобы сохранить содержимое\n` }));
        setOutput((prev) => [...prev, `> Файл не найден в БД — создан пустой шаблон`]);
      }
    } catch (err) {
      setFileContents((c) => ({ ...c, [path]: `// ${path}\n// Ошибка загрузки\n` }));
      setOutput((prev) => [...prev, `> Ошибка загрузки: ${String(err)}`]);
    } finally {
      setLoadingFile(null);
    }
  }, []);

  const openFile = useCallback((path: string) => {
    if (!openTabs.includes(path)) setOpenTabs((t) => [...t, path]);
    setActiveTab(path);
    if (!fileContents[path]) {
      fetchFileContent(path);
    } else {
      const now = new Date().toLocaleTimeString();
      setOutput((prev) => [...prev, ``, `> [${now}] Открыт: ${path} (из кэша)`]);
    }
  }, [openTabs, fileContents, fetchFileContent]);

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

  const [syncing, setSyncing] = useState(false);

  const handleSave = useCallback(async () => {
    if (!activeTab) return;
    setSaving(true);
    const now = new Date().toLocaleTimeString();
    setOutput((prev) => [...prev, ``, `> [${now}] Сохранение ${activeTab}...`]);
    try {
      const content = fileContents[activeTab] || '';
      const res = await fetch(`${IRIDA_FILES_URL}?action=save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: activeTab, content }),
      });
      const data = await res.json();
      if (data.ok) {
        setOutput((prev) => [...prev, `> ✓ Файл сохранён в базу данных`]);
      } else {
        setOutput((prev) => [...prev, `> Ошибка сохранения: ${data.error || 'unknown'}`]);
      }
    } catch (err) {
      setOutput((prev) => [...prev, `> Ошибка: ${String(err)}`]);
    } finally {
      setSaving(false);
    }
  }, [activeTab, fileContents]);

  const handleSync = useCallback(async () => {
    setSyncing(true);
    const now = new Date().toLocaleTimeString();
    setOutput((prev) => [...prev, ``, `> [${now}] Синхронизация файлов проекта...`]);
    const keys = Object.keys(sourceFiles);
    setOutput((prev) => [...prev, `> Найдено ${keys.length} файлов в билде`]);

    let total = 0;
    const CHUNK = 10;
    for (let i = 0; i < keys.length; i += CHUNK) {
      const chunk = keys.slice(i, i + CHUNK);
      const batch: { path: string; content: string }[] = [];
      for (const key of chunk) {
        try {
          const content = await sourceFiles[key]();
          const path = key.replace(/^\//, '');
          batch.push({ path, content });
        } catch { /* skip */ }
      }
      if (batch.length > 0) {
        try {
          await fetch(`${IRIDA_FILES_URL}?action=bulk_save`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ files: batch }),
          });
          total += batch.length;
          setOutput((prev) => [...prev, `> Загружено ${total}/${keys.length}...`]);
        } catch (err) {
          setOutput((prev) => [...prev, `> Ошибка пакета: ${String(err)}`]);
        }
      }
    }
    setOutput((prev) => [...prev, `> ✓ Синхронизация завершена: ${total} файлов загружено`]);
    setSyncing(false);
  }, []);

  const handleCreateFile = useCallback(async () => {
    const path = newFilePath.trim();
    if (!path || path === 'src/') return;
    const now = new Date().toLocaleTimeString();

    const ext = path.split('.').pop() || '';
    let template = '';
    if (['tsx', 'ts'].includes(ext)) {
      const name = path.split('/').pop()?.replace(/\.\w+$/, '') || 'Component';
      if (ext === 'tsx') {
        template = `export default function ${name}() {\n  return (\n    <div>\n      <h1>${name}</h1>\n    </div>\n  );\n}\n`;
      } else {
        template = `// ${name}\n\nexport {};\n`;
      }
    } else if (ext === 'css') {
      template = `/* ${path.split('/').pop()} */\n`;
    } else if (ext === 'json') {
      template = `{\n  \n}\n`;
    } else {
      template = `// ${path}\n`;
    }

    setFileContents((c) => ({ ...c, [path]: template }));
    setCustomFiles((prev) => [...new Set([...prev, path])]);

    const parts = path.split('/');
    const newDirs = new Set(openDirs);
    for (let i = 1; i < parts.length; i++) {
      newDirs.add(parts.slice(0, i).join('/'));
    }
    setOpenDirs(newDirs);

    if (!openTabs.includes(path)) setOpenTabs((t) => [...t, path]);
    setActiveTab(path);

    setOutput((prev) => [...prev, ``, `> [${now}] Создан файл: ${path}`]);

    try {
      await fetch(`${IRIDA_FILES_URL}?action=save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, content: template }),
      });
      setOutput((prev) => [...prev, `> ✓ Файл сохранён в базу данных`]);
    } catch (err) {
      setOutput((prev) => [...prev, `> Ошибка сохранения: ${String(err)}`]);
    }

    setShowNewFile(false);
    setNewFilePath('src/');
  }, [newFilePath, openDirs, openTabs]);

  const handleDeleteFile = useCallback(async (path: string) => {
    const now = new Date().toLocaleTimeString();
    setCustomFiles((prev) => prev.filter((f) => f !== path));
    setFileContents((c) => { const next = { ...c }; delete next[path]; return next; });
    setOpenTabs((tabs) => tabs.filter((t) => t !== path));
    if (activeTab === path) setActiveTab('');

    setOutput((prev) => [...prev, ``, `> [${now}] Удалён файл: ${path}`]);

    try {
      await fetch(`${IRIDA_FILES_URL}?action=save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, content: '' }),
      });
      setOutput((prev) => [...prev, `> ✓ Файл удалён из базы данных`]);
    } catch { /* ignore */ }

    setShowDeleteConfirm(null);
  }, [activeTab]);

  const startRename = useCallback((path: string) => {
    setRenamingFile(path);
    setRenameValue(path);
    setTimeout(() => {
      const input = renameInputRef.current;
      if (input) {
        input.focus();
        const lastSlash = path.lastIndexOf('/');
        const dotIdx = path.lastIndexOf('.');
        input.setSelectionRange(lastSlash + 1, dotIdx > lastSlash ? dotIdx : path.length);
      }
    }, 50);
  }, []);

  const handleRename = useCallback(async () => {
    if (!renamingFile || !renameValue.trim() || renameValue === renamingFile) {
      setRenamingFile(null);
      return;
    }
    const oldPath = renamingFile;
    const newPath = renameValue.trim();
    const now = new Date().toLocaleTimeString();
    const content = fileContents[oldPath] || '';

    setCustomFiles((prev) => prev.map((f) => f === oldPath ? newPath : f));
    setFileContents((c) => {
      const next = { ...c };
      delete next[oldPath];
      next[newPath] = content;
      return next;
    });
    setOpenTabs((tabs) => tabs.map((t) => t === oldPath ? newPath : t));
    if (activeTab === oldPath) setActiveTab(newPath);

    const parts = newPath.split('/');
    const newDirs = new Set(openDirs);
    for (let i = 1; i < parts.length; i++) {
      newDirs.add(parts.slice(0, i).join('/'));
    }
    setOpenDirs(newDirs);

    setOutput((prev) => [...prev, ``, `> [${now}] Переименован: ${oldPath} → ${newPath}`]);

    try {
      await fetch(`${IRIDA_FILES_URL}?action=save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: newPath, content }),
      });
      await fetch(`${IRIDA_FILES_URL}?action=save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: oldPath, content: '' }),
      });
      setOutput((prev) => [...prev, `> ✓ Файл переименован в базе данных`]);
    } catch (err) {
      setOutput((prev) => [...prev, `> Ошибка: ${String(err)}`]);
    }

    setRenamingFile(null);
  }, [renamingFile, renameValue, fileContents, activeTab, openDirs]);

  const handleCreateFolder = useCallback((parentDir: string) => {
    setNewFolderParent(parentDir);
    setNewFolderName('');
    const newDirs = new Set(openDirs);
    newDirs.add(parentDir);
    setOpenDirs(newDirs);
    setTimeout(() => newFolderInputRef.current?.focus(), 50);
  }, [openDirs]);

  const confirmCreateFolder = useCallback(() => {
    if (!newFolderParent || !newFolderName.trim()) {
      setNewFolderParent(null);
      return;
    }
    const fullPath = `${newFolderParent}/${newFolderName.trim()}`;
    const now = new Date().toLocaleTimeString();
    setCustomDirs((prev) => [...new Set([...prev, fullPath])]);
    const newDirs = new Set(openDirs);
    newDirs.add(fullPath);
    setOpenDirs(newDirs);
    setOutput((prev) => [...prev, ``, `> [${now}] Создана папка: ${fullPath}`]);
    setNewFolderParent(null);
    setNewFolderName('');
  }, [newFolderParent, newFolderName, openDirs]);

  const startRenameDir = useCallback((dir: string) => {
    setRenamingDir(dir);
    setRenameDirValue(dir);
    setTimeout(() => {
      const input = renameDirInputRef.current;
      if (input) {
        input.focus();
        const lastSlash = dir.lastIndexOf('/');
        input.setSelectionRange(lastSlash + 1, dir.length);
      }
    }, 50);
  }, []);

  const handleRenameDir = useCallback(() => {
    if (!renamingDir || !renameDirValue.trim() || renameDirValue === renamingDir) {
      setRenamingDir(null);
      return;
    }
    const oldDir = renamingDir;
    const newDir = renameDirValue.trim();
    const now = new Date().toLocaleTimeString();

    setCustomDirs((prev) => prev.map((d) => {
      if (d === oldDir) return newDir;
      if (d.startsWith(oldDir + '/')) return newDir + d.slice(oldDir.length);
      return d;
    }));
    setCustomFiles((prev) => prev.map((f) =>
      f.startsWith(oldDir + '/') ? newDir + f.slice(oldDir.length) : f
    ));
    setFileContents((c) => {
      const next: Record<string, string> = {};
      for (const [k, v] of Object.entries(c)) {
        next[k.startsWith(oldDir + '/') ? newDir + k.slice(oldDir.length) : k] = v;
      }
      return next;
    });
    setOpenTabs((tabs) => tabs.map((t) =>
      t.startsWith(oldDir + '/') ? newDir + t.slice(oldDir.length) : t
    ));
    if (activeTab.startsWith(oldDir + '/')) {
      setActiveTab(newDir + activeTab.slice(oldDir.length));
    }

    const newOpenDirs = new Set<string>();
    openDirs.forEach((d) => {
      if (d === oldDir) newOpenDirs.add(newDir);
      else if (d.startsWith(oldDir + '/')) newOpenDirs.add(newDir + d.slice(oldDir.length));
      else newOpenDirs.add(d);
    });
    setOpenDirs(newOpenDirs);

    setOutput((prev) => [...prev, ``, `> [${now}] Переименована папка: ${oldDir} → ${newDir}`]);
    setRenamingDir(null);
  }, [renamingDir, renameDirValue, activeTab, openDirs]);

  const handleDeleteDir = useCallback((dir: string) => {
    const now = new Date().toLocaleTimeString();
    setCustomDirs((prev) => prev.filter((d) => d !== dir && !d.startsWith(dir + '/')));
    const filesToRemove = customFiles.filter((f) => f.startsWith(dir + '/'));
    setCustomFiles((prev) => prev.filter((f) => !f.startsWith(dir + '/')));
    setFileContents((c) => {
      const next = { ...c };
      filesToRemove.forEach((f) => delete next[f]);
      return next;
    });
    setOpenTabs((tabs) => tabs.filter((t) => !t.startsWith(dir + '/')));
    if (activeTab.startsWith(dir + '/')) setActiveTab('');
    setOutput((prev) => [...prev, ``, `> [${now}] Удалена папка: ${dir} (${filesToRemove.length} файлов)`]);
  }, [customFiles, activeTab]);

  const handleDrop = useCallback(async (targetDir: string) => {
    if (!dragFile || !targetDir) return;
    const fileName = dragFile.split('/').pop() || '';
    const newPath = `${targetDir}/${fileName}`;
    if (newPath === dragFile) { setDragFile(null); setDropTarget(null); return; }
    const now = new Date().toLocaleTimeString();
    const content = fileContents[dragFile] || '';

    if (customFiles.includes(dragFile)) {
      setCustomFiles((prev) => prev.map((f) => f === dragFile ? newPath : f));
    } else {
      setCustomFiles((prev) => [...prev, newPath]);
    }
    setFileContents((c) => {
      const next = { ...c };
      delete next[dragFile];
      next[newPath] = content;
      return next;
    });
    setOpenTabs((tabs) => tabs.map((t) => t === dragFile ? newPath : t));
    if (activeTab === dragFile) setActiveTab(newPath);

    const parts = newPath.split('/');
    const newDirs = new Set(openDirs);
    for (let i = 1; i < parts.length; i++) newDirs.add(parts.slice(0, i).join('/'));
    setOpenDirs(newDirs);

    setOutput((prev) => [...prev, ``, `> [${now}] Перемещён: ${dragFile} → ${newPath}`]);

    try {
      await fetch(`${IRIDA_FILES_URL}?action=save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: newPath, content }),
      });
      if (customFiles.includes(dragFile)) {
        await fetch(`${IRIDA_FILES_URL}?action=save`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: dragFile, content: '' }),
        });
      }
      setOutput((prev) => [...prev, `> ✓ Перемещение сохранено в БД`]);
    } catch (err) {
      setOutput((prev) => [...prev, `> Ошибка: ${String(err)}`]);
    }

    setDragFile(null);
    setDropTarget(null);
  }, [dragFile, fileContents, customFiles, activeTab, openDirs]);

  const downloadFile = useCallback((filePath: string) => {
    const content = fileContents[filePath];
    if (!content) {
      setOutput((prev) => [...prev, `> Файл не загружен: ${filePath}. Откройте файл для загрузки содержимого`]);
      return;
    }
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filePath.split('/').pop() || 'file.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    const now = new Date().toLocaleTimeString();
    setOutput((prev) => [...prev, ``, `> [${now}] Скачан файл: ${filePath}`]);
  }, [fileContents]);

  const [downloading, setDownloading] = useState(false);

  const toggleSelect = useCallback((filePath: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(filePath)) next.delete(filePath);
      else next.add(filePath);
      return next;
    });
  }, []);

  const toggleSelectDir = useCallback((dir: string) => {
    const dirFiles = allFiles.filter((f) => f.startsWith(dir + '/'));
    setSelected((prev) => {
      const next = new Set(prev);
      const allSelected = dirFiles.every((f) => next.has(f));
      if (allSelected) {
        dirFiles.forEach((f) => next.delete(f));
      } else {
        dirFiles.forEach((f) => next.add(f));
      }
      return next;
    });
  }, [allFiles]);

  const selectAll = useCallback(() => {
    setSelected((prev) => prev.size === allFiles.length ? new Set() : new Set(allFiles));
  }, [allFiles]);

  const downloadZip = useCallback(async (filesToDownload: string[], archiveName: string) => {
    setDownloading(true);
    const now = new Date().toLocaleTimeString();
    setOutput((prev) => [...prev, ``, `> [${now}] Сборка ZIP (${filesToDownload.length} файлов)...`]);

    const zip = new JSZip();
    let loaded = 0;
    let errors = 0;

    for (const filePath of filesToDownload) {
      let content = fileContents[filePath];
      if (!content) {
        try {
          const loader = sourceFiles[`/${filePath}`];
          if (loader) {
            content = await loader();
          } else {
            const res = await fetch(`${IRIDA_FILES_URL}?action=read&path=${encodeURIComponent(filePath)}`);
            const data = await res.json();
            content = data.content || '';
          }
          setFileContents((c) => ({ ...c, [filePath]: content! }));
        } catch {
          errors++;
          continue;
        }
      }
      zip.file(filePath, content);
      loaded++;
    }

    setOutput((prev) => [...prev, `> Загружено ${loaded} файлов${errors ? `, ошибок: ${errors}` : ''}`]);

    try {
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = archiveName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setOutput((prev) => [...prev, `> ✓ ZIP-архив скачан (${(blob.size / 1024).toFixed(1)} KB)`]);
    } catch (err) {
      setOutput((prev) => [...prev, `> Ошибка создания архива: ${String(err)}`]);
    }
    setDownloading(false);
  }, [fileContents]);

  const downloadAllAsZip = useCallback(() => downloadZip(allFiles, 'irida-project.zip'), [allFiles, downloadZip]);

  const downloadSelectedAsZip = useCallback(() => {
    if (selected.size === 0) return;
    downloadZip([...selected], 'irida-selected.zip');
  }, [selected, downloadZip]);

  const handleTabKey = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
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
  }, [activeTab, fileContents, handleSave]);

  useEffect(() => {
    if (outputRef.current) outputRef.current.scrollTop = outputRef.current.scrollHeight;
  }, [output]);

  const currentCode = activeTab
    ? (loadingFile === activeTab ? `// Загрузка ${activeTab}...\n` : (fileContents[activeTab] ?? ''))
    : '';

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
      const isDirCustom = customDirs.includes(dir);
      if (renamingDir === dir) {
        return (
          <div key={dir} style={{ paddingLeft: `${8 + depth * 12}px` }} className="py-0.5 pr-1">
            <input
              ref={renameDirInputRef}
              value={renameDirValue}
              onChange={(e) => setRenameDirValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRenameDir();
                if (e.key === 'Escape') setRenamingDir(null);
              }}
              onBlur={() => handleRenameDir()}
              className="w-full bg-black/50 text-xs text-white/80 px-1.5 py-0.5 rounded border border-blue-500/50 font-mono focus:outline-none"
            />
          </div>
        );
      }
      return (
        <div key={dir}>
          <div
            className={`flex items-center group rounded transition-colors ${dropTarget === dir ? 'bg-blue-500/20 ring-1 ring-blue-500/40' : 'hover:bg-white/5'}`}
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDropTarget(dir); }}
            onDragLeave={() => setDropTarget(null)}
            onDrop={(e) => { e.preventDefault(); e.stopPropagation(); handleDrop(dir); }}
          >
            {selectMode && (
              <button
                onClick={(e) => { e.stopPropagation(); toggleSelectDir(dir); }}
                className="shrink-0 ml-1.5 w-3.5 h-3.5 flex items-center justify-center"
              >
                {(() => {
                  const dirFiles = allFiles.filter((f) => f.startsWith(dir + '/'));
                  const selCount = dirFiles.filter((f) => selected.has(f)).length;
                  const iconName = selCount === 0 ? 'Square' : selCount === dirFiles.length ? 'CheckSquare' : 'MinusSquare';
                  return <Icon name={iconName} className={`w-3 h-3 ${selCount > 0 ? 'text-cyan-400' : 'text-white/30'}`} />;
                })()}
              </button>
            )}
            <button
              onClick={() => toggleDir(dir)}
              className="flex items-center gap-1.5 py-0.5 px-2 flex-1 min-w-0 text-left"
              style={{ paddingLeft: selectMode ? '2px' : `${8 + depth * 12}px` }}
            >
              <Icon name={isOpen ? 'ChevronDown' : 'ChevronRight'} className="w-3 h-3 text-white/30 shrink-0" />
              <Icon name={dropTarget === dir ? 'FolderInput' : isOpen ? 'FolderOpen' : 'Folder'} className={`w-3.5 h-3.5 shrink-0 ${dropTarget === dir ? 'text-blue-400' : 'text-yellow-400/70'}`} />
              <span className={`text-xs truncate ${dropTarget === dir ? 'text-blue-300' : 'text-white/60'}`}>{name}</span>
            </button>
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all mr-1 shrink-0">
              <button onClick={() => handleCreateFolder(dir)} className="w-4 h-4 flex items-center justify-center rounded hover:bg-white/20" title="Новая папка">
                <Icon name="FolderPlus" className="w-2.5 h-2.5 text-white/40" />
              </button>
              <button onClick={() => { setNewFilePath(dir + '/'); setShowNewFile(true); setTimeout(() => newFileInputRef.current?.focus(), 100); }} className="w-4 h-4 flex items-center justify-center rounded hover:bg-white/20" title="Новый файл">
                <Icon name="FilePlus" className="w-2.5 h-2.5 text-white/40" />
              </button>
              {isDirCustom && (
                <>
                  <button onClick={() => startRenameDir(dir)} className="w-4 h-4 flex items-center justify-center rounded hover:bg-white/20" title="Переименовать">
                    <Icon name="Pencil" className="w-2.5 h-2.5 text-white/40" />
                  </button>
                  <button onClick={() => handleDeleteDir(dir)} className="w-4 h-4 flex items-center justify-center rounded hover:bg-red-500/30" title="Удалить папку">
                    <Icon name="Trash2" className="w-2.5 h-2.5 text-red-400" />
                  </button>
                </>
              )}
            </div>
          </div>
          {isOpen && (
            <>
              {newFolderParent === dir && (
                <div style={{ paddingLeft: `${20 + depth * 12}px` }} className="py-0.5 pr-1 flex items-center gap-1.5">
                  <Icon name="FolderPlus" className="w-3 h-3 text-yellow-400/50 shrink-0" />
                  <input
                    ref={newFolderInputRef}
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') confirmCreateFolder();
                      if (e.key === 'Escape') setNewFolderParent(null);
                    }}
                    onBlur={() => { if (newFolderName.trim()) confirmCreateFolder(); else setNewFolderParent(null); }}
                    placeholder="имя папки"
                    className="flex-1 bg-black/50 text-xs text-white/80 px-1.5 py-0.5 rounded border border-yellow-500/40 font-mono focus:outline-none placeholder:text-white/20 min-w-0"
                  />
                </div>
              )}
              {files.map((f) => {
                const fname = f.split('/').pop();
                const isCustom = customFiles.includes(f);
                if (renamingFile === f) {
                  return (
                    <div key={f} style={{ paddingLeft: `${20 + depth * 12}px` }} className="py-0.5 pr-1">
                      <input
                        ref={renameInputRef}
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRename();
                          if (e.key === 'Escape') setRenamingFile(null);
                        }}
                        onBlur={() => handleRename()}
                        className="w-full bg-black/50 text-xs text-white/80 px-1.5 py-0.5 rounded border border-blue-500/50 font-mono focus:outline-none"
                      />
                    </div>
                  );
                }
                return (
                  <div
                    key={f}
                    draggable={!selectMode}
                    onDragStart={() => !selectMode && setDragFile(f)}
                    onDragEnd={() => { setDragFile(null); setDropTarget(null); }}
                    className={`flex items-center group hover:bg-white/5 rounded ${activeTab === f ? 'bg-white/10' : ''} ${dragFile === f ? 'opacity-40' : ''} ${selected.has(f) ? 'bg-cyan-500/10' : ''}`}
                    style={{ cursor: selectMode ? 'pointer' : 'grab' }}
                  >
                    {selectMode && (
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleSelect(f); }}
                        className="shrink-0 ml-2 w-3.5 h-3.5 flex items-center justify-center"
                      >
                        <Icon name={selected.has(f) ? 'CheckSquare' : 'Square'} className={`w-3 h-3 ${selected.has(f) ? 'text-cyan-400' : 'text-white/30'}`} />
                      </button>
                    )}
                    <button
                      onClick={() => selectMode ? toggleSelect(f) : openFile(f)}
                      onDoubleClick={() => !selectMode && isCustom && startRename(f)}
                      className="flex items-center gap-1.5 py-0.5 flex-1 min-w-0 text-left"
                      style={{ paddingLeft: `${20 + depth * 12}px` }}
                    >
                      <Icon name={loadingFile === f ? 'Loader' : getFileIcon(f)} className={`w-3 h-3 text-blue-400/70 shrink-0 ${loadingFile === f ? 'animate-spin' : ''}`} />
                      <span className={`text-xs truncate ${activeTab === f ? 'text-white' : 'text-white/50'}`}>{fname}</span>
                    </button>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all mr-1 shrink-0">
                      {fileContents[f] && (
                        <button
                          onClick={() => downloadFile(f)}
                          className="w-4 h-4 flex items-center justify-center rounded hover:bg-white/20"
                          title="Скачать файл"
                        >
                          <Icon name="Download" className="w-2.5 h-2.5 text-white/50" />
                        </button>
                      )}
                      {isCustom && (
                        <>
                          <button
                            onClick={() => startRename(f)}
                            className="w-4 h-4 flex items-center justify-center rounded hover:bg-white/20"
                            title="Переименовать"
                          >
                            <Icon name="Pencil" className="w-2.5 h-2.5 text-white/50" />
                          </button>
                          <button
                            onClick={() => setShowDeleteConfirm(f)}
                            className="w-4 h-4 flex items-center justify-center rounded hover:bg-red-500/30"
                            title="Удалить"
                          >
                            <Icon name="Trash2" className="w-2.5 h-2.5 text-red-400" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
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
          <button
            onClick={() => { setShowNewFile(true); setTimeout(() => newFileInputRef.current?.focus(), 100); }}
            className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs bg-blue-600 text-white hover:bg-blue-500 transition-colors font-medium"
          >
            <Icon name="FilePlus" className="w-3.5 h-3.5" />
            Файл
          </button>
          <button
            onClick={() => handleCreateFolder('src')}
            className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs bg-amber-600 text-white hover:bg-amber-500 transition-colors font-medium"
          >
            <Icon name="FolderPlus" className="w-3.5 h-3.5" />
            Папка
          </button>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors font-medium"
            title="Загрузить все файлы проекта в базу данных"
          >
            <Icon name={syncing ? 'Loader' : 'RefreshCw'} className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Синхронизация...' : 'Синхронизировать'}
          </button>
          <div className="w-px h-5 bg-border" />
          <button
            onClick={() => { setSelectMode((v) => !v); if (selectMode) setSelected(new Set()); }}
            className={`flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs transition-colors font-medium ${selectMode ? 'bg-cyan-600 text-white ring-2 ring-cyan-400/50' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}
            title="Режим выбора файлов для скачивания"
          >
            <Icon name={selectMode ? 'CheckSquare' : 'Square'} className="w-3.5 h-3.5" />
            Выбрать
          </button>
          {selectMode && selected.size > 0 ? (
            <button
              onClick={downloadSelectedAsZip}
              disabled={downloading}
              className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs bg-violet-600 text-white hover:bg-violet-500 disabled:opacity-50 transition-colors font-medium"
              title="Скачать выбранные файлы в ZIP"
            >
              <Icon name={downloading ? 'Loader' : 'FolderArchive'} className={`w-3.5 h-3.5 ${downloading ? 'animate-spin' : ''}`} />
              {downloading ? 'Сборка...' : `Скачать (${selected.size})`}
            </button>
          ) : (
            <button
              onClick={downloadAllAsZip}
              disabled={downloading}
              className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs bg-violet-600 text-white hover:bg-violet-500 disabled:opacity-50 transition-colors font-medium"
              title="Скачать все файлы проекта в ZIP-архиве"
            >
              <Icon name={downloading ? 'Loader' : 'FolderArchive'} className={`w-3.5 h-3.5 ${downloading ? 'animate-spin' : ''}`} />
              {downloading ? 'Сборка...' : 'Скачать ZIP'}
            </button>
          )}
          {activeTab && (
            <>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded font-mono">{getFileLang(activeTab)}</span>
              <button
                onClick={() => downloadFile(activeTab)}
                className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs bg-white/10 text-white/80 hover:bg-white/20 transition-colors font-medium"
                title="Скачать текущий файл"
              >
                <Icon name="Download" className="w-3.5 h-3.5" />
              </button>
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

          {/* Explorer label + new file btn */}
          <div className="flex items-center justify-between px-3 py-1.5 shrink-0">
            <span className="text-[10px] text-white/25 uppercase tracking-wider font-semibold">
              {search ? `Результаты (${filteredFiles?.length ?? 0})` : `Проект (${allFiles.length} файлов)`}
            </span>
            <button
              onClick={() => { setShowNewFile(true); setTimeout(() => newFileInputRef.current?.focus(), 100); }}
              className="text-white/25 hover:text-white/60 transition-colors"
              title="Создать файл"
            >
              <Icon name="FilePlus" className="w-3.5 h-3.5" />
            </button>
          </div>
          {selectMode && (
            <div className="flex items-center gap-2 px-3 py-1 border-b border-white/10 shrink-0 bg-cyan-900/20">
              <button
                onClick={selectAll}
                className="text-[10px] text-cyan-400 hover:text-cyan-300 font-medium"
              >
                {selected.size === allFiles.length ? 'Снять всё' : 'Выбрать всё'}
              </button>
              {selected.size > 0 && (
                <span className="text-[10px] text-cyan-400/60">{selected.size} из {allFiles.length}</span>
              )}
            </div>
          )}

          {/* New file input */}
          {showNewFile && (
            <div className="px-2 pb-2 shrink-0">
              <div className="bg-black/40 rounded border border-white/10 p-2 space-y-2">
                <div className="text-[10px] text-white/40">Путь к новому файлу:</div>
                <input
                  ref={newFileInputRef}
                  value={newFilePath}
                  onChange={(e) => setNewFilePath(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateFile();
                    if (e.key === 'Escape') { setShowNewFile(false); setNewFilePath('src/'); }
                  }}
                  placeholder="src/components/MyFile.tsx"
                  className="w-full bg-black/50 text-xs text-white/80 px-2 py-1 rounded border border-white/10 placeholder:text-white/20 focus:outline-none focus:border-white/30 font-mono"
                />
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleCreateFile}
                    className="flex-1 h-6 text-[10px] bg-emerald-600 text-white rounded hover:bg-emerald-500 transition-colors font-medium"
                  >
                    Создать
                  </button>
                  <button
                    onClick={() => { setShowNewFile(false); setNewFilePath('src/'); }}
                    className="flex-1 h-6 text-[10px] bg-white/10 text-white/50 rounded hover:bg-white/20 transition-colors"
                  >
                    Отмена
                  </button>
                </div>
              </div>
            </div>
          )}

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
              {/* Code with syntax highlighting */}
              <div className="flex flex-1 overflow-hidden bg-[#0d1117]">
                <CodeEditor
                  code={currentCode}
                  language={getPrismLang(activeTab)}
                  onChange={(val) => setFileContents((c) => ({ ...c, [activeTab]: val }))}
                  onKeyDown={handleTabKey}
                  textareaRef={textareaRef}
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

      {/* Delete confirm popup */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#1c2128] border border-white/10 rounded-xl p-5 w-full max-w-xs mx-4 shadow-2xl">
            <div className="flex items-center gap-2 mb-3">
              <Icon name="AlertTriangle" className="w-5 h-5 text-red-400" />
              <span className="text-sm font-semibold text-white">Удалить файл?</span>
            </div>
            <p className="text-xs text-white/50 mb-1">Файл будет удалён из базы данных:</p>
            <p className="text-xs text-white/80 font-mono bg-black/30 rounded px-2 py-1 mb-4 break-all">{showDeleteConfirm}</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleDeleteFile(showDeleteConfirm)}
                className="flex-1 h-8 text-xs bg-red-600 text-white rounded-lg hover:bg-red-500 transition-colors font-medium"
              >
                Удалить
              </button>
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 h-8 text-xs bg-white/10 text-white/60 rounded-lg hover:bg-white/20 transition-colors"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
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