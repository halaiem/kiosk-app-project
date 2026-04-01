import { useState, useEffect, useMemo } from "react";
import Icon from "@/components/ui/icon";
import ReportButton from "@/components/dashboard/ReportButton";
import type { VehicleInfo } from "@/types/dashboard";
import type { DiagnosticApiConfig } from "@/types/dashboard";
import {
  fetchVehicles,
  updateVehicle,
  deleteVehicle,
} from "@/api/dashboardApi";
import { fetchDiagnosticApis } from "@/api/diagnosticsApi";
import type { TypeFilter } from "./vehicleConstants";
import VehicleFormModal from "./VehicleFormModal";
import VehicleViewModal from "./VehicleViewModal";
import VehiclesTable from "./VehiclesTable";

// ── Component ────────────────────────────────────────────────────────────────

export function AdminVehiclesView() {
  const [vehicles, setVehicles] = useState<VehicleInfo[]>([]);
  const [apis, setApis] = useState<DiagnosticApiConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<VehicleInfo | null>(null);
  const [viewingVehicle, setViewingVehicle] = useState<VehicleInfo | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // ── Data loading ───────────────────────────────────────────────────────────

  const loadData = async () => {
    setLoading(true);
    try {
      const [vehiclesData, apisData] = await Promise.all([
        fetchVehicles(),
        fetchDiagnosticApis(),
      ]);
      setVehicles(vehiclesData as VehicleInfo[]);
      setApis(apisData as DiagnosticApiConfig[]);
    } catch (e) {
      console.error("Load vehicles:", e);
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

  // ── Filtered list ──────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    let list = typeFilter === "all" ? vehicles : vehicles.filter((v) => v.type === typeFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (v) =>
          (v.vinNumber ?? "").toLowerCase().includes(q) ||
          (v.boardNumber ?? v.number ?? "").toLowerCase().includes(q) ||
          (v.govRegNumber ?? "").toLowerCase().includes(q) ||
          (v.model ?? "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [vehicles, search, typeFilter]);

  // ── Summary stats ──────────────────────────────────────────────────────────

  const activeCount = vehicles.filter((v) => v.status === "active").length;
  const vehiclesWithApis = new Set(apis.map((a) => a.vehicleId)).size;

  const summaryCards = [
    {
      icon: "Truck",
      value: vehicles.length,
      label: "Всего ТС",
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
      icon: "Plug",
      value: vehiclesWithApis,
      label: "С подключёнными API",
      color: "text-purple-500",
      bg: "bg-purple-500/10",
    },
  ];

  // ── Handlers ───────────────────────────────────────────────────────────────

  const resetForm = () => {
    setShowAddForm(false);
    setEditingVehicle(null);
  };

  const handleDecommission = async (vehicle: VehicleInfo) => {
    try {
      await updateVehicle({ id: vehicle.id, status: "offline" });
      showToast(`ТС #${vehicle.boardNumber ?? vehicle.number} списано`);
      await loadData();
    } catch (e) {
      console.error("Decommission vehicle:", e);
      showToast("Ошибка списания");
    }
  };

  const handleDelete = async (vehicleId: string) => {
    try {
      await deleteVehicle(vehicleId);
      showToast("ТС удалено");
      await loadData();
    } catch (e) {
      console.error("Delete vehicle:", e);
      showToast("Ошибка удаления");
    }
  };

  // ── Loading state ──────────────────────────────────────────────────────────

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

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-[60] bg-card border border-border rounded-xl px-4 py-3 shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <Icon name="CheckCircle" className="w-4 h-4 text-green-500 shrink-0" />
          <span className="text-sm text-foreground">{toast}</span>
        </div>
      )}

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
                <p className="text-xl font-bold text-foreground">{card.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {card.label}
                </p>
              </div>
            </div>
          ))}
        </div>
        <ReportButton filename="admin_vehicles" data={vehicles} />
      </div>

      {/* ── Table card ──────────────────────────────────────── */}
      <VehiclesTable
        filtered={filtered}
        search={search}
        setSearch={setSearch}
        typeFilter={typeFilter}
        setTypeFilter={setTypeFilter}
        onAddClick={() => setShowAddForm(true)}
        onViewClick={setViewingVehicle}
        onEditClick={setEditingVehicle}
        onDecommission={handleDecommission}
        onDelete={handleDelete}
      />

      {/* Modals */}
      <VehicleFormModal
        key={editingVehicle?.id ?? (showAddForm ? "add" : "closed")}
        editingVehicle={editingVehicle}
        showAddForm={showAddForm}
        onClose={resetForm}
        onSuccess={showToast}
        loadData={loadData}
      />
      <VehicleViewModal
        vehicle={viewingVehicle}
        apis={apis}
        onClose={() => setViewingVehicle(null)}
      />
    </div>
  );
}
