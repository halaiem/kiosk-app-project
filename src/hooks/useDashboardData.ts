import { useState, useMemo } from 'react';
import type {
  DispatchMessage, Notification, Alert, RouteInfo, VehicleInfo,
  DriverInfo, ScheduleEntry, DocumentInfo, ServerInfo, AuditLog, DashboardStats,
} from '@/types/dashboard';

function randomId() {
  return Math.random().toString(36).slice(2, 10);
}

function hoursAgo(h: number) {
  return new Date(Date.now() - h * 3600000);
}
function daysAgo(d: number) {
  return new Date(Date.now() - d * 86400000);
}

const INIT_MESSAGES: DispatchMessage[] = [
  { id: '1', driverId: 'V001', driverName: 'Иванов А.П.', vehicleNumber: '412', routeNumber: '5', text: 'Задержка на остановке Вокзальная, пробка', timestamp: hoursAgo(0.1), direction: 'incoming', read: false, type: 'urgent' },
  { id: '2', driverId: 'V002', driverName: 'Сидоров К.М.', vehicleNumber: '318', routeNumber: '3', text: 'Вышел на маршрут, всё штатно', timestamp: hoursAgo(0.5), direction: 'incoming', read: true, type: 'normal' },
  { id: '3', driverId: 'V003', driverName: 'Петрова Н.В.', vehicleNumber: '205', routeNumber: '7', text: 'Прошу подмену на перерыв', timestamp: hoursAgo(1), direction: 'incoming', read: false, type: 'normal' },
  { id: '4', driverId: 'V001', driverName: 'Иванов А.П.', vehicleNumber: '412', routeNumber: '5', text: 'Принято, ожидайте 10 минут', timestamp: hoursAgo(0.08), direction: 'outgoing', read: true, type: 'normal' },
  { id: '5', driverId: 'V004', driverName: 'Козлов Р.Д.', vehicleNumber: '511', routeNumber: '11', text: 'Пассажиру стало плохо, вызвал скорую', timestamp: hoursAgo(0.3), direction: 'incoming', read: false, type: 'urgent' },
];

const INIT_NOTIFICATIONS: Notification[] = [
  { id: '1', title: 'Изменение расписания', body: 'Маршрут №5: интервал увеличен до 8 мин с 14:00', timestamp: hoursAgo(0.5), read: false, level: 'info', targetRole: 'all' },
  { id: '2', title: 'Плановое ТО', body: 'Борт 318 направлен на плановое техобслуживание 30.03', timestamp: hoursAgo(2), read: false, level: 'warning', targetRole: 'technician' },
  { id: '3', title: 'Обновление системы', body: 'Серверное обновление запланировано на 01:00-03:00', timestamp: hoursAgo(5), read: true, level: 'info', targetRole: 'admin' },
  { id: '4', title: 'Превышение скорости', body: 'Борт 511 — 67 км/ч при лимите 50 км/ч на ул. Ленина', timestamp: hoursAgo(0.2), read: false, level: 'critical', targetRole: 'dispatcher' },
];

const INIT_ALERTS: Alert[] = [
  { id: '1', driverId: 'V004', driverName: 'Козлов Р.Д.', vehicleNumber: '511', routeNumber: '11', type: 'sos', message: 'Экстренный вызов: пассажиру требуется помощь', level: 'critical', timestamp: hoursAgo(0.3), resolved: false },
  { id: '2', driverId: 'V001', driverName: 'Иванов А.П.', vehicleNumber: '412', routeNumber: '5', type: 'delay', message: 'Опоздание более 5 мин от графика', level: 'warning', timestamp: hoursAgo(0.1), resolved: false },
  { id: '3', driverId: 'V005', driverName: 'Белов Д.А.', vehicleNumber: '603', routeNumber: '9', type: 'breakdown', message: 'Неисправность токоприёмника, ожидает техпомощь', level: 'critical', timestamp: hoursAgo(1.5), resolved: false },
  { id: '4', driverId: 'V002', driverName: 'Сидоров К.М.', vehicleNumber: '318', routeNumber: '3', type: 'deviation', message: 'Отклонение от маршрута на 200м (объезд ремонта)', level: 'info', timestamp: hoursAgo(3), resolved: true, resolvedBy: 'Смирнова Е.', resolvedAt: hoursAgo(2.5) },
];

