import { useState, useEffect, useMemo } from "react";
import Icon from "@/components/ui/icon";
import ReportButton from "@/components/dashboard/ReportButton";
import type { VehicleInfo, VehicleStatus } from "@/types/dashboard";
import type { DiagnosticApiConfig } from "@/types/dashboard";
import {
  fetchVehicles,
  createVehicle,
  updateVehicle,
  deleteVehicle,
} from "@/api/dashboardApi";
import { fetchDiagnosticApis } from "@/api/diagnosticsApi";

// ── Constants ────────────────────────────────────────────────────────────────

const VEHICLE_TYPE_LABELS: Record<VehicleInfo["type"], string> = {
  bus: "Автобус",
  tram: "Трамвай",
  trolleybus: "Троллейбус",
};

const VEHICLE_TYPE_STYLES: Record<VehicleInfo["type"], string> = {
  bus: "bg-green-500/15 text-green-500",
  tram: "bg-blue-500/15 text-blue-500",
  trolleybus: "bg-purple-500/15 text-purple-500",
};

const VEHICLE_STATUS_LABELS: Record<VehicleStatus, string> = {
  active: "Активен",
  maintenance: "На ТО",
  idle: "Простой",
  offline: "Списан",
};

const VEHICLE_STATUS_STYLES: Record<VehicleStatus, string> = {
  active: "bg-green-500/15 text-green-500",
  maintenance: "bg-yellow-500/15 text-yellow-600",
  idle: "bg-gray-500/15 text-gray-500",
  offline: "bg-red-500/15 text-red-500",
};

const FUEL_TYPE_LABELS: Record<string, string> = {
  diesel: "Дизель",
  gas: "Газ",
  electric: "Электрический",
  hybrid: "Гибрид",
};

