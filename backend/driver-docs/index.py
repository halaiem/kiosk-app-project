import json
import os
import psycopg2


SCHEMA = 't_p25163990_kiosk_app_project'
CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token',
    'Access-Control-Max-Age': '86400',
}
HEADERS = {**CORS, 'Content-Type': 'application/json'}


def get_driver_id_from_token(cur, token: str):
    cur.execute(
        f"SELECT driver_id FROM {SCHEMA}.driver_sessions WHERE token = %s AND expires_at > now()",
        (token,)
    )
    row = cur.fetchone()
    return row[0] if row else None


def handler(event: dict, context) -> dict:
    """Управление новыми документами для водителя: получение и подтверждение прочтения"""

    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    method = event.get('httpMethod', 'GET')
    params = event.get('queryStringParameters') or {}
    token = event.get('headers', {}).get('X-Auth-Token') or event.get('headers', {}).get('x-auth-token', '')

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()

    try:
        driver_id = get_driver_id_from_token(cur, token) if token else None

        # GET — список новых документов для водителя
        if method == 'GET':
            if not driver_id:
                return {'statusCode': 401, 'headers': HEADERS, 'body': json.dumps({'error': 'Unauthorized'})}

            cur.execute(
                f"""SELECT id, title, category, content, file_size, created_at, is_read, is_confirmed
                    FROM {SCHEMA}.driver_new_docs
                    WHERE driver_id = %s AND is_confirmed = false
                    ORDER BY created_at DESC""",
                (driver_id,)
            )
            rows = cur.fetchall()
            docs = [
                {
                    'id': r[0],
                    'title': r[1],
                    'category': r[2],
                    'content': r[3] or '',
                    'file_size': r[4] or '—',
                    'created_at': r[5].isoformat() if r[5] else None,
                    'is_read': r[6],
                    'is_confirmed': r[7],
                }
                for r in rows
            ]
            return {'statusCode': 200, 'headers': HEADERS, 'body': json.dumps({'docs': docs})}

        # POST ?action=mark_read — отметить документ как открытый/прочитанный
        if method == 'POST' and params.get('action') == 'mark_read':
            if not driver_id:
                return {'statusCode': 401, 'headers': HEADERS, 'body': json.dumps({'error': 'Unauthorized'})}
            body = json.loads(event.get('body') or '{}')
            doc_id = body.get('doc_id')
            cur.execute(
                f"""UPDATE {SCHEMA}.driver_new_docs
                    SET is_read = true, opened_at = COALESCE(opened_at, now())
                    WHERE id = %s AND driver_id = %s""",
                (doc_id, driver_id)
            )
            conn.commit()
            return {'statusCode': 200, 'headers': HEADERS, 'body': json.dumps({'ok': True})}

        # POST ?action=confirm — водитель нажал "прочитано и утверждено"
        if method == 'POST' and params.get('action') == 'confirm':
            if not driver_id:
                return {'statusCode': 401, 'headers': HEADERS, 'body': json.dumps({'error': 'Unauthorized'})}
            body = json.loads(event.get('body') or '{}')
            doc_ids = body.get('doc_ids', [])

            if doc_ids:
                ids_str = ','.join(str(int(i)) for i in doc_ids)
                cur.execute(
                    f"""UPDATE {SCHEMA}.driver_new_docs
                        SET is_confirmed = true, confirmed_at = now()
                        WHERE id IN ({ids_str}) AND driver_id = %s""",
                    (driver_id,)
                )

            # Получаем имя водителя для уведомления
            cur.execute(
                f"SELECT full_name FROM {SCHEMA}.drivers WHERE id = %s",
                (driver_id,)
            )
            row = cur.fetchone()
            driver_name = row[0] if row else f'Водитель #{driver_id}'

            # Отправляем системное сообщение диспетчеру (от имени водителя)
            cur.execute(
                f"""INSERT INTO {SCHEMA}.messages (driver_id, sender, text, message_type, is_read)
                    VALUES (%s, 'driver', %s, 'normal', false)""",
                (driver_id, f'✅ {driver_name} прочитал и утвердил новые документы ({len(doc_ids)} шт.)')
            )

            conn.commit()
            return {'statusCode': 200, 'headers': HEADERS, 'body': json.dumps({'ok': True, 'driver_name': driver_name})}

        # POST (без action) — добавить новый документ (вызывается с дашборда)
        if method == 'POST' and not params.get('action'):
            body = json.loads(event.get('body') or '{}')
            title = body.get('title', '').strip()
            category = body.get('category', 'other')
            content = body.get('content', '')
            file_size = body.get('file_size', '—')
            target_driver_id = body.get('driver_id')

            if not title or not target_driver_id:
                return {'statusCode': 400, 'headers': HEADERS, 'body': json.dumps({'error': 'title and driver_id required'})}

            cur.execute(
                f"""INSERT INTO {SCHEMA}.driver_new_docs (driver_id, title, category, content, file_size)
                    VALUES (%s, %s, %s, %s, %s) RETURNING id""",
                (target_driver_id, title, category, content, file_size)
            )
            new_id = cur.fetchone()[0]
            conn.commit()
            return {'statusCode': 200, 'headers': HEADERS, 'body': json.dumps({'ok': True, 'id': new_id})}

        return {'statusCode': 405, 'headers': HEADERS, 'body': json.dumps({'error': 'Method not allowed'})}

    finally:
        conn.close()