import { useMemo } from "react";
import Icon from "@/components/ui/icon";
import ReportButton from "@/components/dashboard/ReportButton";
import type { ServerInfo, ServerStatus } from "@/types/dashboard";

function formatDateTime(date: Date): string {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const mins = String(d.getMinutes()).padStart(2, "0");
  return `${day}.${month} ${hours}:${mins}`;
}

const SERVER_STATUS_DOT: Record<ServerStatus, string> = {
  online: "bg-green-500",
  warning: "bg-yellow-500",
  offline: "bg-red-500",
};

const SERVER_STATUS_LABELS: Record<ServerStatus, string> = {
  online: "Онлайн",
  warning: "Внимание",
  offline: "Недоступен",
};

export function ServersView({ servers }: { servers: ServerInfo[] }) {
  const summary = useMemo(() => {
    const s = { total: servers.length, online: 0, warnings: 0 };
    for (const srv of servers) {
      if (srv.status === "online") s.online++;
      if (srv.status === "warning") s.warnings++;
    }
    return s;
  }, [servers]);

  const summaryCards = [
    { icon: "Server", value: summary.total, label: "Всего серверов", color: "text-blue-500", bg: "bg-blue-500/10" },
    { icon: "CheckCircle", value: summary.online, label: "Онлайн", color: "text-green-500", bg: "bg-green-500/10" },
    { icon: "AlertTriangle", value: summary.warnings, label: "С предупреждениями", color: "text-yellow-500", bg: "bg-yellow-500/10" },
  ];

  const ProgressBar = ({
    value,
    color,
    warn,
  }: {
    value: number;
    color: string;
    warn?: boolean;
  }) => (
    <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
      <div
        className={`h-full rounded-full transition-all ${warn ? "bg-red-500" : color}`}
        style={{ width: `${Math.min(value, 100)}%` }}
      />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <div className="grid grid-cols-3 gap-4 flex-1">
          {summaryCards.map((card) => (
            <div key={card.label} className="bg-card border border-border rounded-2xl p-4 flex items-start gap-3">
              <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center shrink-0`}>
                <Icon name={card.icon} className={`w-5 h-5 ${card.color}`} />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">{card.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{card.label}</p>
              </div>
            </div>
          ))}
        </div>
        <ReportButton filename="servers" data={servers} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {servers.length === 0 ? (
          <div className="col-span-2 bg-card border border-border rounded-2xl flex items-center justify-center py-16">
            <div className="text-center">
              <Icon name="ServerOff" className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Нет серверов</p>
            </div>
          </div>
        ) : (
          servers.map((srv) => {
            const isOffline = srv.status === "offline";
            const cpuWarn = srv.cpu > 70;
            const memWarn = srv.memory > 80;
            const diskWarn = srv.disk > 80;
            return (
              <div
                key={srv.id}
                className={`bg-card border border-border rounded-2xl p-5 ${isOffline ? "opacity-50" : ""}`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                      <Icon name="Server" className="w-5 h-5 text-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{srv.name}</p>
                      <p className="text-[11px] text-muted-foreground">Uptime: {srv.uptime}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2.5 h-2.5 rounded-full ${SERVER_STATUS_DOT[srv.status]} ${
                        srv.status === "online" ? "animate-pulse" : ""
                      }`}
                    />
                    <span
                      className={`text-[11px] font-medium ${
                        srv.status === "online"
                          ? "text-green-500"
                          : srv.status === "warning"
                            ? "text-yellow-500"
                            : "text-red-500"
                      }`}
                    >
                      {SERVER_STATUS_LABELS[srv.status]}
                    </span>
                  </div>
                </div>

                {isOffline ? (
                  <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">
                    <Icon name="WifiOff" className="w-4 h-4 mr-2" />
                    Сервер недоступен
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-muted-foreground">CPU</span>
                        <span className={`text-xs font-medium ${cpuWarn ? "text-red-500" : "text-foreground"}`}>
                          {srv.cpu}%
                          {cpuWarn && <Icon name="AlertTriangle" className="w-3 h-3 inline ml-1" />}
                        </span>
                      </div>
                      <ProgressBar value={srv.cpu} color="bg-blue-500" warn={cpuWarn} />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-muted-foreground">Память</span>
                        <span className={`text-xs font-medium ${memWarn ? "text-red-500" : "text-foreground"}`}>
                          {srv.memory}%
                          {memWarn && <Icon name="AlertTriangle" className="w-3 h-3 inline ml-1" />}
                        </span>
                      </div>
                      <ProgressBar value={srv.memory} color="bg-yellow-500" warn={memWarn} />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-muted-foreground">Диск</span>
                        <span className={`text-xs font-medium ${diskWarn ? "text-red-500" : "text-foreground"}`}>
                          {srv.disk}%
                          {diskWarn && <Icon name="AlertTriangle" className="w-3 h-3 inline ml-1" />}
                        </span>
                      </div>
                      <ProgressBar value={srv.disk} color="bg-green-500" warn={diskWarn} />
                    </div>
                  </div>
                )}

                <div className="mt-4 pt-3 border-t border-border">
                  <span className="text-[10px] text-muted-foreground">
                    Проверка: {formatDateTime(srv.lastCheck)}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
