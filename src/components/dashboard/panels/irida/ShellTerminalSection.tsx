import { useState, useRef, useEffect, useCallback } from 'react';
import Icon from '@/components/ui/icon';

const SHELL_API = 'https://functions.poehali.dev/e8230c6e-2b9b-4f87-b0f0-d1df4e9f3456';

interface HistoryEntry {
  command: string;
  output: string;
  exitCode: number;
  time: string;
}

const WELCOME = [
  '╔══════════════════════════════════════════════════╗',
  '║           ИРИДА Shell v1.0.0                     ║',
  '║           Платформа управления транспортом        ║',
  '╚══════════════════════════════════════════════════╝',
  '',
  'Введите "help" для списка команд.',
  '',
];

export default function ShellTerminalSection() {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [cmdHistory, setCmdHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [running, setRunning] = useState(false);
  const [welcomeLines] = useState(WELCOME);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [history]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const execute = useCallback(async (cmd: string) => {
    const trimmed = cmd.trim();
    if (!trimmed) return;

    if (trimmed === 'clear') {
      setHistory([]);
      return;
    }

    setRunning(true);
    const now = new Date().toLocaleTimeString();

    try {
      const res = await fetch(SHELL_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: trimmed }),
      });
      const data = await res.json();

      if (data.output === '__CLEAR__') {
        setHistory([]);
      } else {
        setHistory(prev => [...prev, {
          command: trimmed,
          output: data.output || '',
          exitCode: data.exitCode ?? 0,
          time: now,
        }]);
      }
    } catch (e) {
      setHistory(prev => [...prev, {
        command: trimmed,
        output: `Connection error: ${String(e)}`,
        exitCode: 1,
        time: now,
      }]);
    }

    setCmdHistory(prev => [trimmed, ...prev.filter(c => c !== trimmed)].slice(0, 50));
    setHistoryIdx(-1);
    setRunning(false);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      execute(input);
      setInput('');
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (cmdHistory.length > 0) {
        const idx = Math.min(historyIdx + 1, cmdHistory.length - 1);
        setHistoryIdx(idx);
        setInput(cmdHistory[idx]);
      }
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIdx > 0) {
        const idx = historyIdx - 1;
        setHistoryIdx(idx);
        setInput(cmdHistory[idx]);
      } else {
        setHistoryIdx(-1);
        setInput('');
      }
    }
    if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault();
      setHistory([]);
    }
  };

  const quickCommands = [
    { label: 'help', cmd: 'help' },
    { label: 'whoami', cmd: 'whoami' },
    { label: 'db:tables', cmd: 'db:tables' },
    { label: 'api:list', cmd: 'api:list' },
    { label: 'config:get', cmd: 'config:get' },
    { label: 'uptime', cmd: 'uptime' },
    { label: 'version', cmd: 'version' },
    { label: 'ping cdn', cmd: 'ping cdn.poehali.dev' },
  ];

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 88px)' }}>
      <div className="flex items-center justify-between mb-3 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-foreground">Терминал</h2>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-muted text-xs font-medium">
              <span className={`w-1.5 h-1.5 rounded-full ${running ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
              <span className="text-muted-foreground">{running ? 'выполняется...' : 'готов'}</span>
            </div>
          </div>
          <p className="text-muted-foreground text-sm mt-0.5">Shell-консоль для управления сервером и API</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setHistory([])}
            className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs bg-secondary text-secondary-foreground hover:bg-secondary/70 border border-border transition-colors font-medium">
            <Icon name="Trash2" className="w-3.5 h-3.5" />
            Очистить
          </button>
        </div>
      </div>

      <div className="flex gap-2 mb-3 flex-wrap shrink-0">
        {quickCommands.map(q => (
          <button key={q.cmd} onClick={() => { execute(q.cmd); }}
            className="px-2.5 py-1 rounded-lg text-xs font-mono bg-muted text-muted-foreground hover:text-foreground hover:bg-primary/10 transition-colors border border-transparent hover:border-primary/30">
            {q.label}
          </button>
        ))}
      </div>

      <div className="flex-1 bg-[#0a0e13] rounded-xl border border-border overflow-hidden flex flex-col" style={{ minHeight: 0 }}
           onClick={() => inputRef.current?.focus()}>
        {/* Traffic lights */}
        <div className="flex items-center gap-1.5 px-4 py-2 bg-[#161b22] border-b border-white/10 shrink-0">
          <div className="w-3 h-3 rounded-full bg-red-500/70" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
          <div className="w-3 h-3 rounded-full bg-green-500/70" />
          <span className="ml-2 text-xs text-white/30 font-mono">irida-shell — {history.length} команд</span>
          <span className="ml-auto text-xs text-white/20 font-mono">Ctrl+L очистить · ↑↓ история</span>
        </div>

        {/* Output */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 font-mono text-xs leading-5" style={{ minHeight: 0 }}>
          {welcomeLines.map((line, i) => (
            <div key={`w-${i}`} className="text-emerald-400/70">{line || '\u00A0'}</div>
          ))}

          {history.map((entry, i) => (
            <div key={i} className="mb-2">
              <div className="flex items-center gap-2">
                <span className="text-emerald-400">irida</span>
                <span className="text-white/30">@</span>
                <span className="text-cyan-400">shell</span>
                <span className="text-white/30">$</span>
                <span className="text-white/80 ml-1">{entry.command}</span>
                <span className="ml-auto text-white/15 text-[10px]">{entry.time}</span>
              </div>
              {entry.output && (
                <div className={`mt-0.5 whitespace-pre-wrap ${entry.exitCode === 0 ? 'text-white/60' : 'text-red-400'}`}>
                  {entry.output}
                </div>
              )}
            </div>
          ))}

          {/* Input line */}
          <div className="flex items-center gap-2 mt-1">
            <span className="text-emerald-400">irida</span>
            <span className="text-white/30">@</span>
            <span className="text-cyan-400">shell</span>
            <span className="text-white/30">$</span>
            <div className="flex-1 relative ml-1">
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={running}
                className="w-full bg-transparent text-white/90 font-mono text-xs focus:outline-none caret-emerald-400 disabled:opacity-40"
                spellCheck={false}
                autoComplete="off"
                autoCapitalize="off"
                placeholder={running ? 'выполняется...' : ''}
              />
              {running && (
                <Icon name="Loader" className="absolute right-0 top-0 w-3 h-3 text-amber-400 animate-spin" />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
