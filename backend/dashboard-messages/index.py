import json
import os
import base64
import uuid
import psycopg2
import psycopg2.extras
import boto3

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Dashboard-Token',
}

def resp(code, body):
    return {'statusCode': code, 'headers': CORS, 'body': json.dumps(body, default=str)}

def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])

def get_schema():
    return os.environ.get('MAIN_DB_SCHEMA', 'public')

def auth_user(cur, schema, token):
    cur.execute(
        f"SELECT du.id, du.role, du.full_name FROM {schema}.dashboard_sessions ds "
        f"JOIN {schema}.dashboard_users du ON du.id = ds.user_id "
        f"WHERE ds.session_token = %s AND ds.is_active = true", (token,)
    )
    r = cur.fetchone()
    if not r:
        return None
    return {'id': r['id'], 'role': r['role'], 'name': r['full_name']}

def handler(event, context):
    """Мессенджер дашборда: чаты, сообщения, файлы, онлайн-статусы"""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': {**CORS, 'Access-Control-Max-Age': '86400'}, 'body': ''}

    headers = event.get('headers') or {}
    token = headers.get('X-Dashboard-Token') or headers.get('x-dashboard-token')
    if not token:
        return resp(401, {'error': 'Не авторизован'})

    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    schema = get_schema()

    user = auth_user(cur, schema, token)
    if not user:
        conn.close()
        return resp(401, {'error': 'Сессия недействительна'})

    cur.execute(f"UPDATE {schema}.chat_members SET is_online = true, last_seen_at = NOW() WHERE user_id = %s", (user['id'],))
    conn.commit()

    method = event.get('httpMethod', 'GET')
    qs = event.get('queryStringParameters') or {}
    action = qs.get('action', '')

    try:
        if method == 'GET' and action == 'users':
            return get_users(cur, schema, user)
        elif method == 'GET' and action == 'drivers':
            return get_drivers(cur, schema)
        elif method == 'GET' and action == 'chats':
            return get_chats(cur, schema, user)
        elif method == 'GET' and action == 'messages':
            return get_messages(cur, conn, schema, user, qs)
        elif method == 'GET' and action == 'unread':
            return get_unread(cur, schema, user)
        elif method == 'POST' and action == 'create_chat':
            return create_chat(cur, conn, schema, user, event)
        elif method == 'POST' and action == 'send':
            return send_message(cur, conn, schema, user, event)
        elif method == 'POST' and action == 'upload':
            return upload_file(cur, conn, schema, user, event)
        elif method == 'PUT' and action == 'read':
            return mark_read(cur, conn, schema, user, qs)
        elif method == 'PUT' and action == 'online':
            return resp(200, {'ok': True})
        elif method == 'POST' and action == 'react':
            return toggle_reaction(cur, conn, schema, user, event)
        elif method == 'GET' and action == 'reactions':
            return get_reactions(cur, schema, qs)
        elif method == 'GET' and action == 'readers':
            return get_readers(cur, schema, user, qs)
        elif method == 'PUT' and action == 'pin':
            return toggle_pin(cur, conn, schema, user, event)
        elif method == 'GET' and action == 'pinned':
            return get_pinned(cur, schema, user, qs)
        elif method == 'GET' and action == 'routes':
            return get_routes(cur, schema)
        elif method == 'GET' and action == 'vehicles':
            return get_vehicles(cur, schema)
        else:
            return resp(400, {'error': 'Неизвестное действие'})
    finally:
        conn.close()


def get_users(cur, schema, user):
    cur.execute(
        f"SELECT du.id, du.full_name, du.role, du.is_active, "
        f"COALESCE(cm.is_online, false) as is_online, cm.last_seen_at "
        f"FROM {schema}.dashboard_users du "
        f"LEFT JOIN (SELECT DISTINCT ON (user_id) user_id, is_online, last_seen_at "
        f"  FROM {schema}.chat_members WHERE user_id IS NOT NULL ORDER BY user_id, last_seen_at DESC NULLS LAST) cm "
        f"ON cm.user_id = du.id "
        f"WHERE du.is_active = true AND du.id != %s "
        f"ORDER BY du.full_name", (user['id'],)
    )
    return resp(200, {'users': cur.fetchall()})


