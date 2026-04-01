import { useState, useEffect, useMemo } from "react";
import Icon from "@/components/ui/icon";
import ReportButton from "@/components/dashboard/ReportButton";
import type { DiagnosticApiConfig } from "@/types/dashboard";
import {
  fetchDiagnosticApis,
  createDiagnosticApi,
  updateDiagnosticApi,
  generateMockDiagnostics,
} from "@/api/diagnosticsApi";
import { fetchVehicles } from "@/api/dashboardApi";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

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

interface VehicleOption {
  id: string;
  number: string;
  vinNumber?: string;
  boardNumber?: string;
}

// ── Component ────────────────────────────────────────────────────────────────

export function DiagnosticApisView() {
  const [apis, setApis] = useState<DiagnosticApiConfig[]>([]);
  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Add form state
  const [fVehicleId, setFVehicleId] = useState("");
  const [vehiclePopoverOpen, setVehiclePopoverOpen] = useState(false);
  const [fApiName, setFApiName] = useState("");
  const [fApiType, setFApiType] = useState("fema");
  const [fApiUrl, setFApiUrl] = useState("");
  const [fApiKey, setFApiKey] = useState("");
  const [fPollInterval, setFPollInterval] = useState("60");

  // Edit form state
  const [eApiName, setEApiName] = useState("");
  const [eApiUrl, setEApiUrl] = useState("");
  const [eApiKey, setEApiKey] = useState("");
  const [ePollInterval, setEPollInterval] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const [apisData, vehiclesData] = await Promise.all([
        fetchDiagnosticApis(),
        fetchVehicles(),
      ]);
      setApis(apisData as DiagnosticApiConfig[]);
      setVehicles(
        (vehiclesData as { id: string; number: string; vinNumber?: string; boardNumber?: string }[]).map((v) => ({
          id: v.id,
          number: v.number,
          vinNumber: v.vinNumber,
          boardNumber: v.boardNumber,
        }))
      );
    } catch (e) {
      console.error("Load diagnostic APIs:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return apis;
    const q = search.toLowerCase();
    return apis.filter(
      (a) =>
        (a.vehicleNumber ?? "").toLowerCase().includes(q) ||
        a.apiName.toLowerCase().includes(q) ||
        a.apiUrl.toLowerCase().includes(q)
    );
  }, [apis, search]);

  const activeCount = apis.filter((a) => a.isActive).length;
  const connectedVehicles = new Set(apis.map((a) => a.vehicleId)).size;

  const summaryCards = [
    {
      icon: "Plug",
      value: apis.length,
      label: "Всего API",
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      icon: "CheckCircle",
      value: activeCount,
      label: "Активных",
      color: "text-green-500",
      bg: "bg-green-500/10",
    },
    {
      icon: "Truck",
      value: connectedVehicles,
      label: "Подключено ТС",
      color: "text-purple-500",
      bg: "bg-purple-500/10",
    },
  ];

  // ── Handlers ─────────────────────────────────────────────────────────────

  const resetAddForm = () => {
    setShowAddForm(false);
    setFVehicleId("");
    setVehiclePopoverOpen(false);
    setFApiName("");
    setFApiType("fema");
    setFApiUrl("");
    setFApiKey("");
    setFPollInterval("60");
  };

  const handleCreate = async () => {
    if (!fVehicleId || !fApiName.trim() || !fApiUrl.trim()) return;
    setSaving(true);
    try {
      await createDiagnosticApi({
        vehicleId: fVehicleId,
        apiName: fApiName.trim(),
        apiType: fApiType,
        apiUrl: fApiUrl.trim(),
        apiKey: fApiKey.trim() || undefined,
        pollInterval: Number(fPollInterval) || 60,
      });
      resetAddForm();
      showToast("API конфигурация создана");
      await loadData();
    } catch (e) {
      console.error("Create API:", e);
      showToast("Ошибка создания");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (api: DiagnosticApiConfig) => {
    try {
      await updateDiagnosticApi({ id: api.id, isActive: !api.isActive });
      await loadData();
      showToast(api.isActive ? "API деактивирован" : "API активирован");
    } catch (e) {
      console.error("Toggle API:", e);
    }
  };

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

  const handleUpdate = async (id: string) => {
    if (!eApiName.trim() || !eApiUrl.trim()) return;
    setSaving(true);
    try {
      await updateDiagnosticApi({
        id,
        apiName: eApiName.trim(),
        apiUrl: eApiUrl.trim(),
        apiKey: eApiKey.trim() || undefined,
        pollInterval: Number(ePollInterval) || 60,
      });
      cancelEditing();
      showToast("API обновлён");
      await loadData();
    } catch (e) {
      console.error("Update API:", e);
      showToast("Ошибка обновления");
    } finally {
      setSaving(false);
    }
  };

  const handleMockData = async (vehicleId: string, vehicleNumber: string) => {
    try {
      const result = await generateMockDiagnostics(vehicleId);
      showToast(
        `Создано ${result.inserted ?? 0} проверок для #${vehicleNumber}`
      );
    } catch (e) {
      console.error("Mock data:", e);
      showToast("Ошибка генерации данных");
    }
  };

  // ── Loading ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <Icon
            name="Loader2"
            className="w-8 h-8 text-primary animate-spin mx-auto mb-3"
          />
          <p className="text-sm text-muted-foreground">Загрузка...</p>
        </div>
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* ── Summary cards ──────────────────────────────────────── */}
      <div className="flex items-start gap-4">
        <div className="grid grid-cols-3 gap-4 flex-1">
          {summaryCards.map((card) => (
            <div
              key={card.label}
              className="bg-card border border-border rounded-2xl p-4 flex items-start gap-3"
            >
              <div
                className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center shrink-0`}
              >
                <Icon name={card.icon} className={`w-5 h-5 ${card.color}`} />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">
                  {card.value}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {card.label}
                </p>
              </div>
            </div>
          ))}
        </div>
        <ReportButton filename="diagnostic_apis" data={apis} />
      </div>

      {/* ── API list card ──────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {/* Toolbar */}
        <div className="px-5 py-3 border-b border-border flex items-center gap-3">
          <span className="text-sm font-semibold text-foreground flex-1">
            API конфигурации
          </span>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Icon
                name="Search"
                className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Борт, API..."
                className="h-8 pl-8 pr-3 rounded-lg border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-ring w-36"
              />
            </div>
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Icon name="Plus" className="w-3.5 h-3.5" />
              Добавить API
            </button>
          </div>
        </div>

        {/* Add form */}
        {showAddForm && (
          <div className="px-5 py-4 border-b border-border bg-muted/30">
            <div className="flex items-center gap-2 mb-3">
              <Icon name="Plug" className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">
                Новая API конфигурация
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">
                  Транспортное средство *
                </label>
                <Popover open={vehiclePopoverOpen} onOpenChange={setVehiclePopoverOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <span className={fVehicleId ? "text-foreground truncate" : "text-muted-foreground"}>
                        {fVehicleId
                          ? (() => {
                              const v = vehicles.find((v) => v.id === fVehicleId);
                              if (!v) return "Выберите ТС по VIN";
                              return v.vinNumber
                                ? `${v.vinNumber} — #${v.boardNumber ?? v.number}`
                                : `#${v.boardNumber ?? v.number}`;
                            })()
                          : "Выберите ТС по VIN"}
                      </span>
                      <Icon name="ChevronsUpDown" className="w-3.5 h-3.5 text-muted-foreground shrink-0 ml-2" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Поиск по VIN..." />
                      <CommandList>
                        <CommandEmpty>Ничего не найдено</CommandEmpty>
                        <CommandGroup>
                          {vehicles.map((v) => {
                            const label = v.vinNumber
                              ? `${v.vinNumber} — #${v.boardNumber ?? v.number}`
                              : `#${v.boardNumber ?? v.number}`;
                            return (
                              <CommandItem
                                key={v.id}
                                value={`${v.vinNumber ?? ""} ${v.boardNumber ?? ""} ${v.number}`}
                                onSelect={() => {
                                  setFVehicleId(v.id);
                                  setVehiclePopoverOpen(false);
                                }}
                                className="flex items-center justify-between"
                              >
                                <span className="truncate">{label}</span>
                                {fVehicleId === v.id && (
                                  <Icon name="Check" className="w-4 h-4 text-primary shrink-0 ml-2" />
                                )}
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">
                  Название API *
                </label>
                <input
                  type="text"
                  value={fApiName}
                  onChange={(e) => setFApiName(e.target.value)}
                  placeholder="ФЕМА Борт-5001"
                  className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">
                  Тип API
                </label>
                <select
                  value={fApiType}
                  onChange={(e) => setFApiType(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="fema">ФЕМА</option>
                  <option value="obd">OBD-II</option>
                  <option value="custom">Пользовательский</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 mt-3">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">
                  URL эндпоинта *
                </label>
                <input
                  type="text"
                  value={fApiUrl}
                  onChange={(e) => setFApiUrl(e.target.value)}
                  placeholder="https://api.fema.ru/v1/diag"
                  className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">
                  API ключ
                </label>
                <input
                  type="password"
                  value={fApiKey}
                  onChange={(e) => setFApiKey(e.target.value)}
                  placeholder="sk_..."
                  className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">
                  Интервал опроса (сек)
                </label>
                <input
                  type="number"
                  value={fPollInterval}
                  onChange={(e) => setFPollInterval(e.target.value)}
                  min={10}
                  max={3600}
                  className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={resetAddForm}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleCreate}
                disabled={
                  !fVehicleId || !fApiName.trim() || !fApiUrl.trim() || saving
                }
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? "Создаю..." : "Создать"}
              </button>
            </div>
          </div>
        )}

        {/* Table */}
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
                        onClick={() => handleToggleActive(api)}
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
                            handleMockData(api.vehicleId, api.vehicleNumber)
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
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl bg-foreground text-background text-sm font-medium shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200">
          {toast}
        </div>
      )}
    </div>
  );
}

export default DiagnosticApisView;