const INIT_ROUTES: RouteInfo[] = [
  { id: '1', number: '5', name: 'Депо Северное → Депо Южное', stopsCount: 24, distance: 18.5, avgTime: 52, isActive: true, assignedVehicles: 6 },
  { id: '2', number: '3', name: 'ЖД Вокзал → Микрорайон Восток', stopsCount: 18, distance: 12.3, avgTime: 38, isActive: true, assignedVehicles: 4 },
  { id: '3', number: '7', name: 'Центр → Промзона', stopsCount: 15, distance: 9.8, avgTime: 28, isActive: true, assignedVehicles: 3 },
  { id: '4', number: '9', name: 'Площадь Мира → Аэропорт', stopsCount: 30, distance: 22.1, avgTime: 65, isActive: true, assignedVehicles: 5 },
  { id: '5', number: '11', name: 'Депо Западное → Университет', stopsCount: 20, distance: 14.7, avgTime: 42, isActive: true, assignedVehicles: 4 },
  { id: '6', number: '2', name: 'Старый город → Новый район', stopsCount: 12, distance: 7.2, avgTime: 22, isActive: false, assignedVehicles: 0 },
];

const INIT_VEHICLES: VehicleInfo[] = [
  { id: '1', number: '412', type: 'tram', status: 'active', routeNumber: '5', driverName: 'Иванов А.П.', lastMaintenance: daysAgo(15), nextMaintenance: daysAgo(-15), mileage: 142350 },
  { id: '2', number: '318', type: 'tram', status: 'active', routeNumber: '3', driverName: 'Сидоров К.М.', lastMaintenance: daysAgo(8), nextMaintenance: daysAgo(-22), mileage: 98200 },
  { id: '3', number: '205', type: 'trolleybus', status: 'active', routeNumber: '7', driverName: 'Петрова Н.В.', lastMaintenance: daysAgo(20), nextMaintenance: daysAgo(-10), mileage: 76400 },
  { id: '4', number: '511', type: 'tram', status: 'active', routeNumber: '11', driverName: 'Козлов Р.Д.', lastMaintenance: daysAgo(5), nextMaintenance: daysAgo(-25), mileage: 112800 },
  { id: '5', number: '603', type: 'trolleybus', status: 'maintenance', routeNumber: '9', driverName: '—', lastMaintenance: daysAgo(0), nextMaintenance: daysAgo(-30), mileage: 88100 },
  { id: '6', number: '415', type: 'tram', status: 'idle', routeNumber: '—', driverName: '—', lastMaintenance: daysAgo(3), nextMaintenance: daysAgo(-27), mileage: 155600 },
  { id: '7', number: '720', type: 'bus', status: 'active', routeNumber: '9', driverName: 'Белов Д.А.', lastMaintenance: daysAgo(12), nextMaintenance: daysAgo(-18), mileage: 203400 },
  { id: '8', number: '321', type: 'tram', status: 'offline', routeNumber: '—', driverName: '—', lastMaintenance: daysAgo(45), nextMaintenance: daysAgo(15), mileage: 198700 },
];

const INIT_DRIVERS: DriverInfo[] = [
  { id: 'V001', name: 'Иванов Алексей Петрович', tabNumber: '1042', status: 'on_shift', vehicleNumber: '412', routeNumber: '5', shiftStart: hoursAgo(4), phone: '+7 (900) 111-22-33', rating: 4.8 },
  { id: 'V002', name: 'Сидоров Кирилл Михайлович', tabNumber: '1087', status: 'on_shift', vehicleNumber: '318', routeNumber: '3', shiftStart: hoursAgo(3), phone: '+7 (900) 222-33-44', rating: 4.5 },
  { id: 'V003', name: 'Петрова Наталья Владимировна', tabNumber: '1123', status: 'break', vehicleNumber: '205', routeNumber: '7', shiftStart: hoursAgo(5), phone: '+7 (900) 333-44-55', rating: 4.9 },
  { id: 'V004', name: 'Козлов Роман Дмитриевич', tabNumber: '1156', status: 'on_shift', vehicleNumber: '511', routeNumber: '11', shiftStart: hoursAgo(2), phone: '+7 (900) 444-55-66', rating: 4.2 },
  { id: 'V005', name: 'Белов Дмитрий Андреевич', tabNumber: '1201', status: 'on_shift', vehicleNumber: '720', routeNumber: '9', shiftStart: hoursAgo(6), phone: '+7 (900) 555-66-77', rating: 4.6 },
  { id: 'V006', name: 'Новиков Сергей Игоревич', tabNumber: '1089', status: 'off_shift', vehicleNumber: '—', routeNumber: '—', phone: '+7 (900) 666-77-88', rating: 4.7 },
  { id: 'V007', name: 'Фёдорова Ольга Сергеевна', tabNumber: '1245', status: 'sick', vehicleNumber: '—', routeNumber: '—', phone: '+7 (900) 777-88-99', rating: 4.4 },
];