def get_drivers(cur, schema):
    cur.execute(
        f"SELECT d.id, d.full_name, d.tab_number, d.vehicle_id, d.status, "
        f"v.board_number, r.route_number "
        f"FROM {schema}.drivers d "
        f"LEFT JOIN {schema}.vehicles v ON v.id = d.vehicle_id "
        f"LEFT JOIN {schema}.routes r ON r.id = d.route_id "
        f"WHERE d.is_active = true "
        f"ORDER BY d.full_name"
    )
    return resp(200, {'drivers': cur.fetchall()})


def get_chats(cur, schema, user):
    cur.execute(
        f"SELECT c.id, c.title, c.created_at, c.last_message_at, "
        f"(SELECT content FROM {schema}.chat_messages WHERE chat_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message, "
        f"(SELECT COALESCE(du.full_name, dr.full_name) FROM {schema}.chat_messages cm2 "
        f"  LEFT JOIN {schema}.dashboard_users du ON du.id = cm2.sender_user_id "
        f"  LEFT JOIN {schema}.drivers dr ON dr.id = cm2.sender_driver_id "
        f"  WHERE cm2.chat_id = c.id ORDER BY cm2.created_at DESC LIMIT 1) as last_sender, "
        f"(SELECT COUNT(*) FROM {schema}.chat_messages cm3 "
        f"  WHERE cm3.chat_id = c.id AND cm3.created_at > COALESCE(my.last_read_at, '1970-01-01') "
        f"  AND cm3.sender_user_id != %s) as unread_count "
        f"FROM {schema}.chats c "
        f"JOIN {schema}.chat_members my ON my.chat_id = c.id AND my.user_id = %s "
        f"WHERE c.is_active = true "
        f"ORDER BY c.last_message_at DESC",
        (user['id'], user['id'])
    )
    chats = cur.fetchall()

    for chat in chats:
        cur.execute(
            f"SELECT cm.user_id, cm.driver_id, cm.is_online, cm.last_seen_at, "
            f"COALESCE(du.full_name, dr.full_name) as name, "
            f"COALESCE(du.role, 'driver') as role "
            f"FROM {schema}.chat_members cm "
            f"LEFT JOIN {schema}.dashboard_users du ON du.id = cm.user_id "
            f"LEFT JOIN {schema}.drivers dr ON dr.id = cm.driver_id "
            f"WHERE cm.chat_id = %s", (chat['id'],)
        )
        chat['members'] = cur.fetchall()

    return resp(200, {'chats': chats})


def get_messages(cur, conn, schema, user, qs):
    chat_id = qs.get('chat_id')
    if not chat_id:
        return resp(400, {'error': 'chat_id обязателен'})

    cur.execute(
        f"SELECT 1 FROM {schema}.chat_members WHERE chat_id = %s AND user_id = %s",
        (chat_id, user['id'])
    )
    if not cur.fetchone():
        return resp(403, {'error': 'Нет доступа к чату'})

    # Пометить все входящие как delivered при загрузке
    cur.execute(
        f"UPDATE {schema}.chat_messages SET status = 'delivered' "
        f"WHERE chat_id = %s AND status = 'sent' AND sender_user_id != %s",
        (chat_id, user['id'])
    )

    cur.execute(
        f"SELECT cm.id, cm.content, cm.subject, cm.created_at, cm.sender_user_id, cm.sender_driver_id, "
        f"cm.status, cm.is_pinned, cm.pinned_at, "
        f"COALESCE(du.full_name, dr.full_name) as sender_name, "
        f"COALESCE(du.role, 'driver') as sender_role "
        f"FROM {schema}.chat_messages cm "
        f"LEFT JOIN {schema}.dashboard_users du ON du.id = cm.sender_user_id "
        f"LEFT JOIN {schema}.drivers dr ON dr.id = cm.sender_driver_id "
        f"WHERE cm.chat_id = %s ORDER BY cm.created_at ASC", (chat_id,)
    )
    msgs = cur.fetchall()

    for m in msgs:
        cur.execute(
            f"SELECT id, file_name, file_url, file_size, content_type FROM {schema}.chat_files WHERE message_id = %s", (m['id'],)
        )
        m['files'] = cur.fetchall()

    # Обновить last_read_at и пометить как read все delivered-сообщения от других
    cur.execute(
        f"UPDATE {schema}.chat_members SET last_read_at = NOW() WHERE chat_id = %s AND user_id = %s",
        (chat_id, user['id'])
    )

    # Считаем: если все не-отправители прочли — статус read
    # (участников > 1, у всех last_read_at >= created_at)
    cur.execute(
        f"SELECT COUNT(*) as total FROM {schema}.chat_members WHERE chat_id = %s", (chat_id,)
    )
    total_members = cur.fetchone()['total']

    if total_members > 1:
        cur.execute(
            f"UPDATE {schema}.chat_messages SET status = 'read' "
            f"WHERE chat_id = %s AND status = 'delivered' AND sender_user_id != %s "
            f"AND (SELECT COUNT(*) FROM {schema}.chat_members cm2 "
            f"     WHERE cm2.chat_id = %s AND cm2.user_id != sender_user_id "
            f"     AND cm2.last_read_at >= created_at) >= (SELECT COUNT(*) - 1 FROM {schema}.chat_members WHERE chat_id = %s)",
            (chat_id, user['id'], chat_id, chat_id)
        )

    conn.commit()

    return resp(200, {'messages': msgs})


