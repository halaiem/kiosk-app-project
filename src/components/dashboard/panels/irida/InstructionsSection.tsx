import { useState } from 'react';
import Icon from '@/components/ui/icon';

const DOCS = [
  {
    id: 'gettingstarted', category: 'Начало работы', icon: 'Rocket', color: 'text-blue-500', bg: 'bg-blue-500/10',
    articles: [
      { title: 'Обзор системы ИРИДА', desc: 'Архитектура, роли, компоненты платформы', readTime: '5 мин', updated: '08.04.2026' },
      { title: 'Первичная настройка', desc: 'Установка города, перевозчика, транспорта', readTime: '10 мин', updated: '08.04.2026' },
      { title: 'Управление ролями', desc: 'Как создавать и настраивать пользователей', readTime: '7 мин', updated: '07.04.2026' },
      { title: 'Секретный код Irida-Tools', desc: 'Двухфакторная защита главного администратора', readTime: '3 мин', updated: '06.04.2026' },
    ],
  },
  {
    id: 'dispatcher', category: 'Диспетчер', icon: 'Radio', color: 'text-emerald-500', bg: 'bg-emerald-500/10',
    articles: [
      { title: 'Мониторинг транспорта на карте', desc: 'Слои карты, фильтры, телеметрия в реальном времени', readTime: '8 мин', updated: '07.04.2026' },
      { title: 'Работа с сообщениями', desc: 'Чат с водителями, срочные сообщения', readTime: '5 мин', updated: '06.04.2026' },
      { title: 'Уведомления и тревоги', desc: 'SOS, поломки, отклонения от маршрута', readTime: '6 мин', updated: '06.04.2026' },
    ],
  },
  {
    id: 'technician', category: 'Техник', icon: 'Wrench', color: 'text-amber-500', bg: 'bg-amber-500/10',
    articles: [
      { title: 'Управление водителями', desc: 'Создание, редактирование, статусы водителей', readTime: '10 мин', updated: '07.04.2026' },
      { title: 'Наряд на день', desc: 'Составление, печать, подтверждение нарядов', readTime: '8 мин', updated: '06.04.2026' },
      { title: 'Диагностика транспорта', desc: 'OBD-коды, DTC, критичность неисправностей', readTime: '12 мин', updated: '05.04.2026' },
      { title: 'Расписание маршрутов', desc: 'Создание и редактирование расписаний', readTime: '7 мин', updated: '04.04.2026' },
    ],
  },
  {
    id: 'irida', category: 'Irida-Tools', icon: 'KeyRound', color: 'text-purple-500', bg: 'bg-purple-500/10',
    articles: [
      { title: 'Терминал — файловый менеджер', desc: 'Просмотр, редактирование и скачивание файлов', readTime: '10 мин', updated: '08.04.2026' },
      { title: 'База данных — SQL консоль', desc: 'Просмотр таблиц, редактирование, SQL-запросы', readTime: '12 мин', updated: '08.04.2026' },
      { title: 'UI-дизайн — брендирование', desc: 'Темы, цвета, шрифты, логотип перевозчика', readTime: '8 мин', updated: '07.04.2026' },
      { title: 'Live-наблюдение за файлами', desc: 'Автообновление терминала при изменениях в БД', readTime: '5 мин', updated: '08.04.2026' },
    ],
  },
  {
    id: 'tablet', category: 'Планшет водителя', icon: 'Tablet', color: 'text-red-500', bg: 'bg-red-500/10',
    articles: [
      { title: 'Вход и авторизация', desc: 'PIN-код, сессии, выход из системы', readTime: '4 мин', updated: '06.04.2026' },
      { title: 'Навигация на маршруте', desc: 'Карта, остановки, отклонения', readTime: '6 мин', updated: '05.04.2026' },
      { title: 'SOS и экстренные вызовы', desc: 'Как работает SOS-кнопка', readTime: '3 мин', updated: '04.04.2026' },
    ],
  },
];