const INIT_SCHEDULE: ScheduleEntry[] = [
  { id: '1', routeNumber: '5', driverName: 'Иванов А.П.', vehicleNumber: '412', startTime: '06:00', endTime: '14:00', date: '2026-03-29', status: 'active' },
  { id: '2', routeNumber: '3', driverName: 'Сидоров К.М.', vehicleNumber: '318', startTime: '07:00', endTime: '15:00', date: '2026-03-29', status: 'active' },
  { id: '3', routeNumber: '7', driverName: 'Петрова Н.В.', vehicleNumber: '205', startTime: '05:30', endTime: '13:30', date: '2026-03-29', status: 'active' },
  { id: '4', routeNumber: '11', driverName: 'Козлов Р.Д.', vehicleNumber: '511', startTime: '08:00', endTime: '16:00', date: '2026-03-29', status: 'active' },
  { id: '5', routeNumber: '9', driverName: 'Белов Д.А.', vehicleNumber: '720', startTime: '04:00', endTime: '12:00', date: '2026-03-29', status: 'active' },
  { id: '6', routeNumber: '5', driverName: 'Новиков С.И.', vehicleNumber: '415', startTime: '14:00', endTime: '22:00', date: '2026-03-29', status: 'planned' },
  { id: '7', routeNumber: '3', driverName: 'Фёдорова О.С.', vehicleNumber: '318', startTime: '15:00', endTime: '23:00', date: '2026-03-29', status: 'cancelled' },
  { id: '8', routeNumber: '5', driverName: 'Иванов А.П.', vehicleNumber: '412', startTime: '06:00', endTime: '14:00', date: '2026-03-30', status: 'planned' },
];

const INIT_DOCUMENTS: DocumentInfo[] = [
  { id: '1', title: 'Маршрутный лист №5 — 29.03.2026', type: 'route_sheet', status: 'approved', createdAt: daysAgo(1), updatedAt: hoursAgo(4), author: 'Васильев О.', assignedTo: 'Иванов А.П.' },
  { id: '2', title: 'Акт ТО борт 603', type: 'maintenance_report', status: 'review', createdAt: hoursAgo(3), updatedAt: hoursAgo(1), author: 'Морозова А.', assignedTo: 'Депо Северное' },
  { id: '3', title: 'Расписание маршрутов на апрель', type: 'schedule', status: 'draft', createdAt: hoursAgo(6), updatedAt: hoursAgo(2), author: 'Васильев О.' },
  { id: '4', title: 'Инструкция: Действия при аварии', type: 'instruction', status: 'approved', createdAt: daysAgo(30), updatedAt: daysAgo(5), author: 'Петров М.' },
  { id: '5', title: 'Лицензия: Козлов Р.Д. категория Tm', type: 'license', status: 'approved', createdAt: daysAgo(365), updatedAt: daysAgo(365), author: 'ГИБДД', assignedTo: 'Козлов Р.Д.' },
  { id: '6', title: 'Лицензия: Белов Д.А. категория D', type: 'license', status: 'expired', createdAt: daysAgo(400), updatedAt: daysAgo(400), author: 'ГИБДД', assignedTo: 'Белов Д.А.' },
];

const INIT_SERVERS: ServerInfo[] = [
  { id: '1', name: 'API Gateway', status: 'online', cpu: 23, memory: 45, disk: 32, uptime: '45д 12ч', lastCheck: hoursAgo(0.01) },
  { id: '2', name: 'PostgreSQL Primary', status: 'online', cpu: 41, memory: 68, disk: 55, uptime: '45д 12ч', lastCheck: hoursAgo(0.01) },
  { id: '3', name: 'Redis Cache', status: 'online', cpu: 8, memory: 34, disk: 12, uptime: '30д 5ч', lastCheck: hoursAgo(0.01) },
  { id: '4', name: 'Kiosk WebSocket', status: 'warning', cpu: 72, memory: 81, disk: 28, uptime: '12д 8ч', lastCheck: hoursAgo(0.05) },
  { id: '5', name: 'Telemetry Collector', status: 'online', cpu: 55, memory: 60, disk: 44, uptime: '45д 12ч', lastCheck: hoursAgo(0.01) },
  { id: '6', name: 'Backup Storage', status: 'offline', cpu: 0, memory: 0, disk: 88, uptime: '—', lastCheck: hoursAgo(2) },
];