def get_unread(cur, schema, user):
    cur.execute(
        f"SELECT c.id as chat_id, c.title, "
        f"cm.id as message_id, cm.content, cm.subject, cm.created_at, "
        f"COALESCE(du.full_name, dr.full_name) as sender_name "
        f"FROM {schema}.chat_messages cm "
        f"JOIN {schema}.chats c ON c.id = cm.chat_id "
        f"JOIN {schema}.chat_members my ON my.chat_id = c.id AND my.user_id = %s "
        f"LEFT JOIN {schema}.dashboard_users du ON du.id = cm.sender_user_id "
        f"LEFT JOIN {schema}.drivers dr ON dr.id = cm.sender_driver_id "
        f"WHERE cm.created_at > COALESCE(my.last_read_at, '1970-01-01') "
        f"AND cm.sender_user_id != %s AND c.is_active = true "
        f"ORDER BY cm.created_at DESC LIMIT 20",
        (user['id'], user['id'])
    )
    return resp(200, {'unread': cur.fetchall()})


def create_chat(cur, conn, schema, user, event):
    body = json.loads(event.get('body') or '{}')
    title = body.get('title', '').strip()
    member_user_ids = body.get('user_ids', [])
    member_driver_ids = body.get('driver_ids', [])

    if not title:
        return resp(400, {'error': 'Укажите название чата'})
    if not member_user_ids and not member_driver_ids:
        return resp(400, {'error': 'Добавьте хотя бы одного участника'})

    cur.execute(
        f"INSERT INTO {schema}.chats (title, created_by) VALUES (%s, %s) RETURNING id",
        (title, user['id'])
    )
    chat_id = cur.fetchone()['id']

    cur.execute(
        f"INSERT INTO {schema}.chat_members (chat_id, user_id, role) VALUES (%s, %s, 'creator')",
        (chat_id, user['id'])
    )

    for uid in member_user_ids:
        cur.execute(
            f"INSERT INTO {schema}.chat_members (chat_id, user_id) VALUES (%s, %s) ON CONFLICT DO NOTHING",
            (chat_id, uid)
        )

    for did in member_driver_ids:
        cur.execute(
            f"INSERT INTO {schema}.chat_members (chat_id, driver_id) VALUES (%s, %s)",
            (chat_id, did)
        )

    conn.commit()
    return resp(201, {'chat_id': chat_id})


def send_message(cur, conn, schema, user, event):
    body = json.loads(event.get('body') or '{}')
    chat_id = body.get('chat_id')
    content = body.get('content', '').strip()
    subject = body.get('subject', '').strip() or None

    if not chat_id or not content:
        return resp(400, {'error': 'chat_id и content обязательны'})

    cur.execute(
        f"SELECT 1 FROM {schema}.chat_members WHERE chat_id = %s AND user_id = %s",
        (chat_id, user['id'])
    )
    if not cur.fetchone():
        return resp(403, {'error': 'Нет доступа к чату'})

    cur.execute(
        f"INSERT INTO {schema}.chat_messages (chat_id, sender_user_id, content, subject) "
        f"VALUES (%s, %s, %s, %s) RETURNING id, created_at",
        (chat_id, user['id'], content, subject)
    )
    msg = cur.fetchone()

    cur.execute(f"UPDATE {schema}.chats SET last_message_at = NOW(), updated_at = NOW() WHERE id = %s", (chat_id,))
    cur.execute(
        f"UPDATE {schema}.chat_members SET last_read_at = NOW() WHERE chat_id = %s AND user_id = %s",
        (chat_id, user['id'])
    )
    conn.commit()

    return resp(201, {'message_id': msg['id'], 'created_at': msg['created_at']})


