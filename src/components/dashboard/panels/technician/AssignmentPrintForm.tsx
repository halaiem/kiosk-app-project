import { useRef, useCallback } from "react";
import type { DriverInfo, VehicleInfo } from "@/types/dashboard";

interface PrintRow {
  routeNumber: string;
  routeName: string;
  driverName: string;
  driverTab: string;
  vehicleDisplay: string;
  vehicleType: string;
  shiftStart: string;
  shiftEnd: string;
  shiftType: "regular" | "additional";
  notes: string;
}

interface AssignmentPrintFormProps {
  date: string;
  rows: PrintRow[];
  open: boolean;
  onClose: () => void;
}

const SHIFT_LABELS: Record<string, string> = {
  regular: "Основная",
  additional: "Дополнительная",
};

function formatDateRu(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const months = [
    "января", "февраля", "марта", "апреля", "мая", "июня",
    "июля", "августа", "сентября", "октября", "ноября", "декабря",
  ];
  const weekdays = [
    "воскресенье", "понедельник", "вторник", "среда",
    "четверг", "пятница", "суббота",
  ];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()} г., ${weekdays[d.getDay()]}`;
}

function AssignmentPrintForm({ date, rows, open, onClose }: AssignmentPrintFormProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useCallback(() => {
    const content = printRef.current;
    if (!content) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const regularRows = rows.filter((r) => r.shiftType === "regular");
    const additionalRows = rows.filter((r) => r.shiftType === "additional");

    const buildTableRows = (list: PrintRow[]) =>
      list
        .map(
          (r, i) => `
        <tr>
          <td class="center">${i + 1}</td>
          <td class="bold">${r.routeNumber}</td>
          <td>${r.routeName}</td>
          <td>${r.driverName}</td>
          <td class="center">${r.driverTab}</td>
          <td>${r.vehicleDisplay}</td>
          <td class="center">${r.vehicleType}</td>
          <td class="center mono">${r.shiftStart}</td>
          <td class="center mono">${r.shiftEnd}</td>
          <td class="notes">${r.notes || ""}</td>
        </tr>
      `
        )
        .join("");

    const buildSection = (title: string, list: PrintRow[]) => {
      if (list.length === 0) return "";
      return `
        <h3>${title} (${list.length})</h3>
        <table>
          <thead>
            <tr>
              <th class="w-num">№</th>
              <th class="w-route-num">Маршрут</th>
              <th class="w-route-name">Название</th>
              <th class="w-driver">Водитель</th>
              <th class="w-tab">Таб. №</th>
              <th class="w-vehicle">Транспорт</th>
              <th class="w-vtype">Тип</th>
              <th class="w-time">Начало</th>
              <th class="w-time">Конец</th>
              <th class="w-notes">Примечание</th>
            </tr>
          </thead>
          <tbody>
            ${buildTableRows(list)}
          </tbody>
        </table>
      `;
    };

    printWindow.document.write(`<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <title>Наряд на ${date}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: "Times New Roman", Times, serif;
      font-size: 11pt;
      color: #000;
      padding: 15mm 15mm 20mm 25mm;
      line-height: 1.3;
    }
    .header {
      text-align: center;
      margin-bottom: 8mm;
    }
    .header h1 {
      font-size: 16pt;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 2mm;
    }
    .header .date {
      font-size: 13pt;
      font-weight: normal;
    }
    .header .org {
      font-size: 10pt;
      color: #555;
      margin-top: 1mm;
    }
    h3 {
      font-size: 12pt;
      margin: 5mm 0 2mm;
      border-bottom: 1px solid #999;
      padding-bottom: 1mm;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9.5pt;
      margin-bottom: 4mm;
    }
    th, td {
      border: 0.5pt solid #333;
      padding: 2mm 2mm;
      text-align: left;
      vertical-align: top;
    }
    th {
      background: #f0f0f0;
      font-weight: bold;
      text-align: center;
      font-size: 8.5pt;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .mono { font-family: "Courier New", monospace; }
    .notes { font-size: 8.5pt; color: #555; }
    .w-num { width: 7mm; }
    .w-route-num { width: 16mm; }
    .w-route-name { width: 30mm; }
    .w-driver { width: 38mm; }
    .w-tab { width: 14mm; }
    .w-vehicle { width: 28mm; }
    .w-vtype { width: 18mm; }
    .w-time { width: 14mm; }
    .w-notes { }
    .summary {
      margin-top: 6mm;
      font-size: 10pt;
    }
    .summary td {
      border: none;
      padding: 1mm 3mm 1mm 0;
    }
    .summary .label { font-weight: bold; width: 50mm; }
    .signatures {
      margin-top: 15mm;
      display: flex;
      justify-content: space-between;
      page-break-inside: avoid;
    }
    .sig-block {
      width: 45%;
    }
    .sig-block .sig-title {
      font-size: 10pt;
      font-weight: bold;
      margin-bottom: 8mm;
    }
    .sig-line {
      border-bottom: 1px solid #000;
      height: 6mm;
      margin-bottom: 1mm;
    }
    .sig-label {
      font-size: 8pt;
      color: #666;
      text-align: center;
    }
    .footer {
      position: fixed;
      bottom: 10mm;
      left: 25mm;
      right: 15mm;
      font-size: 8pt;
      color: #999;
      border-top: 0.5pt solid #ccc;
      padding-top: 2mm;
      display: flex;
      justify-content: space-between;
    }
    @media print {
      body { padding: 0; }
      .no-print { display: none !important; }
      @page {
        size: A4 landscape;
        margin: 12mm 12mm 18mm 20mm;
      }
    }
    .print-btn {
      position: fixed;
      top: 10px;
      right: 10px;
      z-index: 1000;
      display: flex;
      gap: 8px;
    }
    .print-btn button {
      padding: 8px 20px;
      font-size: 13px;
      border: 1px solid #ccc;
      border-radius: 6px;
      cursor: pointer;
      font-family: sans-serif;
    }
    .print-btn .btn-print {
      background: #2563eb;
      color: #fff;
      border-color: #2563eb;
    }
    .print-btn .btn-close {
      background: #f3f4f6;
      color: #333;
    }
  </style>
</head>
<body>
  <div class="print-btn no-print">
    <button class="btn-print" onclick="window.print()">🖨 Печать</button>
    <button class="btn-close" onclick="window.close()">✕ Закрыть</button>
  </div>

  <div class="header">
    <h1>Наряд на выпуск</h1>
    <div class="date">${formatDateRu(date)}</div>
  </div>

  ${buildSection("Основные смены", regularRows)}
  ${buildSection("Дополнительные смены", additionalRows)}

  <table class="summary">
    <tr>
      <td class="label">Всего назначений:</td>
      <td>${rows.length}</td>
    </tr>
    <tr>
      <td class="label">Основных смен:</td>
      <td>${regularRows.length}</td>
    </tr>
    ${additionalRows.length > 0 ? `
    <tr>
      <td class="label">Дополнительных смен:</td>
      <td>${additionalRows.length}</td>
    </tr>` : ""}
    <tr>
      <td class="label">Маршрутов задействовано:</td>
      <td>${new Set(rows.map((r) => r.routeNumber)).size}</td>
    </tr>
    <tr>
      <td class="label">Единиц транспорта:</td>
      <td>${new Set(rows.map((r) => r.vehicleDisplay)).size}</td>
    </tr>
  </table>

  <div class="signatures">
    <div class="sig-block">
      <div class="sig-title">Составил:</div>
      <div class="sig-line"></div>
      <div class="sig-label">подпись / ФИО / должность</div>
    </div>
    <div class="sig-block">
      <div class="sig-title">Утвердил:</div>
      <div class="sig-line"></div>
      <div class="sig-label">подпись / ФИО / должность</div>
    </div>
  </div>

  <div class="footer">
    <span>Документ сформирован: ${new Date().toLocaleString("ru-RU")}</span>
    <span>Наряд на ${date}</span>
  </div>
</body>
</html>`);
    printWindow.document.close();
  }, [rows, date]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-2xl p-6 w-full max-w-lg mx-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-foreground">
            Печать наряда
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-muted hover:bg-muted/80 flex items-center justify-center"
          >
            <span className="text-muted-foreground text-lg">✕</span>
          </button>
        </div>

        <div className="space-y-3 mb-5">
          <div className="bg-muted/30 rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Дата наряда</span>
              <span className="font-medium text-foreground">
                {formatDateRu(date)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Назначений</span>
              <span className="font-medium text-foreground">{rows.length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Основных / доп.</span>
              <span className="font-medium text-foreground">
                {rows.filter((r) => r.shiftType === "regular").length} /{" "}
                {rows.filter((r) => r.shiftType === "additional").length}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Маршрутов</span>
              <span className="font-medium text-foreground">
                {new Set(rows.map((r) => r.routeNumber)).size}
              </span>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Документ откроется в новом окне в альбомной ориентации A4.
            Нажмите «Печать» или Ctrl+P.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="flex-1 h-10 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Отмена
          </button>
          <button
            onClick={() => {
              handlePrint();
              onClose();
            }}
            className="flex-1 flex items-center justify-center gap-2 h-10 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            🖨 Открыть печатную форму
          </button>
        </div>
      </div>

      <div ref={printRef} className="hidden" />
    </div>
  );
}

export function preparePrintRows(
  rows: {
    routeNumber: string;
    routeName: string;
    driverId: number | null;
    vehicleId: string;
    shiftStart: string;
    shiftEnd: string;
    shiftType: "regular" | "additional";
    notes: string;
  }[],
  drivers: DriverInfo[],
  vehicles: VehicleInfo[]
): PrintRow[] {
  const typeLabels: Record<string, string> = {
    bus: "Автобус",
    tram: "Трамвай",
    trolleybus: "Троллейбус",
  };

  return rows
    .filter((r) => r.driverId !== null && r.vehicleId)
    .map((r) => {
      const driver = drivers.find((d) => Number(d.id) === r.driverId);
      const vehicle = vehicles.find((v) => v.id === r.vehicleId);
      return {
        routeNumber: r.routeNumber,
        routeName: r.routeName,
        driverName: driver ? driver.name : `#${r.driverId}`,
        driverTab: driver ? driver.tabNumber : "—",
        vehicleDisplay: vehicle
          ? `#${vehicle.boardNumber ?? vehicle.number}`
          : r.vehicleId,
        vehicleType: vehicle ? (typeLabels[vehicle.type] ?? vehicle.type) : "—",
        shiftStart: r.shiftStart,
        shiftEnd: r.shiftEnd,
        shiftType: r.shiftType,
        notes: r.notes,
      };
    });
}

export default AssignmentPrintForm;
