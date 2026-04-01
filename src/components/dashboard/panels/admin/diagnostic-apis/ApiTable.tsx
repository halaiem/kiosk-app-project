import { useState } from "react";
import Icon from "@/components/ui/icon";
import type { DiagnosticApiConfig } from "@/types/dashboard";

// ── Constants ────────────────────────────────────────────────────────────────

const API_TYPE_LABELS: Record<string, string> = {
  fema: "ФЕМА",
  obd: "OBD-II",
  custom: "Пользовательский",
};

const API_TYPE_STYLES: Record<string, string> = {
  fema: "bg-blue-500/15 text-blue-500",
  obd: "bg-green-500/15 text-green-500",
  custom: "bg-purple-500/15 text-purple-500",
};

// ── Props ────────────────────────────────────────────────────────────────────

interface ApiTableProps {
  filtered: DiagnosticApiConfig[];
  saving: boolean;
  onToggleActive: (api: DiagnosticApiConfig) => void;
  onUpdate: (
    id: string,
    data: { apiName: string; apiUrl: string; apiKey: string; pollInterval: string }
  ) => void;
  onMockData: (vehicleId: string, vehicleNumber: string) => void;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function ApiTable({
  filtered,
  saving,
  onToggleActive,
  onUpdate,
  onMockData,
}: ApiTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null);

  // Edit form state
  const [eApiName, setEApiName] = useState("");
  const [eApiUrl, setEApiUrl] = useState("");
  const [eApiKey, setEApiKey] = useState("");
  const [ePollInterval, setEPollInterval] = useState("");

  const startEditing = (api: DiagnosticApiConfig) => {
    setEditingId(api.id);
    setEApiName(api.apiName);
    setEApiUrl(api.apiUrl);
    setEApiKey("");
    setEPollInterval(String(api.pollInterval));
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEApiName("");
    setEApiUrl("");
    setEApiKey("");
    setEPollInterval("");
  };

  const handleUpdate = (id: string) => {
    if (!eApiName.trim() || !eApiUrl.trim()) return;
    onUpdate(id, {
      apiName: eApiName,
      apiUrl: eApiUrl,
      apiKey: eApiKey,
      pollInterval: ePollInterval,
    });
    cancelEditing();
  };

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-border text-xs text-muted-foreground">
          <th className="text-left px-5 py-2.5 font-medium">Статус</th>
          <th className="text-left px-3 py-2.5 font-medium">ТС</th>
          <th className="text-left px-3 py-2.5 font-medium">Название</th>
          <th className="text-left px-3 py-2.5 font-medium">Тип</th>
          <th className="text-left px-3 py-2.5 font-medium">URL</th>
          <th className="text-left px-3 py-2.5 font-medium">Интервал</th>
          <th className="text-right px-5 py-2.5 font-medium">Действия</th>
        </tr>
      </thead>
      <tbody>
        {filtered.length === 0 ? (
          <tr>
            <td colSpan={7} className="py-16">
              <div className="flex items-center justify-center">
                <div className="text-center">
                  <Icon
                    name="PlugZap"
                    className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2"
                  />
                  <p className="text-sm text-muted-foreground">
                    Нет API конфигураций
                  </p>
                </div>
              </div>
            </td>
          </tr>
        ) : (
          filtered.map((api) => {
            const isEditing = editingId === api.id;
            const typeStyle =
              API_TYPE_STYLES[api.apiType] ?? API_TYPE_STYLES.custom;
            const typeLabel =
              API_TYPE_LABELS[api.apiType] ?? api.apiType;

            if (isEditing) {
              return (
                <tr
                  key={api.id}
                  className="border-b border-border bg-muted/30"
                >
                  <td colSpan={7} className="px-5 py-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Icon
                        name="Pencil"
                        className="w-4 h-4 text-primary"
                      />
                      <span className="text-sm font-semibold text-foreground">
                        Редактирование — #{api.vehicleNumber}
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-3">
                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">
                          Название
                        </label>
                        <input
                          type="text"
                          value={eApiName}
                          onChange={(e) => setEApiName(e.target.value)}
                          className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">
                          URL
                        </label>
                        <input
                          type="text"
                          value={eApiUrl}
                          onChange={(e) => setEApiUrl(e.target.value)}
                          className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">
                          API ключ (оставьте пустым)
                        </label>
                        <input
                          type="password"
                          value={eApiKey}
                          onChange={(e) => setEApiKey(e.target.value)}
                          placeholder="Без изменений"
                          className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">
                          Интервал (сек)
                        </label>
                        <input
                          type="number"
                          value={ePollInterval}
                          onChange={(e) =>
                            setEPollInterval(e.target.value)
                          }
                          min={10}
                          max={3600}
                          className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      <button
                        onClick={cancelEditing}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Отмена
                      </button>
                      <button
                        onClick={() => handleUpdate(api.id)}
                        disabled={
                          !eApiName.trim() || !eApiUrl.trim() || saving
                        }
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        {saving ? "Сохраняю..." : "Сохранить"}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            }

            return (
              <tr
                key={api.id}
                className={`border-b border-border transition-colors ${
                  api.isActive ? "hover:bg-muted/30" : "opacity-50"
                }`}
              >
                {/* Status */}
                <td className="px-5 py-3">
                  <button
                    onClick={() => onToggleActive(api)}
                    className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-lg transition-colors ${
                      api.isActive
                        ? "bg-green-500/15 text-green-500 hover:bg-green-500/25"
                        : "bg-red-500/15 text-red-500 hover:bg-red-500/25"
                    }`}
                  >
                    <div
                      className={`w-2 h-2 rounded-full ${
                        api.isActive ? "bg-green-500" : "bg-red-500"
                      }`}
                    />
                    {api.isActive ? "Активен" : "Выключен"}
                  </button>
                </td>

                {/* Vehicle */}
                <td className="px-3 py-3 font-medium text-foreground">
                  #{api.vehicleNumber || "---"}
                </td>

                {/* Name */}
                <td className="px-3 py-3 text-foreground">
                  {api.apiName}
                </td>

                {/* Type */}
                <td className="px-3 py-3">
                  <span
                    className={`text-[11px] font-medium px-2 py-0.5 rounded ${typeStyle}`}
                  >
                    {typeLabel}
                  </span>
                </td>

                {/* URL */}
                <td className="px-3 py-3">
                  <span
                    className="text-xs text-muted-foreground font-mono truncate block max-w-[200px]"
                    title={api.apiUrl}
                  >
                    {api.apiUrl}
                  </span>
                </td>

                {/* Poll interval */}
                <td className="px-3 py-3 text-xs text-muted-foreground">
                  {api.pollInterval}с
                </td>

                {/* Actions */}
                <td className="px-5 py-3">
                  <div className="flex items-center gap-1.5 justify-end">
                    <button
                      onClick={() => startEditing(api)}
                      className="w-7 h-7 rounded-lg bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors"
                      title="Редактировать"
                    >
                      <Icon name="Pencil" className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() =>
                        onMockData(api.vehicleId, api.vehicleNumber)
                      }
                      className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-500 hover:bg-purple-500/20 flex items-center justify-center transition-colors"
                      title="Сгенерировать тестовые данные"
                    >
                      <Icon name="FlaskConical" className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })
        )}
      </tbody>
    </table>
  );
}
