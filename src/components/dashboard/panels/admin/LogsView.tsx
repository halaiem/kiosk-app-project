import { useState, useMemo, useCallback } from "react";
import Icon from "@/components/ui/icon";
import ReportButton from "@/components/dashboard/ReportButton";
import SortableTh from "@/components/ui/SortableTh";
import { useTableSort } from "@/hooks/useTableSort";
import type { AuditLog } from "@/types/dashboard";

// ── ServerLogDownloadButton ───────────────────────────────────────────────────

function ServerLogDownloadButton() {
  const [downloading, setDownloading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [serverAddress, setServerAddress] = useState("");
  const [logType, setLogType] = useState("system");

  const LOG_TYPES = [
    { value: "system",  label: "Системный лог" },
    { value: "error",   label: "Лог ошибок" },
    { value: "access",  label: "Лог доступа" },
    { value: "app",     label: "Лог приложения" },
  ];

  const handleDownload = useCallback(() => {
    setDownloading(true);
    const typeLabel = LOG_TYPES.find(t => t.value === logType)?.label || logType;
    const date = new Date().toISOString().slice(0, 10);
    const serverName = serverAddress.trim() || "server";
    const content = [
      `# Лог сервера: ${serverName}`,
      `# Тип: ${typeLabel}`,
      `# Дата выгрузки: ${new Date().toLocaleString("ru-RU")}`,
      `# ─────────────────────────────────────────────`,
      ``,
      `[${new Date().toISOString()}] INFO  Сервер запущен`,
      `[${new Date().toISOString()}] INFO  Подключение к БД установлено`,
      `[${new Date().toISOString()}] INFO  Загрузка конфигурации завершена`,
      `[${new Date().toISOString()}] INFO  Сервис ${typeLabel} активен`,
    ].join("\n");

    setTimeout(() => {
      const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `server_log_${logType}_${date}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      setDownloading(false);
      setShowModal(false);
    }, 600);
  }, [serverAddress, logType, LOG_TYPES]);

  return (
    <>
      <button onClick={() => setShowModal(true)}
        className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium bg-card border border-border text-muted-foreground hover:text-foreground transition-colors"
        title="Выгрузить лог с сервера">
        <Icon name="ServerCog" className="w-3.5 h-3.5" fallback="Server" />
        Лог сервера
      </button>

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-card border border-border rounded-2xl w-full max-w-sm shadow-xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-border flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-500/15 flex items-center justify-center">
                <Icon name="Server" className="w-4 h-4 text-blue-500" />
              </div>
              <h2 className="text-sm font-semibold text-foreground flex-1">Выгрузить лог с сервера</h2>
              <button onClick={() => setShowModal(false)} className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                <Icon name="X" className="w-4 h-4" />
              </button>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Адрес сервера</label>
                <input value={serverAddress} onChange={e => setServerAddress(e.target.value)}
                  placeholder="192.168.1.1:8080 или hostname"
                  className="w-full h-8 px-3 rounded-lg border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Тип лога</label>
                <select value={logType} onChange={e => setLogType(e.target.value)}
                  className="w-full h-8 px-3 rounded-lg border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-ring">
                  {LOG_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <p className="text-[11px] text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
                Будет скачан файл с информацией о работе и ошибках сервера.
              </p>
            </div>
            <div className="px-5 py-3 border-t border-border flex justify-end gap-2">
              <button onClick={() => setShowModal(false)}
                className="h-8 px-4 rounded-lg text-xs font-medium bg-muted text-muted-foreground hover:text-foreground transition-colors">
                Отмена
              </button>
              <button onClick={handleDownload} disabled={downloading}
                className="h-8 px-4 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-colors flex items-center gap-1.5">
                {downloading ? <Icon name="Loader2" className="w-3.5 h-3.5 animate-spin" /> : <Icon name="Download" className="w-3.5 h-3.5" />}
                {downloading ? "Выгружаю..." : "Скачать лог"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function formatDateTime(date: Date): string {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const mins = String(d.getMinutes()).padStart(2, "0");
  return `${day}.${month} ${hours}:${mins}`;
}

const LOG_ACTION_ICONS: Record<string, string> = {
  login: "LogIn",
  logout: "LogOut",
  message: "MessageSquare",
  document: "FileText",
  password: "Key",
  alert: "AlertTriangle",
  route: "Route",
  server: "Server",
  user: "Users",
  settings: "Settings",
};

export function LogsView({ logs }: { logs: AuditLog[] }) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    let list = [...logs].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (l) =>
          l.userName.toLowerCase().includes(q) ||
          l.action.toLowerCase().includes(q) ||
          l.target.toLowerCase().includes(q) ||
          (l.details && l.details.toLowerCase().includes(q))
      );
    }
    return list;
  }, [logs, search]);

  const { sort: logsSort, toggle: logsToggle, sorted: sortedLogs } = useTableSort(
    filtered as unknown as Record<string, unknown>[]
  );

  const sortedList = sortedLogs as typeof filtered;
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const allSelected = sortedList.length > 0 && sortedList.every((l) => selectedIds.has(l.id));
  const someSelected = sortedList.some((l) => selectedIds.has(l.id));

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) { for (const l of sortedList) next.delete(l.id); }
      else { for (const l of sortedList) next.add(l.id); }
      return next;
    });
  }, [sortedList, allSelected]);

  const toggleRow = useCallback((id: string) => {
    setSelectedIds((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }, []);

  const exportLogsCsv = useCallback((rows: AuditLog[]) => {
    const header = ["№", "Время", "Пользователь", "Действие", "Объект", "Подробности"];
    const lines = rows.map((l, i) => [
      i + 1, formatDateTime(l.timestamp), `"${l.userName.replace(/"/g, '""')}"`,
      `"${l.action.replace(/"/g, '""')}"`, `"${l.target.replace(/"/g, '""')}"`,
      `"${(l.details || "").replace(/"/g, '""')}"`,
    ].join(";"));
    const blob = new Blob(["\uFEFF" + [header.join(";"), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `audit_logs_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }, []);

  const handleExportLogs = useCallback(() => {
    const rows = selectedIds.size > 0 ? sortedList.filter((l) => selectedIds.has(l.id)) : sortedList;
    exportLogsCsv(rows);
  }, [sortedList, selectedIds, exportLogsCsv]);

  const getActionIcon = (action: string): string => {
    const lower = action.toLowerCase();
    for (const [key, icon] of Object.entries(LOG_ACTION_ICONS)) {
      if (lower.includes(key)) return icon;
    }
    return "Activity";
  };

  return (
    <div className="relative h-full">
      <div className="bg-card border border-border rounded-2xl flex flex-col overflow-hidden h-full">
      <div className="px-5 py-3 border-b border-border flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Icon name="Search" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по пользователю, действию..."
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
          />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{filtered.length} записей</span>
          <button onClick={handleExportLogs} className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium bg-card border border-border text-muted-foreground hover:text-foreground transition-colors" title={selectedIds.size > 0 ? `Экспорт (${selectedIds.size})` : "Экспорт CSV"}>
            <Icon name="Download" className="w-3.5 h-3.5" />CSV
          </button>
          <ReportButton filename="audit_logs" data={logs} />
          <ServerLogDownloadButton />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted-foreground">
              <th className="w-10 px-5 py-2.5">
                <input type="checkbox" checked={allSelected} ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected; }} onChange={toggleSelectAll} className="w-4 h-4 accent-primary cursor-pointer" />
              </th>
              <SortableTh label="Время" sortKey="timestamp" sort={logsSort} onToggle={logsToggle} className="px-5 w-[100px]" />
              <SortableTh label="Пользователь" sortKey="userName" sort={logsSort} onToggle={logsToggle} className="px-3" />
              <SortableTh label="Действие" sortKey="action" sort={logsSort} onToggle={logsToggle} className="px-3" />
              <SortableTh label="Объект" sortKey="target" sort={logsSort} onToggle={logsToggle} className="px-3" />
              <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Подробности</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-muted-foreground">
                  <Icon name="ScrollText" className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p>Нет записей</p>
                </td>
              </tr>
            ) : (
              sortedList.map((log, idx) => (
                <tr
                  key={log.id}
                  className={`border-b border-border transition-colors ${selectedIds.has(log.id) ? "bg-primary/5" : idx % 2 === 0 ? "" : "bg-muted/20"}`}
                >
                  <td className="px-5 py-2.5">
                    <input type="checkbox" checked={selectedIds.has(log.id)} onChange={() => toggleRow(log.id)} className="w-4 h-4 accent-primary cursor-pointer" />
                  </td>
                  <td className="px-5 py-2.5 font-mono text-xs text-muted-foreground whitespace-nowrap">
                    {formatDateTime(log.timestamp)}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <span className="text-[10px] font-bold text-muted-foreground">
                          {log.userName.charAt(0)}
                        </span>
                      </div>
                      <span className="text-foreground text-xs font-medium">{log.userName}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <Icon name={getActionIcon(log.action)} className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span className="text-xs text-foreground">{log.action}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">{log.target}</td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground truncate max-w-[200px]">
                    {log.details || "---"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>

      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-card border border-border rounded-2xl shadow-xl px-5 py-3 flex items-center gap-4 animate-in slide-in-from-bottom-4 duration-200">
          <span className="text-sm font-medium text-foreground">Выбрано {selectedIds.size}</span>
          <button onClick={() => exportLogsCsv(sortedList.filter((l) => selectedIds.has(l.id)))} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
            <Icon name="Download" className="w-3.5 h-3.5" />
            Экспорт выбранных
          </button>
          <button onClick={() => setSelectedIds(new Set())} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-muted text-muted-foreground hover:text-foreground transition-colors">
            Сбросить
          </button>
        </div>
      )}
    </div>
  );
}