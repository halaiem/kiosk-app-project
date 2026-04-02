import { useState, useMemo, useCallback } from "react";
import Icon from "@/components/ui/icon";
import ReportButton from "@/components/dashboard/ReportButton";
import type {
  VehicleInfo,
  DriverInfo,
  DriverStatus,
  DriverLifecycleStatus,
  RouteInfo,
  ScheduleEntry,
  DocumentInfo,
} from "@/types/dashboard";
import { formatTime, Modal } from "./TechRoutes";
import { createDriver as apiCreateDriver } from "@/api/driverApi";
import {
  updateDriver as apiUpdateDriver,
  deleteDriver as apiDeleteDriver,
} from "@/api/dashboardApi";
import {
  DRIVER_STATUS_STYLES,
  DRIVER_STATUS_LABELS,
  generatePin,
} from "./TechVDConstants";

type SortKey = "name" | "status" | "rating";

const LIFECYCLE_STATUS_LABELS: Record<string, string> = {
  active: "\u0410\u043a\u0442\u0438\u0432\u0435\u043d",
  vacation: "\u0412 \u043e\u0442\u043f\u0443\u0441\u043a\u0435",
  sick_leave: "\u0411\u043e\u043b\u044c\u043d\u0438\u0447\u043d\u044b\u0439",
  fired: "\u0423\u0432\u043e\u043b\u0435\u043d",
};
const LIFECYCLE_STATUS_STYLES: Record<string, string> = {
  active: "bg-green-500/15 text-green-500",
  vacation: "bg-yellow-500/15 text-yellow-600",
  sick_leave: "bg-orange-500/15 text-orange-500",
  fired: "bg-red-500/15 text-red-500",
};

interface DriversViewProps {
  drivers: DriverInfo[];
  onReload?: () => void;
  vehicles?: VehicleInfo[];
  routes?: RouteInfo[];
  schedules?: ScheduleEntry[];
  documents?: DocumentInfo[];
}

