import { useState, useMemo, useCallback } from "react";
import Icon from "@/components/ui/icon";
import type { ServerInfo, ServerStatus } from "@/types/dashboard";

// ── helpers ───────────────────────────────────────────────────────────────────

function formatDateTime(date: Date): string {
  const d = new Date(date);
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

const SERVER_STATUS_DOT: Record<ServerStatus, string> = {
  online: "bg-green-500",
  warning: "bg-yellow-500",
  offline: "bg-red-500",
};

const SERVER_STATUS_BADGE: Record<ServerStatus, string> = {
  online: "bg-green-500/15 text-green-500",
  warning: "bg-yellow-500/15 text-yellow-600",
  offline: "bg-red-500/15 text-red-500",
};

const SERVER_STATUS_LABELS: Record<ServerStatus, string> = {
  online: "Онлайн",
  warning: "Внимание",
  offline: "Недоступен",
};

const SERVER_TYPES = [
  { value: "irida",    label: "ИРИДА" },
  { value: "db",       label: "БД" },
  { value: "storage",  label: "Хранилище" },
  { value: "backup",   label: "Резервных копий" },
  { value: "telemetry",label: "Телеметрия" },
  { value: "api",      label: "API" },
  { value: "other",    label: "Другое" },
];

const SERVER_TYPE_ICONS: Record<string, string> = {
  irida: "Server", db: "Database", storage: "HardDrive",
  backup: "Archive", telemetry: "Activity", api: "Plug", other: "Server",
};

// ── custom server interface (extends ServerInfo with config) ──────────────────

interface CustomServer extends ServerInfo {
  address?: string;
  port?: string;
  serverType?: string;
  isCustom?: boolean;
}

const LS_KEY = "admin_custom_servers";

function loadCustomServers(): CustomServer[] {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]"); }
  catch { return []; }
}
function saveCustomServers(list: CustomServer[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(list));
}

// ── sub-components ────────────────────────────────────────────────────────────

function ProgressBar({ value, color, warn }: { value: number; color: string; warn?: boolean }) {
  return (
    <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
      <div className={`h-full rounded-full transition-all ${warn ? "bg-red-500" : color}`}
        style={{ width: `${Math.min(value, 100)}%` }} />
    </div>
  );
}

interface ServerFormState {
  name: string;
  address: string;
  port: string;
  serverType: string;
  status: ServerStatus;
}

function ServerFormModal({
  initial,
  title,
  onSave,
  onClose,
}: {
  initial?: Partial<ServerFormState>;
  title: string;
  onSave: (v: ServerFormState) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<ServerFormState>({
    name: initial?.name || "",
    address: initial?.address || "",
    port: initial?.port || "",
    serverType: initial?.serverType || "irida",
    status: initial?.status || "offline",
  });

  const inputCls = "w-full h-8 px-3 rounded-lg border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-500/15 flex items-center justify-center">
            <Icon name="Server" className="w-4 h-4 text-blue-500" />
          </div>
          <h2 className="text-sm font-semibold text-foreground flex-1">{title}</h2>
          <button onClick={onClose} className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
            <Icon name="X" className="w-4 h-4" />
          </button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Название *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Сервер ИРИДА" className={inputCls} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Адрес сервера *</label>
              <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                placeholder="192.168.1.1 или hostname" className={inputCls} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Порт</label>
              <input value={form.port} onChange={e => setForm(f => ({ ...f, port: e.target.value.replace(/\D/g, "") }))}
                placeholder="8080" maxLength={5} className={inputCls} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Тип сервера</label>
              <select value={form.serverType} onChange={e => setForm(f => ({ ...f, serverType: e.target.value }))}
                className="w-full h-8 px-3 rounded-lg border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-ring">
                {SERVER_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Статус</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as ServerStatus }))}
                className="w-full h-8 px-3 rounded-lg border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="online">Онлайн</option>
                <option value="warning">Внимание</option>
                <option value="offline">Недоступен</option>
              </select>
            </div>
          </div>
        </div>
        <div className="px-5 py-3 border-t border-border flex justify-end gap-2">
          <button onClick={onClose} className="h-8 px-4 rounded-lg text-xs font-medium bg-muted text-muted-foreground hover:text-foreground transition-colors">
            Отмена
          </button>
          <button
            onClick={() => { if (!form.name.trim() || !form.address.trim()) return; onSave(form); }}
            disabled={!form.name.trim() || !form.address.trim()}
            className="h-8 px-4 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-colors">
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
}

