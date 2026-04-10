"""Полный экспорт данных из облачной БД в формате SQL INSERT для переноса на свой сервер"""
import json
import os
import psycopg2
import psycopg2.extras
from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

SKIP_TABLES = {
    'vehicle_telemetry', 'vehicle_events',
    'vehicle_telemetry_2025_01', 'vehicle_telemetry_2025_02', 'vehicle_telemetry_2025_03',
    'vehicle_telemetry_2025_04', 'vehicle_telemetry_2025_05', 'vehicle_telemetry_2025_06',
    'vehicle_telemetry_2025_07', 'vehicle_telemetry_2025_08', 'vehicle_telemetry_2025_09',
    'vehicle_telemetry_2025_10', 'vehicle_telemetry_2025_11', 'vehicle_telemetry_2025_12',
    'vehicle_telemetry_2026_01', 'vehicle_telemetry_2026_02', 'vehicle_telemetry_2026_03',
    'vehicle_telemetry_2026_04', 'vehicle_telemetry_2026_05', 'vehicle_telemetry_2026_06',
    'vehicle_telemetry_2026_07', 'vehicle_telemetry_2026_08', 'vehicle_telemetry_2026_09',
    'vehicle_telemetry_2026_10', 'vehicle_telemetry_2026_11', 'vehicle_telemetry_2026_12',
    'vehicle_events_2025_q1', 'vehicle_events_2025_q2', 'vehicle_events_2025_q3', 'vehicle_events_2025_q4',
    'vehicle_events_2026_q1', 'vehicle_events_2026_q2', 'vehicle_events_2026_q3', 'vehicle_events_2026_q4',
}

TABLE_ORDER = [
    'organizations',
    'drivers',
    'dashboard_users',
    'accounts',
    'routes',
    'stops',
    'route_stops',
    'vehicles',
    'documents',
    'driver_sessions',
    'dashboard_sessions',
    'messages',
    'assignments',
    'assignment_templates',
    'incidents',
    'settings',
    'audit_logs',
    'trip_summary',
    'vehicle_diagnostic_apis',
    'vehicle_diagnostics',
    'vehicle_issue_reports',
    'dispatcher_ratings',
    'user_ratings',
    'driver_new_docs',
    'irida_project_files',
    'mrm_admins',
    'chats',
    'chat_members',
    'chat_messages',
    'chat_files',
    'chat_reactions',
    'chat_visibility_rules',
    'filter_presets',
    'service_requests',
    'service_logs',
    'service_request_routing',
    'ts_documents',
    'external_emails',
    'message_templates',
    'notification_templates',
    'motivation_phrases',
    'geo_zones',
    'geo_zone_events',
]


def resp(code, body, content_type='application/json'):
    if content_type == 'application/json':
        return {
            'statusCode': code,
            'headers': {**CORS, 'Content-Type': content_type},
            'body': json.dumps(body, ensure_ascii=False, default=str),
        }
    return {
        'statusCode': code,
        'headers': {**CORS, 'Content-Type': content_type},
        'body': body,
    }


def get_schema(cur):
    schema = os.environ.get('MAIN_DB_SCHEMA', '')
    if not schema:
        cur.execute(
            "SELECT schema_name FROM information_schema.schemata "
            "WHERE schema_name NOT IN ('information_schema','pg_catalog','public','pg_toast') "
            "AND schema_name NOT LIKE 'pg_%' ORDER BY schema_name LIMIT 1"
        )
        row = cur.fetchone()
        schema = row[0] if row else 'public'
    return schema


def escape_value(val):
    if val is None:
        return 'NULL'
    if isinstance(val, bool):
        return 'TRUE' if val else 'FALSE'
    if isinstance(val, (int, float, Decimal)):
        return str(val)
    if isinstance(val, (datetime, date)):
        return "'{}'".format(str(val))
    if isinstance(val, UUID):
        return "'{}'".format(str(val))
    if isinstance(val, dict) or isinstance(val, list):
        s = json.dumps(val, ensure_ascii=False, default=str)
        return "'{}'".format(s.replace("'", "''"))
    s = str(val)
    return "'{}'".format(s.replace("'", "''"))


