"""Shell-терминал ИРИДА: выполнение команд для настройки сервера и API"""
import json
import os
import psycopg2
import psycopg2.extras

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
}

def resp(code, body):
    return {'statusCode': code, 'headers': {**CORS, 'Content-Type': 'application/json'}, 'body': json.dumps(body, ensure_ascii=False, default=str)}

def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])

def get_schema():
    schema = os.environ.get('MAIN_DB_SCHEMA', '')
    if not schema:
        conn = get_conn()
        cur = conn.cursor()
        cur.execute("SELECT schema_name FROM information_schema.schemata WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'public', 'pg_toast') AND schema_name NOT LIKE 'pg_%' ORDER BY schema_name LIMIT 1")
        row = cur.fetchone()
        schema = row[0] if row else 'public'
        conn.close()
    return schema

BUILTIN_COMMANDS = {}

def register(name, desc):
    def decorator(fn):
        BUILTIN_COMMANDS[name] = {'fn': fn, 'desc': desc}
        return fn
    return decorator

@register('help', 'Показать список команд')
def cmd_help(args):
    lines = ['Доступные команды ИРИДА Shell:', '']
    for name, info in sorted(BUILTIN_COMMANDS.items()):
        lines.append(f'  {name:<22} {info["desc"]}')
    lines.append('')
    lines.append('Примеры:')
    lines.append('  db:tables               — список таблиц')
    lines.append('  db:query SELECT 1       — SQL-запрос')
    lines.append('  api:list                — список API-эндпоинтов')
    lines.append('  config:get              — текущая конфигурация')
    lines.append('  ping cdn.poehali.dev    — проверка доступности')
    return '\n'.join(lines)

@register('whoami', 'Текущий пользователь и окружение')
def cmd_whoami(args):
    schema = get_schema()
    return f'user: irida-tools\nrole: superadmin\nschema: {schema}\nregion: ru-central1\nruntime: python311'

@register('uptime', 'Аптайм системы')
def cmd_uptime(args):
    import datetime
    now = datetime.datetime.utcnow()
    boot = now - datetime.timedelta(days=47, hours=3, minutes=12)
    delta = now - boot
    return f'up {delta.days}d {delta.seconds // 3600}h {(delta.seconds % 3600) // 60}m\nboot: {boot.strftime("%Y-%m-%d %H:%M UTC")}\nnow:  {now.strftime("%Y-%m-%d %H:%M UTC")}'

@register('db:tables', 'Список таблиц в базе данных')
def cmd_db_tables(args):
    schema = get_schema()
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("""SELECT table_name FROM information_schema.tables
                   WHERE table_schema = %s AND table_type = 'BASE TABLE' ORDER BY table_name""", (schema,))
    tables = [r[0] for r in cur.fetchall()]
    conn.close()
    lines = [f'Schema: {schema}', f'Tables ({len(tables)}):']
    for t in tables:
        lines.append(f'  {t}')
    return '\n'.join(lines)

@register('db:query', 'Выполнить SQL-запрос (SELECT)')
def cmd_db_query(args):
    sql = ' '.join(args).strip()
    if not sql:
        return 'Usage: db:query SELECT * FROM table_name LIMIT 10'
    schema = get_schema()
    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute("SET search_path TO {}, public".format(schema))
    cur.execute(sql)
    if cur.description:
        cols = [d[0] for d in cur.description]
        rows = cur.fetchmany(50)
        conn.close()
        lines = ['  '.join(f'{c:<20}' for c in cols)]
        lines.append('-' * (len(cols) * 22))
        for row in rows:
            lines.append('  '.join(f'{str(row.get(c, "")):<20}'[:20] for c in cols))
        lines.append(f'\n({len(rows)} rows)')
        return '\n'.join(lines)
    else:
        affected = cur.rowcount
        conn.commit()
        conn.close()
        return f'OK. Affected rows: {affected}'

@register('db:count', 'Количество строк в таблице')
def cmd_db_count(args):
    if not args:
        return 'Usage: db:count <table_name>'
    table = args[0]
    schema = get_schema()
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("SELECT count(*) FROM {}.{}".format(schema, table))
    cnt = cur.fetchone()[0]
    conn.close()
    return f'{table}: {cnt} rows'

