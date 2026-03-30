import { createClient } from '@supabase/supabase-js'

// ─────────────────────────────────────────────────
// НАСТРОЙКА: замени значения на свои из Supabase
// Project Settings → API → URL и anon public key
// ─────────────────────────────────────────────────
const SUPABASE_URL = 'https://ВАШ-ПРОЕКТ.supabase.co'
const SUPABASE_ANON_KEY = 'ВАШ-ANON-KEY'

// ─────────────────────────────────────────────────
// ТИПЫ БАЗЫ ДАННЫХ
// ─────────────────────────────────────────────────

export type UserRole = 'dispatcher' | 'technician' | 'admin'
export type VehicleStatus = 'active' | 'maintenance' | 'idle' | 'offline'
export type DriverStatus = 'on_shift' | 'off_shift' | 'break' | 'sick'
export type RouteStatus = 'active' | 'route_change' | 'temp_route' | 'route_extension' | 'suspended' | 'planned'
export type DocumentStatus = 'draft' | 'review' | 'approved' | 'expired'
export type AlertLevel = 'info' | 'warning' | 'critical'
export type AlertType = 'sos' | 'breakdown' | 'delay' | 'deviation' | 'speeding'
export type MessageType = 'normal' | 'urgent' | 'system'
export type MessageDirection = 'incoming' | 'outgoing'
export type VehicleType = 'tram' | 'trolleybus' | 'bus'

// Пользователи дашборда (диспетчеры, техники, администраторы)
export interface DashboardUser {
  id: string
  name: string
  role: UserRole
  password_hash: string
  avatar_url?: string
  last_login?: string
  is_active: boolean
  created_at: string
}

// Водители (для планшетного киоска)
export interface Driver {
  id: string
  name: string
  tab_number: string
  pin: string
  status: DriverStatus
  vehicle_number: string
  route_number: string
  phone: string
  rating: number
  shift_start?: string
  shift_end?: string
  created_at: string
}

// Транспортные средства
export interface Vehicle {
  id: string
  number: string
  type: VehicleType
  status: VehicleStatus
  route_number: string
  driver_name: string
  last_maintenance: string
  next_maintenance: string
  mileage: number
  lat?: number
  lng?: number
  speed?: number
  created_at: string
}

// Маршруты
export interface Route {
  id: string
  number: string
  name: string
  stops_count: number
  distance: number
  avg_time: number
  is_active: boolean
  assigned_vehicles: number
  route_status: RouteStatus
  created_at: string
}

// Сообщения между диспетчером и водителями
export interface DispatchMessage {
  id: string
  driver_id: string
  driver_name: string
  vehicle_number: string
  route_number: string
  text: string
  direction: MessageDirection
  type: MessageType
  is_read: boolean
  confirmed: boolean
  confirmed_at?: string
  created_at: string
}

// Уведомления
export interface Notification {
  id: string
  title: string
  body: string
  is_read: boolean
  level: AlertLevel
  target_role: UserRole | 'all'
  created_at: string
}

// Алерты / инциденты
export interface Alert {
  id: string
  driver_id: string
  driver_name: string
  vehicle_number: string
  route_number: string
  type: AlertType
  message: string
  level: AlertLevel
  resolved: boolean
  resolved_by?: string
  resolved_at?: string
  created_at: string
}

// Документы
export interface DocumentInfo {
  id: string
  title: string
  type: 'route_sheet' | 'maintenance_report' | 'schedule' | 'instruction' | 'license'
  status: DocumentStatus
  author: string
  assigned_to?: string
  file_url?: string
  created_at: string
  updated_at: string
}

// Расписание
export interface ScheduleEntry {
  id: string
  route_number: string
  driver_name: string
  vehicle_number: string
  start_time: string
  end_time: string
  date: string
  status: 'planned' | 'active' | 'completed' | 'cancelled'
  created_at: string
}

// Сессии водителей (для планшета)
export interface DriverSession {
  id: string
  driver_id: string
  token: string
  expires_at: string
  created_at: string
}

// Лог аудита
export interface AuditLog {
  id: string
  user_id: string
  user_name: string
  action: string
  target: string
  details?: string
  created_at: string
}

// Настройки приложения
export interface AppSettingsRow {
  id: number
  carrier_name: string
  carrier_logo?: string
  carrier_description?: string
  city: string
  transport_type: VehicleType
  settings_json: Record<string, unknown>
  updated_at: string
}