def export_table(cur, schema, table_name):
    try:
        cur.execute("SELECT * FROM {}.{} ORDER BY 1".format(schema, table_name))
    except Exception:
        return ''
    rows = cur.fetchall()
    if not rows:
        return ''
    col_names = [desc[0] for desc in cur.description]
    lines = []
    lines.append('-- Table: {}'.format(table_name))
    lines.append('DELETE FROM {} CASCADE;'.format(table_name))

    for row in rows:
        values = []
        for i, col in enumerate(col_names):
            values.append(escape_value(row[col]))
        lines.append('INSERT INTO {} ({}) VALUES ({});'.format(
            table_name,
            ', '.join(col_names),
            ', '.join(values),
        ))

    has_serial = False
    for col in col_names:
        if col == 'id':
            has_serial = True
            break
    if has_serial:
        lines.append("SELECT setval(pg_get_serial_sequence('{table}', 'id'), COALESCE((SELECT MAX(id) FROM {table}), 1)) WHERE pg_get_serial_sequence('{table}', 'id') IS NOT NULL;".format(table=table_name))

    lines.append('')
    return '\n'.join(lines)


def handler(event, context):
    """Экспорт всех данных из облачной БД в SQL-формате для переноса на свой сервер"""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': {**CORS, 'Access-Control-Max-Age': '86400'}, 'body': ''}

    params = event.get('queryStringParameters') or {}
    action = params.get('action', 'full')

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    schema = get_schema(cur)

    if action == 'info':
        cur.execute(
            "SELECT table_name FROM information_schema.tables "
            "WHERE table_schema = %s AND table_type = 'BASE TABLE' ORDER BY table_name",
            (schema,)
        )
        all_tables = [r['table_name'] for r in cur.fetchall()]
        export_tables = [t for t in all_tables if t not in SKIP_TABLES]
        skip = [t for t in all_tables if t in SKIP_TABLES]

        table_stats = []
        for t in export_tables:
            try:
                cur.execute("SELECT count(*) as cnt FROM {}.{}".format(schema, t))
                cnt = cur.fetchone()['cnt']
            except:
                cnt = -1
                conn.rollback()
            table_stats.append({'table': t, 'rows': cnt})

        conn.close()
        return resp(200, {
            'export_tables': table_stats,
            'skip_tables': skip,
            'total_tables': len(export_tables),
            'total_skip': len(skip),
        })

    if action == 'table':
        table = params.get('table', '')
        if not table:
            conn.close()
            return resp(400, {'error': 'table param required'})
        sql = export_table(cur, schema, table)
        conn.close()
        return resp(200, sql, content_type='text/plain; charset=utf-8')

    if action == 'full':
        parts = []
        parts.append('-- ============================================')
        parts.append('-- ИРИДА: полный экспорт данных')
        parts.append('-- Дата: {}'.format(datetime.now().strftime('%Y-%m-%d %H:%M:%S')))
        parts.append('-- Источник: облачная БД (poehali.dev)')
        parts.append('-- Назначение: свой сервер (public schema)')
        parts.append('-- ============================================')
        parts.append('')
        parts.append('BEGIN;')
        parts.append('')
        parts.append('SET session_replication_role = replica;')
        parts.append('')

        exported = 0
        errors = []

        cur.execute(
            "SELECT table_name FROM information_schema.tables "
            "WHERE table_schema = %s AND table_type = 'BASE TABLE' ORDER BY table_name",
            (schema,)
        )
        existing = {r['table_name'] for r in cur.fetchall()}

        for table in TABLE_ORDER:
            if table in SKIP_TABLES:
                continue
            if table not in existing:
                continue
            try:
                sql = export_table(cur, schema, table)
                if sql:
                    parts.append(sql)
                    exported += 1
            except Exception as e:
                errors.append({'table': table, 'error': str(e)})
                conn.rollback()

        remaining = existing - set(TABLE_ORDER) - SKIP_TABLES
        for table in sorted(remaining):
            try:
                sql = export_table(cur, schema, table)
                if sql:
                    parts.append(sql)
                    exported += 1
            except Exception as e:
                errors.append({'table': table, 'error': str(e)})
                conn.rollback()

        parts.append('SET session_replication_role = DEFAULT;')
        parts.append('')
        parts.append('COMMIT;')
        parts.append('')
        parts.append('-- Экспортировано таблиц: {}'.format(exported))
        if errors:
            parts.append('-- Ошибки: {}'.format(json.dumps(errors, ensure_ascii=False)))

        conn.close()
        full_sql = '\n'.join(parts)
        return resp(200, full_sql, content_type='text/plain; charset=utf-8')

    conn.close()
    return resp(400, {'error': 'Unknown action. Use: info, table, full'})
