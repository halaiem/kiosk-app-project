import { useState, useCallback } from "react";
import type { AdminTab, ServerInfo, AuditLog, DriverInfo, Notification } from "@/types/dashboard";
import { UsersView } from "./admin/UsersView";
import { SettingsView } from "./admin/SettingsView";
import { ServersView } from "./admin/ServersView";
import { LogsView } from "./admin/LogsView";
import { DiagnosticApisView } from "./admin/DiagnosticApisView";
import { AdminVehiclesView } from "./admin/AdminVehiclesView";
import { AdminNotificationsView } from "./admin/AdminNotificationsView";
import MessagesView from "./shared/MessagesView";
import TicketsPanel from "./shared/TicketsPanel";
import TicketArchiveView from "./admin/TicketArchiveView";
import TicketSettingsView from "./admin/settings/TicketSettingsView";
import VotingView from "./shared/VotingView";
import TasksView from "./shared/TasksView";
import TasksArchiveView from "./shared/TasksArchiveView";
import DepotParkView from "./shared/DepotParkView";

interface AdminPanelProps {
  tab: AdminTab;
  servers: ServerInfo[];
  logs: AuditLog[];
  drivers?: DriverInfo[];
  notifications?: Notification[];
  onMarkNotificationRead?: (id: string) => void;
  onReload?: () => void;
  currentUserId?: number;
}

export default function AdminPanel({ tab, servers, logs, drivers = [], notifications: notifProp, onMarkNotificationRead: onMarkReadProp, onReload, currentUserId }: AdminPanelProps) {
  const [localNotifs, setLocalNotifs] = useState<Notification[]>(notifProp || []);

  const handleMarkRead = useCallback((id: string) => {
    if (onMarkReadProp) onMarkReadProp(id);
    setLocalNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, [onMarkReadProp]);

  if (tab === "users") return <UsersView drivers={drivers} onReload={onReload} />;
  if (tab === "settings") return <SettingsView />;
  if (tab === "servers") return <ServersView servers={servers} />;
  if (tab === "logs") return <LogsView logs={logs} />;
  if (tab === "diagnostic_apis") return <DiagnosticApisView />;
  if (tab === "admin_vehicles") return <AdminVehiclesView />;
  if (tab === "notifications") return <AdminNotificationsView notifications={notifProp || localNotifs} onMarkNotificationRead={handleMarkRead} />;
  if (tab === "dash_messages") return <MessagesView currentUserId={currentUserId || 0} />;
  if (tab === "service_requests") return <TicketsPanel role="admin" />;
  if (tab === "ticket_archive") return <TicketArchiveView />;
  if (tab === "ticket_settings") return <TicketSettingsView />;
  if (tab === "tasks") return <TasksView currentUserId={currentUserId} />;
  if (tab === "tasks_archive") return <TasksArchiveView />;
  if (tab === "depot_park") return <DepotParkView role="admin" />;
  if (tab === "voting") return <VotingView currentUserId={currentUserId} />;
  return null;
}