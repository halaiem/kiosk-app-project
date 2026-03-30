import Icon from '@/components/ui/icon';

export default function DocsDashboard() {
  const tzBlocks = [
    {
      title: '1. Dashboard Overview',
      content: `Единая панель управления транспортной системой ТрамДиспетч.
URL: /dashboard
3 роли, 1 точка входа, авторизация по ID + пароль.

Роли:
• Диспетчер (D001/disp123) — мониторинг, связь с водителями, тревоги
• Техник (T001/tech123) — маршруты, документы, транспорт, расписание, водители
• Администратор (A001/admin123) — пользователи, настройки, серверы, логи

Каждая роль видит только свой набор вкладок в сайдбаре.`,
    },
    {
      title: '2. Architecture',
      content: `src/
├── pages/Dashboard.tsx              — главная страница, оркестратор
├── types/dashboard.ts               — все TypeScript типы
├── hooks/
│   ├── useDashboardAuth.ts          — авторизация, DEMO_USERS
│   └── useDashboardData.ts          — все данные и мутации
├── components/dashboard/
│   ├── DashboardLogin.tsx            — экран входа (ID + пароль)
│   ├── DashboardSidebar.tsx          — сайдбар навигации
│   └── panels/
│       ├── DispatcherPanel.tsx       — 4 вкладки диспетчера
│       ├── TechnicianPanel.tsx       — 5 вкладок техника
│       └── AdminPanel.tsx           — 4 вкладки админа`,
    },
    {
      title: '3. Dispatcher Tabs',
      content: `• overview — Статистика (водители, маршруты, тревоги, % по графику) + недавние алерты + сообщения
• messages — Чат-мессенджер с водителями, список бесед слева, чат справа, отправка сообщений
• notifications — Лента уведомлений (info/warning/critical), фильтры, отметка прочитанных
• alerts — Тревоги водителей (SOS, поломка, задержка, отклонение, превышение), решение тревог`,
    },
    {
      title: '4. Technician Tabs',
      content: `• routes — Карточки маршрутов (номер, остановки, дистанция, время, ТС), суммарная статистика
• documents — Документы (маршрутные листы, акты ТО, расписания, инструкции, лицензии), смена статуса
• vehicles — Транспорт (трамвай/троллейбус/автобус), статус, пробег, ТО, предупреждения
• drivers — Таблица водителей (табель, ФИО, статус, ТС, рейтинг), поиск, сортировка
• schedule — Расписание смен на дату, статусы (план/актив/завершён/отменён)`,
    },
    {
      title: '5. Administrator Tabs',
      content: `• users — Управление пользователями: добавление, роль, блокировка, смена пароля
• settings — Система, безопасность, уведомления, интерфейс (визуальные настройки)
• servers — Мониторинг серверов (API, DB, Redis, WebSocket, Telemetry, Backup), CPU/RAM/Disk
• logs — Аудит-лог действий всех пользователей, фильтрация, иконки по типу действий`,
    },
    {
      title: '6. Data Types (dashboard.ts)',
      content: `UserRole: 'dispatcher' | 'technician' | 'admin'
DashboardUser: { id, name, role, avatar?, lastLogin?, isActive }
DispatchMessage: { id, driverId, driverName, vehicleNumber, routeNumber, text, timestamp, direction, read, type }
Notification: { id, title, body, timestamp, read, level, targetRole }
Alert: { id, driverId, driverName, vehicleNumber, routeNumber, type, message, level, timestamp, resolved }
RouteInfo: { id, number, name, stopsCount, distance, avgTime, isActive, assignedVehicles }
VehicleInfo: { id, number, type, status, routeNumber, driverName, mileage, maintenance dates }
DriverInfo: { id, name, tabNumber, status, vehicleNumber, routeNumber, shiftStart/End, phone, rating }
ScheduleEntry: { id, routeNumber, driverName, vehicleNumber, startTime, endTime, date, status }
DocumentInfo: { id, title, type, status, createdAt, updatedAt, author, assignedTo }
ServerInfo: { id, name, status, cpu, memory, disk, uptime, lastCheck }
AuditLog: { id, userId, userName, action, target, timestamp, details }`,
    },
  ];

  const prompts = [
    {
      title: '7a. Добавить новую вкладку в Dashboard',
      badge: 'Cursor / Claude',
      code: `Ты опытный React-разработчик. Добавь новую вкладку в Dashboard ТрамДиспетч.

Стек: React 18, TypeScript, Tailwind CSS, shadcn/ui.
Иконки: только через <Icon name="..." size={N} />.

Шаги:
1. Добавь новый тип вкладки в src/types/dashboard.ts (в нужную роль)
2. Добавь навигацию в DashboardSidebar.tsx (в массив DISPATCHER_NAV / TECHNICIAN_NAV / ADMIN_NAV)
3. Создай UI-компонент вкладки внутри соответствующего panels/*.tsx
4. Подключи данные в useDashboardData.ts если нужны

Стили: bg-card для карточек, border-border для рамок, text-foreground для текста.
Таблицы: rounded-2xl overflow-hidden, заголовок bg-muted.
Бейджи: rounded-full px-2 py-0.5 text-[11px] font-medium.`,
    },
    {
      title: '7b. Backend авторизация для Dashboard',
      badge: 'Python',
      code: `Создай backend-функцию авторизации для Dashboard ТрамДиспетч.

Требования:
- POST /dashboard-auth, body: { id: string, password: string }
- Проверка в таблице dashboard_users (id, password_hash, role, name, is_active)
- Возврат JWT-токена в ответе (PyJWT)
- Хеширование паролей через hashlib/bcrypt
- Роли: dispatcher, technician, admin
- Блокировка после 5 неудачных попыток

Миграция БД:
CREATE TABLE dashboard_users (
  id VARCHAR(10) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('dispatcher','technician','admin')),
  password_hash VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  failed_attempts INT DEFAULT 0,
  locked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);`,
    },
    {
      title: '7c. Подключить реальные данные к Dashboard',
      badge: 'Full Stack',
      code: `Замени демо-данные в useDashboardData.ts на реальные API-вызовы.

Порядок:
1. Создай backend-функции:
   - GET /dashboard/messages — сообщения диспетчера
   - GET /dashboard/alerts — тревоги
   - GET /dashboard/vehicles — транспорт
   - GET /dashboard/drivers — водители
   - GET /dashboard/schedule — расписание
   - GET /dashboard/stats — статистика

2. Добавь URL из func2url.json в хук
3. Замени useState на useQuery (react-query уже установлен)
4. Добавь loading/error состояния в панели
5. Мутации: useMutation для sendMessage, resolveAlert и т.д.

Каждый endpoint: CORS, JSON, X-Authorization для аутентификации.`,
    },
  ];

  return (
    <div className="space-y-8">
      <div className="space-y-6 text-sm text-foreground">
        {tzBlocks.map((s) => (
          <div key={s.title} className="border border-border rounded-2xl overflow-hidden">
            <div className="px-4 py-3 bg-muted border-b border-border">
              <span className="font-semibold text-foreground">{s.title}</span>
            </div>
            <div className="px-4 py-4 whitespace-pre-wrap font-mono text-xs leading-relaxed text-foreground/80 bg-background">
              {s.content}
            </div>
          </div>
        ))}
      </div>

      <div>
        <div className="flex items-center gap-2 mb-4">
          <Icon name="Bot" size={16} className="text-primary" />
          <span className="text-sm font-semibold text-foreground">AI-промпты для Dashboard</span>
        </div>
        <div className="space-y-6">
          {prompts.map((p) => (
            <div key={p.title} className="border border-border rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-muted border-b border-border">
                <span className="font-semibold text-foreground text-sm">{p.title}</span>
                <span className="text-[11px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">{p.badge}</span>
              </div>
              <pre className="p-4 text-xs text-foreground/80 whitespace-pre-wrap font-mono leading-relaxed bg-background overflow-x-auto">{p.code}</pre>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
