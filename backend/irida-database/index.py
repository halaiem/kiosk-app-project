"""Управление таблицами БД проекта: список таблиц, чтение данных, редактирование строк, экспорт CSV"""
import json
import os
import psycopg2
import psycopg2.extras

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
}

SCHEMA = None

def resp(code, body):
    return {'statusCode': code, 'headers': {**CORS, 'Content-Type': 'application/json'}, 'body': json.dumps(body, ensure_ascii=False, default=str)}

def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])

def get_schema(cur):
    global SCHEMA
    if SCHEMA:
        return SCHEMA
    schema = os.environ.get('MAIN_DB_SCHEMA', '')
    if not schema:
        cur.execute("SELECT schema_name FROM information_schema.schemata WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'public', 'pg_toast') AND schema_name NOT LIKE 'pg_%' ORDER BY schema_name LIMIT 1")
        row = cur.fetchone()
        schema = row[0] if row else 'public'
    SCHEMA = schema
    return schema

def handler(event, context):
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': {**CORS, 'Access-Control-Max-Age': '86400'}, 'body': ''}

    params = event.get('queryStringParameters') or {}
    action = params.get('action', 'tables')
    method = event.get('httpMethod', 'GET')

    conn = get_conn()
    cur = conn.cursor()
    schema = get_schema(cur)

    try:
        if action == 'tables' and method == 'GET':
            cur.execute("""
                SELECT t.table_name,
                       (SELECT count(*) FROM information_schema.columns c WHERE c.table_schema = t.table_schema AND c.table_name = t.table_name) as col_count
                FROM information_schema.tables t
                WHERE t.table_schema = %s AND t.table_type = 'BASE TABLE'
                ORDER BY t.table_name
            """, (schema,))
            tables = []
            for row in cur.fetchall():
                tname = row[0]
                try:
                    cur.execute("SELECT count(*) FROM {}.{}".format(schema, tname))
                    cnt = cur.fetchone()[0]
                except:
                    cnt = -1
                    conn.rollback()
                tables.append({'name': tname, 'columns': row[1], 'rows': cnt})
            return resp(200, {'tables': tables, 'schema': schema})

        if action == 'columns' and method == 'GET':
            table = params.get('table', '')
            if not table:
                return resp(400, {'error': 'table param required'})
            cur.execute("""
                SELECT column_name, data_type, is_nullable, column_default,
                       character_maximum_length
                FROM information_schema.columns
                WHERE table_schema = %s AND table_name = %s
                ORDER BY ordinal_position
            """, (schema, table))
            cols = [{'name': r[0], 'type': r[1], 'nullable': r[2] == 'YES', 'default': r[3], 'max_length': r[4]} for r in cur.fetchall()]

            cur.execute("""
                SELECT kcu.column_name
                FROM information_schema.table_constraints tc
                JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
                WHERE tc.table_schema = %s AND tc.table_name = %s AND tc.constraint_type = 'PRIMARY KEY'
            """, (schema, table))
            pk_cols = [r[0] for r in cur.fetchall()]
            return resp(200, {'columns': cols, 'primary_keys': pk_cols, 'table': table})

        if action == 'data' and method == 'GET':
            table = params.get('table', '')
            limit = int(params.get('limit', '100'))
            offset = int(params.get('offset', '0'))
            sort_col = params.get('sort', '')
            sort_dir = params.get('dir', 'ASC')
            if not table:
                return resp(400, {'error': 'table param required'})
            if sort_dir.upper() not in ('ASC', 'DESC'):
                sort_dir = 'ASC'

            order = ""
            if sort_col:
                order = " ORDER BY {} {}".format(sort_col, sort_dir)
            else:
                order = " ORDER BY 1"

            cur.execute("SELECT count(*) FROM {}.{}".format(schema, table))
            total = cur.fetchone()[0]

            query = "SELECT * FROM {}.{}{} LIMIT {} OFFSET {}".format(schema, table, order, limit, offset)
            cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            cur.execute(query)
            rows = cur.fetchall()
            col_names = [desc[0] for desc in cur.description] if cur.description else []
            return resp(200, {'rows': rows, 'columns': col_names, 'total': total, 'limit': limit, 'offset': offset})

        if action == 'update' and method == 'POST':
            body = json.loads(event.get('body', '{}'))
            table = body.get('table', '')
            pk_columns = body.get('pk_columns', [])
            pk_values = body.get('pk_values', [])
            updates = body.get('updates', {})
            if not table or not pk_columns or not updates:
                return resp(400, {'error': 'table, pk_columns, pk_values, updates required'})

            set_parts = []
            vals = []
            for col, val in updates.items():
                set_parts.append("{} = %s".format(col))
                vals.append(val)

            where_parts = []
            for i, pk_col in enumerate(pk_columns):
                where_parts.append("{} = %s".format(pk_col))
                vals.append(pk_values[i])

            query = "UPDATE {}.{} SET {} WHERE {}".format(schema, table, ', '.join(set_parts), ' AND '.join(where_parts))
            cur.execute(query, vals)
            conn.commit()
            return resp(200, {'ok': True, 'affected': cur.rowcount})

        if action == 'insert' and method == 'POST':
            body = json.loads(event.get('body', '{}'))
            table = body.get('table', '')
            row_data = body.get('row', {})
            if not table or not row_data:
                return resp(400, {'error': 'table and row required'})

            cols = list(row_data.keys())
            vals = list(row_data.values())
            placeholders = ', '.join(['%s'] * len(cols))
            col_str = ', '.join(cols)
            query = "INSERT INTO {}.{} ({}) VALUES ({})".format(schema, table, col_str, placeholders)
            cur.execute(query, vals)
            conn.commit()
            return resp(200, {'ok': True})

        if action == 'delete' and method == 'POST':
            body = json.loads(event.get('body', '{}'))
            table = body.get('table', '')
            pk_columns = body.get('pk_columns', [])
            pk_values = body.get('pk_values', [])
            if not table or not pk_columns:
                return resp(400, {'error': 'table and pk_columns required'})

            where_parts = []
            vals = []
            for i, pk_col in enumerate(pk_columns):
                where_parts.append("{} = %s".format(pk_col))
                vals.append(pk_values[i])

            query = "DELETE FROM {}.{} WHERE {}".format(schema, table, ' AND '.join(where_parts))
            cur.execute(query, vals)
            conn.commit()
            return resp(200, {'ok': True, 'affected': cur.rowcount})

        if action == 'export' and method == 'GET':
            table = params.get('table', '')
            if not table:
                return resp(400, {'error': 'table param required'})
            cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            cur.execute("SELECT * FROM {}.{} ORDER BY 1".format(schema, table))
            rows = cur.fetchall()
            col_names = [desc[0] for desc in cur.description] if cur.description else []
            return resp(200, {'rows': rows, 'columns': col_names, 'table': table})

        return resp(400, {'error': 'unknown action'})

    except Exception as e:
        conn.rollback()
        return resp(500, {'error': str(e)})
    finally:
        conn.close()
