import Icon from '@/components/ui/icon';

export default function DocsAgentOrder() {
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
        'Компоненты: LoginPage → WelcomeScreen → MainPage → Sidebar → Messenger → Map → RouteStops',
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
