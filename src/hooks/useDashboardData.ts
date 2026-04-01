import { useState, useEffect, useCallback, useMemo } from 'react';
import type {
  DispatchMessage, Notification, Alert, RouteInfo, VehicleInfo,
  DriverInfo, ScheduleEntry, DocumentInfo, ServerInfo, AuditLog, DashboardStats, DashboardUser,
  IssueReport,
} from '@/types/dashboard';
import type { MapVehicleInfo } from '@/components/dashboard/MapVehicleCard';
import {
  fetchStats, fetchDrivers, fetchRoutes, fetchVehicles,
  fetchSchedule, fetchDocuments, fetchMessages, fetchAlerts, fetchAuditLogs,
  sendDispatcherMsg, resolveAlert as apiResolveAlert, updateDocumentStatus as apiUpdateDocumentStatus,
} from '@/api/dashboardApi';
import { fetchIssueReports, resolveIssueReport as apiResolveIssue } from '@/api/diagnosticsApi';

const ROUTES = ['5','3','7','9','11','12','14','1','18','22'];
const STATUSES: MapVehicleInfo['status'][] = ['ok','ok','ok','ok','ok','ok','ok','warning','critical','ok'];

export function generateMapVehicles(): MapVehicleInfo[] {
  const out: MapVehicleInfo[] = [];
  for (let i = 0; i < 100; i++) {
    const num = 100 + i;
    const route = ROUTES[i % ROUTES.length];
    out.push({
      id: `V${String(i+1).padStart(3,'0')}`,
      number: String(num),
      route,
      x: 8 + Math.random() * 84,
      y: 8 + Math.random() * 84,
      status: STATUSES[i % STATUSES.length],
      label: `Борт ${num} • М${route}`,
    });
  }
  return out;
}

function hoursAgo(h: number) { return new Date(Date.now() - h * 3600000); }

const FALLBACK_SERVERS: ServerInfo[] = [
  { id: '1', name: 'Основной сервер', status: 'online', cpu: 42, memory: 68, disk: 55, uptime: '45д 12ч', lastCheck: new Date() },
  { id: '2', name: 'Сервер маршрутов', status: 'online', cpu: 28, memory: 45, disk: 38, uptime: '45д 12ч', lastCheck: new Date() },
  { id: '3', name: 'Сервер телеметрии', status: 'warning', cpu: 87, memory: 82, disk: 61, uptime: '12д 5ч', lastCheck: new Date() },
];

const FALLBACK_NOTIFICATIONS: Notification[] = [
  { id: '1', title: 'Система запущена', body: 'Данные загружаются с сервера', timestamp: new Date(), read: false, level: 'info', targetRole: 'all' },
];

function mapDriver(d: Record<string, unknown>): DriverInfo {
  const rawStatus = (d.shiftStatus || d.status || '') as string;
  const validStatuses = ['on_shift', 'off_shift', 'break', 'sick'];
  let status: DriverInfo['status'] = 'off_shift';
  if (d.isOnline) {
    status = validStatuses.includes(rawStatus) ? rawStatus as DriverInfo['status'] : 'on_shift';
  } else if (validStatuses.includes(rawStatus)) {
    status = rawStatus as DriverInfo['status'];
  }
  return {
    id: String(d.id),
    name: String(d.name || d.fullName || ''),
    tabNumber: String(d.tabNumber || d.employeeId || ''),
    status,
    vehicleNumber: String(d.vehicleNumber || ''),
    routeNumber: String(d.routeNumber || ''),
    shiftStart: d.shiftStart ? new Date(d.shiftStart as string) : undefined,
    phone: String(d.phone || ''),
    rating: Number(d.rating || 4.5),
  };
}

function mapRoute(r: Record<string, unknown>): RouteInfo {
  return {
    id: String(r.id),
    number: String(r.number || r.routeNumber || ''),
    name: String(r.name || ''),
    stopsCount: Number(r.stopsCount || 0),
    distance: Number(r.distance || r.distanceKm || 0),
    avgTime: Number(r.avgTime || r.avgTimeMin || 0),
    isActive: r.isActive !== false,
    assignedVehicles: Number(r.assignedVehicles || 0),
    routeStatus: (r.routeStatus as RouteInfo['routeStatus']) || 'active',
  };
}

