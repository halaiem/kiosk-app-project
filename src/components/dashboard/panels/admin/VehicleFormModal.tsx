import { useState } from "react";
import Icon from "@/components/ui/icon";
import type { VehicleInfo } from "@/types/dashboard";
import { createVehicle, updateVehicle } from "@/api/dashboardApi";

interface VehicleFormModalProps {
  editingVehicle: VehicleInfo | null;
  showAddForm: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  loadData: () => Promise<void>;
}

export default function VehicleFormModal({
  editingVehicle,
  showAddForm,
  onClose,
  onSuccess,
  loadData,
}: VehicleFormModalProps) {
  const isEditing = !!editingVehicle;

  const [saving, setSaving] = useState(false);

  // ── Form state ─────────────────────────────────────────────────────────────
  const [fVinNumber, setFVinNumber] = useState(editingVehicle?.vinNumber ?? "");
  const [fType, setFType] = useState<VehicleInfo["type"]>(editingVehicle?.type ?? "bus");
  const [fBoardNumber, setFBoardNumber] = useState(
    editingVehicle?.boardNumber ?? editingVehicle?.number ?? ""
  );
  const [fGovRegNumber, setFGovRegNumber] = useState(editingVehicle?.govRegNumber ?? "");
  const [fModel, setFModel] = useState(editingVehicle?.model ?? "");
  const [fManufacturer, setFManufacturer] = useState(editingVehicle?.manufacturer ?? "");
  const [fRegCertificateNumber, setFRegCertificateNumber] = useState(
    editingVehicle?.regCertificateNumber ?? ""
  );
  const [fYear, setFYear] = useState(editingVehicle?.year ? String(editingVehicle.year) : "");
  const [fPassengerCapacity, setFPassengerCapacity] = useState(
    editingVehicle?.passengerCapacity ? String(editingVehicle.passengerCapacity) : ""
  );
  const [fFuelType, setFFuelType] = useState(editingVehicle?.fuelType ?? "diesel");
  const [fVehicleColor, setFVehicleColor] = useState(editingVehicle?.vehicleColor ?? "");
  const [fIsAccessible, setFIsAccessible] = useState(editingVehicle?.isAccessible ?? false);
  const [fInsuranceNumber, setFInsuranceNumber] = useState(editingVehicle?.insuranceNumber ?? "");
  const [fInsuranceExpiry, setFInsuranceExpiry] = useState(editingVehicle?.insuranceExpiry ?? "");
  const [fTechInspectionExpiry, setFTechInspectionExpiry] = useState(
    editingVehicle?.techInspectionExpiry ?? ""
  );
  const [fDocumentsInfo, setFDocumentsInfo] = useState(editingVehicle?.documentsInfo ?? "");
  const [fMileage, setFMileage] = useState(
    editingVehicle?.mileage ? String(editingVehicle.mileage) : ""
  );

  // ── Early return after all hooks ───────────────────────────────────────────
  if (!showAddForm && !isEditing) return null;

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
      onClose();
      onSuccess("Транспортное средство создано");
      await loadData();
    } catch (e) {
      console.error("Create vehicle:", e);
      onSuccess("Ошибка создания ТС");
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
      onClose();
      onSuccess("Транспортное средство обновлено");
      await loadData();
    } catch (e) {
      console.error("Update vehicle:", e);
      onSuccess("Ошибка обновления ТС");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
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
            onClick={onClose}
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
            onClick={onClose}
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
}