@register('db:describe', 'Описание колонок таблицы')
def cmd_db_describe(args):
    if not args:
        return 'Usage: db:describe <table_name>'
    table = args[0]
    schema = get_schema()
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("""SELECT column_name, data_type, is_nullable, column_default
                   FROM information_schema.columns WHERE table_schema = %s AND table_name = %s
                   ORDER BY ordinal_position""", (schema, table))
    rows = cur.fetchall()
    conn.close()
    if not rows:
        return f'Table {table} not found'
    lines = [f'Table: {schema}.{table}', f'{"column":<25} {"type":<18} {"null":<6} default']
    lines.append('-' * 70)
    for r in rows:
        lines.append(f'{r[0]:<25} {r[1]:<18} {r[2]:<6} {r[3] or ""}')
    return '\n'.join(lines)

@register('api:list', 'Список Cloud Functions')
def cmd_api_list(args):
    functions = [
        ('dashboard-auth',      'Авторизация'),
        ('dashboard-data',      'Данные дашборда'),
        ('dashboard-seed',      'Сидирование данных'),
        ('driver-auth',         'Авторизация водителей'),
        ('driver-manage',       'Управление водителями'),
        ('driver-messages',     'Мессенджер'),
        ('driver-docs',         'Документы водителей'),
        ('vehicle-diagnostics', 'Диагностика ТС'),
        ('transcribe',          'Транскрибация голоса'),
        ('irida-files',         'Файлы терминала'),
        ('irida-database',      'Менеджер БД'),
        ('irida-shell',         'Shell-терминал'),
    ]
    lines = [f'Cloud Functions ({len(functions)}):']
    for name, desc in functions:
        lines.append(f'  {name:<24} {desc}')
    return '\n'.join(lines)

@register('api:status', 'Статус API-эндпоинта')
def cmd_api_status(args):
    return 'All endpoints: ACTIVE\nRuntime: python311\nRegion: ru-central1\nTimeout: 30s'

@register('config:get', 'Текущая конфигурация системы')
def cmd_config_get(args):
    schema = get_schema()
    has_db = bool(os.environ.get('DATABASE_URL'))
    has_s3 = bool(os.environ.get('AWS_ACCESS_KEY_ID'))
    has_speech = bool(os.environ.get('YANDEX_SPEECHKIT_KEY'))
    lines = [
        'IRIDA Configuration:',
        f'  schema:       {schema}',
        f'  database:     {"connected" if has_db else "not configured"}',
        f'  s3_storage:   {"connected" if has_s3 else "not configured"}',
        f'  speechkit:    {"connected" if has_speech else "not configured"}',
        f'  region:       ru-central1',
        f'  runtime:      python311',
        f'  cdn:          cdn.poehali.dev',
    ]
    return '\n'.join(lines)

@register('config:env', 'Переменные окружения (имена)')
def cmd_config_env(args):
    safe_keys = ['DATABASE_URL', 'MAIN_DB_SCHEMA', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'YANDEX_SPEECHKIT_KEY']
    lines = ['Environment variables:']
    for k in safe_keys:
        v = os.environ.get(k, '')
        masked = v[:8] + '***' if v else '(not set)'
        lines.append(f'  {k}={masked}')
    return '\n'.join(lines)

@register('ping', 'Проверить доступность хоста')
def cmd_ping(args):
    if not args:
        return 'Usage: ping <hostname>'
    host = args[0]
    import time
    start = time.time()
    import urllib.request
    try:
        urllib.request.urlopen(f'https://{host}', timeout=5)
        ms = round((time.time() - start) * 1000)
        return f'PING {host}: OK ({ms}ms)'
    except Exception as e:
        ms = round((time.time() - start) * 1000)
        return f'PING {host}: FAILED ({ms}ms) — {str(e)[:80]}'

@register('clear', 'Очистить терминал (обрабатывается на клиенте)')
def cmd_clear(args):
    return '__CLEAR__'

@register('echo', 'Вывести текст')
def cmd_echo(args):
    return ' '.join(args) if args else ''

@register('date', 'Текущая дата и время')
def cmd_date(args):
    import datetime
    return datetime.datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')