const INIT_LOGS: AuditLog[] = [
  { id: '1', userId: 'A001', userName: 'Петров М.', action: 'Вход в систему', target: 'Dashboard', timestamp: hoursAgo(0.1) },
  { id: '2', userId: 'D001', userName: 'Смирнова Е.', action: 'Отправка сообщения', target: 'Водитель Иванов А.П.', timestamp: hoursAgo(0.5) },
  { id: '3', userId: 'T001', userName: 'Васильев О.', action: 'Создание документа', target: 'Маршрутный лист №5', timestamp: hoursAgo(1) },
  { id: '4', userId: 'A001', userName: 'Петров М.', action: 'Изменение пароля', target: 'Пользователь D002', timestamp: hoursAgo(3) },
  { id: '5', userId: 'D002', userName: 'Козлов А.', action: 'Подтверждение алерта', target: 'Алерт #4 (отклонение)', timestamp: hoursAgo(4) },
  { id: '6', userId: 'T002', userName: 'Морозова А.', action: 'Обновление маршрута', target: 'Маршрут №9', timestamp: hoursAgo(6) },
  { id: '7', userId: 'A001', userName: 'Петров М.', action: 'Перезапуск сервера', target: 'Backup Storage', timestamp: hoursAgo(8) },
  { id: '8', userId: 'D001', userName: 'Смирнова Е.', action: 'Создание алерта', target: 'Борт 603 — поломка', timestamp: hoursAgo(10) },
];

export function useDashboardData() {
  const [messages, setMessages] = useState<DispatchMessage[]>(INIT_MESSAGES);
  const [notifications, setNotifications] = useState<Notification[]>(INIT_NOTIFICATIONS);
  const [alerts, setAlerts] = useState<Alert[]>(INIT_ALERTS);
  const [routes] = useState<RouteInfo[]>(INIT_ROUTES);
  const [vehicles] = useState<VehicleInfo[]>(INIT_VEHICLES);
  const [drivers] = useState<DriverInfo[]>(INIT_DRIVERS);
  const [schedule] = useState<ScheduleEntry[]>(INIT_SCHEDULE);
  const [documents, setDocuments] = useState<DocumentInfo[]>(INIT_DOCUMENTS);
  const [servers] = useState<ServerInfo[]>(INIT_SERVERS);
  const [logs] = useState<AuditLog[]>(INIT_LOGS);

  const stats: DashboardStats = useMemo(() => ({
    activeDrivers: drivers.filter((d) => d.status === 'on_shift').length,
    totalVehicles: vehicles.length,
    activeRoutes: routes.filter((r) => r.isActive).length,
    unresolvedAlerts: alerts.filter((a) => !a.resolved).length,
    avgDelay: 3.2,
    onTimePercent: 87,
  }), [drivers, vehicles, routes, alerts]);

  const sendMessage = (driverId: string, text: string) => {
    const driver = drivers.find((d) => d.id === driverId);
    if (!driver) return;
    setMessages((prev) => [...prev, {
      id: randomId(),
      driverId,
      driverName: driver.name.split(' ').map((w, i) => i === 0 ? w : w[0] + '.').join(' '),
      vehicleNumber: driver.vehicleNumber,
      routeNumber: driver.routeNumber,
      text,
      timestamp: new Date(),
      direction: 'outgoing',
      read: true,
      type: 'normal',
    }]);
  };

  const markMessageRead = (id: string) => {
    setMessages((prev) => prev.map((m) => m.id === id ? { ...m, read: true } : m));
  };

  const resolveAlert = (id: string, resolverName: string) => {
    setAlerts((prev) => prev.map((a) => a.id === id ? { ...a, resolved: true, resolvedBy: resolverName, resolvedAt: new Date() } : a));
  };

  const markNotificationRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
  };

  const updateDocumentStatus = (id: string, status: DocumentInfo['status']) => {
    setDocuments((prev) => prev.map((d) => d.id === id ? { ...d, status, updatedAt: new Date() } : d));
  };

  return {
    messages, notifications, alerts, routes, vehicles, drivers, schedule, documents, servers, logs, stats,
    sendMessage, markMessageRead, resolveAlert, markNotificationRead, updateDocumentStatus,
  };
}
