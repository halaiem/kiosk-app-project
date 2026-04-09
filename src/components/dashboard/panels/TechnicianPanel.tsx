import { RoutesView } from "./technician/TechRoutes";
import { DocumentsView } from "./technician/TechDocuments";
import { VehiclesView, DriversView } from "./technician/TechVehiclesDrivers";
import { ScheduleView } from "./technician/TechSchedule";
import { TechDiagnosticsView } from "./technician/TechDiagnosticsView";
import { DailyAssignmentView } from "./technician/TechDailyAssignment";
import TechServiceRequestsView from "./technician/TechServiceRequestsView";
import MessagesView from "./shared/MessagesView";
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
  currentUserId?: number;
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
  currentUserId,
}: TechnicianPanelProps) {
  if (tab === "service_requests") return <TechServiceRequestsView vehicles={vehicles} onReload={onReload} />;
  if (tab === "routes") return <RoutesView routes={routes} onReload={onReload} />;
  if (tab === "documents") return <DocumentsView documents={documents} onUpdateDocumentStatus={onUpdateDocumentStatus} onReload={onReload} />;
  if (tab === "vehicles") return <VehiclesView vehicles={vehicles} onReload={onReload} />;
  if (tab === "drivers") return <DriversView drivers={drivers} onReload={onReload} schedules={schedule} vehicles={vehicles} routes={routes} documents={documents} />;
  if (tab === "schedule") return <ScheduleView schedule={schedule} onReload={onReload} />;
  if (tab === "daily_assignment") return <DailyAssignmentView routes={routes} drivers={drivers} vehicles={vehicles} schedule={schedule} onReload={onReload} />;
  if (tab === "diagnostics") return <TechDiagnosticsView onReload={onReload} />;
  if (tab === "dash_messages") return <MessagesView currentUserId={currentUserId || 0} />;
  return null;
}