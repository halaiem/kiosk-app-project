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
}

export default function TechnicianPanel({
  tab,
  routes,
  documents,
  vehicles,
  drivers,
  schedule,
  onUpdateDocumentStatus,
}: TechnicianPanelProps) {
  if (tab === "routes") return <RoutesView routes={routes} />;
  if (tab === "documents") return <DocumentsView documents={documents} onUpdateDocumentStatus={onUpdateDocumentStatus} />;
  if (tab === "vehicles") return <VehiclesView vehicles={vehicles} />;
  if (tab === "drivers") return <DriversView drivers={drivers} />;
  if (tab === "schedule") return <ScheduleView schedule={schedule} />;
  return null;
}