// ─────────────────────────────────────────────────
// СХЕМА БАЗЫ ДАННЫХ (для TypeScript автодополнения)
// ─────────────────────────────────────────────────

export interface Database {
  public: {
    Tables: {
      dashboard_users: {
        Row: DashboardUser
        Insert: Omit<DashboardUser, 'created_at'>
        Update: Partial<Omit<DashboardUser, 'id' | 'created_at'>>
      }
      drivers: {
        Row: Driver
        Insert: Omit<Driver, 'created_at'>
        Update: Partial<Omit<Driver, 'id' | 'created_at'>>
      }
      vehicles: {
        Row: Vehicle
        Insert: Omit<Vehicle, 'created_at'>
        Update: Partial<Omit<Vehicle, 'id' | 'created_at'>>
      }
      routes: {
        Row: Route
        Insert: Omit<Route, 'created_at'>
        Update: Partial<Omit<Route, 'id' | 'created_at'>>
      }
      dispatch_messages: {
        Row: DispatchMessage
        Insert: Omit<DispatchMessage, 'created_at'>
        Update: Partial<Omit<DispatchMessage, 'id' | 'created_at'>>
      }
      notifications: {
        Row: Notification
        Insert: Omit<Notification, 'created_at'>
        Update: Partial<Omit<Notification, 'id' | 'created_at'>>
      }
      alerts: {
        Row: Alert
        Insert: Omit<Alert, 'created_at'>
        Update: Partial<Omit<Alert, 'id' | 'created_at'>>
      }
      documents: {
        Row: DocumentInfo
        Insert: Omit<DocumentInfo, 'created_at' | 'updated_at'>
        Update: Partial<Omit<DocumentInfo, 'id' | 'created_at'>>
      }
      schedule: {
        Row: ScheduleEntry
        Insert: Omit<ScheduleEntry, 'created_at'>
        Update: Partial<Omit<ScheduleEntry, 'id' | 'created_at'>>
      }
      driver_sessions: {
        Row: DriverSession
        Insert: Omit<DriverSession, 'created_at'>
        Update: Partial<Omit<DriverSession, 'id' | 'created_at'>>
      }
      audit_logs: {
        Row: AuditLog
        Insert: Omit<AuditLog, 'id' | 'created_at'>
        Update: never
      }
      app_settings: {
        Row: AppSettingsRow
        Insert: Omit<AppSettingsRow, 'id' | 'updated_at'>
        Update: Partial<Omit<AppSettingsRow, 'id'>>
      }
    }
  }
}

// ─────────────────────────────────────────────────
// КЛИЕНТ SUPABASE
// ─────────────────────────────────────────────────

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY)

// ─────────────────────────────────────────────────
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ─────────────────────────────────────────────────

// Водители
export const driversApi = {
  getAll: () => supabase.from('drivers').select('*').order('name'),
  getById: (id: string) => supabase.from('drivers').select('*').eq('id', id).single(),
  getByTabNumber: (tabNumber: string) =>
    supabase.from('drivers').select('*').eq('tab_number', tabNumber).single(),
  updateStatus: (id: string, status: DriverStatus) =>
    supabase.from('drivers').update({ status }).eq('id', id),
}

// Транспорт
export const vehiclesApi = {
  getAll: () => supabase.from('vehicles').select('*').order('number'),
  getActive: () =>
    supabase.from('vehicles').select('*').eq('status', 'active').order('number'),
  updateStatus: (id: string, status: VehicleStatus) =>
    supabase.from('vehicles').update({ status }).eq('id', id),
  updateLocation: (id: string, lat: number, lng: number, speed: number) =>
    supabase.from('vehicles').update({ lat, lng, speed }).eq('id', id),
}

// Маршруты
export const routesApi = {
  getAll: () => supabase.from('routes').select('*').order('number'),
  getActive: () =>
    supabase.from('routes').select('*').eq('is_active', true).order('number'),
}

