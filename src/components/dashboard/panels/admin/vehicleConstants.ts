import type { VehicleInfo, VehicleStatus } from "@/types/dashboard";

// ── Constants ────────────────────────────────────────────────────────────────

export const VEHICLE_TYPE_LABELS: Record<VehicleInfo["type"], string> = {
  bus: "Автобус",
  tram: "Трамвай",
  trolleybus: "Троллейбус",
  electrobus: "Электробус",
  technical: "Технический",
};

export const VEHICLE_TYPE_STYLES: Record<VehicleInfo["type"], string> = {
  bus: "bg-green-500/15 text-green-500",
  tram: "bg-blue-500/15 text-blue-500",
  trolleybus: "bg-purple-500/15 text-purple-500",
  electrobus: "bg-teal-500/15 text-teal-500",
  technical: "bg-orange-500/15 text-orange-500",
};

export const VEHICLE_STATUS_LABELS: Record<VehicleStatus, string> = {
  active: "Активен",
  maintenance: "На ТО",
  idle: "Простой",
  offline: "Списан",
};

export const VEHICLE_STATUS_STYLES: Record<VehicleStatus, string> = {
  active: "bg-green-500/15 text-green-500",
  maintenance: "bg-yellow-500/15 text-yellow-600",
  idle: "bg-gray-500/15 text-gray-500",
  offline: "bg-red-500/15 text-red-500",
};

export const FUEL_TYPE_LABELS: Record<string, string> = {
  diesel: "Дизель",
  gas: "Газ",
  electric: "Электрический",
  hybrid: "Гибрид",
};

export type TypeFilter = "all" | VehicleInfo["type"];