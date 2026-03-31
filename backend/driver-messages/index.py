import json
import os
import psycopg2


def get_driver_id_from_token(cur, token):
    cur.execute("SELECT driver_id FROM driver_sessions WHERE session_token = %s AND is_online = true", (token,))
    row = cur.fetchone()
    return row[0] if row else None


def handler(event: dict, context) -> dict:
    """Отправка и получение сообщений между водителем и диспетчером с поддержкой офлайн-очереди"""

    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': {'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, X-User-Id, X-Auth-Token, X-Session-Id', 'Access-Control-Max-Age': '86400'}, 'body': ''}

    headers = {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'}
    method = event.get('httpMethod', 'GET')
    path = event.get('path', '/')
    params = event.get('queryStringParameters') or {}

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()

    try:
        if method == 'GET':
            driver_id = params.get('driver_id')
            token = event.get('headers', {}).get('X-Auth-Token', '')
            since_id = params.get('since_id', 0)

            if not driver_id and token:
                driver_id = get_driver_id_from_token(cur, token)

            if not driver_id:
                return {'statusCode': 401, 'headers': headers, 'body': json.dumps({'error': 'Unauthorized'})}

            cur.execute("""
                SELECT id, sender, text, message_type, is_read, created_at, delivered_at, client_id
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
                    'createdAt': str(r[5]),
                    'deliveredAt': str(r[6]) if r[6] else None,
                    'clientId': r[7]
                })

            if token and rows:
                dispatcher_ids = [r[0] for r in rows if r[1] == 'dispatcher' and r[6] is None]
                if dispatcher_ids:
                    cur.execute("UPDATE messages SET is_read = true, delivered_at = NOW() WHERE id = ANY(%s)", (dispatcher_ids,))
                    conn.commit()

            return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'messages': msgs})}

        if method == 'POST':
            body = json.loads(event.get('body') or '{}')
            action = params.get('action', '')
            token = event.get('headers', {}).get('X-Auth-Token', '')

            if action == 'batch':
                if not token:
                    return {'statusCode': 401, 'headers': headers, 'body': json.dumps({'error': 'Unauthorized'})}

                driver_id = get_driver_id_from_token(cur, token)
                if not driver_id:
                    return {'statusCode': 401, 'headers': headers, 'body': json.dumps({'error': 'Session expired'})}

                queue = body.get('messages', [])
                if not queue:
                    return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Empty batch'})}

                results = []
                for item in queue:
                    text = item.get('text', '').strip()
                    msg_type = item.get('type', 'normal')
                    client_id = item.get('clientId', '')

                    if not text:
                        continue

                    if client_id:
                        cur.execute("SELECT id FROM messages WHERE client_id = %s", (client_id,))
                        existing = cur.fetchone()
                        if existing:
                            results.append({'clientId': client_id, 'serverId': existing[0], 'status': 'duplicate'})
                            continue

                    cur.execute(
                        "INSERT INTO messages (driver_id, sender, text, message_type, client_id) VALUES (%s, 'driver', %s, %s, %s) RETURNING id, created_at",
                        (driver_id, text, msg_type, client_id or None)
                    )
                    msg_id, created_at = cur.fetchone()
                    results.append({'clientId': client_id, 'serverId': msg_id, 'createdAt': str(created_at), 'status': 'sent'})

                conn.commit()
                return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'results': results})}

            if action == 'confirm_delivery':
                message_ids = body.get('message_ids', [])
                if message_ids:
                    cur.execute("UPDATE messages SET delivered_at = NOW() WHERE id = ANY(%s) AND delivered_at IS NULL", (message_ids,))
                    conn.commit()
                return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'ok': True})}

            text = body.get('text', '').strip()
            msg_type = body.get('type', 'normal')
            client_id = body.get('clientId', '')

            if token:
                driver_id = get_driver_id_from_token(cur, token)
                if not driver_id:
                    return {'statusCode': 401, 'headers': headers, 'body': json.dumps({'error': 'Unauthorized'})}
                sender = 'driver'
            else:
                driver_id = body.get('driver_id')
                sender = 'dispatcher'
                if not driver_id:
                    return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'driver_id обязателен'})}

            if not text:
                return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Текст обязателен'})}

            if client_id:
                cur.execute("SELECT id FROM messages WHERE client_id = %s", (client_id,))
                existing = cur.fetchone()
                if existing:
                    return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'id': existing[0], 'status': 'duplicate'})}

            cur.execute(
                "INSERT INTO messages (driver_id, sender, text, message_type, client_id) VALUES (%s, %s, %s, %s, %s) RETURNING id, created_at",
                (driver_id, sender, text, msg_type, client_id or None)
            )
            msg_id, created_at = cur.fetchone()
            conn.commit()

            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({'id': msg_id, 'createdAt': str(created_at)})
            }

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
