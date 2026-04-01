import { useState, useEffect, useMemo } from "react";
import Icon from "@/components/ui/icon";
import type { DiagnosticApiConfig } from "@/types/dashboard";
import {
  fetchDiagnosticApis,
  createDiagnosticApi,
  updateDiagnosticApi,
  generateMockDiagnostics,
} from "@/api/diagnosticsApi";
import { fetchVehicles } from "@/api/dashboardApi";
import SummaryCards from "./diagnostic-apis/SummaryCards";
import AddApiForm from "./diagnostic-apis/AddApiForm";
import ApiTable from "./diagnostic-apis/ApiTable";

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
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

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

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleCreate = async (data: {
    vehicleId: string;
    apiName: string;
    apiType: string;
    apiUrl: string;
    apiKey: string;
    pollInterval: string;
  }) => {
    if (!data.vehicleId || !data.apiName.trim() || !data.apiUrl.trim()) return;
    setSaving(true);
    try {
      await createDiagnosticApi({
        vehicleId: data.vehicleId,
        apiName: data.apiName.trim(),
        apiType: data.apiType,
        apiUrl: data.apiUrl.trim(),
        apiKey: data.apiKey.trim() || undefined,
        pollInterval: Number(data.pollInterval) || 60,
      });
      setShowAddForm(false);
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

  const handleUpdate = async (
    id: string,
    data: { apiName: string; apiUrl: string; apiKey: string; pollInterval: string }
  ) => {
    if (!data.apiName.trim() || !data.apiUrl.trim()) return;
    setSaving(true);
    try {
      await updateDiagnosticApi({
        id,
        apiName: data.apiName.trim(),
        apiUrl: data.apiUrl.trim(),
        apiKey: data.apiKey.trim() || undefined,
        pollInterval: Number(data.pollInterval) || 60,
      });
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
      <SummaryCards apis={apis} />

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
          <AddApiForm
            vehicles={vehicles}
            saving={saving}
            onCancel={() => setShowAddForm(false)}
            onCreate={handleCreate}
          />
        )}

        {/* Table */}
        <ApiTable
          filtered={filtered}
          saving={saving}
          onToggleActive={handleToggleActive}
          onUpdate={handleUpdate}
          onMockData={handleMockData}
        />
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
