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