export function DriversView({
  drivers,
  onReload,
  schedules,
}: DriversViewProps) {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("name");
  const [showForm, setShowForm] = useState(false);
  const [detailDriver, setDetailDriver] = useState<DriverInfo | null>(null);
  const [editingDriver, setEditingDriver] = useState<DriverInfo | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [createdPin, setCreatedPin] = useState<string | null>(null);

  // Create form state
  const [fName, setFName] = useState("");
  const [fPin, setFPin] = useState(() => generatePin());
  const [fPhone, setFPhone] = useState("");
  const [fVehicleType, setFVehicleType] = useState<VehicleInfo["type"] | "">(
    ""
  );
  const [fVehicleNumber, setFVehicleNumber] = useState("");
  const [fRoute, setFRoute] = useState("");
  const [fShiftStart, setFShiftStart] = useState("08:00");

  // Edit form state
  const [eName, setEName] = useState("");
  const [ePin, setEPin] = useState("");
  const [eOriginalPin, setEOriginalPin] = useState("");
  const [ePhone, setEPhone] = useState("");
  const [eVehicleType, setEVehicleType] = useState<VehicleInfo["type"] | "">(
    ""
  );
  const [eVehicleNumber, setEVehicleNumber] = useState("");
  const [eRoute, setERoute] = useState("");
  const [eShiftStart, setEShiftStart] = useState("08:00");
  const [eDriverStatus, setEDriverStatus] =
    useState<DriverLifecycleStatus>("active");
  const [eStatusNote, setEStatusNote] = useState("");
  const [eRating, setERating] = useState("4.5");
  const [eTechPassword, setETechPassword] = useState("");
  const [editError, setEditError] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  // Status change confirmation in detail modal
  const [confirmAction, setConfirmAction] = useState<{
    status: DriverLifecycleStatus;
    label: string;
  } | null>(null);
  const [confirmNote, setConfirmNote] = useState("");
  const [confirmSaving, setConfirmSaving] = useState(false);

  const filtered = useMemo(() => {
    let list = [...drivers];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.tabNumber.toLowerCase().includes(q) ||
          d.vehicleNumber.toLowerCase().includes(q)
      );
    }
    const statusOrder: Record<DriverStatus, number> = {
      on_shift: 0,
      break: 1,
      off_shift: 2,
      sick: 3,
    };
    list.sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name, "ru");
      if (sortBy === "status")
        return statusOrder[a.status] - statusOrder[b.status];
      return b.rating - a.rating;
    });
    return list;
  }, [drivers, search, sortBy]);

  const resetForm = () => {
    setFName("");
    setFPin(generatePin());
    setFPhone("");
    setFVehicleType("");
    setFVehicleNumber("");
    setFRoute("");
    setFShiftStart("08:00");
    setError("");
    setShowForm(false);
    setCreatedPin(null);
  };

  const openEdit = (d: DriverInfo) => {
    setEName(d.name);
    setEPin(d.pin || "");
    setEOriginalPin(d.pin || "");
    setEPhone(d.phone || "");
    setEVehicleType((d.vehicleType as VehicleInfo["type"]) || "");
    setEVehicleNumber(d.vehicleNumber || "");
    setERoute(d.routeNumber || "");
    setEShiftStart(
      d.shiftStart ? formatTime(d.shiftStart) : "08:00"
    );
    setEDriverStatus(d.driverStatus || "active");
    setEStatusNote(d.statusNote || "");
    setERating(d.rating?.toFixed(1) || "4.5");
    setETechPassword("");
    setEditError("");
    setEditingDriver(d);
  };

  const handleCreate = useCallback(async () => {
    if (!fName.trim() || !fPin.trim()) {
      setError("\u0417\u0430\u043f\u043e\u043b\u043d\u0438\u0442\u0435 \u0424\u0418\u041e \u0438 PIN");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await apiCreateDriver({
        fullName: fName.trim(),
        pin: fPin.trim(),
        vehicleType: fVehicleType || "tram",
        vehicleNumber: fVehicleNumber.trim(),
        routeNumber: fRoute.trim(),
        shiftStart: fShiftStart,
        phone: fPhone.trim() || undefined,
      });
      setCreatedPin(fPin);
      onReload?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "\u041e\u0448\u0438\u0431\u043a\u0430 \u0441\u043e\u0437\u0434\u0430\u043d\u0438\u044f");
    } finally {
      setSaving(false);
    }
  }, [
    fName,
    fPin,
    fPhone,
    fVehicleType,
    fVehicleNumber,
    fRoute,
    fShiftStart,
    onReload,
  ]);

  const handleEdit = useCallback(async () => {
    if (!editingDriver) return;
    if (!eName.trim()) {
      setEditError("\u0424\u0418\u041e \u043e\u0431\u044f\u0437\u0430\u0442\u0435\u043b\u044c\u043d\u043e");
      return;
    }
    setEditSaving(true);
    setEditError("");
    try {
      const payload: Record<string, unknown> = {
        id: editingDriver.id,
        fullName: eName.trim(),
        phone: ePhone.trim() || null,
        vehicleType: eVehicleType || "tram",
        vehicleNumber: eVehicleNumber.trim(),
        routeNumber: eRoute.trim(),
        shiftStart: eShiftStart,
        driverStatus: eDriverStatus,
        statusNote: eStatusNote.trim(),
        rating: parseFloat(eRating) || 4.5,
      };
      // Only send pin if it changed
      const pinChanged = ePin.trim() !== eOriginalPin;
      if (pinChanged) {
        payload.pin = ePin.trim();
        payload.techPassword = eTechPassword;
      }
      await apiUpdateDriver(payload);
      setEditingDriver(null);
      onReload?.();
    } catch (e) {
      setEditError(
        e instanceof Error ? e.message : "\u041e\u0448\u0438\u0431\u043a\u0430 \u0441\u043e\u0445\u0440\u0430\u043d\u0435\u043d\u0438\u044f"
      );
    } finally {
      setEditSaving(false);
    }
  }, [
    editingDriver,
    eName,
    ePin,
    eOriginalPin,
    ePhone,
    eVehicleType,
    eVehicleNumber,
    eRoute,
    eShiftStart,
    eDriverStatus,
    eStatusNote,
    eRating,
    eTechPassword,
    onReload,
  ]);

  const handleStatusChange = useCallback(
    async (driver: DriverInfo, newStatus: DriverLifecycleStatus, note: string) => {
      setConfirmSaving(true);
      try {
        if (newStatus === "fired") {
          await apiDeleteDriver(Number(driver.id));
        } else {
          await apiUpdateDriver({
            id: driver.id,
            driverStatus: newStatus,
            statusNote: note,
          });
        }
        setConfirmAction(null);
        setConfirmNote("");
        setDetailDriver(null);
        onReload?.();
      } catch (e) {
        console.error(e);
      } finally {
        setConfirmSaving(false);
      }
    },
    [onReload]
  );

  const driverAssignments = useMemo(() => {
    if (!detailDriver || !schedules) return [];
    return schedules.filter(
      (s) =>
        s.driverId === Number(detailDriver.id) &&
        s.status !== "cancelled"
    );
  }, [detailDriver, schedules]);

  const sortButtons: { key: SortKey; label: string }[] = [
    { key: "name", label: "\u0418\u043c\u044f" },
    { key: "status", label: "\u0421\u0442\u0430\u0442\u0443\u0441" },
    { key: "rating", label: "\u0420\u0435\u0439\u0442\u0438\u043d\u0433" },
  ];

  const pinChanged = ePin.trim() !== eOriginalPin;

  return (
    <div className="bg-card border border-border rounded-2xl flex flex-col overflow-hidden h-full">
      <div className="px-5 py-3 border-b border-border flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Icon
            name="Search"
            className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="\u041f\u043e\u0438\u0441\u043a \u043f\u043e \u0438\u043c\u0435\u043d\u0438, \u0442\u0430\u0431\u0435\u043b\u044c\u043d\u043e\u043c\u0443..."
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
          />
        </div>
        <div className="flex items-center gap-1 ml-auto">
          <span className="text-xs text-muted-foreground mr-1">
            \u0421\u043e\u0440\u0442\u0438\u0440\u043e\u0432\u043a\u0430:
          </span>
          {sortButtons.map((s) => (
            <button
              key={s.key}
              onClick={() => setSortBy(s.key)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                sortBy === s.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <ReportButton filename="drivers" data={drivers} />
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors shrink-0"
        >
          <Icon name="UserPlus" className="w-4 h-4" />
          \u0414\u043e\u0431\u0430\u0432\u0438\u0442\u044c
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted-foreground">
              <th className="text-left px-5 py-2.5 font-medium">
                \u0422\u0430\u0431. \u043d\u043e\u043c\u0435\u0440
              </th>
              <th className="text-left px-3 py-2.5 font-medium">\u0424\u0418\u041e</th>
              <th className="text-left px-3 py-2.5 font-medium">
                \u0421\u0442\u0430\u0442\u0443\u0441
              </th>
              <th className="text-left px-3 py-2.5 font-medium">\u0422\u0421</th>
              <th className="text-left px-3 py-2.5 font-medium">
                \u041c\u0430\u0440\u0448\u0440\u0443\u0442
              </th>
              <th className="text-left px-3 py-2.5 font-medium">
                \u0421\u043c\u0435\u043d\u0430
              </th>
              <th className="text-left px-3 py-2.5 font-medium">PIN</th>
              <th className="text-left px-3 py-2.5 font-medium">
                \u0422\u0435\u043b\u0435\u0444\u043e\u043d
              </th>
              <th className="text-left px-3 py-2.5 font-medium">
                \u0420\u0435\u0439\u0442\u0438\u043d\u0433
              </th>
              <th className="px-3 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={10}
                  className="text-center py-12 text-muted-foreground"
                >
                  <Icon
                    name="UserX"
                    className="w-10 h-10 mx-auto mb-2 opacity-30"
                  />
                  <p>\u041d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d\u043e</p>
                </td>
              </tr>
            ) : (
              filtered.map((d) => {
                const lifecycle = d.driverStatus || "active";
                return (
                  <tr
                    key={d.id}
                    className="border-b border-border hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-5 py-3 font-mono text-xs text-muted-foreground">
                      {d.tabNumber}
                    </td>
                    <td className="px-3 py-3 font-medium text-foreground">
                      {d.name}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-col gap-1">
                        <span
                          className={`text-[11px] font-medium px-2 py-0.5 rounded w-fit ${
                            DRIVER_STATUS_STYLES[d.status]
                          }`}
                        >
                          {DRIVER_STATUS_LABELS[d.status]}
                        </span>
                        {lifecycle !== "active" && (
                          <span
                            className={`text-[10px] font-medium px-2 py-0.5 rounded w-fit ${
                              LIFECYCLE_STATUS_STYLES[lifecycle] || ""
                            }`}
                          >
                            {LIFECYCLE_STATUS_LABELS[lifecycle] || lifecycle}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-muted-foreground text-xs">
                      {d.vehicleNumber || "---"}
                    </td>
                    <td className="px-3 py-3 text-muted-foreground text-xs">
                      {d.routeNumber || "---"}
                    </td>
                    <td className="px-3 py-3 text-xs">
                      <span className="text-muted-foreground">
                        {d.shiftStart
                          ? `\u2191 ${formatTime(d.shiftStart)}`
                          : "---"}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded tracking-widest text-foreground">
                        \u2022\u2022\u2022\u2022
                      </span>
                    </td>
                    <td className="px-3 py-3 text-muted-foreground text-xs font-mono">
                      {d.phone || "---"}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }, (_, i) => (
                          <Icon
                            key={i}
                            name="Star"
                            className={`w-3.5 h-3.5 ${
                              i < Math.round(d.rating)
                                ? "text-yellow-500 fill-yellow-500"
                                : "text-muted-foreground/30"
                            }`}
                          />
                        ))}
                        <span className="text-[11px] text-muted-foreground ml-1">
                          {d.rating.toFixed(1)}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setDetailDriver(d)}
                          className="text-[11px] px-2 py-1 rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                        >
                          <Icon name="Eye" className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => openEdit(d)}
                          className="text-[11px] px-2 py-1 rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                        >
                          <Icon name="Pencil" className="w-3 h-3" />
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

      {/* ── Detail Modal ───────────────────────────────────────────────── */}
      {detailDriver && !confirmAction && (
        <Modal
          title={`\u0412\u043e\u0434\u0438\u0442\u0435\u043b\u044c \u2014 ${detailDriver.name}`}
          onClose={() => setDetailDriver(null)}
        >
          <div className="px-5 py-4 space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                { label: "\u0422\u0430\u0431. \u043d\u043e\u043c\u0435\u0440", value: detailDriver.tabNumber },
                {
                  label: "\u0421\u0442\u0430\u0442\u0443\u0441 \u0441\u043c\u0435\u043d\u044b",
                  value: DRIVER_STATUS_LABELS[detailDriver.status],
                  colored: DRIVER_STATUS_STYLES[detailDriver.status],
                },
                {
                  label: "\u0411\u043e\u0440\u0442\u043e\u0432\u043e\u0439 \u043d\u043e\u043c\u0435\u0440",
                  value: detailDriver.vehicleNumber || "\u2014",
                },
                {
                  label: "\u041c\u0430\u0440\u0448\u0440\u0443\u0442",
                  value: detailDriver.routeNumber
                    ? `\u2116${detailDriver.routeNumber}`
                    : "\u2014",
                },
                {
                  label: "\u041d\u0430\u0447\u0430\u043b\u043e \u0441\u043c\u0435\u043d\u044b",
                  value: detailDriver.shiftStart
                    ? formatTime(detailDriver.shiftStart)
                    : "\u2014",
                },
                {
                  label: "\u0422\u0435\u043b\u0435\u0444\u043e\u043d",
                  value: detailDriver.phone || "\u2014",
                },
                {
                  label: "\u0420\u0435\u0439\u0442\u0438\u043d\u0433",
                  value: `${detailDriver.rating.toFixed(1)} / 5.0`,
                },
              ].map(({ label, value, colored }) => (
                <div key={label} className="bg-muted/40 rounded-xl p-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">
                    {label}
                  </p>
                  {colored ? (
                    <span
                      className={`text-sm font-medium px-2 py-0.5 rounded ${colored}`}
                    >
                      {value}
                    </span>
                  ) : (
                    <span className="font-medium text-foreground">{value}</span>
                  )}
                </div>
              ))}
            </div>

            {/* ── Driver lifecycle status section ───────────────── */}
            <div className="bg-muted/40 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-foreground uppercase tracking-wide">
                  \u0421\u0442\u0430\u0442\u0443\u0441 \u0432\u043e\u0434\u0438\u0442\u0435\u043b\u044f
                </p>
                <span
                  className={`text-xs font-medium px-2.5 py-1 rounded-lg ${
                    LIFECYCLE_STATUS_STYLES[
                      detailDriver.driverStatus || "active"
                    ] || LIFECYCLE_STATUS_STYLES.active
                  }`}
                >
                  {LIFECYCLE_STATUS_LABELS[detailDriver.driverStatus || "active"] ||
                    "\u0410\u043a\u0442\u0438\u0432\u0435\u043d"}
                </span>
              </div>
              {detailDriver.statusNote && (
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium">\u041f\u0440\u0438\u043c\u0435\u0447\u0430\u043d\u0438\u0435:</span>{" "}
                  {detailDriver.statusNote}
                </p>
              )}
              {detailDriver.statusChangedAt && (
                <p className="text-[10px] text-muted-foreground">
                  \u0418\u0437\u043c\u0435\u043d\u0435\u043d\u043e:{" "}
                  {new Date(detailDriver.statusChangedAt).toLocaleString("ru")}
                </p>
              )}
              {(detailDriver.driverStatus || "active") !== "fired" && (
                <div className="flex items-center gap-2 pt-1">
                  {(detailDriver.driverStatus || "active") !== "vacation" && (
                    <button
                      onClick={() =>
                        setConfirmAction({
                          status: "vacation",
                          label: "\u041e\u0442\u043f\u0443\u0441\u043a",
                        })
                      }
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-yellow-500/15 text-yellow-600 hover:bg-yellow-500/25 transition-colors"
                    >
                      \u041e\u0442\u043f\u0443\u0441\u043a
                    </button>
                  )}
                  {(detailDriver.driverStatus || "active") !== "sick_leave" && (
                    <button
                      onClick={() =>
                        setConfirmAction({
                          status: "sick_leave",
                          label: "\u0411\u043e\u043b\u044c\u043d\u0438\u0447\u043d\u044b\u0439",
                        })
                      }
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-orange-500/15 text-orange-500 hover:bg-orange-500/25 transition-colors"
                    >
                      \u0411\u043e\u043b\u044c\u043d\u0438\u0447\u043d\u044b\u0439
                    </button>
                  )}
                  {(detailDriver.driverStatus || "active") !== "active" && (
                    <button
                      onClick={() =>
                        setConfirmAction({
                          status: "active",
                          label: "\u0412\u0435\u0440\u043d\u0443\u0442\u044c \u043d\u0430 \u0441\u043b\u0443\u0436\u0431\u0443",
                        })
                      }
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-green-500/15 text-green-500 hover:bg-green-500/25 transition-colors"
                    >
                      \u0412\u0435\u0440\u043d\u0443\u0442\u044c
                    </button>
                  )}
                  <button
                    onClick={() =>
                      setConfirmAction({
                        status: "fired",
                        label: "\u0423\u0432\u043e\u043b\u0438\u0442\u044c",
                      })
                    }
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/15 text-red-500 hover:bg-red-500/25 transition-colors ml-auto"
                  >
                    \u0423\u0432\u043e\u043b\u0438\u0442\u044c
                  </button>
                </div>
              )}
            </div>

            {/* ── PIN info ────────────────────────────────────── */}
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
              <p className="text-[10px] text-amber-600 uppercase tracking-wide mb-1 font-semibold">
                PIN \u0434\u043b\u044f \u0432\u0445\u043e\u0434\u0430 \u0432 \u043f\u043b\u0430\u043d\u0448\u0435\u0442
              </p>
              <p className="text-xs text-muted-foreground">
                PIN \u0445\u0440\u0430\u043d\u0438\u0442\u0441\u044f \u0432 \u0437\u0430\u0448\u0438\u0444\u0440\u043e\u0432\u0430\u043d\u043d\u043e\u043c \u0432\u0438\u0434\u0435. \u041f\u0435\u0440\u0435\u0434\u0430\u0439\u0442\u0435 \u0432\u043e\u0434\u0438\u0442\u0435\u043b\u044e PIN \u043f\u0440\u0438 \u0441\u043e\u0437\u0434\u0430\u043d\u0438\u0438 \u0438\u043b\u0438
                \u0441\u0431\u0440\u043e\u0441\u044c\u0442\u0435 \u0447\u0435\u0440\u0435\u0437 \u0442\u0435\u0445\u043d\u0438\u043a\u0430.
              </p>
            </div>

            {/* ── Assignments ─────────────────────────────────── */}
            {schedules && driverAssignments.length > 0 && (
              <div className="bg-muted/40 rounded-xl p-4 space-y-2">
                <p className="text-xs font-semibold text-foreground uppercase tracking-wide">
                  \u041d\u0430\u0437\u043d\u0430\u0447\u0435\u043d\u0438\u044f
                </p>
                <div className="space-y-1.5">
                  {driverAssignments.slice(0, 5).map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center justify-between text-xs bg-background rounded-lg px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <Icon
                          name="Route"
                          className="w-3 h-3 text-muted-foreground"
                        />
                        <span className="font-medium">
                          \u041c\u0430\u0440\u0448\u0440\u0443\u0442 {a.routeNumber || "---"}
                        </span>
                        <span className="text-muted-foreground">
                          \u0422\u0421: {a.vehicleNumber || "---"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <span>{a.date}</span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                            a.status === "active"
                              ? "bg-green-500/15 text-green-500"
                              : a.status === "completed"
                              ? "bg-blue-500/15 text-blue-500"
                              : "bg-gray-500/15 text-gray-500"
                          }`}
                        >
                          {a.status}
                        </span>
                      </div>
                    </div>
                  ))}
                  {driverAssignments.length > 5 && (
                    <p className="text-[10px] text-muted-foreground text-center">
                      \u0438 \u0435\u0449\u0451 {driverAssignments.length - 5}...
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* ── Status Change Confirmation Modal ──────────────────────────── */}
      {detailDriver && confirmAction && (
        <Modal
          title={`${confirmAction.label} \u2014 ${detailDriver.name}`}
          onClose={() => {
            setConfirmAction(null);
            setConfirmNote("");
          }}
        >
          <div className="px-5 py-4 space-y-4">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  LIFECYCLE_STATUS_STYLES[confirmAction.status]
                }`}
              >
                <Icon
                  name={
                    confirmAction.status === "fired"
                      ? "UserX"
                      : confirmAction.status === "vacation"
                      ? "Palmtree"
                      : confirmAction.status === "sick_leave"
                      ? "Thermometer"
                      : "UserCheck"
                  }
                  className="w-5 h-5"
                />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {confirmAction.status === "fired"
                    ? "\u0412\u044b \u0443\u0432\u0435\u0440\u0435\u043d\u044b, \u0447\u0442\u043e \u0445\u043e\u0442\u0438\u0442\u0435 \u0443\u0432\u043e\u043b\u0438\u0442\u044c \u0432\u043e\u0434\u0438\u0442\u0435\u043b\u044f?"
                    : `\u0418\u0437\u043c\u0435\u043d\u0438\u0442\u044c \u0441\u0442\u0430\u0442\u0443\u0441 \u043d\u0430 "${LIFECYCLE_STATUS_LABELS[confirmAction.status]}"?`}
                </p>
                {confirmAction.status === "fired" && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    \u0412\u0441\u0435 \u0430\u043a\u0442\u0438\u0432\u043d\u044b\u0435 \u043d\u0430\u0437\u043d\u0430\u0447\u0435\u043d\u0438\u044f \u0431\u0443\u0434\u0443\u0442 \u043e\u0442\u043c\u0435\u043d\u0435\u043d\u044b
                  </p>
                )}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                \u041f\u0440\u0438\u0447\u0438\u043d\u0430 / \u043a\u043e\u043c\u043c\u0435\u043d\u0442\u0430\u0440\u0438\u0439
              </label>
              <textarea
                value={confirmNote}
                onChange={(e) => setConfirmNote(e.target.value)}
                rows={2}
                placeholder="\u0423\u043a\u0430\u0436\u0438\u0442\u0435 \u043f\u0440\u0438\u0447\u0438\u043d\u0443..."
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setConfirmAction(null);
                  setConfirmNote("");
                }}
                className="px-4 py-2 rounded-lg bg-muted text-muted-foreground text-sm hover:bg-muted/80 transition-colors"
              >
                \u041e\u0442\u043c\u0435\u043d\u0430
              </button>
              <button
                onClick={() =>
                  handleStatusChange(
                    detailDriver,
                    confirmAction.status,
                    confirmNote
                  )
                }
                disabled={confirmSaving}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
                  confirmAction.status === "fired"
                    ? "bg-red-500 text-white hover:bg-red-600"
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                }`}
              >
                {confirmSaving
                  ? "\u0421\u043e\u0445\u0440\u0430\u043d\u0435\u043d\u0438\u0435..."
                  : confirmAction.label}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Edit Modal ─────────────────────────────────────────────────── */}
      {editingDriver && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setEditingDriver(null)}
        >
          <div
            key={editingDriver.id}
            className="bg-card border border-border rounded-2xl p-6 w-full max-w-lg mx-4 shadow-xl max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold text-foreground">
                \u0420\u0435\u0434\u0430\u043a\u0442\u0438\u0440\u043e\u0432\u0430\u043d\u0438\u0435 \u0432\u043e\u0434\u0438\u0442\u0435\u043b\u044f
              </h3>
              <button
                onClick={() => setEditingDriver(null)}
                className="w-8 h-8 rounded-lg bg-muted hover:bg-muted/80 flex items-center justify-center"
              >
                <Icon
                  name="X"
                  className="w-4 h-4 text-muted-foreground"
                />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {/* Full name */}
              <div className="col-span-2">
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  \u0424\u0418\u041e \u043f\u043e\u043b\u043d\u043e\u0441\u0442\u044c\u044e *
                </label>
                <input
                  type="text"
                  value={eName}
                  onChange={(e) => setEName(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              {/* Phone */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  \u0422\u0435\u043b\u0435\u0444\u043e\u043d
                </label>
                <input
                  type="text"
                  value={ePhone}
                  onChange={(e) => setEPhone(e.target.value)}
                  placeholder="+7 (9XX) XXX-XX-XX"
                  className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              {/* Vehicle type */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  \u0422\u0438\u043f \u0422\u0421
                </label>
                <select
                  value={eVehicleType}
                  onChange={(e) =>
                    setEVehicleType(e.target.value as VehicleInfo["type"])
                  }
                  className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">\u2014 \u0432\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u2014</option>
                  <option value="tram">\u0422\u0440\u0430\u043c\u0432\u0430\u0439</option>
                  <option value="trolleybus">\u0422\u0440\u043e\u043b\u043b\u0435\u0439\u0431\u0443\u0441</option>
                  <option value="bus">\u0410\u0432\u0442\u043e\u0431\u0443\u0441</option>
                </select>
              </div>
              {/* Vehicle number */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  \u0411\u043e\u0440\u0442\u043e\u0432\u043e\u0439 \u043d\u043e\u043c\u0435\u0440
                </label>
                <input
                  type="text"
                  value={eVehicleNumber}
                  onChange={(e) => setEVehicleNumber(e.target.value)}
                  placeholder="\u0422\u041c-3450"
                  className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              {/* Route */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  \u041c\u0430\u0440\u0448\u0440\u0443\u0442
                </label>
                <input
                  type="text"
                  value={eRoute}
                  onChange={(e) => setERoute(e.target.value)}
                  placeholder="5"
                  className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              {/* Shift start */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  \u041d\u0430\u0447\u0430\u043b\u043e \u0441\u043c\u0435\u043d\u044b
                </label>
                <input
                  type="time"
                  value={eShiftStart}
                  onChange={(e) => setEShiftStart(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              {/* Rating */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  \u0420\u0435\u0439\u0442\u0438\u043d\u0433
                </label>
                <input
                  type="number"
                  value={eRating}
                  onChange={(e) => setERating(e.target.value)}
                  min="0"
                  max="5"
                  step="0.1"
                  className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              {/* Driver lifecycle status */}
              <div className="col-span-2">
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  \u0421\u0442\u0430\u0442\u0443\u0441 \u0432\u043e\u0434\u0438\u0442\u0435\u043b\u044f
                </label>
                <select
                  value={eDriverStatus}
                  onChange={(e) =>
                    setEDriverStatus(
                      e.target.value as DriverLifecycleStatus
                    )
                  }
                  className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="active">\u0410\u043a\u0442\u0438\u0432\u0435\u043d</option>
                  <option value="vacation">\u041e\u0442\u043f\u0443\u0441\u043a</option>
                  <option value="sick_leave">\u0411\u043e\u043b\u044c\u043d\u0438\u0447\u043d\u044b\u0439</option>
                  <option value="fired">\u0423\u0432\u043e\u043b\u0435\u043d</option>
                </select>
              </div>

              {/* Status note */}
              <div className="col-span-2">
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  \u041f\u0440\u0438\u043c\u0435\u0447\u0430\u043d\u0438\u0435 \u043a \u0441\u0442\u0430\u0442\u0443\u0441\u0443
                </label>
                <textarea
                  value={eStatusNote}
                  onChange={(e) => setEStatusNote(e.target.value)}
                  rows={2}
                  placeholder="\u041f\u0440\u0438\u0447\u0438\u043d\u0430 \u0438\u0437\u043c\u0435\u043d\u0435\u043d\u0438\u044f \u0441\u0442\u0430\u0442\u0443\u0441\u0430..."
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
              </div>

              {/* PIN editing */}
              <div className="col-span-2">
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  PIN \u0434\u043b\u044f \u0432\u0445\u043e\u0434\u0430 \u0432 \u043f\u043b\u0430\u043d\u0448\u0435\u0442
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-10 px-3 rounded-lg border border-primary/40 bg-primary/5 flex items-center gap-3">
                    <Icon
                      name="KeyRound"
                      className="w-4 h-4 text-primary flex-shrink-0"
                    />
                    <input
                      type="text"
                      value={ePin}
                      onChange={(e) =>
                        setEPin(
                          e.target.value.replace(/\D/g, "").slice(0, 6)
                        )
                      }
                      placeholder="1234"
                      className="flex-1 bg-transparent font-mono text-xl font-bold tracking-[0.4em] text-foreground focus:outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setEPin(generatePin())}
                    className="h-10 px-3 rounded-lg border border-border bg-muted hover:bg-muted/70 text-muted-foreground text-xs flex items-center gap-1.5 transition-colors"
                  >
                    <Icon name="RefreshCw" className="w-3.5 h-3.5" />
                    \u041d\u043e\u0432\u044b\u0439
                  </button>
                </div>
                {pinChanged && (
                  <p className="text-[10px] text-amber-600 mt-1">
                    PIN \u0438\u0437\u043c\u0435\u043d\u0451\u043d \u2014 \u0434\u043b\u044f \u0441\u043e\u0445\u0440\u0430\u043d\u0435\u043d\u0438\u044f \u0432\u0432\u0435\u0434\u0438\u0442\u0435 \u043f\u0430\u0440\u043e\u043b\u044c \u0442\u0435\u0445\u043d\u0438\u043a\u0430
                  </p>
                )}
              </div>

              {/* Tech password for PIN change */}
              {pinChanged && (
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-amber-600 mb-1">
                    \u041f\u0430\u0440\u043e\u043b\u044c \u0442\u0435\u0445\u043d\u0438\u043a\u0430 (\u0434\u043b\u044f \u0441\u043c\u0435\u043d\u044b PIN) *
                  </label>
                  <input
                    type="password"
                    value={eTechPassword}
                    onChange={(e) => setETechPassword(e.target.value)}
                    placeholder="\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u0432\u0430\u0448 \u043f\u0430\u0440\u043e\u043b\u044c..."
                    className="w-full h-9 px-3 rounded-lg border border-amber-500/40 bg-amber-500/5 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  />
                </div>
              )}
            </div>
            {editError && (
              <p className="text-xs text-destructive mt-3">{editError}</p>
            )}
            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={() => setEditingDriver(null)}
                className="px-4 py-2 rounded-lg bg-muted text-muted-foreground text-sm hover:bg-muted/80 transition-colors"
              >
                \u041e\u0442\u043c\u0435\u043d\u0430
              </button>
              <button
                onClick={handleEdit}
                disabled={
                  editSaving ||
                  !eName.trim() ||
                  (pinChanged && !eTechPassword.trim())
                }
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {editSaving ? "\u0421\u043e\u0445\u0440\u0430\u043d\u0435\u043d\u0438\u0435..." : "\u0421\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Create Form Modal ──────────────────────────────────────────── */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => !createdPin && resetForm()}
        >
          <div
            className="bg-card border border-border rounded-2xl p-6 w-full max-w-lg mx-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {createdPin ? (
              <>
                <div className="flex flex-col items-center text-center gap-4 py-2">
                  <div className="w-14 h-14 rounded-full bg-green-500/15 flex items-center justify-center">
                    <Icon
                      name="UserCheck"
                      className="w-7 h-7 text-green-500"
                    />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-foreground">
                      \u0412\u043e\u0434\u0438\u0442\u0435\u043b\u044c \u0441\u043e\u0437\u0434\u0430\u043d!
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      \u041f\u0435\u0440\u0435\u0434\u0430\u0439\u0442\u0435 PIN \u0432\u043e\u0434\u0438\u0442\u0435\u043b\u044e \u0434\u043b\u044f \u0430\u0432\u0442\u043e\u0440\u0438\u0437\u0430\u0446\u0438\u0438 \u043d\u0430 \u043f\u043b\u0430\u043d\u0448\u0435\u0442\u0435
                    </p>
                  </div>
                  <div className="w-full bg-primary/5 border border-primary/20 rounded-xl p-4">
                    <p className="text-[10px] text-primary uppercase tracking-wide mb-2 font-semibold">
                      PIN-\u043a\u043e\u0434 \u0434\u043b\u044f \u0432\u0445\u043e\u0434\u0430
                    </p>
                    <p className="font-mono text-4xl font-bold tracking-[0.5em] text-foreground select-all">
                      {createdPin}
                    </p>
                  </div>
                  <button
                    onClick={resetForm}
                    className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
                  >
                    \u0413\u043e\u0442\u043e\u0432\u043e
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-base font-semibold text-foreground">
                    \u041d\u043e\u0432\u044b\u0439 \u0432\u043e\u0434\u0438\u0442\u0435\u043b\u044c
                  </h3>
                  <button
                    onClick={resetForm}
                    className="w-8 h-8 rounded-lg bg-muted hover:bg-muted/80 flex items-center justify-center"
                  >
                    <Icon
                      name="X"
                      className="w-4 h-4 text-muted-foreground"
                    />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-muted-foreground mb-1">
                      \u0424\u0418\u041e \u043f\u043e\u043b\u043d\u043e\u0441\u0442\u044c\u044e *
                    </label>
                    <input
                      type="text"
                      value={fName}
                      onChange={(e) => setFName(e.target.value)}
                      placeholder="\u041e\u0441\u0441\u0430\u043c\u0430 \u0418\u0432\u0430\u043d\u043e\u0432 \u041f\u0435\u0442\u0440\u043e\u0432\u0438\u0447"
                      className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">
                      \u0422\u0435\u043b\u0435\u0444\u043e\u043d
                    </label>
                    <input
                      type="text"
                      value={fPhone}
                      onChange={(e) => setFPhone(e.target.value)}
                      placeholder="+7 (9XX) XXX-XX-XX"
                      className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">
                      \u0422\u0438\u043f \u0422\u0421
                    </label>
                    <select
                      value={fVehicleType}
                      onChange={(e) =>
                        setFVehicleType(
                          e.target.value as VehicleInfo["type"]
                        )
                      }
                      className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="">\u2014 \u0432\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u2014</option>
                      <option value="tram">\u0422\u0440\u0430\u043c\u0432\u0430\u0439</option>
                      <option value="trolleybus">\u0422\u0440\u043e\u043b\u043b\u0435\u0439\u0431\u0443\u0441</option>
                      <option value="bus">\u0410\u0432\u0442\u043e\u0431\u0443\u0441</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">
                      \u0411\u043e\u0440\u0442\u043e\u0432\u043e\u0439 \u043d\u043e\u043c\u0435\u0440
                    </label>
                    <input
                      type="text"
                      value={fVehicleNumber}
                      onChange={(e) => setFVehicleNumber(e.target.value)}
                      placeholder="\u0422\u041c-3450"
                      className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">
                      \u041c\u0430\u0440\u0448\u0440\u0443\u0442
                    </label>
                    <input
                      type="text"
                      value={fRoute}
                      onChange={(e) => setFRoute(e.target.value)}
                      placeholder="5"
                      className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">
                      \u041d\u0430\u0447\u0430\u043b\u043e \u0441\u043c\u0435\u043d\u044b
                    </label>
                    <input
                      type="time"
                      value={fShiftStart}
                      onChange={(e) => setFShiftStart(e.target.value)}
                      className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-muted-foreground mb-1">
                      PIN \u0434\u043b\u044f \u0432\u0445\u043e\u0434\u0430 \u0432 \u043f\u043b\u0430\u043d\u0448\u0435\u0442 *
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-10 px-3 rounded-lg border border-primary/40 bg-primary/5 flex items-center gap-3">
                        <Icon
                          name="KeyRound"
                          className="w-4 h-4 text-primary flex-shrink-0"
                        />
                        <input
                          type="text"
                          value={fPin}
                          onChange={(e) =>
                            setFPin(
                              e.target.value
                                .replace(/\D/g, "")
                                .slice(0, 6)
                            )
                          }
                          placeholder="1234"
                          className="flex-1 bg-transparent font-mono text-xl font-bold tracking-[0.4em] text-foreground focus:outline-none"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setFPin(generatePin())}
                        className="h-10 px-3 rounded-lg border border-border bg-muted hover:bg-muted/70 text-muted-foreground text-xs flex items-center gap-1.5 transition-colors"
                      >
                        <Icon name="RefreshCw" className="w-3.5 h-3.5" />
                        \u041d\u043e\u0432\u044b\u0439
                      </button>
                      <button
                        type="button"
                        onClick={() => navigator.clipboard.writeText(fPin)}
                        className="h-10 px-3 rounded-lg border border-border bg-muted hover:bg-muted/70 text-muted-foreground text-xs flex items-center gap-1.5 transition-colors"
                      >
                        <Icon name="Copy" className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      \u0412\u043e\u0434\u0438\u0442\u0435\u043b\u044c \u0432\u0432\u043e\u0434\u0438\u0442 \u044d\u0442\u043e\u0442 PIN \u043f\u0440\u0438 \u0430\u0432\u0442\u043e\u0440\u0438\u0437\u0430\u0446\u0438\u0438 \u043d\u0430 \u043f\u043b\u0430\u043d\u0448\u0435\u0442\u0435
                    </p>
                  </div>
                </div>
                {error && (
                  <p className="text-xs text-destructive mt-3">{error}</p>
                )}
                <div className="flex justify-end gap-2 mt-5">
                  <button
                    onClick={resetForm}
                    className="px-4 py-2 rounded-lg bg-muted text-muted-foreground text-sm hover:bg-muted/80 transition-colors"
                  >
                    \u041e\u0442\u043c\u0435\u043d\u0430
                  </button>
                  <button
                    onClick={handleCreate}
                    disabled={saving || !fName.trim() || !fPin.trim()}
                    className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {saving ? "\u0421\u043e\u0437\u0434\u0430\u044e..." : "\u0421\u043e\u0437\u0434\u0430\u0442\u044c \u0432\u043e\u0434\u0438\u0442\u0435\u043b\u044f"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}