def upload_file(cur, conn, schema, user, event):
    body = json.loads(event.get('body') or '{}')
    message_id = body.get('message_id')
    file_name = body.get('file_name', 'file')
    file_data = body.get('file_data')
    content_type = body.get('content_type', 'application/octet-stream')

    if not message_id or not file_data:
        return resp(400, {'error': 'message_id и file_data обязательны'})

    raw = base64.b64decode(file_data)
    if len(raw) > 5 * 1024 * 1024:
        return resp(400, {'error': 'Файл превышает 5 MB'})

    s3 = boto3.client(
        's3',
        endpoint_url='https://bucket.poehali.dev',
        aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
        aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'],
    )

    ext = file_name.rsplit('.', 1)[-1] if '.' in file_name else 'bin'
    key = f"chat_files/{uuid.uuid4().hex}.{ext}"

    s3.put_object(Bucket='files', Key=key, Body=raw, ContentType=content_type)
    file_url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"

    cur.execute(
        f"INSERT INTO {schema}.chat_files (message_id, file_name, file_url, file_size, content_type) "
        f"VALUES (%s, %s, %s, %s, %s) RETURNING id",
        (message_id, file_name, file_url, len(raw), content_type)
    )
    file_id = cur.fetchone()['id']
    conn.commit()

    return resp(201, {'file_id': file_id, 'file_url': file_url})


ALLOWED_EMOJIS = {'👍', '👎', '❤️', '😂', '😮', '😢', '🔥', '👏'}

def toggle_reaction(cur, conn, schema, user, event):
    body = json.loads(event.get('body') or '{}')
    message_id = body.get('message_id')
    emoji = body.get('emoji', '')
    if not message_id or emoji not in ALLOWED_EMOJIS:
        return resp(400, {'error': 'Неверные параметры'})
    cur.execute(
        f"SELECT id FROM {schema}.chat_reactions WHERE message_id = %s AND user_id = %s AND emoji = %s",
        (message_id, user['id'], emoji)
    )
    existing = cur.fetchone()
    if existing:
        cur.execute(f"DELETE FROM {schema}.chat_reactions WHERE id = %s", (existing['id'],))
        conn.commit()
        return resp(200, {'action': 'removed'})
    else:
        cur.execute(
            f"INSERT INTO {schema}.chat_reactions (message_id, user_id, emoji) VALUES (%s, %s, %s)",
            (message_id, user['id'], emoji)
        )
        conn.commit()
        return resp(201, {'action': 'added'})


def get_reactions(cur, schema, qs):
    chat_id = qs.get('chat_id')
    if not chat_id:
        return resp(400, {'error': 'chat_id обязателен'})
    cur.execute(
        f"SELECT cr.message_id, cr.emoji, cr.user_id, "
        f"COALESCE(du.full_name, dr.full_name) as user_name "
        f"FROM {schema}.chat_reactions cr "
        f"LEFT JOIN {schema}.dashboard_users du ON du.id = cr.user_id "
        f"LEFT JOIN {schema}.drivers dr ON dr.id = cr.driver_id "
        f"WHERE cr.message_id IN ("
        f"  SELECT id FROM {schema}.chat_messages WHERE chat_id = %s"
        f")",
        (chat_id,)
    )
    rows = cur.fetchall()
    grouped: dict = {}
    for r in rows:
        mid = r['message_id']
        if mid not in grouped:
            grouped[mid] = {}
        emoji = r['emoji']
        if emoji not in grouped[mid]:
            grouped[mid][emoji] = {'count': 0, 'users': []}
        grouped[mid][emoji]['count'] += 1
        grouped[mid][emoji]['users'].append({'id': r['user_id'], 'name': r['user_name']})
    return resp(200, {'reactions': grouped})


