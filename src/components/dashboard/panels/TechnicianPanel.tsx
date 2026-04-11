import { useState, useCallback } from "react";
import { RoutesView } from "./technician/TechRoutes";
import { DocumentsView } from "./technician/TechDocuments";
import { VehiclesView, DriversView } from "./technician/TechVehiclesDrivers";
import { ScheduleView } from "./technician/TechSchedule";
import { TechDiagnosticsView } from "./technician/TechDiagnosticsView";
import { DailyAssignmentView } from "./technician/TechDailyAssignment";
import TicketsPanel from "./shared/TicketsPanel";
import { NotificationsView } from "./technician/TechNotificationsView";
import MessagesView from "./shared/MessagesView";
import VotingView from "./shared/VotingView";
import { AdminVehiclesView } from "./admin/AdminVehiclesView";
import type {
  TechnicianTab,
  RouteInfo,
  DocumentInfo,
  VehicleInfo,
  DriverInfo,
  ScheduleEntry,
  Notification,
} from "@/types/dashboard";

interface TechnicianPanelProps {
  tab: TechnicianTab;
  routes: RouteInfo[];
  documents: DocumentInfo[];
  vehicles: VehicleInfo[];
  drivers: DriverInfo[];
  schedule: ScheduleEntry[];
  notifications?: Notification[];
  onUpdateDocumentStatus: (id: string, status: DocumentInfo["status"]) => void;
  onMarkNotificationRead?: (id: string) => void;
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
  notifications: notifProp,
  onUpdateDocumentStatus,
  onMarkNotificationRead: onMarkReadProp,
  onReload,
  currentUserId,
}: TechnicianPanelProps) {
  const [localNotifs, setLocalNotifs] = useState<Notification[]>(notifProp || []);

  const handleMarkRead = useCallback((id: string) => {
    if (onMarkReadProp) onMarkReadProp(id);
    setLocalNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, [onMarkReadProp]);

  if (tab === "service_requests") return <TicketsPanel role="technician" vehicles={vehicles} onReload={onReload} />;
  if (tab === "routes") return <RoutesView routes={routes} onReload={onReload} />;
  if (tab === "documents") return <DocumentsView documents={documents} onUpdateDocumentStatus={onUpdateDocumentStatus} onReload={onReload} />;
  if (tab === "vehicles") return <VehiclesView vehicles={vehicles} onReload={onReload} />;
  if (tab === "drivers") return <DriversView drivers={drivers} onReload={onReload} schedules={schedule} vehicles={vehicles} routes={routes} documents={documents} />;
  if (tab === "schedule") return <ScheduleView schedule={schedule} onReload={onReload} />;
  if (tab === "daily_assignment") return <DailyAssignmentView routes={routes} drivers={drivers} vehicles={vehicles} schedule={schedule} onReload={onReload} />;
  if (tab === "diagnostics") return <TechDiagnosticsView onReload={onReload} />;
  if (tab === "notifications") return <NotificationsView notifications={notifProp || localNotifs} onMarkNotificationRead={handleMarkRead} />;
  if (tab === "dash_messages") return <MessagesView currentUserId={currentUserId || 0} />;
  if (tab === "admin_vehicles") return <AdminVehiclesView />;
  if (tab === "voting") return <VotingView currentUserId={currentUserId || 0} />;
  return null;
}