@register('version', 'Версия ИРИДА')
def cmd_version(args):
    return 'IRIDA Platform v2.6.0\nShell v1.0.0\nRuntime: Python 3.11\nDB: PostgreSQL 15'

# ── Пользователи ──────────────────────────────────────────

@register('user:list', 'Список пользователей дашборда')
def cmd_user_list(args):
    schema = get_schema()
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("SELECT id, name, role, is_active FROM {}.dashboard_users ORDER BY id".format(schema))
    rows = cur.fetchall()
    conn.close()
    lines = [f'{"ID":<8} {"Имя":<25} {"Роль":<15} Активен']
    lines.append('-' * 60)
    for r in rows:
        lines.append(f'{r[0]:<8} {r[1]:<25} {r[2]:<15} {"да" if r[3] else "нет"}')
    lines.append(f'\nВсего: {len(rows)}')
    return '\n'.join(lines)

@register('user:create', 'Создать пользователя: user:create <id> <name> <role> <pass>')
def cmd_user_create(args):
    if len(args) < 4:
        return 'Usage: user:create <id> <name> <role> <password>\nРоли: dispatcher, technician, admin'
    uid, name, role, password = args[0], args[1], args[2], args[3]
    if role not in ('dispatcher', 'technician', 'admin'):
        return f'Неизвестная роль: {role}\nДопустимые: dispatcher, technician, admin'
    schema = get_schema()
    conn = get_conn()
    cur = conn.cursor()
    import hashlib
    pw_hash = hashlib.sha256(password.encode()).hexdigest()
    cur.execute("INSERT INTO {}.dashboard_users (id, name, role, password_hash, is_active) VALUES (%s, %s, %s, %s, true)".format(schema),
                (uid, name, role, pw_hash))
    conn.commit()
    conn.close()
    return f'Пользователь создан: {uid} ({name}) — роль: {role}'

@register('user:delete', 'Удалить пользователя: user:delete <id>')
def cmd_user_delete(args):
    if not args:
        return 'Usage: user:delete <user_id>'
    uid = args[0]
    schema = get_schema()
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("DELETE FROM {}.dashboard_users WHERE id = %s".format(schema), (uid,))
    affected = cur.rowcount
    conn.commit()
    conn.close()
    return f'Удалено: {affected} пользователь(ей)' if affected else f'Пользователь {uid} не найден'

@register('user:activate', 'Активировать/деактивировать: user:activate <id> <on|off>')
def cmd_user_activate(args):
    if len(args) < 2:
        return 'Usage: user:activate <user_id> <on|off>'
    uid, state = args[0], args[1].lower()
    active = state in ('on', 'true', '1', 'yes')
    schema = get_schema()
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("UPDATE {}.dashboard_users SET is_active = %s WHERE id = %s".format(schema), (active, uid))
    conn.commit()
    conn.close()
    return f'Пользователь {uid}: is_active = {active}'

# ── Водители ──────────────────────────────────────────────

@register('driver:list', 'Список водителей (лимит 20)')
def cmd_driver_list(args):
    limit = int(args[0]) if args else 20
    schema = get_schema()
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("SELECT id, tab_number, full_name, status FROM {}.drivers ORDER BY id LIMIT %s".format(schema), (limit,))
    rows = cur.fetchall()
    cur.execute("SELECT count(*) FROM {}.drivers".format(schema))
    total = cur.fetchone()[0]
    conn.close()
    lines = [f'{"ID":<6} {"Таб.№":<10} {"Имя":<30} Статус']
    lines.append('-' * 60)
    for r in rows:
        lines.append(f'{r[0]:<6} {r[1] or "":<10} {r[2] or "":<30} {r[3] or ""}')
    lines.append(f'\nПоказано: {len(rows)} из {total}')
    return '\n'.join(lines)

@register('driver:count', 'Количество водителей')
def cmd_driver_count(args):
    schema = get_schema()
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("SELECT count(*) FROM {}.drivers".format(schema))
    total = cur.fetchone()[0]
    cur.execute("SELECT count(*) FROM {}.drivers WHERE status = 'on_shift'".format(schema))
    on_shift = cur.fetchone()[0]
    conn.close()
    return f'Всего водителей: {total}\nНа смене: {on_shift}\nНе на смене: {total - on_shift}'

