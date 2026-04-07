"""Чтение и сохранение файлов проекта для Irida-Tools терминала"""
import json
import os
import psycopg2

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
}

def resp(code, body):
    return {'statusCode': code, 'headers': {**CORS, 'Content-Type': 'application/json'}, 'body': json.dumps(body, ensure_ascii=False)}

def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])

def handler(event, context):
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': {**CORS, 'Access-Control-Max-Age': '86400'}, 'body': ''}

    params = event.get('queryStringParameters') or {}
    action = params.get('action', 'read')
    method = event.get('httpMethod', 'GET')

    conn = get_conn()
    cur = conn.cursor()

    if action == 'read' and method == 'GET':
        file_path = params.get('path', '')
        if not file_path:
            return resp(400, {'error': 'path is required'})
        cur.execute("SELECT content, updated_at FROM irida_project_files WHERE file_path = %s", (file_path,))
        row = cur.fetchone()
        conn.close()
        if not row:
            return resp(404, {'error': 'file not found', 'path': file_path})
        return resp(200, {'path': file_path, 'content': row[0], 'updated_at': str(row[1])})

    if action == 'save' and method == 'POST':
        body = json.loads(event.get('body', '{}'))
        file_path = body.get('path', '')
        content = body.get('content', '')
        if not file_path:
            return resp(400, {'error': 'path is required'})
        cur.execute(
            """INSERT INTO irida_project_files (file_path, content, updated_at)
               VALUES (%s, %s, NOW())
               ON CONFLICT (file_path) DO UPDATE SET content = EXCLUDED.content, updated_at = NOW()""",
            (file_path, content)
        )
        conn.commit()
        conn.close()
        return resp(200, {'ok': True, 'path': file_path})

    if action == 'list' and method == 'GET':
        cur.execute("SELECT file_path, updated_at FROM irida_project_files ORDER BY file_path")
        rows = cur.fetchall()
        conn.close()
        return resp(200, {'files': [{'path': r[0], 'updated_at': str(r[1])} for r in rows]})

    if action == 'bulk_save' and method == 'POST':
        body = json.loads(event.get('body', '{}'))
        files = body.get('files', [])
        if not files:
            return resp(400, {'error': 'files array is required'})
        saved = 0
        for f in files:
            fp = f.get('path', '')
            ct = f.get('content', '')
            if fp:
                cur.execute(
                    """INSERT INTO irida_project_files (file_path, content, updated_at)
                       VALUES (%s, %s, NOW())
                       ON CONFLICT (file_path) DO UPDATE SET content = EXCLUDED.content, updated_at = NOW()""",
                    (fp, ct)
                )
                saved += 1
        conn.commit()
        conn.close()
        return resp(200, {'ok': True, 'saved': saved})

    conn.close()
    return resp(400, {'error': 'unknown action'})
