import { useState } from 'react';
import Icon from '@/components/ui/icon';

type Section = 'prompts' | 'tz' | 'ui' | 'dashboard' | 'agent-order';

const SECTIONS: { id: Section; label: string; icon: string }[] = [
  { id: 'prompts', label: 'AI Промпты (Киоск)', icon: 'Bot' },
  { id: 'tz', label: 'ТЗ (Киоск)', icon: 'FileText' },
  { id: 'ui', label: 'UI Layout', icon: 'Layout' },
  { id: 'dashboard', label: 'Dashboard ТЗ + Промпты', icon: 'LayoutDashboard' },
  { id: 'agent-order', label: 'Порядок запуска агентов', icon: 'Workflow' },
];

function PromptsSection() {
  return (
    <div className="space-y-6">
      <p className="text-muted-foreground text-sm">Готовые промпты для AI-агентов при разработке и доработке киоскового приложения водителя трамвая.</p>

      {[
        {
          title: '1. Генерация нового экрана',
          badge: 'Cursor / Claude',
          code: `Ты опытный React-разработчик. Создай новый экран для киоскового приложения водителя трамвая.

Стек: React 18, TypeScript, Tailwind CSS, shadcn/ui, lucide-react.
Иконки: только через компонент <Icon name="..." size={N} />.
Цвета: используй CSS-переменные (--kiosk-bg, --kiosk-surface, --primary и т.д.).
Тема: поддерживай light/dark через классы .dark на html.

Экран должен:
- Быть адаптирован под горизонтальный планшет 10"
- Поддерживать touch-жесты (большие кнопки, min 44px)
- Использовать компоненты из src/components/kiosk/
- Экспортировать default function`,
        },
        {
          title: '2. Доработка компонента',
          badge: 'Claude Code',
          code: `Изучи компонент src/components/kiosk/MainPage.tsx.
Не меняй логику — только UI.

Задача: [опиши задачу]

Правила:
- Не добавляй комментарии
- Не меняй пропсы интерфейса Props
- Сохраняй существующие CSS-классы kiosk-*
- Header всегда с фоном #152d52 (style, не класс)
- Счётчик непрочитанных: z-index 10, красный bg-red-500`,
        },
        {
          title: '3. Backend-функция (Python)',
          badge: 'Python / Cloud Functions',
          code: `Создай backend-функцию на Python 3.11 для киоскового приложения.

Структура: /backend/function-name/index.py
Точка входа: def handler(event: dict, context) -> dict

Требования:
- Всегда обрабатывай OPTIONS для CORS
- Добавляй 'Access-Control-Allow-Origin': '*' во все ответы
- БД: os.environ['DATABASE_URL'] + psycopg2 (Simple Query Protocol)
- Авторизация: читай из X-Authorization (не Authorization)
- Возвращай JSON: {'statusCode': 200, 'headers': {...}, 'body': json.dumps(...)}
- Без try/except если не критично
- Docstring на русском в handler`,
        },
        {
          title: '4. Миграция БД',
          badge: 'PostgreSQL',
          code: `Напиши SQL-миграцию для PostgreSQL.

Правила:
- Только forward-миграция (без rollback)
- Naming: V{N}__{description}.sql
- Simple Query Protocol — без $1 плейсхолдеров в DDL
- UUID как primary key: id UUID PRIMARY KEY DEFAULT gen_random_uuid()
- Всегда добавляй created_at TIMESTAMPTZ DEFAULT NOW()
- Индексы для полей поиска

Таблица: [опиши структуру]`,
        },
        {
          title: '5. Отладка и рефакторинг',
          badge: 'Debug',
          code: `Изучи frontend-логи и найди причину ошибки.

Контекст приложения:
- React SPA, киоск водителя трамвая
- Хук useKioskState управляет всем состоянием
- Тема: light/dark/auto, применяется через document.documentElement.classList
- WebSocket не используется — данные симулируются в хуке
- Backend: Python Cloud Functions, URL в func2url.json

Ошибка: [вставь лог или описание]

Найди причину и предложи минимальное исправление.`,
        },
      ].map(p => (
        <div key={p.title} className="border border-border rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-muted border-b border-border">
            <span className="font-semibold text-foreground text-sm">{p.title}</span>
            <span className="text-[11px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">{p.badge}</span>
          </div>
          <pre className="p-4 text-xs text-foreground/80 whitespace-pre-wrap font-mono leading-relaxed bg-background overflow-x-auto">{p.code}</pre>
        </div>
      ))}
    </div>
  );
}