function mapVehicle(v: Record<string, unknown>): VehicleInfo {
  return {
    id: String(v.id),
    number: String(v.number || v.label || ''),
    type: (v.type || v.transportType || 'bus') as VehicleInfo['type'],
    status: (v.status || 'active') as VehicleInfo['status'],
    routeNumber: String(v.routeNumber || ''),
    driverName: String(v.driverName || ''),
    lastMaintenance: v.lastMaintenance ? new Date(v.lastMaintenance as string) : hoursAgo(720),
    nextMaintenance: v.nextMaintenance ? new Date(v.nextMaintenance as string) : hoursAgo(-720),
    mileage: Number(v.mileage || 0),
  };
}

function mapSchedule(s: Record<string, unknown>): ScheduleEntry {
  return {
    id: String(s.id),
    routeNumber: String(s.routeNumber || ''),
    driverName: String(s.driverName || ''),
    vehicleNumber: String(s.vehicleNumber || ''),
    startTime: String(s.startTime || ''),
    endTime: String(s.endTime || ''),
    date: String(s.date || ''),
    status: (s.status || 'planned') as ScheduleEntry['status'],
  };
}

function mapDocument(d: Record<string, unknown>): DocumentInfo {
  return {
    id: String(d.id),
    title: String(d.title || ''),
    type: (d.type || d.docType || 'instruction') as DocumentInfo['type'],
    status: (d.status || 'draft') as DocumentInfo['status'],
    createdAt: d.createdAt ? new Date(d.createdAt as string) : new Date(),
    updatedAt: d.updatedAt ? new Date(d.updatedAt as string) : new Date(),
    author: String(d.author || d.authorName || ''),
    assignedTo: d.assignedTo ? String(d.assignedTo) : undefined,
  };
}

function mapMessage(m: Record<string, unknown>, drivers: DriverInfo[]): DispatchMessage {
  const driverId = String(m.driverId || m.driver_id || '');
  const driver = drivers.find(d => d.id === driverId);
  return {
    id: String(m.id),
    driverId,
    driverName: String(m.driverName || driver?.name || ''),
    vehicleNumber: String(m.vehicleNumber || driver?.vehicleNumber || ''),
    routeNumber: String(m.routeNumber || driver?.routeNumber || ''),
    text: String(m.text || ''),
    timestamp: m.timestamp ? new Date(m.timestamp as string) : (m.createdAt ? new Date(m.createdAt as string) : new Date()),
    direction: m.sender === 'driver' ? 'incoming' : 'outgoing',
    read: Boolean(m.read || m.is_read || m.isRead),
    type: (m.type || m.messageType || m.message_type || 'normal') as DispatchMessage['type'],
  };
}

function mapAlert(a: Record<string, unknown>, drivers: DriverInfo[]): Alert {
  const driverId = String(a.driverId || a.driver_id || '');
  const driver = drivers.find(d => d.id === driverId);
  return {
    id: String(a.id),
    driverId,
    driverName: String(a.driverName || driver?.name || ''),
    vehicleNumber: String(a.vehicleNumber || driver?.vehicleNumber || ''),
    routeNumber: String(a.routeNumber || driver?.routeNumber || ''),
    type: (a.type || 'sos') as Alert['type'],
    message: String(a.message || a.text || ''),
    level: (a.level || 'critical') as Alert['level'],
    timestamp: a.timestamp ? new Date(a.timestamp as string) : (a.createdAt ? new Date(a.createdAt as string) : new Date()),
    resolved: Boolean(a.resolved),
    resolvedBy: a.resolvedBy ? String(a.resolvedBy) : undefined,
    resolvedAt: a.resolvedAt ? new Date(a.resolvedAt as string) : undefined,
  };
}

