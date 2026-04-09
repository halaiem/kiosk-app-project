import json
import os
import psycopg2


CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-User-Id, X-Auth-Token, X-Session-Id',
    'Access-Control-Max-Age': '86400',
}


def get_driver_id_from_token(cur, token):
    cur.execute("SELECT driver_id FROM driver_sessions WHERE session_token = %s AND is_online = true", (token,))
    row = cur.fetchone()
    return row[0] if row else None


def get_driver_info(cur, driver_id):
    cur.execute("SELECT id, full_name, COALESCE(employee_id, '') FROM drivers WHERE id = %s", (int(driver_id),))
    row = cur.fetchone()
    return {'id': row[0], 'name': row[1], 'tab': row[2] or str(row[0])} if row else None


def get_or_create_driver_chat(cur, driver_id):
    """Находит/создаёт персональный чат для водителя со всеми диспетчерами"""
    cur.execute("""
        SELECT c.id FROM chats c
        JOIN chat_members cm ON cm.chat_id = c.id
        WHERE cm.driver_id = %s AND c.title LIKE 'Водитель %%'
        LIMIT 1
    """, (driver_id,))
    row = cur.fetchone()
    if row:
        return row[0]

    info = get_driver_info(cur, driver_id)
    if not info:
        return None

    title = f"Водитель {info['tab']} ({info['name']})"
    cur.execute("SELECT id FROM dashboard_users WHERE role IN ('admin','dispatcher') AND is_active = true ORDER BY id LIMIT 1")
    creator_row = cur.fetchone()
    creator_id = creator_row[0] if creator_row else 1
    cur.execute(
        "INSERT INTO chats (title, default_type, is_active, created_by) VALUES (%s, 'message', true, %s) RETURNING id",
        (title, creator_id))
    chat_id = cur.fetchone()[0]

    cur.execute(
        "INSERT INTO chat_members (chat_id, driver_id, role) VALUES (%s, %s, 'driver')",
        (chat_id, driver_id))

    cur.execute("SELECT id FROM dashboard_users WHERE role IN ('dispatcher','admin') AND is_active = true")
    for r in cur.fetchall():
        cur.execute(
            "INSERT INTO chat_members (chat_id, user_id, role) VALUES (%s, %s, 'dispatcher')",
            (chat_id, r[0]))
    return chat_id