// Сообщения
export const messagesApi = {
  getByDriver: (driverId: string) =>
    supabase.from('dispatch_messages').select('*').eq('driver_id', driverId).order('created_at'),
  getAll: () =>
    supabase.from('dispatch_messages').select('*').order('created_at', { ascending: false }),
  send: (msg: Database['public']['Tables']['dispatch_messages']['Insert']) =>
    supabase.from('dispatch_messages').insert(msg),
  markRead: (id: string) =>
    supabase.from('dispatch_messages').update({ is_read: true }).eq('id', id),
  confirm: (id: string) =>
    supabase.from('dispatch_messages').update({ confirmed: true, confirmed_at: new Date().toISOString() }).eq('id', id),
  // Real-time подписка на новые сообщения
  subscribe: (driverId: string, callback: (msg: DispatchMessage) => void) =>
    supabase
      .channel(`messages:driver:${driverId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'dispatch_messages',
        filter: `driver_id=eq.${driverId}`,
      }, (payload) => callback(payload.new as DispatchMessage))
      .subscribe(),
}

// Уведомления
export const notificationsApi = {
  getAll: () =>
    supabase.from('notifications').select('*').order('created_at', { ascending: false }),
  getUnread: (role: UserRole) =>
    supabase.from('notifications').select('*').eq('is_read', false)
      .in('target_role', [role, 'all']).order('created_at', { ascending: false }),
  markRead: (id: string) =>
    supabase.from('notifications').update({ is_read: true }).eq('id', id),
}

// Алерты
export const alertsApi = {
  getUnresolved: () =>
    supabase.from('alerts').select('*').eq('resolved', false).order('created_at', { ascending: false }),
  resolve: (id: string, resolvedBy: string) =>
    supabase.from('alerts').update({ resolved: true, resolved_by: resolvedBy, resolved_at: new Date().toISOString() }).eq('id', id),
  create: (alert: Database['public']['Tables']['alerts']['Insert']) =>
    supabase.from('alerts').insert(alert),
  // Real-time подписка на новые алерты
  subscribe: (callback: (alert: Alert) => void) =>
    supabase
      .channel('alerts:new')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'alerts',
      }, (payload) => callback(payload.new as Alert))
      .subscribe(),
}

// Пользователи дашборда
export const dashboardUsersApi = {
  getAll: () =>
    supabase.from('dashboard_users').select('id, name, role, avatar_url, last_login, is_active, created_at').order('name'),
  getById: (id: string) =>
    supabase.from('dashboard_users').select('*').eq('id', id).single(),
  login: (id: string) =>
    supabase.from('dashboard_users').update({ last_login: new Date().toISOString() }).eq('id', id),
  create: (user: Database['public']['Tables']['dashboard_users']['Insert']) =>
    supabase.from('dashboard_users').insert(user),
  update: (id: string, data: Database['public']['Tables']['dashboard_users']['Update']) =>
    supabase.from('dashboard_users').update(data).eq('id', id),
  delete: (id: string) =>
    supabase.from('dashboard_users').delete().eq('id', id),
}

// Сессии водителей (планшет)
export const sessionsApi = {
  create: (session: Database['public']['Tables']['driver_sessions']['Insert']) =>
    supabase.from('driver_sessions').insert(session),
  getByToken: (token: string) =>
    supabase.from('driver_sessions').select('*, drivers(*)').eq('token', token).single(),
  delete: (token: string) =>
    supabase.from('driver_sessions').delete().eq('token', token),
}

// Документы
export const documentsApi = {
  getAll: () =>
    supabase.from('documents').select('*').order('created_at', { ascending: false }),
  getByAssignee: (name: string) =>
    supabase.from('documents').select('*').eq('assigned_to', name).order('created_at', { ascending: false }),
  updateStatus: (id: string, status: DocumentStatus) =>
    supabase.from('documents').update({ status, updated_at: new Date().toISOString() }).eq('id', id),
}

// Расписание
export const scheduleApi = {
  getByDate: (date: string) =>
    supabase.from('schedule').select('*').eq('date', date).order('start_time'),
  getActive: () =>
    supabase.from('schedule').select('*').eq('status', 'active').order('start_time'),
}

// Настройки приложения
export const settingsApi = {
  get: () =>
    supabase.from('app_settings').select('*').eq('id', 1).single(),
  update: (data: Database['public']['Tables']['app_settings']['Update']) =>
    supabase.from('app_settings').update(data).eq('id', 1),
}

// Лог аудита
export const auditApi = {
  getAll: (limit = 100) =>
    supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(limit),
  log: (userId: string, userName: string, action: string, target: string, details?: string) =>
    supabase.from('audit_logs').insert({ user_id: userId, user_name: userName, action, target, details }),
}