def get_readers(cur, schema, user, qs):
    message_id = qs.get('message_id')
    chat_id = qs.get('chat_id')
    if not message_id or not chat_id:
        return resp(400, {'error': 'message_id и chat_id обязательны'})

    # Проверяем доступ
    cur.execute(
        f"SELECT sender_user_id, created_at FROM {schema}.chat_messages WHERE id = %s AND chat_id = %s",
        (message_id, chat_id)
    )
    msg = cur.fetchone()
    if not msg:
        return resp(404, {'error': 'Сообщение не найдено'})

    # Все участники чата (кроме отправителя)
    cur.execute(
        f"SELECT cm.user_id, cm.driver_id, cm.last_read_at, "
        f"COALESCE(du.full_name, dr.full_name) as name, "
        f"COALESCE(du.role, 'driver') as role "
        f"FROM {schema}.chat_members cm "
        f"LEFT JOIN {schema}.dashboard_users du ON du.id = cm.user_id "
        f"LEFT JOIN {schema}.drivers dr ON dr.id = cm.driver_id "
        f"WHERE cm.chat_id = %s AND cm.user_id != %s",
        (chat_id, msg['sender_user_id'])
    )
    members = cur.fetchall()

    read_list = []
    unread_list = []
    for m in members:
        entry = {
            'user_id': m['user_id'],
            'driver_id': m['driver_id'],
            'name': m['name'],
            'role': m['role'],
            'read_at': m['last_read_at'],
        }
        if m['last_read_at'] and m['last_read_at'] >= msg['created_at']:
            read_list.append(entry)
        else:
            unread_list.append(entry)

    return resp(200, {'read': read_list, 'unread': unread_list})


def toggle_pin(cur, conn, schema, user, event):
    """Закрепить / открепить сообщение в чате."""
    body = json.loads(event.get('body') or '{}')
    message_id = body.get('message_id')
    chat_id = body.get('chat_id')
    if not message_id or not chat_id:
        return resp(400, {'error': 'message_id и chat_id обязательны'})

    cur.execute(
        f"SELECT 1 FROM {schema}.chat_members WHERE chat_id = %s AND user_id = %s",
        (chat_id, user['id'])
    )
    if not cur.fetchone():
        return resp(403, {'error': 'Нет доступа к чату'})

    cur.execute(
        f"SELECT is_pinned FROM {schema}.chat_messages WHERE id = %s AND chat_id = %s",
        (message_id, chat_id)
    )
    msg = cur.fetchone()
    if not msg:
        return resp(404, {'error': 'Сообщение не найдено'})

    new_state = not msg['is_pinned']
    if new_state:
        cur.execute(
            f"UPDATE {schema}.chat_messages SET is_pinned = TRUE, pinned_at = NOW(), pinned_by = %s WHERE id = %s",
            (user['id'], message_id)
        )
    else:
        cur.execute(
            f"UPDATE {schema}.chat_messages SET is_pinned = FALSE, pinned_at = NULL, pinned_by = NULL WHERE id = %s",
            (message_id,)
        )
    conn.commit()
    return resp(200, {'pinned': new_state})


def get_pinned(cur, schema, user, qs):
    """Получить закреплённые сообщения чата."""
    chat_id = qs.get('chat_id')
    if not chat_id:
        return resp(400, {'error': 'chat_id обязателен'})

    cur.execute(
        f"SELECT 1 FROM {schema}.chat_members WHERE chat_id = %s AND user_id = %s",
        (chat_id, user['id'])
    )
    if not cur.fetchone():
        return resp(403, {'error': 'Нет доступа к чату'})

    cur.execute(
        f"SELECT cm.id, cm.content, cm.subject, cm.created_at, cm.pinned_at, "
        f"cm.sender_user_id, cm.sender_driver_id, "
        f"COALESCE(du.full_name, dr.full_name) as sender_name "
        f"FROM {schema}.chat_messages cm "
        f"LEFT JOIN {schema}.dashboard_users du ON du.id = cm.sender_user_id "
        f"LEFT JOIN {schema}.drivers dr ON dr.id = cm.sender_driver_id "
        f"WHERE cm.chat_id = %s AND cm.is_pinned = TRUE "
        f"ORDER BY cm.pinned_at DESC",
        (chat_id,)
    )
    return resp(200, {'pinned': cur.fetchall()})


def get_routes(cur, schema):
    """Получить список маршрутов для вставки в сообщение."""
    cur.execute(
        f"SELECT id, route_number, name FROM {schema}.routes WHERE is_active = TRUE ORDER BY route_number"
    )
    rows = cur.fetchall()
    return resp(200, {'routes': rows})


def get_vehicles(cur, schema):
    """Получить список транспорта для вставки в сообщение."""
    cur.execute(
        f"SELECT id, board_number, model FROM {schema}.vehicles WHERE is_active = TRUE ORDER BY board_number"
    )
    rows = cur.fetchall()
    return resp(200, {'vehicles': rows})