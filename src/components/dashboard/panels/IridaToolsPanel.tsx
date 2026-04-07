import { useState, useRef, useEffect } from 'react';
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
const INITIAL_CODE = `// Irida-Tools — Редактор кода
// Используйте этот редактор для просмотра и изменения конфигурации

const iridaConfig = {
  version: "2.1.0",
  environment: "production",
  modules: ["cities", "ui", "server", "equipment"],
  debug: false,
  api: {
    timeout: 30000,
    retries: 3,
    baseUrl: "https://api.irida.local"
  }
};

function applyConfig(config) {
  console.log("[Irida] Применяю конфигурацию...", config);
  // TODO: добавить валидацию
  return { status: "ok", applied: new Date().toISOString() };
}

module.exports = { iridaConfig, applyConfig };
`;

function TerminalSection() {
  const [code, setCode] = useState(INITIAL_CODE);
  const [output, setOutput] = useState<string[]>([
    '> Irida Terminal v2.1.0',
    '> Готов к работе. Нажмите "Выполнить" для запуска кода.',
  ]);
  const [activeFile, setActiveFile] = useState('config.js');
  const [running, setRunning] = useState(false);
  const outputRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const FILES = ['config.js', 'routes.json', 'settings.yaml'];

  const FILE_CONTENT: Record<string, string> = {
    'config.js': INITIAL_CODE,
    'routes.json': `{
  "routes": [
    { "id": 1, "name": "Маршрут A1", "active": true },
    { "id": 2, "name": "Маршрут B2", "active": false },
    { "id": 3, "name": "Маршрут C3", "active": true }
  ],
  "updated": "2026-04-07T14:00:00Z"
}`,
    'settings.yaml': `# Irida Platform Settings
server:
  host: 0.0.0.0
  port: 8080
  workers: 4

database:
  host: localhost
  port: 5432
  name: irida_db
  pool_size: 10

logging:
  level: INFO
  file: /var/log/irida.log
  max_size: 100MB
`,
  };

  useEffect(() => {
    setCode(FILE_CONTENT[activeFile]);
  }, [activeFile]);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  const handleRun = () => {
    setRunning(true);
    const now = new Date().toLocaleTimeString();
    setOutput((prev) => [
      ...prev,
      ``,
      `> [${now}] Выполняю ${activeFile}...`,
      `> Синтаксическая проверка: OK`,
      `> Загружаю модули: irida-core, db, scheduler`,
      `> Применяю изменения...`,
      `> ✓ Файл ${activeFile} успешно применён`,
      `> Изменения вступят в силу после перезапуска сервиса`,
    ]);
    setTimeout(() => setRunning(false), 1200);
  };

  const handleClear = () => {
    setOutput(['> Консоль очищена.']);
  };

  const handleSave = () => {
    const now = new Date().toLocaleTimeString();
    setOutput((prev) => [
      ...prev,
      ``,
      `> [${now}] Сохранение ${activeFile}...`,
      `> ✓ Файл сохранён`,
    ]);
  };

  const handleTabKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const ta = textareaRef.current;
      if (!ta) return;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const newCode = code.substring(0, start) + '  ' + code.substring(end);
      setCode(newCode);
      setTimeout(() => { ta.selectionStart = ta.selectionEnd = start + 2; }, 0);
    }
  };

  return (
    <div className="space-y-4 h-full">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Терминал</h2>
        <p className="text-muted-foreground mt-1">Редактор кода и консоль выполнения</p>
      </div>

      <div className="bg-[#0d1117] rounded-xl border border-border overflow-hidden flex flex-col" style={{ height: 'calc(100vh - 220px)' }}>
        {/* Window bar */}
        <div className="flex items-center gap-2 px-4 py-2 bg-[#161b22] border-b border-border/50 shrink-0">
          <div className="w-3 h-3 rounded-full bg-red-500/70" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
          <div className="w-3 h-3 rounded-full bg-green-500/70" />
          <div className="ml-2 flex gap-1">
            {FILES.map((f) => (
              <button
                key={f}
                onClick={() => setActiveFile(f)}
                className={`px-3 py-1 rounded text-xs font-mono transition-colors ${
                  activeFile === f
                    ? 'bg-[#0d1117] text-white'
                    : 'text-white/40 hover:text-white/70'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 h-7 px-3 rounded text-xs bg-white/10 text-white/70 hover:bg-white/20 hover:text-white transition-colors font-mono"
            >
              <Icon name="Save" className="w-3 h-3" />
              Сохранить
            </button>
            <button
              onClick={handleRun}
              disabled={running}
              className="flex items-center gap-1.5 h-7 px-3 rounded text-xs bg-green-600 text-white hover:bg-green-500 disabled:opacity-50 transition-colors font-mono"
            >
              <Icon name={running ? 'Loader' : 'Play'} className={`w-3 h-3 ${running ? 'animate-spin' : ''}`} />
              {running ? 'Выполняю...' : 'Выполнить'}
            </button>
          </div>
        </div>

        {/* Editor + output */}
        <div className="flex flex-1 overflow-hidden">
          {/* Code editor */}
          <div className="flex flex-1 overflow-hidden border-r border-border/30">
            {/* Line numbers */}
            <div className="px-3 py-4 text-right select-none shrink-0 bg-[#0d1117]">
              {code.split('\n').map((_, i) => (
                <div key={i} className="text-xs text-white/20 font-mono leading-5">{i + 1}</div>
              ))}
            </div>
            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={handleTabKey}
              spellCheck={false}
              className="flex-1 resize-none bg-[#0d1117] text-green-300 font-mono text-xs leading-5 p-4 pl-2 focus:outline-none overflow-auto"
            />
          </div>

          {/* Output console */}
          <div className="w-72 flex flex-col shrink-0 bg-[#0a0e13]">
            <div className="flex items-center justify-between px-3 py-2 border-b border-border/30">
              <span className="text-xs text-white/40 font-mono">Консоль</span>
              <button onClick={handleClear} className="text-white/30 hover:text-white/60 transition-colors">
                <Icon name="Trash2" className="w-3 h-3" />
              </button>
            </div>
            <div ref={outputRef} className="flex-1 overflow-y-auto p-3 space-y-0.5">
              {output.map((line, i) => (
                <div key={i} className={`text-xs font-mono leading-5 ${
                  line.includes('✓') ? 'text-green-400' :
                  line.includes('Ошибка') || line.includes('ERROR') ? 'text-red-400' :
                  line.startsWith('>') ? 'text-white/60' : 'text-white/20'
                }`}>
                  {line || '\u00A0'}
                </div>
              ))}
            </div>
          </div>
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