function mapLog(l: Record<string, unknown>): AuditLog {
  return {
    id: String(l.id),
    userId: String(l.userId || l.user_id || ''),
    userName: String(l.userName || l.user_name || ''),
    action: String(l.action || ''),
    target: String(l.target || ''),
    timestamp: l.timestamp ? new Date(l.timestamp as string) : (l.createdAt ? new Date(l.createdAt as string) : new Date()),
    details: l.details ? String(l.details) : undefined,
  };
}

export function useDashboardData(user?: DashboardUser | null) {
  const [stats, setStats] = useState<DashboardStats>({
    activeDrivers: 0, totalVehicles: 0, activeRoutes: 0,
    unresolvedAlerts: 0, avgDelay: 0, onTimePercent: 95,
  });
  const [messages, setMessages] = useState<DispatchMessage[]>([]);
  const [notifications] = useState<Notification[]>(FALLBACK_NOTIFICATIONS);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [routes, setRoutes] = useState<RouteInfo[]>([]);
  const [vehicles, setVehicles] = useState<VehicleInfo[]>([]);
  const [drivers, setDrivers] = useState<DriverInfo[]>([]);
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const [documents, setDocuments] = useState<DocumentInfo[]>([]);
  const [servers] = useState<ServerInfo[]>(FALLBACK_SERVERS);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [issueReports, setIssueReports] = useState<IssueReport[]>([]);

  const loadAll = useCallback(async () => {
    if (!user) return;
    try {
      const [statsData, driversData, routesData, vehiclesData, schedData, docsData] = await Promise.allSettled([
        fetchStats(),
        fetchDrivers(),
        fetchRoutes(),
        fetchVehicles(),
        fetchSchedule(),
        fetchDocuments(),
      ]);

      if (statsData.status === 'fulfilled') {
        const s = statsData.value.stats || statsData.value;
        setStats({
          activeDrivers: Number(s.activeDrivers || 0),
          totalVehicles: Number(s.totalVehicles || 0),
          activeRoutes: Number(s.activeRoutes || 0),
          unresolvedAlerts: Number(s.unresolvedAlerts || 0),
          avgDelay: Number(s.avgDelay || 0),
          onTimePercent: Number(s.onTimePercent || 95),
        });
      }

      let mappedDrivers: DriverInfo[] = [];
      if (driversData.status === 'fulfilled') {
        const arr = Array.isArray(driversData.value) ? driversData.value : (driversData.value as Record<string, unknown>).drivers || [];
        mappedDrivers = (arr as Record<string, unknown>[]).map(mapDriver);
        setDrivers(mappedDrivers);
      }

      if (routesData.status === 'fulfilled') {
        const arr = Array.isArray(routesData.value) ? routesData.value : (routesData.value as Record<string, unknown>).routes || [];
        setRoutes((arr as Record<string, unknown>[]).map(mapRoute));
      }
      if (vehiclesData.status === 'fulfilled') {
        const arr = Array.isArray(vehiclesData.value) ? vehiclesData.value : (vehiclesData.value as Record<string, unknown>).vehicles || [];
        setVehicles((arr as Record<string, unknown>[]).map(mapVehicle));
      }
      if (schedData.status === 'fulfilled') {
        const arr = Array.isArray(schedData.value) ? schedData.value : (schedData.value as Record<string, unknown>).schedule || [];
        setSchedule((arr as Record<string, unknown>[]).map(mapSchedule));
      }
      if (docsData.status === 'fulfilled') {
        const arr = Array.isArray(docsData.value) ? docsData.value : (docsData.value as Record<string, unknown>).documents || [];
        setDocuments((arr as Record<string, unknown>[]).map(mapDocument));
      }

      const [msgsData, alertsData] = await Promise.allSettled([
        fetchMessages(),
        fetchAlerts(),
      ]);

      if (msgsData.status === 'fulfilled') {
        const arr = Array.isArray(msgsData.value) ? msgsData.value : (msgsData.value as Record<string, unknown>).messages || [];
        setMessages((arr as Record<string, unknown>[]).map(m => mapMessage(m, mappedDrivers)));
      }
      if (alertsData.status === 'fulfilled') {
        const arr = Array.isArray(alertsData.value) ? alertsData.value : (alertsData.value as Record<string, unknown>).alerts || [];
        setAlerts((arr as Record<string, unknown>[]).map(a => mapAlert(a, mappedDrivers)));
      }

      if (user.role === 'admin') {
        try {
          const logsData = await fetchAuditLogs();
          const arr = Array.isArray(logsData) ? logsData : (logsData as Record<string, unknown>).logs || [];
          setLogs((arr as Record<string, unknown>[]).map(mapLog));
        } catch { /* ignore */ }
      }

      // Load issue reports for dispatcher/technician
      if (user.role === 'dispatcher' || user.role === 'technician') {
        try {
          const issuesData = await fetchIssueReports();
          const arr = Array.isArray(issuesData) ? issuesData : [];
          setIssueReports(arr as IssueReport[]);
        } catch { /* ignore */ }
      }
    } catch (e) {
      console.error('Dashboard data load error:', e);
    }
  }, [user]);

  useEffect(() => {
    loadAll();
    if (!user) return;
    const interval = setInterval(loadAll, 15000);
    return () => clearInterval(interval);
  }, [loadAll, user]);

  const sendMessage = useCallback(async (driverId: string, text: string) => {
    try {
      await sendDispatcherMsg(driverId, text);
      const driver = drivers.find(d => d.id === driverId);
      const newMsg: DispatchMessage = {
        id: Date.now().toString(),
        driverId,
        driverName: driver?.name || '',
        vehicleNumber: driver?.vehicleNumber || '',
        routeNumber: driver?.routeNumber || '',
        text,
        timestamp: new Date(),
        direction: 'outgoing',
        read: true,
        type: 'normal',
      };
      setMessages(prev => [...prev, newMsg]);
    } catch (e) {
      console.error('Send message error:', e);
    }
  }, [drivers]);

  const markMessageRead = useCallback((id: string) => {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, read: true } : m));
  }, []);

  const resolveAlert = useCallback(async (id: string, resolverName: string) => {
    try {
      await apiResolveAlert(Number(id));
      setAlerts(prev => prev.map(a => a.id === id ? { ...a, resolved: true, resolvedBy: resolverName, resolvedAt: new Date() } : a));
    } catch (e) {
      console.error('Resolve alert error:', e);
    }
  }, []);

  const markNotificationRead = useCallback((id: string) => {
    /* local only */
  }, []);

  const updateDocumentStatus = useCallback(async (id: string, status: DocumentInfo['status']) => {
    try {
      await apiUpdateDocumentStatus(Number(id), status);
      setDocuments(prev => prev.map(d => d.id === id ? { ...d, status, updatedAt: new Date() } : d));
    } catch (e) {
      console.error('Update document error:', e);
    }
  }, []);

  const resolveIssue = useCallback(async (id: string, notes?: string) => {
    try {
      await apiResolveIssue(id, notes);
      setIssueReports(prev => prev.map(r => r.id === id ? { ...r, reportStatus: 'resolved' as const, resolvedAt: new Date().toISOString(), resolutionNotes: notes || null } : r));
    } catch (e) {
      console.error('Resolve issue error:', e);
    }
  }, []);

  const mapVehicles = useMemo(() => {
    return drivers.filter(d => d.status === 'on_shift' || d.status === 'break').map((d, i) => ({
      id: d.id,
      number: d.vehicleNumber || `Б-${d.id}`,
      lat: 56.835 + (Math.sin(i * 0.7) * 0.015),
      lng: 60.600 + (Math.cos(i * 0.5) * 0.025),
      progress: Math.round(Math.random() * 100),
      interval: 4 + Math.floor(Math.random() * 6),
    }));
  }, [drivers]);

  return {
    stats,
    messages,
    notifications,
    alerts,
    routes,
    vehicles,
    drivers,
    schedule,
    documents,
    servers,
    logs,
    issueReports,
    mapVehicles,
    sendMessage,
    markMessageRead,
    resolveAlert,
    markNotificationRead,
    updateDocumentStatus,
    resolveIssue,
    reload: loadAll,
  };
}