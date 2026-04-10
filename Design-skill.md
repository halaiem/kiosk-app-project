# Design-skill — UI-ориентиры проекта ИРИДА

Этот файл — личный справочник по дизайну дашборда. Использовать при любых изменениях UI.

---

## 1. Размеры и высота элементов

| Элемент | Высота | Размер текста | Скругление |
|---|---|---|---|
| Кнопка основная (primary) | `h-8` | `text-xs` | `rounded-lg` |
| Кнопка иконка-кнопка | `w-7 h-7` | — | `rounded-lg` |
| Input / Select | `h-8` | `text-xs` / `text-sm` | `rounded-lg` |
| Строка таблицы (py) | `py-2.5` | `text-xs`–`text-sm` | — |
| Заголовок блока (header) | `py-3` | `text-sm font-semibold` | — |
| Тулбар / фильтры | `py-3` | `text-xs` | — |
| Бейдж-тег роли | `px-2 py-0.5` | `text-[11px] font-medium` | `rounded` |
| Иконка блока (декор) | `w-7 h-7` | иконка `w-4 h-4` | `rounded-lg` |
| Счётчик в заголовке | `px-2 py-0.5` | `text-xs` | `rounded-full` |

---

## 2. Отступы в блоках

- Блок-карточка: `bg-card border border-border rounded-2xl overflow-hidden`
- Заголовок блока: `px-5 py-3 border-b border-border`
- Тулбар (фильтры/поиск): `px-5 py-3 border-b border-border`
- Форма добавления: `px-5 py-4 border-b border-border bg-muted/30`
- Ячейки таблицы: `px-4 py-2.5` (вертикальный `py-2.5`)
- Попап/модал: `p-5` внутри, `rounded-2xl`, `max-w-lg`

---

## 3. Цветовые паттерны

### Кнопки
- **Primary**: `bg-primary text-primary-foreground hover:bg-primary/90`
- **Muted/Ghost**: `bg-muted text-muted-foreground hover:text-foreground`
- **Danger**: `bg-red-500/10 text-red-500 hover:bg-red-500/20`
- **Success**: `bg-green-500/15 text-green-500`

### Статус-бейджи (lifecycle)
```
active      → bg-green-500/15 text-green-500
vacation    → bg-yellow-500/15 text-yellow-600
sick_leave  → bg-orange-500/15 text-orange-500
fired       → bg-red-500/15 text-red-500
```

### Роли пользователей
```
dispatcher  → bg-blue-500/15 text-blue-500
technician  → bg-green-500/15 text-green-500
admin       → bg-red-500/15 text-red-500
mechanic    → bg-orange-500/15 text-orange-500
irida_tools → bg-purple-500/15 text-purple-500
```

---

## 4. Таблицы

- Шапка: `text-xs text-muted-foreground font-medium`, `py-2.5`
- Строка данных: `text-sm`, hover `hover:bg-muted/30 transition-colors`
- Чекбокс в шапке и строке: `w-4 h-4 accent-primary cursor-pointer`
- Кнопки действий строки: иконки `w-7 h-7 rounded-lg`, не текст
- Пустой стейт: `colSpan-all`, `py-10 text-center text-sm text-muted-foreground`

---

## 5. Формы

- Лейбл: `text-xs font-medium text-muted-foreground mb-1 block`
- Input: `h-8 px-3 rounded-lg border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-ring`
- Grid форм: `grid grid-cols-2 gap-3` или `grid-cols-3 gap-3` для компактности
- Кнопки формы: всегда `flex justify-end gap-2 mt-4`
- Ошибка формы: `text-xs text-destructive` или `bg-destructive/10 rounded-lg px-3 py-2`

---

## 6. Попапы / Модалы

- Оверлей: `fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4`
- Контейнер: `bg-card border border-border rounded-2xl w-full max-w-md shadow-xl overflow-hidden`
- Заголовок: `px-5 py-4 border-b border-border flex items-center gap-2`
- Тело: `px-5 py-4 space-y-3`
- Футер: `px-5 py-4 border-t border-border flex justify-end gap-2`
- Кнопка закрытия: `w-8 h-8 rounded-lg bg-muted flex items-center justify-center`

---

## 7. Консистентность иконок

- Декоративные иконки в заголовках блоков: обёрнуты в цветной `div w-7 h-7 rounded-lg`
- Иконки в кнопках: `w-3.5 h-3.5` для маленьких кнопок, `w-4 h-4` для средних
- Всегда использовать `<Icon name="..." />` — никогда прямой импорт из lucide-react

---

## 8. Тулбар правила

Тулбар строится слева-направо:
1. **Фильтры** (pill-кнопки) — слева
2. `ml-auto` разделитель
3. **Поиск** (input с иконкой) — `w-36`–`w-48`
4. **Экспорт CSV** — ghost-кнопка с иконкой Download
5. **Экспорт Excel** — ghost-кнопка с иконкой FileSpreadsheet (опционально)
6. **Добавить** — primary-кнопка с иконкой Plus/UserPlus — последняя

---

## 9. Компактность виджетов

- Разделы внутри одной страницы: `space-y-4`
- Не использовать `p-6` или `p-8` в табличных блоках (только в попапах)
- Высота строк таблицы НЕ `py-4` — максимум `py-2.5`
- Поля формы НЕ `h-10`/`h-11` — только `h-8` (compact) или `h-9` (normal)
- В модалах допустим `h-9`–`h-10` для удобства ввода

---

## 10. Export-кнопки

```tsx
// CSV
<button className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium bg-muted text-muted-foreground hover:text-foreground border border-border transition-colors">
  <Icon name="Download" className="w-3.5 h-3.5" />CSV
</button>

// Excel
<button className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium bg-muted text-muted-foreground hover:text-foreground border border-border transition-colors">
  <Icon name="FileSpreadsheet" className="w-3.5 h-3.5" />Excel
</button>
```

---

## 11. "Глаз" — просмотр записи

- Иконка-кнопка: `w-7 h-7 rounded-lg bg-muted text-muted-foreground hover:text-foreground`
- Открывает попап-карточку с информацией (read-only)
- Порядок кнопок в строке: `Eye → Pencil → Trash2`

---

_Последнее обновление: 2026-04-10_