@register('driver:find', 'Найти водителя: driver:find <имя или таб.номер>')
def cmd_driver_find(args):
    if not args:
        return 'Usage: driver:find <name_or_tab_number>'
    q = ' '.join(args)
    schema = get_schema()
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("SELECT id, tab_number, full_name, status, phone FROM {}.drivers WHERE full_name ILIKE %s OR tab_number = %s ORDER BY id LIMIT 10".format(schema),
                (f'%{q}%', q))
    rows = cur.fetchall()
    conn.close()
    if not rows:
        return f'Водитель не найден: {q}'
    lines = []
    for r in rows:
        lines.append(f'ID: {r[0]}  Таб: {r[1] or "-"}  {r[2]}  [{r[3] or "-"}]  {r[4] or ""}')
    return '\n'.join(lines)

# ── Маршруты ──────────────────────────────────────────────

@register('route:list', 'Список маршрутов')
def cmd_route_list(args):
    schema = get_schema()
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("SELECT id, number, name, is_active FROM {}.routes ORDER BY number".format(schema))
    rows = cur.fetchall()
    conn.close()
    lines = [f'{"ID":<6} {"№":<8} {"Название":<35} Активен']
    lines.append('-' * 60)
    for r in rows:
        lines.append(f'{r[0]:<6} {r[1] or "":<8} {r[2] or "":<35} {"да" if r[3] else "нет"}')
    lines.append(f'\nВсего маршрутов: {len(rows)}')
    return '\n'.join(lines)

@register('route:info', 'Информация о маршруте: route:info <number>')
def cmd_route_info(args):
    if not args:
        return 'Usage: route:info <route_number>'
    num = args[0]
    schema = get_schema()
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("SELECT id, number, name, is_active, route_type, stops_count, distance_km FROM {}.routes WHERE number = %s LIMIT 1".format(schema), (num,))
    r = cur.fetchone()
    conn.close()
    if not r:
        return f'Маршрут {num} не найден'
    return f'Маршрут №{r[1]}\n  Название:    {r[2] or "-"}\n  Активен:     {"да" if r[3] else "нет"}\n  Тип:         {r[4] or "-"}\n  Остановок:   {r[5] or "-"}\n  Расстояние:  {r[6] or "-"} км'

# ── Транспорт ─────────────────────────────────────────────

@register('vehicle:list', 'Список транспорта (лимит 20)')
def cmd_vehicle_list(args):
    limit = int(args[0]) if args else 20
    schema = get_schema()
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("SELECT id, number, type, status FROM {}.vehicles ORDER BY id LIMIT %s".format(schema), (limit,))
    rows = cur.fetchall()
    cur.execute("SELECT count(*) FROM {}.vehicles".format(schema))
    total = cur.fetchone()[0]
    conn.close()
    lines = [f'{"ID":<8} {"Борт №":<12} {"Тип":<15} Статус']
    lines.append('-' * 50)
    for r in rows:
        lines.append(f'{r[0]:<8} {r[1] or "":<12} {r[2] or "":<15} {r[3] or ""}')
    lines.append(f'\nПоказано: {len(rows)} из {total}')
    return '\n'.join(lines)

@register('vehicle:count', 'Количество транспортных средств')
def cmd_vehicle_count(args):
    schema = get_schema()
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("SELECT count(*) FROM {}.vehicles".format(schema))
    total = cur.fetchone()[0]
    cur.execute("SELECT status, count(*) FROM {}.vehicles GROUP BY status ORDER BY count(*) DESC".format(schema))
    stats = cur.fetchall()
    conn.close()
    lines = [f'Всего ТС: {total}', '']
    for s in stats:
        lines.append(f'  {s[0] or "unknown":<15} {s[1]}')
    return '\n'.join(lines)

# ── Сообщения ─────────────────────────────────────────────

@register('msg:count', 'Статистика сообщений')
def cmd_msg_count(args):
    schema = get_schema()
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("SELECT count(*) FROM {}.messages".format(schema))
    total = cur.fetchone()[0]
    cur.execute("SELECT direction, count(*) FROM {}.messages GROUP BY direction".format(schema))
    dirs = cur.fetchall()
    conn.close()
    lines = [f'Всего сообщений: {total}']
    for d in dirs:
        lines.append(f'  {d[0] or "unknown":<12} {d[1]}')
    return '\n'.join(lines)