// ── main component ────────────────────────────────────────────────────────────

export function ServersView({ servers: propServers }: { servers: ServerInfo[] }) {
  const [customServers, setCustomServers] = useState<CustomServer[]>(() => loadCustomServers());
  const [showAddModal, setShowAddModal] = useState(false);
  const [editServer, setEditServer] = useState<CustomServer | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const allServers: CustomServer[] = useMemo(() => [
    ...propServers.map(s => ({ ...s, isCustom: false })),
    ...customServers,
  ], [propServers, customServers]);

  const summary = useMemo(() => {
    const s = { total: allServers.length, online: 0, warnings: 0, offline: 0 };
    for (const srv of allServers) {
      if (srv.status === "online") s.online++;
      if (srv.status === "warning") s.warnings++;
      if (srv.status === "offline") s.offline++;
    }
    return s;
  }, [allServers]);

  const handleAddServer = useCallback((form: ServerFormState) => {
    const newSrv: CustomServer = {
      id: `custom_${Date.now()}`,
      name: form.name,
      address: form.address,
      port: form.port,
      serverType: form.serverType,
      status: form.status,
      cpu: 0, memory: 0, disk: 0,
      uptime: "—",
      lastCheck: new Date(),
      isCustom: true,
    };
    const updated = [...customServers, newSrv];
    setCustomServers(updated);
    saveCustomServers(updated);
    setShowAddModal(false);
  }, [customServers]);

  const handleEditServer = useCallback((form: ServerFormState) => {
    if (!editServer) return;
    const updated = customServers.map(s =>
      s.id === editServer.id ? { ...s, ...form } : s
    );
    setCustomServers(updated);
    saveCustomServers(updated);
    setEditServer(null);
  }, [customServers, editServer]);

  const handleDelete = useCallback((id: string) => {
    const updated = customServers.filter(s => s.id !== id);
    setCustomServers(updated);
    saveCustomServers(updated);
    setDeleteConfirmId(null);
  }, [customServers]);

  const typeLabel = (t?: string) => SERVER_TYPES.find(x => x.value === t)?.label || t || "—";
  const typeIcon = (t?: string) => SERVER_TYPE_ICONS[t || "other"] || "Server";

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { icon: "Server", value: summary.total, label: "Всего", color: "text-blue-500", bg: "bg-blue-500/10" },
          { icon: "CheckCircle", value: summary.online, label: "Онлайн", color: "text-green-500", bg: "bg-green-500/10" },
          { icon: "AlertTriangle", value: summary.warnings, label: "Внимание", color: "text-yellow-500", bg: "bg-yellow-500/10" },
          { icon: "XCircle", value: summary.offline, label: "Недоступны", color: "text-red-500", bg: "bg-red-500/10" },
        ].map(c => (
          <div key={c.label} className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl ${c.bg} flex items-center justify-center shrink-0`}>
              <Icon name={c.icon} className={`w-4 h-4 ${c.color}`} />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground">{c.value}</p>
              <p className="text-[11px] text-muted-foreground">{c.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Servers list */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-500/15 flex items-center justify-center">
            <Icon name="Server" className="w-4 h-4 text-blue-500" />
          </div>
          <span className="text-sm font-semibold text-foreground">Серверы</span>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{allServers.length}</span>
          <button onClick={() => setShowAddModal(true)}
            className="ml-auto flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
            <Icon name="Plus" className="w-3.5 h-3.5" />Добавить сервер
          </button>
        </div>

        <div className="divide-y divide-border">
          {allServers.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-muted-foreground">
              <Icon name="ServerOff" className="w-8 h-8 mx-auto mb-2 opacity-30" />
              Нет серверов
            </div>
          ) : allServers.map(srv => {
            const isExpanded = expandedId === srv.id;
            const cpuWarn = srv.cpu > 70;
            const memWarn = srv.memory > 80;
            const diskWarn = srv.disk > 80;
            const isOffline = srv.status === "offline";

            return (
              <div key={srv.id}>
                <div className="px-5 py-3 flex items-center gap-3 hover:bg-muted/20 transition-colors">
                  <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
                    <Icon name={typeIcon(srv.serverType)} className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground truncate">{srv.name}</span>
                      {srv.isCustom && <span className="text-[9px] text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">настроен</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      {srv.address && <span className="text-[11px] text-muted-foreground font-mono">{srv.address}{srv.port ? `:${srv.port}` : ""}</span>}
                      {srv.serverType && <span className="text-[11px] text-muted-foreground">{typeLabel(srv.serverType)}</span>}
                      <span className="text-[11px] text-muted-foreground">Uptime: {srv.uptime}</span>
                    </div>
                  </div>
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${SERVER_STATUS_BADGE[srv.status]}`}>
                    <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${SERVER_STATUS_DOT[srv.status]} ${srv.status === "online" ? "animate-pulse" : ""}`} />
                    {SERVER_STATUS_LABELS[srv.status]}
                  </span>

                  {/* metric badges */}
                  {!isOffline && (
                    <div className="hidden sm:flex items-center gap-1.5">
                      {[
                        { label: "CPU", val: srv.cpu, warn: cpuWarn },
                        { label: "RAM", val: srv.memory, warn: memWarn },
                        { label: "Диск", val: srv.disk, warn: diskWarn },
                      ].map(m => (
                        <span key={m.label} className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${m.warn ? "bg-red-500/15 text-red-500" : "bg-muted text-muted-foreground"}`}>
                          {m.label} {m.val}%
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => setExpandedId(isExpanded ? null : srv.id)}
                      className="w-7 h-7 rounded-lg bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors"
                      title="Подробнее">
                      <Icon name={isExpanded ? "ChevronUp" : "ChevronDown"} className="w-3.5 h-3.5" />
                    </button>
                    {srv.isCustom ? (
                      <>
                        <button onClick={() => setEditServer(srv)}
                          className="w-7 h-7 rounded-lg bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors"
                          title="Настроить">
                          <Icon name="Settings" className="w-3.5 h-3.5" />
                        </button>
                        {deleteConfirmId === srv.id ? (
                          <>
                            <span className="text-xs text-destructive">Удалить?</span>
                            <button onClick={() => handleDelete(srv.id)}
                              className="w-7 h-7 rounded-lg bg-red-500/15 text-red-500 hover:bg-red-500/25 flex items-center justify-center transition-colors">
                              <Icon name="Check" className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setDeleteConfirmId(null)}
                              className="w-7 h-7 rounded-lg bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors">
                              <Icon name="X" className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : (
                          <button onClick={() => setDeleteConfirmId(srv.id)}
                            className="w-7 h-7 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 flex items-center justify-center transition-colors"
                            title="Удалить">
                            <Icon name="Trash2" className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </>
                    ) : (
                      <button onClick={() => {
                        const editableVersion: CustomServer = { ...srv, isCustom: true };
                        setEditServer(editableVersion);
                      }}
                        className="w-7 h-7 rounded-lg bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors"
                        title="Настроить">
                        <Icon name="Settings" className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* expanded metrics */}
                {isExpanded && (
                  <div className="px-5 pb-4 bg-muted/10">
                    {isOffline ? (
                      <div className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
                        <Icon name="WifiOff" className="w-4 h-4" />Сервер недоступен
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-4 pt-3">
                        {[
                          { label: "CPU", val: srv.cpu, color: "bg-blue-500", warn: cpuWarn },
                          { label: "Память", val: srv.memory, color: "bg-yellow-500", warn: memWarn },
                          { label: "Диск", val: srv.disk, color: "bg-green-500", warn: diskWarn },
                        ].map(m => (
                          <div key={m.label}>
                            <div className="flex justify-between mb-1.5">
                              <span className="text-xs text-muted-foreground">{m.label}</span>
                              <span className={`text-xs font-mono font-medium ${m.warn ? "text-red-500" : "text-foreground"}`}>{m.val}%</span>
                            </div>
                            <ProgressBar value={m.val} color={m.color} warn={m.warn} />
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="mt-3 text-[10px] text-muted-foreground">
                      Последняя проверка: {formatDateTime(srv.lastCheck)}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Modals */}
      {showAddModal && (
        <ServerFormModal
          title="Добавить сервер"
          onSave={handleAddServer}
          onClose={() => setShowAddModal(false)}
        />
      )}
      {editServer && (
        <ServerFormModal
          title="Настройка подключения к серверу"
          initial={editServer}
          onSave={handleEditServer}
          onClose={() => setEditServer(null)}
        />
      )}
    </div>
  );
}
