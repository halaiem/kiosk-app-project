import json
import os
import psycopg2


def get_driver_id_from_token(cur, token):
    cur.execute("SELECT driver_id FROM driver_sessions WHERE session_token = %s AND is_online = true", (token,))
    row = cur.fetchone()
    return row[0] if row else None


def handler(event: dict, context) -> dict:
    """Отправка и получение сообщений между водителем и диспетчером"""

    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': {'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, X-User-Id, X-Auth-Token, X-Session-Id', 'Access-Control-Max-Age': '86400'}, 'body': ''}

    headers = {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'}
    method = event.get('httpMethod', 'GET')
    path = event.get('path', '/')
    params = event.get('queryStringParameters') or {}

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()

    try:
        # GET /messages — получить сообщения
        if method == 'GET':
            driver_id = params.get('driver_id')
            token = event.get('headers', {}).get('X-Auth-Token', '')
            since_id = params.get('since_id', 0)

            if not driver_id and token:
                driver_id = get_driver_id_from_token(cur, token)

            if not driver_id:
                return {'statusCode': 401, 'headers': headers, 'body': json.dumps({'error': 'Unauthorized'})}

            cur.execute("""
                SELECT id, sender, text, message_type, is_read, created_at
                FROM messages
                WHERE driver_id = %s AND id > %s
                ORDER BY created_at ASC
            """, (int(driver_id), int(since_id)))

            rows = cur.fetchall()
            msgs = []
            for r in rows:
                msgs.append({
                    'id': r[0], 'sender': r[1], 'text': r[2],
                    'type': r[3], 'isRead': r[4],
                    'createdAt': str(r[5])
                })

            # Помечаем как прочитанные для водителя
            if token and rows:
                ids = [r[0] for r in rows]
                cur.execute("UPDATE messages SET is_read = true WHERE id = ANY(%s) AND sender = 'dispatcher'", (ids,))
                conn.commit()

            return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'messages': msgs})}

        # POST /messages — отправить сообщение
        if method == 'POST':
            body = json.loads(event.get('body') or '{}')
            text = body.get('text', '').strip()
            msg_type = body.get('type', 'normal')
            token = event.get('headers', {}).get('X-Auth-Token', '')

            # Водитель отправляет диспетчеру
            if token:
                driver_id = get_driver_id_from_token(cur, token)
                if not driver_id:
                    return {'statusCode': 401, 'headers': headers, 'body': json.dumps({'error': 'Unauthorized'})}
                sender = 'driver'

            # Диспетчер отправляет водителю
            else:
                driver_id = body.get('driver_id')
                sender = 'dispatcher'
                if not driver_id:
                    return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'driver_id обязателен'})}

            if not text:
                return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Текст обязателен'})}

            cur.execute(
                "INSERT INTO messages (driver_id, sender, text, message_type) VALUES (%s, %s, %s, %s) RETURNING id, created_at",
                (driver_id, sender, text, msg_type)
            )
            msg_id, created_at = cur.fetchone()
            conn.commit()

            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({'id': msg_id, 'createdAt': str(created_at)})
            }

        # PUT /read — пометить прочитанными
        if method == 'PUT' and '/read' in path:
            body = json.loads(event.get('body') or '{}')
            driver_id = body.get('driver_id')
            if driver_id:
                cur.execute("UPDATE messages SET is_read = true WHERE driver_id = %s AND sender = 'driver'", (driver_id,))
                conn.commit()
            return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'ok': True})}

        return {'statusCode': 404, 'headers': headers, 'body': json.dumps({'error': 'Not found'})}

    finally:
        cur.close()
        conn.close()