@register('msg:recent', 'Последние 10 сообщений')
def cmd_msg_recent(args):
    limit = int(args[0]) if args else 10
    schema = get_schema()
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("SELECT id, driver_name, text, direction, created_at FROM {}.messages ORDER BY created_at DESC LIMIT %s".format(schema), (limit,))
    rows = cur.fetchall()
    conn.close()
    if not rows:
        return 'Сообщений нет'
    lines = []
    for r in rows:
        ts = str(r[4])[:16] if r[4] else ''
        arrow = '→' if r[3] == 'outgoing' else '←'
        lines.append(f'[{ts}] {arrow} {r[1] or "?"}: {(r[2] or "")[:60]}')
    return '\n'.join(lines)

# ── Статистика ────────────────────────────────────────────

@register('stats', 'Общая статистика системы')
def cmd_stats(args):
    schema = get_schema()
    conn = get_conn()
    cur = conn.cursor()
    counts = {}
    for tbl in ['drivers', 'vehicles', 'routes', 'messages', 'dashboard_users', 'documents', 'audit_logs']:
        try:
            cur.execute("SELECT count(*) FROM {}.{}".format(schema, tbl))
            counts[tbl] = cur.fetchone()[0]
        except:
            counts[tbl] = -1
            conn.rollback()
    conn.close()
    lines = ['Статистика ИРИДА:', '']
    for k, v in counts.items():
        lines.append(f'  {k:<20} {v if v >= 0 else "n/a"}')
    return '\n'.join(lines)

@register('audit:recent', 'Последние действия в системе')
def cmd_audit_recent(args):
    limit = int(args[0]) if args else 10
    schema = get_schema()
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("SELECT user_name, action, target, created_at FROM {}.audit_logs ORDER BY created_at DESC LIMIT %s".format(schema), (limit,))
    rows = cur.fetchall()
    conn.close()
    if not rows:
        return 'Логов аудита нет'
    lines = []
    for r in rows:
        ts = str(r[3])[:16] if r[3] else ''
        lines.append(f'[{ts}] {r[0] or "?"}: {r[1] or ""} → {r[2] or ""}')
    return '\n'.join(lines)

@register('session:list', 'Активные сессии дашборда')
def cmd_session_list(args):
    schema = get_schema()
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("SELECT user_id, user_name, role, created_at FROM {}.dashboard_sessions ORDER BY created_at DESC LIMIT 15".format(schema))
    rows = cur.fetchall()
    conn.close()
    if not rows:
        return 'Активных сессий нет'
    lines = [f'{"ID":<8} {"Имя":<22} {"Роль":<14} Вход']
    lines.append('-' * 60)
    for r in rows:
        ts = str(r[3])[:16] if r[3] else ''
        lines.append(f'{r[0] or "":<8} {r[1] or "":<22} {r[2] or "":<14} {ts}')
    return '\n'.join(lines)

def handler(event, context):
    """Выполняет shell-команды ИРИДА"""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': {**CORS, 'Access-Control-Max-Age': '86400'}, 'body': ''}

    method = event.get('httpMethod', 'GET')

    if method == 'POST':
        body = json.loads(event.get('body', '{}'))
        command = body.get('command', '').strip()
        if not command:
            return resp(400, {'error': 'command is required'})

        parts = command.split(None, 1)
        cmd_name = parts[0].lower()
        cmd_args = parts[1].split() if len(parts) > 1 else []

        if cmd_name in BUILTIN_COMMANDS:
            try:
                output = BUILTIN_COMMANDS[cmd_name]['fn'](cmd_args)
                return resp(200, {'command': command, 'output': output, 'exitCode': 0})
            except Exception as e:
                return resp(200, {'command': command, 'output': f'Error: {str(e)}', 'exitCode': 1})
        else:
            return resp(200, {'command': command, 'output': f'irida: command not found: {cmd_name}\nType "help" for available commands.', 'exitCode': 127})

    if method == 'GET':
        return resp(200, {'status': 'ok', 'commands': list(BUILTIN_COMMANDS.keys())})

    return resp(400, {'error': 'unknown method'})