def handler(event: dict, context) -> dict:
    """Сообщения водитель ↔ диспетчер через единую систему чатов (chat_messages)"""

    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    headers = {**CORS, 'Content-Type': 'application/json'}
    method = event.get('httpMethod', 'GET')
    path = event.get('path', '/')
    params = event.get('queryStringParameters') or {}

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()

    try:
        if method == 'GET':
            if params.get('action') == 'templates':
                cur.execute(
                    "SELECT id, title, content, COALESCE(icon, '') FROM message_templates "
                    "WHERE target_role = 'driver' AND target_scope = 'tablet' AND is_active = true "
                    "ORDER BY sort_order, id"
                )
                rows = cur.fetchall()
                templates = [
                    {'id': r[0], 'title': r[1], 'content': r[2], 'icon': r[3]}
                    for r in rows
                ]
                return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'templates': templates})}

            driver_id = params.get('driver_id')
            token = event.get('headers', {}).get('X-Auth-Token') or event.get('headers', {}).get('x-auth-token', '')
            since_id = int(params.get('since_id', 0))

            if not driver_id and token:
                driver_id = get_driver_id_from_token(cur, token)

            if not driver_id:
                return {'statusCode': 401, 'headers': headers, 'body': json.dumps({'error': 'Unauthorized'})}

            driver_id = int(driver_id)
            chat_id = get_or_create_driver_chat(cur, driver_id)
            if not chat_id:
                return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'messages': []})}

            cur.execute("""
                SELECT cm.id, cm.sender_user_id, cm.sender_driver_id, cm.content,
                       cm.created_at, cm.is_read, cm.message_type,
                       (SELECT file_url FROM chat_files WHERE message_id = cm.id AND content_type LIKE 'audio/%%' LIMIT 1) as audio_url
                FROM chat_messages cm
                WHERE cm.chat_id = %s AND cm.id > %s
                ORDER BY cm.created_at ASC
            """, (chat_id, since_id))

            rows = cur.fetchall()
            msgs = []
            for r in rows:
                sender = 'driver' if r[2] else 'dispatcher'
                msgs.append({
                    'id': r[0],
                    'sender': sender,
                    'text': r[3],
                    'type': r[6] or 'normal',
                    'isRead': r[5],
                    'createdAt': str(r[4]),
                    'deliveredAt': str(r[4]),
                    'clientId': None,
                    'audioUrl': r[7],
                })

            if token and rows:
                cur.execute("""
                    UPDATE chat_messages SET is_read = true
                    WHERE chat_id = %s AND sender_user_id IS NOT NULL AND is_read = false
                """, (chat_id,))
                conn.commit()

            conn.commit()
            return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'messages': msgs, 'chat_id': chat_id})}

        if method == 'POST':
            body = json.loads(event.get('body') or '{}')
            action = params.get('action', '')
            token = event.get('headers', {}).get('X-Auth-Token') or event.get('headers', {}).get('x-auth-token', '')

            if action == 'batch':
                if not token:
                    return {'statusCode': 401, 'headers': headers, 'body': json.dumps({'error': 'Unauthorized'})}

                driver_id = get_driver_id_from_token(cur, token)
                if not driver_id:
                    return {'statusCode': 401, 'headers': headers, 'body': json.dumps({'error': 'Session expired'})}

                queue = body.get('messages', [])
                if not queue:
                    return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Empty batch'})}

                chat_id = get_or_create_driver_chat(cur, driver_id)

                results = []
                for item in queue:
                    text = item.get('text', '').strip()
                    msg_type = item.get('type', 'normal')
                    client_id = item.get('clientId', '')

                    if not text:
                        continue

                    cur.execute(
                        "INSERT INTO chat_messages (chat_id, sender_driver_id, content, message_type, status) "
                        "VALUES (%s, %s, %s, %s, 'sent') RETURNING id, created_at",
                        (chat_id, driver_id, text, msg_type)
                    )
                    msg_id, created_at = cur.fetchone()
                    cur.execute("UPDATE chats SET last_message_at = NOW() WHERE id = %s", (chat_id,))
                    results.append({'clientId': client_id, 'serverId': msg_id, 'createdAt': str(created_at), 'status': 'sent'})

                conn.commit()
                return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'results': results})}

            if action == 'confirm_delivery':
                message_ids = body.get('message_ids', [])
                if message_ids:
                    cur.execute("UPDATE chat_messages SET is_read = true WHERE id = ANY(%s)", (message_ids,))
                    conn.commit()
                return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'ok': True})}

            text = body.get('text', '').strip()
            msg_type = body.get('type', 'normal')
            audio_url = body.get('audio_url', '').strip()
            audio_duration = body.get('audio_duration', 0)

            if token:
                driver_id = get_driver_id_from_token(cur, token)
                if not driver_id:
                    return {'statusCode': 401, 'headers': headers, 'body': json.dumps({'error': 'Unauthorized'})}
                sender_driver_id = driver_id
                sender_user_id = None
            else:
                driver_id = body.get('driver_id')
                if not driver_id:
                    return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'driver_id обязателен'})}
                sender_driver_id = None
                sender_user_id = body.get('sender_user_id')
                if not sender_user_id:
                    cur.execute("SELECT id FROM dashboard_users WHERE role IN ('dispatcher','admin') AND is_active = true ORDER BY id LIMIT 1")
                    drow = cur.fetchone()
                    sender_user_id = drow[0] if drow else None

            if not text and not audio_url:
                return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Текст или аудио обязательны'})}

            chat_id = get_or_create_driver_chat(cur, int(driver_id))

            cur.execute(
                "INSERT INTO chat_messages (chat_id, sender_user_id, sender_driver_id, content, message_type, status) "
                "VALUES (%s, %s, %s, %s, %s, 'sent') RETURNING id, created_at",
                (chat_id, sender_user_id, sender_driver_id, text or '[Голосовое сообщение]', msg_type)
            )
            msg_id, created_at = cur.fetchone()

            if audio_url:
                file_name = f"voice_{msg_id}.webm"
                cur.execute(
                    "INSERT INTO chat_files (message_id, file_name, file_url, file_size, content_type) "
                    "VALUES (%s, %s, %s, %s, %s)",
                    (msg_id, file_name, audio_url, 0, 'audio/webm')
                )

            cur.execute("UPDATE chats SET last_message_at = NOW() WHERE id = %s", (chat_id,))
            conn.commit()

            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({'id': msg_id, 'createdAt': str(created_at), 'chat_id': chat_id})
            }

        if method == 'PUT' and '/read' in path:
            body = json.loads(event.get('body') or '{}')
            driver_id = body.get('driver_id')
            if driver_id:
                cur.execute("""
                    UPDATE chat_messages SET is_read = true
                    WHERE chat_id IN (
                        SELECT chat_id FROM chat_members WHERE driver_id = %s
                    ) AND sender_driver_id IS NOT NULL
                """, (int(driver_id),))
                conn.commit()
            return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'ok': True})}

        return {'statusCode': 404, 'headers': headers, 'body': json.dumps({'error': 'Not found'})}

    finally:
        cur.close()
        conn.close()