export default function InstructionsSection() {
  const [search, setSearch] = useState('');
  const [openCat, setOpenCat] = useState<string | null>('gettingstarted');
  const [openArticle, setOpenArticle] = useState<{ cat: string; idx: number } | null>(null);

  const filtered = search.trim()
    ? DOCS.map(d => ({ ...d, articles: d.articles.filter(a => a.title.toLowerCase().includes(search.toLowerCase()) || a.desc.toLowerCase().includes(search.toLowerCase())) })).filter(d => d.articles.length > 0)
    : DOCS;

  const totalArticles = DOCS.reduce((s, d) => s + d.articles.length, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Инструкции</h2>
          <p className="text-muted-foreground text-sm mt-0.5">Документация по всем модулям системы ИРИДА</p>
        </div>
        <span className="text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded-full">{totalArticles} статей</span>
      </div>

      <div className="flex items-center gap-2 bg-muted/50 rounded-xl px-3 py-2.5 border border-border">
        <Icon name="Search" className="w-4 h-4 text-muted-foreground shrink-0" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск по инструкциям..."
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none" />
        {search && <button onClick={() => setSearch('')}><Icon name="X" className="w-4 h-4 text-muted-foreground" /></button>}
      </div>

      <div className="space-y-3">
        {filtered.map(cat => (
          <div key={cat.id} className="bg-card border border-border rounded-2xl overflow-hidden">
            <button onClick={() => setOpenCat(openCat === cat.id ? null : cat.id)}
              className="w-full flex items-center gap-3 px-5 py-4 hover:bg-muted/30 transition-colors text-left">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${cat.bg}`}>
                <Icon name={cat.icon} className={`w-4.5 h-4.5 ${cat.color}`} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">{cat.category}</p>
                <p className="text-xs text-muted-foreground">{cat.articles.length} статей</p>
              </div>
              <Icon name={openCat === cat.id ? 'ChevronUp' : 'ChevronDown'} className="w-4 h-4 text-muted-foreground" />
            </button>

            {openCat === cat.id && (
              <div className="border-t border-border divide-y divide-border">
                {cat.articles.map((art, idx) => (
                  <div key={idx}>
                    <button onClick={() => setOpenArticle(openArticle?.cat === cat.id && openArticle?.idx === idx ? null : { cat: cat.id, idx })}
                      className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-muted/20 transition-colors text-left">
                      <Icon name="FileText" className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{art.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{art.desc}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs text-muted-foreground hidden sm:block">{art.readTime}</span>
                        <span className="text-[10px] text-muted-foreground/60 hidden lg:block">{art.updated}</span>
                        <Icon name={openArticle?.cat === cat.id && openArticle?.idx === idx ? 'ChevronUp' : 'ChevronRight'} className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                    </button>
                    {openArticle?.cat === cat.id && openArticle?.idx === idx && (
                      <div className="px-5 pb-4 pt-2 bg-muted/20">
                        <div className="bg-card rounded-xl border border-border p-4 space-y-2">
                          <div className="flex items-center gap-2 pb-2 border-b border-border">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${cat.bg}`}>
                              <Icon name={cat.icon} className={`w-3.5 h-3.5 ${cat.color}`} />
                            </div>
                            <p className="text-sm font-semibold text-foreground">{art.title}</p>
                          </div>
                          <p className="text-sm text-muted-foreground leading-relaxed">{art.desc}</p>
                          <div className="pt-2 space-y-1.5">
                            {[
                              `Раздел «${cat.category}» доступен в соответствующей роли дашборда.`,
                              `Актуально для версии ИРИДА 2.6.0 и выше.`,
                              `При возникновении вопросов обращайтесь в поддержку через раздел Irida-Tools.`,
                            ].map((line, i) => (
                              <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                                <Icon name="ChevronRight" className="w-3 h-3 mt-0.5 shrink-0 text-primary" />
                                <span>{line}</span>
                              </div>
                            ))}
                          </div>
                          <div className="flex items-center justify-between pt-2 border-t border-border">
                            <span className="text-[10px] text-muted-foreground">Обновлено: {art.updated}</span>
                            <span className="text-[10px] text-muted-foreground">Время чтения: {art.readTime}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Icon name="Search" className="w-8 h-8 mx-auto mb-3 opacity-30" />
            <p>Ничего не найдено по запросу «{search}»</p>
          </div>
        )}
      </div>
    </div>
  );
}
