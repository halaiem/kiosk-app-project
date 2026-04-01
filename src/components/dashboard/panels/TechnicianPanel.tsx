import { RoutesView } from "./technician/TechRoutes";
import { DocumentsView } from "./technician/TechDocuments";
import { VehiclesView, DriversView } from "./technician/TechVehiclesDrivers";
import { ScheduleView } from "./technician/TechSchedule";
import type {
  TechnicianTab,
  RouteInfo,
  DocumentInfo,
  VehicleInfo,
  DriverInfo,
  ScheduleEntry,
} from "@/types/dashboard";

interface TechnicianPanelProps {
  tab: TechnicianTab;
  routes: RouteInfo[];
  documents: DocumentInfo[];
  vehicles: VehicleInfo[];
  drivers: DriverInfo[];
  schedule: ScheduleEntry[];
  onUpdateDocumentStatus: (id: string, status: DocumentInfo["status"]) => void;
  onReload?: () => void;
}

export default function TechnicianPanel({
  tab,
  routes,
  documents,
  vehicles,
  drivers,
  schedule,
  onUpdateDocumentStatus,
  onReload,
}: TechnicianPanelProps) {
  if (tab === "routes") return <RoutesView routes={routes} />;
  if (tab === "documents") return <DocumentsView documents={documents} onUpdateDocumentStatus={onUpdateDocumentStatus} onReload={onReload} />;
  if (tab === "vehicles") return <VehiclesView vehicles={vehicles} onReload={onReload} />;
  if (tab === "drivers") return <DriversView drivers={drivers} onReload={onReload} />;
  if (tab === "schedule") return <ScheduleView schedule={schedule} onReload={onReload} />;
  return null;
}