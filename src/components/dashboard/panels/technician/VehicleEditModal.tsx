import { useState, useCallback } from "react";
import Icon from "@/components/ui/icon";
import type { VehicleInfo, VehicleStatus } from "@/types/dashboard";
import { updateVehicle as apiUpdateVehicle } from "@/api/dashboardApi";

interface VehicleEditModalProps {
  vehicle: VehicleInfo;
  onClose: () => void;
  onReload?: () => void;
}

export default function VehicleEditModal({ vehicle, onClose, onReload }: VehicleEditModalProps) {
  const [eVin, setEVin] = useState(vehicle.vinNumber || "");
  const [eType, setEType] = useState<VehicleInfo["type"] | "">(vehicle.type);
  const [eBoardNumber, setEBoardNumber] = useState(vehicle.boardNumber || vehicle.number || "");
  const [eGovReg, setEGovReg] = useState(vehicle.govRegNumber || "");
  const [eModel, setEModel] = useState(vehicle.model || "");
  const [eManufacturer, setEManufacturer] = useState(vehicle.manufacturer || "");
  const [eRegCert, setERegCert] = useState(vehicle.regCertificateNumber || "");
  const [eYear, setEYear] = useState(vehicle.year != null ? String(vehicle.year) : "");
  const [ePassengerCap, setEPassengerCap] = useState(vehicle.passengerCapacity != null ? String(vehicle.passengerCapacity) : "");
  const [eFuelType, setEFuelType] = useState(vehicle.fuelType || "");
  const [eColor, setEColor] = useState(vehicle.vehicleColor || "");
  const [eMileage, setEMileage] = useState(String(vehicle.mileage || 0));
  const [eInsuranceNumber, setEInsuranceNumber] = useState(vehicle.insuranceNumber || "");
  const [eInsuranceExpiry, setEInsuranceExpiry] = useState(vehicle.insuranceExpiry || "");
  const [eTechInspExpiry, setETechInspExpiry] = useState(vehicle.techInspectionExpiry || "");
  const [eIsAccessible, setEIsAccessible] = useState(vehicle.isAccessible || false);
  const [eDocsInfo, setEDocsInfo] = useState(vehicle.documentsInfo || "");
  const [eStatus, setEStatus] = useState<VehicleStatus | "">(vehicle.status);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = useCallback(async () => {
    setSaving(true);
    setError("");
    try {
      await apiUpdateVehicle({
        id: vehicle.id,
        vinNumber: eVin.trim() || null,
        type: eType || undefined,
        boardNumber: eBoardNumber.trim() || undefined,
        number: eBoardNumber.trim() || undefined,
        govRegNumber: eGovReg.trim() || null,
        model: eModel.trim() || null,
        manufacturer: eManufacturer.trim() || null,
        regCertificateNumber: eRegCert.trim() || null,
        year: eYear ? Number(eYear) : null,
        passengerCapacity: ePassengerCap ? Number(ePassengerCap) : null,
        fuelType: eFuelType.trim() || null,
        vehicleColor: eColor.trim() || null,
        mileage: Number(eMileage) || 0,
        insuranceNumber: eInsuranceNumber.trim() || null,
        insuranceExpiry: eInsuranceExpiry || null,
        techInspectionExpiry: eTechInspExpiry || null,
        isAccessible: eIsAccessible,
        documentsInfo: eDocsInfo.trim() || null,
        status: eStatus || undefined,
      });
      onClose();
      onReload?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  }, [vehicle.id, eVin, eType, eBoardNumber, eGovReg, eModel, eManufacturer, eRegCert, eYear, ePassengerCap, eFuelType, eColor, eMileage, eInsuranceNumber, eInsuranceExpiry, eTechInspExpiry, eIsAccessible, eDocsInfo, eStatus, onClose, onReload]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-2xl mx-4 shadow-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold text-foreground">Редактирование ТС — #{vehicle.boardNumber || vehicle.number}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-muted hover:bg-muted/80 flex items-center justify-center">
            <Icon name="X" className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">VIN-номер</label>
            <input type="text" value={eVin} onChange={e => setEVin(e.target.value)} placeholder="XTA..." className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Тип ТС *</label>
            <select value={eType} onChange={e => setEType(e.target.value as VehicleInfo["type"])} className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="tram">Трамвай</option>
              <option value="trolleybus">Троллейбус</option>
              <option value="bus">Автобус</option>
              <option value="electrobus">Электробус</option>
              <option value="technical">Технический</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Бортовой номер</label>
            <input type="text" value={eBoardNumber} onChange={e => setEBoardNumber(e.target.value)} className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Гос. рег. номер</label>
            <input type="text" value={eGovReg} onChange={e => setEGovReg(e.target.value)} placeholder="А000АА00" className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Модель</label>
            <input type="text" value={eModel} onChange={e => setEModel(e.target.value)} placeholder="71-623" className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Производитель</label>
            <input type="text" value={eManufacturer} onChange={e => setEManufacturer(e.target.value)} placeholder="УКВЗ" className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Рег. свидетельство</label>
            <input type="text" value={eRegCert} onChange={e => setERegCert(e.target.value)} className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Год выпуска</label>
            <input type="number" value={eYear} onChange={e => setEYear(e.target.value)} placeholder="2020" min="1990" max="2030" className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Вместимость (чел.)</label>
            <input type="number" value={ePassengerCap} onChange={e => setEPassengerCap(e.target.value)} min="0" className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Тип топлива</label>
            <input type="text" value={eFuelType} onChange={e => setEFuelType(e.target.value)} placeholder="Электро / Дизель" className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Цвет</label>
            <input type="text" value={eColor} onChange={e => setEColor(e.target.value)} placeholder="Красный" className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Пробег (км)</label>
            <input type="number" value={eMileage} onChange={e => setEMileage(e.target.value)} min="0" className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Номер страховки</label>
            <input type="text" value={eInsuranceNumber} onChange={e => setEInsuranceNumber(e.target.value)} className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Страховка до</label>
            <input type="date" value={eInsuranceExpiry} onChange={e => setEInsuranceExpiry(e.target.value)} className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Тех. осмотр до</label>
            <input type="date" value={eTechInspExpiry} onChange={e => setETechInspExpiry(e.target.value)} className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Статус</label>
            <select value={eStatus} onChange={e => setEStatus(e.target.value as VehicleStatus)} className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="active">Активен</option>
              <option value="maintenance">ТО</option>
              <option value="idle">Простой</option>
              <option value="offline">Офлайн</option>
            </select>
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer h-9">
              <input type="checkbox" checked={eIsAccessible} onChange={e => setEIsAccessible(e.target.checked)} className="w-4 h-4 rounded border-border text-primary focus:ring-ring" />
              <span className="text-sm text-foreground">Доступность</span>
            </label>
          </div>
          <div className="col-span-3">
            <label className="block text-xs font-medium text-muted-foreground mb-1">Информация о документах</label>
            <textarea value={eDocsInfo} onChange={e => setEDocsInfo(e.target.value)} rows={2} placeholder="Доп. информация о документах..." className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
          </div>
        </div>
        {error && <p className="text-xs text-destructive mt-3">{error}</p>}
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-muted text-muted-foreground text-sm hover:bg-muted/80 transition-colors">Отмена</button>
          <button disabled={saving} onClick={handleSave} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-colors disabled:opacity-50">
            {saving ? "Сохранение..." : "Сохранить"}
          </button>
        </div>
      </div>
    </div>
  );
}