function TZSection() {
  return (
    <div className="space-y-6 text-sm text-foreground">
      {[
        {
          title: '1. Назначение системы',
          content: `Киоск водителя трамвая — это одностраничное веб-приложение (SPA), работающее на Android-планшете 10" в горизонтальной ориентации, закреплённом в кабине. Приложение обеспечивает:

• Отображение текущего маршрута, остановок и положения на карте
• Двустороннюю текстовую связь с диспетчером (мессенджер)
• Уведомления об изменениях расписания и экстренных ситуациях
• Управление сменой (начало, перерыв, завершение)
• Настройку интерфейса (тема дня/ночи/авто по расписанию)`,
        },
        {
          title: '2. Стек технологий',
          content: `Frontend:
• React 18 + TypeScript + Vite
• Tailwind CSS + shadcn/ui компоненты
• lucide-react для иконок (через обёртку <Icon />)
• Роутинг: React Router v6

Backend:
• Python 3.11, Cloud Functions
• psycopg2 для PostgreSQL (Simple Query Protocol)
• boto3 для S3-хранилища

База данных:
• PostgreSQL, миграции через Flyway (db_migrations/)

Хостинг:
• poehali.dev — SPA + Cloud Functions + S3 + CDN`,
        },
        {
          title: '3. Архитектура Frontend',
          content: `src/
├── pages/
│   ├── Index.tsx          — главная страница, оркестратор состояния
│   └── Docs.tsx           — документация проекта
├── components/kiosk/
│   ├── LoginPage.tsx      — экран авторизации водителя
│   ├── WelcomeScreen.tsx  — экран приветствия перед сменой
│   ├── MainPage.tsx       — основной рабочий экран
│   ├── SidebarMenu.tsx    — боковое меню (профиль, настройки и т.д.)
│   ├── Messenger.tsx      — чат с диспетчером
│   ├── MapWidget.tsx      — карта маршрута
│   ├── RouteStops.tsx     — список остановок
│   ├── NotificationOverlay.tsx — всплывающие уведомления
│   ├── BreakModal.tsx     — модал перерыва
│   └── KioskUnlockModal.tsx — разблокировка киоска
├── hooks/
│   └── useKioskState.ts   — центральный хук состояния
└── types/
    └── kiosk.ts           — TypeScript типы`,
        },
        {
          title: '4. Управление состоянием',
          content: `Весь стейт хранится в useKioskState (src/hooks/useKioskState.ts):

• screen: 'login' | 'welcome' | 'main' — текущий экран
• driver: Driver | null — данные авторизованного водителя
• messages: Message[] — история чата с диспетчером
• connection: 'online' | 'offline' — статус связи
• theme: 'light' | 'dark' | 'auto' — режим темы
• darkFrom / darkTo: number — часы переключения в авто-режиме
• speed, isMoving, currentStopIndex — телематика

Хук применяет тему через document.documentElement.classList.toggle('dark').
В режиме 'auto' проверяет текущий час каждую минуту.`,
        },
        {
          title: '5. Темы оформления',
          content: `Три режима: light / dark / auto (по расписанию).

Light (белый фон):
• --background: white, --foreground: #141414
• --kiosk-bg: #f5f5f5, --kiosk-surface: white

Dark (тёмно-синий):
• --background: hsl(215 28% 8%)
• --kiosk-bg: hsl(215 25% 10%)

Header — всегда тёмно-синий (#152d52), независимо от темы.
Применяется через inline style, не CSS-переменную.`,
        },
        {
          title: '6. Требования к UI',
          content: `• Минимальный размер интерактивных элементов: 44×44px
• Горизонтальная ориентация, 10" планшет (1280×800 и выше)
• Ripple-эффект на всех кнопках (класс ripple)
• Анимации: открытие меню 350ms cubic-bezier, смена секций 250ms
• Плавный переход тем: background-color 0.4s ease (только kiosk-surface)
• Без scroll на основном экране (всё видно без прокрутки)
• Шрифт: Golos Text / Rubik`,
        },
        {
          title: '7. Backend API',
          content: `Функции доступны через URL из func2url.json.
Все функции возвращают JSON, обрабатывают OPTIONS.

Планируемые endpoints:
• POST /auth — авторизация водителя по табельному номеру
• GET  /messages — получение новых сообщений от диспетчера
• POST /messages — отправка сообщения водителем
• POST /shift/start — начало смены
• POST /shift/end — завершение смены
• GET  /route — данные маршрута и остановок`,
        },
      ].map(s => (
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
  );
}

function UISection() {
  return (
    <div className="space-y-6 text-sm">

      {/* Main screen layout */}
      <div className="border border-border rounded-2xl overflow-hidden">
        <div className="px-4 py-3 bg-muted border-b border-border">
          <span className="font-semibold text-foreground">Основной экран (MainPage)</span>
        </div>
        <div className="p-4 bg-background font-mono text-xs text-foreground/80 leading-relaxed">
          <pre>{`┌─────────────────────────────────────────────────────────────────┐
│ HEADER (#152d52)                                                │
│ [≡] [№5 | Депо Сев → Депо Юж] [Борт 412]    [●Онлайн][☀][HH:MM][☕][⏻] │
├─────────────────────────────────────────────────────────────────┤
│ STATUS BAR (card bg)                                            │
│ [⏱ 4 мин интервал] [🕐 -2 мин от графика] [● GPS]    [ТрансПарк] │
├──────────────────────────────┬──────────────────────────────────┤
│                              │                                  │
│   MAP WIDGET                 │   ROUTE STOPS    │  MESSENGER   │
│   (MapWidget.tsx)            │   (RouteStops)   │  (Messenger) │
│                              │                  │              │
│   flex-1                     │   stops list     │   messages   │
│   rounded-2xl                │   + progress     │   + input    │
│                              │                  │              │
└──────────────────────────────┴──────────────────┴──────────────┘
  landscape: flex-row (карта слева, правая панель справа)
  portrait:  flex-col (карта сверху)`}</pre>
        </div>
      </div>

      {/* Sidebar layout */}
      <div className="border border-border rounded-2xl overflow-hidden">
        <div className="px-4 py-3 bg-muted border-b border-border">
          <span className="font-semibold text-foreground">Боковое меню (SidebarMenu)</span>
        </div>
        <div className="p-4 bg-background font-mono text-xs text-foreground/80 leading-relaxed">
          <pre>{`┌──────────────────────────┐
│ HEADER (sidebar-bg)       │
│ [Трам] ТрамДиспетч    [X] │
│ [👤] Иван Петров          │
│     Маршрут №5 · 412      │
├──────────────────────────┤
│ NAV (анимация slide)      │
│  [👤] Профиль          >  │
│  [🔔] Уведомления [3]  >  │
│  [⚙] Настройки         >  │
│  [📦] Архив            >  │
│  [🎧] Поддержка        >  │
├──────────────────────────┤
│ FOOTER                    │
│ [⏻ Завершить смену]       │
└──────────────────────────┘

Открытие: translateX(0), 350ms cubic-bezier
Закрытие: translateX(-100%), 350ms
Секция:   slide-in from right, 250ms
Оверлей:  opacity 0→1, 350ms`}</pre>
        </div>
      </div>

      {/* Color tokens */}
      <div className="border border-border rounded-2xl overflow-hidden">
        <div className="px-4 py-3 bg-muted border-b border-border">
          <span className="font-semibold text-foreground">Цветовые токены</span>
        </div>
        <div className="p-4 bg-background">
          <div className="grid grid-cols-2 gap-3">
            {[
              { name: '--kiosk-bg', light: '#f5f5f5', dark: 'hsl(215 25% 10%)', desc: 'Фон страницы' },
              { name: '--kiosk-surface', light: '#ffffff', dark: 'hsl(215 28% 13%)', desc: 'Поверхность карточек' },
              { name: '--kiosk-surface-variant', light: '#eeeeee', dark: 'hsl(215 25% 16%)', desc: 'Вторичная поверхность' },
              { name: 'Header (inline)', light: '#152d52', dark: '#152d52', desc: 'Всегда одинаковый' },
              { name: '--primary', light: 'hsl(213 94% 38%)', dark: 'hsl(213 94% 65%)', desc: 'Акцент, кнопки' },
              { name: '--destructive', light: 'hsl(0 72% 51%)', dark: 'hsl(0 72% 55%)', desc: 'Ошибки, удаление' },
              { name: '--success', light: 'hsl(142 71% 45%)', dark: 'hsl(142 71% 45%)', desc: 'Онлайн, ОК' },
              { name: '--sidebar-background', light: 'hsl(215 25% 12%)', dark: 'hsl(215 28% 6%)', desc: 'Меню (всегда тёмное)' },
            ].map(t => (
              <div key={t.name} className="flex items-start gap-3 p-3 rounded-xl bg-muted border border-border">
                <div className="flex gap-1 flex-shrink-0 mt-0.5">
                  <div className="w-5 h-5 rounded border border-border/50" style={{ background: t.light }} title="light" />
                  <div className="w-5 h-5 rounded border border-border/50" style={{ background: t.dark }} title="dark" />
                </div>
                <div>
                  <div className="font-mono text-[10px] text-primary font-semibold">{t.name}</div>
                  <div className="text-[11px] text-muted-foreground">{t.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Component sizes */}
      <div className="border border-border rounded-2xl overflow-hidden">
        <div className="px-4 py-3 bg-muted border-b border-border">
          <span className="font-semibold text-foreground">Размеры компонентов</span>
        </div>
        <div className="p-4 bg-background">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="text-muted-foreground border-b border-border">
                <th className="text-left pb-2">Элемент</th>
                <th className="text-left pb-2">Размер</th>
                <th className="text-left pb-2">Классы</th>
              </tr>
            </thead>
            <tbody className="text-foreground/80 divide-y divide-border">
              {[
                ['Кнопка меню', '40×40px', 'w-10 h-10'],
                ['Иконка-кнопка', '40×40px', 'w-10 h-10 rounded-xl'],
                ['Кнопка в сайдбаре', 'full × 48px', 'w-full py-3.5 px-4'],
                ['Поле ввода чата', 'full × 44px', 'min-h-[44px]'],
                ['Header', 'full × auto', 'px-[15px] py-[15px]'],
                ['Status bar', 'full × 36px', 'px-2 py-1.5'],
                ['Сайдбар', '320px × full', 'w-80 max-w-[85vw]'],
                ['Бейдж уведомлений', '20×20px', 'min-w-[20px] h-[20px]'],
              ].map(([el, size, cls]) => (
                <tr key={el}>
                  <td className="py-2 pr-4 text-foreground">{el}</td>
                  <td className="py-2 pr-4 text-primary">{size}</td>
                  <td className="py-2 text-muted-foreground">{cls}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function DashboardSection() {
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

function AgentOrderSection() {
  const stages = [
    {
      num: 1,
      title: 'Фундамент',
      agent: 'Architect',
      items: [
        'Создание типов: src/types/kiosk.ts, src/types/dashboard.ts',
        'Настройка Tailwind: tailwind.config.ts, src/index.css (CSS переменные, темы)',
        'Настройка роутинга: src/App.tsx (React Router)',
      ],
      deps: null,
      result: 'Пустой проект с полной типизацией и стилями',
    },
    {
      num: 2,
      title: 'Киоск водителя',
      agent: 'Kiosk Builder',
      items: [
        'Хук состояния: src/hooks/useKioskState.ts',
        'Компоненты: LoginPage \u2192 WelcomeScreen \u2192 MainPage \u2192 Sidebar \u2192 Messenger \u2192 Map \u2192 RouteStops',
        'Оркестратор: src/pages/Index.tsx',
      ],
      deps: 'Этап 1',
      result: 'Полностью рабочее приложение водителя',
    },
    {
      num: 3,
      title: 'Dashboard — Авторизация',
      agent: 'Auth Builder',
      items: [
        'Хук: src/hooks/useDashboardAuth.ts (пользователи, логин, роли)',
        'Компонент: DashboardLogin.tsx',
      ],
      deps: 'Этап 1',
      result: 'Экран входа с демо-пользователями',
    },
    {
      num: 4,
      title: 'Dashboard — Layout',
      agent: 'Layout Builder',
      items: [
        'Навигация: DashboardSidebar.tsx (3 набора вкладок по ролям)',
        'Данные: src/hooks/useDashboardData.ts (все сущности и мутации)',
        'Страница: src/pages/Dashboard.tsx (оркестратор)',
      ],
      deps: 'Этап 3',
      result: 'Каркас дашборда с навигацией',
    },
    {
      num: 5,
      title: 'Dispatcher Panel',
      agent: 'Dispatcher Builder',
      items: [
        'DispatcherPanel.tsx: Overview, Messages (чат), Notifications, Alerts',
        'Данные: messages, notifications, alerts из useDashboardData',
      ],
      deps: 'Этап 4',
      result: 'Полный интерфейс диспетчера',
    },
    {
      num: 6,
      title: 'Technician Panel',
      agent: 'Technician Builder',
      items: [
        'TechnicianPanel.tsx: Routes, Documents, Vehicles, Drivers, Schedule',
        'Данные: routes, vehicles, drivers, documents, schedule из useDashboardData',
      ],
      deps: 'Этап 4',
      result: 'Полный интерфейс техника',
    },
    {
      num: 7,
      title: 'Admin Panel',
      agent: 'Admin Builder',
      items: [
        'AdminPanel.tsx: Users, Settings, Servers, Logs',
        'Данные: servers, logs из useDashboardData + DEMO_USERS',
      ],
      deps: 'Этап 4',
      result: 'Полный интерфейс администратора',
    },
    {
      num: 8,
      title: 'Backend API',
      agent: 'Backend Builder',
      items: [
        'Миграции БД: таблицы users, messages, alerts, vehicles, drivers, routes, schedule',
        'Cloud Functions: auth, messages, alerts, vehicles, drivers, schedule, stats',
        'Интеграция: замена демо-данных на API-вызовы',
      ],
      deps: 'Этапы 5-7',
      result: 'Полностью работающая система',
    },
    {
      num: 9,
      title: 'Документация',
      agent: 'Docs Builder',
      items: [
        'src/pages/Docs.tsx: ТЗ, промпты, UI layout, порядок запуска',
      ],
      deps: 'Все этапы',
      result: 'Полная документация проекта',
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3 mb-2">
        <Icon name="Workflow" size={20} className="text-primary" />
        <h2 className="text-lg font-bold text-foreground">Порядок запуска AI-агентов</h2>
      </div>

      <div className="relative">
        <div className="absolute left-[23px] top-0 bottom-0 w-px bg-border" />

        <div className="space-y-4">
          {stages.map((stage) => (
            <div key={stage.num} className="relative flex gap-4">
              <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0 z-10">
                {stage.num}
              </div>
              <div className="flex-1 border border-border rounded-2xl overflow-hidden">
                <div className="px-4 py-3 bg-muted border-b border-border flex items-center justify-between">
                  <span className="font-semibold text-foreground text-sm">
                    Этап {stage.num}: {stage.title}
                  </span>
                  <span className="text-[11px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                    Agent: {stage.agent}
                  </span>
                </div>
                <div className="px-4 py-3 bg-background text-xs space-y-2">
                  <div className="space-y-1">
                    {stage.items.map((item, i) => (
                      <div key={i} className="flex items-start gap-2 text-foreground/80 font-mono">
                        <Icon name="ArrowRight" size={12} className="text-primary mt-0.5 shrink-0" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-4 pt-1 border-t border-border mt-2">
                    {stage.deps && (
                      <span className="text-muted-foreground">
                        <span className="font-medium">Зависимости:</span> {stage.deps}
                      </span>
                    )}
                    <span className="text-green-500 ml-auto">
                      <span className="font-medium">Результат:</span> {stage.result}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="border border-border rounded-2xl overflow-hidden bg-primary/5">
        <div className="px-4 py-3 bg-primary/10 border-b border-border flex items-center gap-2">
          <Icon name="GitBranch" size={15} className="text-primary" />
          <span className="font-semibold text-foreground text-sm">Параллельные ветки</span>
        </div>
        <div className="px-4 py-4 text-xs font-mono text-foreground/80 space-y-2 leading-relaxed">
          <div className="flex items-start gap-2">
            <Icon name="ArrowRight" size={12} className="text-primary mt-0.5 shrink-0" />
            <span>Этапы 5, 6, 7 могут выполняться параллельно (все зависят только от Этапа 4)</span>
          </div>
          <div className="flex items-start gap-2">
            <Icon name="ArrowRight" size={12} className="text-primary mt-0.5 shrink-0" />
            <span>Этап 2 (Киоск) и Этап 3 (Dashboard Auth) могут выполняться параллельно</span>
          </div>
          <div className="flex items-start gap-2">
            <Icon name="ArrowRight" size={12} className="text-primary mt-0.5 shrink-0" />
            <span>Этап 8 (Backend) запускается только после всех панелей</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Docs() {
  const [active, setActive] = useState<Section>('prompts');

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-4">
          <div className="flex items-center gap-3 flex-1">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Icon name="BookOpen" size={18} className="text-primary" />
            </div>
            <div>
              <div className="font-bold text-foreground">Документация</div>
              <div className="text-[11px] text-muted-foreground">ТрамДиспетч · Кабина водителя</div>
            </div>
          </div>
          <a href="/" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <Icon name="ArrowLeft" size={15} />
            К приложению
          </a>
        </div>
        <div className="max-w-5xl mx-auto px-6 flex gap-1 pb-0">
          {SECTIONS.map(s => (
            <button
              key={s.id}
              onClick={() => setActive(s.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all ${
                active === s.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon name={s.icon} size={15} />
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        {active === 'prompts' && <PromptsSection />}
        {active === 'tz' && <TZSection />}
        {active === 'ui' && <UISection />}
        {active === 'dashboard' && <DashboardSection />}
        {active === 'agent-order' && <AgentOrderSection />}
      </div>
    </div>
  );
}