type TypeFilter = "all" | VehicleInfo["type"];

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
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // ── Form state ─────────────────────────────────────────────────────────────
  const [fVinNumber, setFVinNumber] = useState("");
  const [fType, setFType] = useState<VehicleInfo["type"]>("bus");
  const [fBoardNumber, setFBoardNumber] = useState("");
  const [fGovRegNumber, setFGovRegNumber] = useState("");
  const [fModel, setFModel] = useState("");
  const [fManufacturer, setFManufacturer] = useState("");
  const [fRegCertificateNumber, setFRegCertificateNumber] = useState("");
  const [fYear, setFYear] = useState("");
  const [fPassengerCapacity, setFPassengerCapacity] = useState("");
  const [fFuelType, setFFuelType] = useState("diesel");
  const [fVehicleColor, setFVehicleColor] = useState("");
  const [fIsAccessible, setFIsAccessible] = useState(false);
  const [fInsuranceNumber, setFInsuranceNumber] = useState("");
  const [fInsuranceExpiry, setFInsuranceExpiry] = useState("");
  const [fTechInspectionExpiry, setFTechInspectionExpiry] = useState("");
  const [fDocumentsInfo, setFDocumentsInfo] = useState("");
  const [fMileage, setFMileage] = useState("");

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

  // ── Form helpers ───────────────────────────────────────────────────────────

  const resetForm = () => {
    setShowAddForm(false);
    setEditingVehicle(null);
    setFVinNumber("");
    setFType("bus");
    setFBoardNumber("");
    setFGovRegNumber("");
    setFModel("");
    setFManufacturer("");
    setFRegCertificateNumber("");
    setFYear("");
    setFPassengerCapacity("");
    setFFuelType("diesel");
    setFVehicleColor("");
    setFIsAccessible(false);
    setFInsuranceNumber("");
    setFInsuranceExpiry("");
    setFTechInspectionExpiry("");
    setFDocumentsInfo("");
    setFMileage("");
  };

  const populateForm = (v: VehicleInfo) => {
    setFVinNumber(v.vinNumber ?? "");
    setFType(v.type);
    setFBoardNumber(v.boardNumber ?? v.number ?? "");
    setFGovRegNumber(v.govRegNumber ?? "");
    setFModel(v.model ?? "");
    setFManufacturer(v.manufacturer ?? "");
    setFRegCertificateNumber(v.regCertificateNumber ?? "");
    setFYear(v.year ? String(v.year) : "");
    setFPassengerCapacity(v.passengerCapacity ? String(v.passengerCapacity) : "");
    setFFuelType(v.fuelType ?? "diesel");
    setFVehicleColor(v.vehicleColor ?? "");
    setFIsAccessible(v.isAccessible ?? false);
    setFInsuranceNumber(v.insuranceNumber ?? "");
    setFInsuranceExpiry(v.insuranceExpiry ?? "");
    setFTechInspectionExpiry(v.techInspectionExpiry ?? "");
    setFDocumentsInfo(v.documentsInfo ?? "");
    setFMileage(v.mileage ? String(v.mileage) : "");
  };

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleCreate = async () => {
    if (!fBoardNumber.trim() || !fVinNumber.trim()) return;
    setSaving(true);
    try {
      await createVehicle({
        number: fBoardNumber.trim(),
        vinNumber: fVinNumber.trim(),
        type: fType,
        boardNumber: fBoardNumber.trim(),
        govRegNumber: fGovRegNumber.trim() || undefined,
        model: fModel.trim() || undefined,
        manufacturer: fManufacturer.trim() || undefined,
        regCertificateNumber: fRegCertificateNumber.trim() || undefined,
        year: Number(fYear) || undefined,
        passengerCapacity: Number(fPassengerCapacity) || undefined,
        fuelType: fFuelType || undefined,
        vehicleColor: fVehicleColor.trim() || undefined,
        isAccessible: fIsAccessible,
        insuranceNumber: fInsuranceNumber.trim() || undefined,
        insuranceExpiry: fInsuranceExpiry || undefined,
        techInspectionExpiry: fTechInspectionExpiry || undefined,
        documentsInfo: fDocumentsInfo.trim() || undefined,
        mileage: Number(fMileage) || 0,
        status: "active",
      });
      resetForm();
      showToast("Транспортное средство создано");
      await loadData();
    } catch (e) {
      console.error("Create vehicle:", e);
      showToast("Ошибка создания ТС");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingVehicle || !fBoardNumber.trim() || !fVinNumber.trim()) return;
    setSaving(true);
    try {
      await updateVehicle({
        id: editingVehicle.id,
        number: fBoardNumber.trim(),
        vinNumber: fVinNumber.trim(),
        type: fType,
        boardNumber: fBoardNumber.trim(),
        govRegNumber: fGovRegNumber.trim() || undefined,
        model: fModel.trim() || undefined,
        manufacturer: fManufacturer.trim() || undefined,
        regCertificateNumber: fRegCertificateNumber.trim() || undefined,
        year: Number(fYear) || undefined,
        passengerCapacity: Number(fPassengerCapacity) || undefined,
        fuelType: fFuelType || undefined,
        vehicleColor: fVehicleColor.trim() || undefined,
        isAccessible: fIsAccessible,
        insuranceNumber: fInsuranceNumber.trim() || undefined,
        insuranceExpiry: fInsuranceExpiry || undefined,
        techInspectionExpiry: fTechInspectionExpiry || undefined,
        documentsInfo: fDocumentsInfo.trim() || undefined,
        mileage: Number(fMileage) || 0,
      });
      resetForm();
      showToast("Транспортное средство обновлено");
      await loadData();
    } catch (e) {
      console.error("Update vehicle:", e);
      showToast("Ошибка обновления ТС");
    } finally {
      setSaving(false);
    }
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

  const startEditing = (v: VehicleInfo) => {
    setEditingVehicle(v);
    populateForm(v);
  };

  const getLinkedApis = (vehicleId: string) =>
    apis.filter((a) => a.vehicleId === vehicleId);

  // ── Type filter buttons ────────────────────────────────────────────────────

  const typeFilters: { key: TypeFilter; label: string }[] = [
    { key: "all", label: "Все" },
    { key: "tram", label: "Трамваи" },
    { key: "trolleybus", label: "Троллейбусы" },
    { key: "bus", label: "Автобусы" },
  ];

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

  // ── Form modal ─────────────────────────────────────────────────────────────

  const renderFormModal = () => {
    const isEditing = !!editingVehicle;
    if (!showAddForm && !isEditing) return null;

    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
        onClick={resetForm}
      >
        <div
          className="bg-card border border-border rounded-2xl p-6 w-full max-w-2xl mx-4 shadow-xl max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Icon name={isEditing ? "Pencil" : "Plus"} className="w-4 h-4 text-primary" />
              <h3 className="text-base font-semibold text-foreground">
                {isEditing ? "Редактирование ТС" : "Новое транспортное средство"}
              </h3>
            </div>
            <button
              onClick={resetForm}
              className="w-8 h-8 rounded-lg bg-muted hover:bg-muted/80 flex items-center justify-center"
            >
              <Icon name="X" className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {/* VIN */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                VIN-номер *
              </label>
              <input
                type="text"
                value={fVinNumber}
                onChange={(e) => setFVinNumber(e.target.value.slice(0, 17))}
                maxLength={17}
                placeholder="XTA21099043578291"
                className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            {/* Type */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Тип ТС
              </label>
              <select
                value={fType}
                onChange={(e) => setFType(e.target.value as VehicleInfo["type"])}
                className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="bus">Автобус</option>
                <option value="tram">Трамвай</option>
                <option value="trolleybus">Троллейбус</option>
              </select>
            </div>
            {/* Board number */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Бортовой номер *
              </label>
              <input
                type="text"
                value={fBoardNumber}
                onChange={(e) => setFBoardNumber(e.target.value)}
                placeholder="А-5001"
                className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            {/* Gov reg number */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Гос. рег. номер
              </label>
              <input
                type="text"
                value={fGovRegNumber}
                onChange={(e) => setFGovRegNumber(e.target.value)}
                placeholder="А123БВ77"
                className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            {/* Model */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Модель
              </label>
              <input
                type="text"
                value={fModel}
                onChange={(e) => setFModel(e.target.value)}
                placeholder="ЛиАЗ-5292"
                className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            {/* Manufacturer */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Производитель
              </label>
              <input
                type="text"
                value={fManufacturer}
                onChange={(e) => setFManufacturer(e.target.value)}
                placeholder="ЛиАЗ"
                className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            {/* Reg certificate number */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Номер рег. свидетельства
              </label>
              <input
                type="text"
                value={fRegCertificateNumber}
                onChange={(e) => setFRegCertificateNumber(e.target.value)}
                placeholder="77УА123456"
                className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            {/* Year */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Год выпуска
              </label>
              <input
                type="number"
                value={fYear}
                onChange={(e) => setFYear(e.target.value)}
                placeholder="2023"
                className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            {/* Passenger capacity */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Вместимость
              </label>
              <input
                type="number"
                value={fPassengerCapacity}
                onChange={(e) => setFPassengerCapacity(e.target.value)}
                placeholder="110"
                className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            {/* Fuel type */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Тип топлива
              </label>
              <select
                value={fFuelType}
                onChange={(e) => setFFuelType(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="diesel">Дизель</option>
                <option value="gas">Газ</option>
                <option value="electric">Электрический</option>
                <option value="hybrid">Гибрид</option>
              </select>
            </div>
            {/* Color */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Цвет
              </label>
              <input
                type="text"
                value={fVehicleColor}
                onChange={(e) => setFVehicleColor(e.target.value)}
                placeholder="Белый"
                className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            {/* Mileage */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Пробег (км)
              </label>
              <input
                type="number"
                value={fMileage}
                onChange={(e) => setFMileage(e.target.value)}
                placeholder="0"
                className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            {/* Insurance number */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Номер страховки
              </label>
              <input
                type="text"
                value={fInsuranceNumber}
                onChange={(e) => setFInsuranceNumber(e.target.value)}
                placeholder="ААА-1234567890"
                className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            {/* Insurance expiry */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Срок действия страховки
              </label>
              <input
                type="date"
                value={fInsuranceExpiry}
                onChange={(e) => setFInsuranceExpiry(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            {/* Tech inspection expiry */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Срок действия техосмотра
              </label>
              <input
                type="date"
                value={fTechInspectionExpiry}
                onChange={(e) => setFTechInspectionExpiry(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            {/* Accessible */}
            <div className="flex items-center gap-2 self-end pb-1.5">
              <input
                type="checkbox"
                id="accessible-check"
                checked={fIsAccessible}
                onChange={(e) => setFIsAccessible(e.target.checked)}
                className="w-4 h-4 rounded border-border text-primary focus:ring-ring"
              />
              <label htmlFor="accessible-check" className="text-xs font-medium text-muted-foreground">
                Доступность для МГН
              </label>
            </div>
          </div>

          {/* Documents info - full width */}
          <div className="mt-3">
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Документы на ТС
            </label>
            <textarea
              value={fDocumentsInfo}
              onChange={(e) => setFDocumentsInfo(e.target.value)}
              placeholder="Дополнительная информация о документах..."
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 mt-5">
            <button
              onClick={resetForm}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
            >
              Отмена
            </button>
            <button
              onClick={isEditing ? handleUpdate : handleCreate}
              disabled={saving || !fBoardNumber.trim() || !fVinNumber.trim()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {saving && <Icon name="Loader2" className="w-3.5 h-3.5 animate-spin" />}
              {isEditing ? "Сохранить" : "Создать"}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ── View details modal ─────────────────────────────────────────────────────

  const renderViewModal = () => {
    if (!viewingVehicle) return null;
    const v = viewingVehicle;
    const linkedApis = getLinkedApis(v.id);

    const detailRows: { label: string; value: string | number | undefined }[] = [
      { label: "VIN-номер", value: v.vinNumber },
      { label: "Бортовой номер", value: v.boardNumber ?? v.number },
      { label: "Тип ТС", value: VEHICLE_TYPE_LABELS[v.type] },
      { label: "Гос. рег. номер", value: v.govRegNumber },
      { label: "Модель", value: v.model },
      { label: "Производитель", value: v.manufacturer },
      { label: "Номер рег. свидетельства", value: v.regCertificateNumber },
      { label: "Год выпуска", value: v.year },
      { label: "Вместимость", value: v.passengerCapacity },
      { label: "Тип топлива", value: v.fuelType ? (FUEL_TYPE_LABELS[v.fuelType] ?? v.fuelType) : undefined },
      { label: "Цвет", value: v.vehicleColor },
      { label: "Пробег", value: v.mileage ? `${v.mileage.toLocaleString()} км` : undefined },
      { label: "Доступность для МГН", value: v.isAccessible ? "Да" : "Нет" },
      { label: "Номер страховки", value: v.insuranceNumber },
      { label: "Срок действия страховки", value: v.insuranceExpiry },
      { label: "Срок действия техосмотра", value: v.techInspectionExpiry },
      { label: "Маршрут", value: v.routeNumber },
      { label: "Водитель", value: v.driverName },
    ];

    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
        onClick={() => setViewingVehicle(null)}
      >
        <div
          className="bg-card border border-border rounded-2xl p-6 w-full max-w-2xl mx-4 shadow-xl max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                <Icon name="Bus" className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground">
                  #{v.boardNumber ?? v.number}
                </h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded ${VEHICLE_TYPE_STYLES[v.type]}`}>
                    {VEHICLE_TYPE_LABELS[v.type]}
                  </span>
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded ${VEHICLE_STATUS_STYLES[v.status]}`}>
                    {VEHICLE_STATUS_LABELS[v.status]}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setViewingVehicle(null)}
              className="w-8 h-8 rounded-lg bg-muted hover:bg-muted/80 flex items-center justify-center"
            >
              <Icon name="X" className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 mb-5">
            {detailRows.map((row) => (
              <div key={row.label} className="flex items-center justify-between py-1 border-b border-border/50">
                <span className="text-xs text-muted-foreground">{row.label}</span>
                <span className="text-xs font-medium text-foreground">
                  {row.value ?? "---"}
                </span>
              </div>
            ))}
          </div>

          {/* Documents info */}
          {v.documentsInfo && (
            <div className="mb-5">
              <p className="text-xs font-medium text-muted-foreground mb-1.5">Документы на ТС</p>
              <div className="p-3 rounded-lg bg-muted/30 border border-border text-xs text-foreground whitespace-pre-wrap">
                {v.documentsInfo}
              </div>
            </div>
          )}

          {/* Linked APIs */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
              <Icon name="Plug" className="w-3.5 h-3.5" />
              Подключённые API ({linkedApis.length})
            </p>
            {linkedApis.length === 0 ? (
              <p className="text-xs text-muted-foreground/60 py-3 text-center">
                Нет подключённых API
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {linkedApis.map((api) => (
                  <div
                    key={api.id}
                    className="p-3 rounded-lg border border-border bg-muted/20 flex items-center gap-3"
                  >
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                      <Icon name="Plug" className="w-4 h-4 text-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">
                        {api.apiName}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {api.apiType?.toUpperCase() ?? "API"}
                      </p>
                    </div>
                    <span
                      className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                        api.isActive
                          ? "bg-green-500/15 text-green-500"
                          : "bg-red-500/15 text-red-500"
                      }`}
                    >
                      {api.isActive ? "Активен" : "Неактивен"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

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
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {/* Toolbar */}
        <div className="px-5 py-3 border-b border-border flex items-center gap-3">
          {typeFilters.map((f) => (
            <button
              key={f.key}
              onClick={() => setTypeFilter(f.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                typeFilter === f.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2">
            <div className="relative">
              <Icon
                name="Search"
                className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="VIN, борт, гос. номер..."
                className="h-8 pl-8 pr-3 rounded-lg border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-ring w-48"
              />
            </div>
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Icon name="Plus" className="w-3.5 h-3.5" />
              Добавить ТС
            </button>
          </div>
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <Icon
                name="Bus"
                className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2"
              />
              <p className="text-sm text-muted-foreground">Нет транспортных средств</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">
                    Борт. номер
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">
                    VIN-номер
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">
                    Тип ТС
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">
                    Гос. номер
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">
                    Модель / Произв.
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">
                    Год
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">
                    Статус
                  </th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((v) => (
                  <tr
                    key={v.id}
                    className="border-b border-border/50 hover:bg-muted/20 transition-colors cursor-pointer"
                    onClick={() => setViewingVehicle(v)}
                  >
                    <td className="px-4 py-3">
                      <span className="font-semibold text-foreground">
                        #{v.boardNumber ?? v.number}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground font-mono">
                      {v.vinNumber ?? "---"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-[11px] font-medium px-2 py-0.5 rounded ${VEHICLE_TYPE_STYLES[v.type]}`}
                      >
                        {VEHICLE_TYPE_LABELS[v.type]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-foreground">
                      {v.govRegNumber ?? "---"}
                    </td>
                    <td className="px-4 py-3 text-xs text-foreground">
                      {[v.model, v.manufacturer].filter(Boolean).join(" / ") || "---"}
                    </td>
                    <td className="px-4 py-3 text-xs text-foreground">
                      {v.year ?? "---"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-[11px] font-medium px-2 py-0.5 rounded ${VEHICLE_STATUS_STYLES[v.status]}`}
                      >
                        {VEHICLE_STATUS_LABELS[v.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div
                        className="flex items-center justify-end gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => startEditing(v)}
                          title="Редактировать"
                          className="w-7 h-7 rounded-lg hover:bg-muted flex items-center justify-center transition-colors"
                        >
                          <Icon name="Pencil" className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                        {v.status !== "offline" ? (
                          <button
                            onClick={() => handleDecommission(v)}
                            title="Списать"
                            className="w-7 h-7 rounded-lg hover:bg-red-500/10 flex items-center justify-center transition-colors"
                          >
                            <Icon name="Ban" className="w-3.5 h-3.5 text-red-500" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleDelete(v.id)}
                            title="Удалить"
                            className="w-7 h-7 rounded-lg hover:bg-red-500/10 flex items-center justify-center transition-colors"
                          >
                            <Icon name="Trash2" className="w-3.5 h-3.5 text-red-500" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      {renderFormModal()}
      {renderViewModal()}
    </div>
  );
}
