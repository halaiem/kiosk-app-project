import json
import os
import base64
import uuid
import time
import psycopg2
import psycopg2.extras
import boto3

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Dashboard-Token',
}

# ── In-memory TTL cache ───────────────────────────────────────────────────────
_cache: dict = {}

def cache_get(key: str):
    entry = _cache.get(key)
    if entry and time.time() < entry['exp']:
        return entry['val']
    return None

def cache_set(key: str, val, ttl: int = 300):
    _cache[key] = {'val': val, 'exp': time.time() + ttl}

def cache_del(key: str):
    _cache.pop(key, None)
# ─────────────────────────────────────────────────────────────────────────────

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

    method = event.get('httpMethod', 'GET')
    qs = event.get('queryStringParameters') or {}
    action = qs.get('action', '')

    if action not in ('reactions', 'pinned', 'routes', 'vehicles', 'filters', 'readers'):
        cur.execute(f"UPDATE {schema}.chat_members SET is_online = true, last_seen_at = NOW() WHERE user_id = %s", (user['id'],))
        conn.commit()

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
            return get_routes_list(cur, schema)
        elif method == 'GET' and action == 'vehicles':
            return get_vehicles_list(cur, schema)
        elif method == 'GET' and action == 'filters':
            return get_filters(cur, schema)
        elif method == 'POST' and action == 'add_members':
            return add_members(cur, conn, schema, user, event)
        else:
            return resp(400, {'error': 'Неизвестное действие'})
    finally:
        conn.close()


def get_users(cur, schema, user):
    # Онлайн-статусы меняются быстро — TTL 30с; список пользователей — 120с
    cached = cache_get(f'users:{schema}')
    if cached is None:
        cur.execute(
            f"SELECT du.id, du.full_name, du.role, du.is_active, "
            f"COALESCE(cm.is_online, false) as is_online, cm.last_seen_at "
            f"FROM {schema}.dashboard_users du "
            f"LEFT JOIN (SELECT DISTINCT ON (user_id) user_id, is_online, last_seen_at "
            f"  FROM {schema}.chat_members WHERE user_id IS NOT NULL ORDER BY user_id, last_seen_at DESC NULLS LAST) cm "
            f"ON cm.user_id = du.id "
            f"WHERE du.is_active = true "
            f"ORDER BY du.full_name"
        )
        cached = cur.fetchall()
        cache_set(f'users:{schema}', cached, ttl=30)
    # Исключаем текущего пользователя из кешированного списка
    users = [u for u in cached if u['id'] != user['id']]
    return resp(200, {'users': users})


def get_drivers(cur, schema):
    cached = cache_get(f'drivers:{schema}')
    if cached is None:
        cur.execute(
            f"SELECT d.id, d.full_name, d.tab_number, d.vehicle_id, d.status, "
            f"v.board_number, r.route_number "
            f"FROM {schema}.drivers d "
            f"LEFT JOIN {schema}.vehicles v ON v.id = d.vehicle_id "
            f"LEFT JOIN {schema}.routes r ON r.id = d.route_id "
            f"WHERE d.is_active = true "
            f"ORDER BY d.full_name"
        )
        cached = cur.fetchall()
        cache_set(f'drivers:{schema}', cached, ttl=120)
    return resp(200, {'drivers': cached})


def get_chats(cur, schema, user):
    cur.execute(
        f"SELECT c.id, c.title, c.created_at, c.last_message_at, c.default_type, "
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

    if chats:
        chat_ids = [c['id'] for c in chats]
        cur.execute(
            f"SELECT cm.chat_id, cm.user_id, cm.driver_id, cm.is_online, cm.last_seen_at, "
            f"COALESCE(du.full_name, dr.full_name) as name, "
            f"COALESCE(du.role, 'driver') as role "
            f"FROM {schema}.chat_members cm "
            f"LEFT JOIN {schema}.dashboard_users du ON du.id = cm.user_id "
            f"LEFT JOIN {schema}.drivers dr ON dr.id = cm.driver_id "
            f"WHERE cm.chat_id IN %s", (tuple(chat_ids),)
        )
        members_rows = cur.fetchall()
        members_by_chat = {}
        for m in members_rows:
            cid = m['chat_id']
            if cid not in members_by_chat:
                members_by_chat[cid] = []
            members_by_chat[cid].append(m)
        for chat in chats:
            chat['members'] = members_by_chat.get(chat['id'], [])

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
        f"cm.status, cm.is_pinned, cm.pinned_at, cm.message_type, "
        f"COALESCE(du.full_name, dr.full_name) as sender_name, "
        f"COALESCE(du.role, 'driver') as sender_role "
        f"FROM {schema}.chat_messages cm "
        f"LEFT JOIN {schema}.dashboard_users du ON du.id = cm.sender_user_id "
        f"LEFT JOIN {schema}.drivers dr ON dr.id = cm.sender_driver_id "
        f"WHERE cm.chat_id = %s ORDER BY cm.created_at ASC", (chat_id,)
    )
    msgs = cur.fetchall()

    if msgs:
        msg_ids = [m['id'] for m in msgs]
        cur.execute(
            f"SELECT id, message_id, file_name, file_url, file_size, content_type "
            f"FROM {schema}.chat_files WHERE message_id IN %s", (tuple(msg_ids),)
        )
        files_rows = cur.fetchall()
        files_by_msg = {}
        for f in files_rows:
            mid = f['message_id']
            if mid not in files_by_msg:
                files_by_msg[mid] = []
            files_by_msg[mid].append(f)
        for m in msgs:
            m['files'] = files_by_msg.get(m['id'], [])

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
    default_type = body.get('default_type', 'message')
    if default_type not in ('message', 'notification'):
        default_type = 'message'

    if not title:
        return resp(400, {'error': 'Укажите название чата'})
    if not member_user_ids and not member_driver_ids:
        return resp(400, {'error': 'Добавьте хотя бы одного участника'})

    cur.execute(
        f"INSERT INTO {schema}.chats (title, created_by, default_type) VALUES (%s, %s, %s) RETURNING id",
        (title, user['id'], default_type)
    )
    chat_id = cur.fetchone()['id']

    cur.execute(
        f"INSERT INTO {schema}.chat_members (chat_id, user_id, role) VALUES (%s, %s, 'creator')",
        (chat_id, user['id'])
    )

    if member_user_ids:
        vals = [(chat_id, uid) for uid in member_user_ids]
        psycopg2.extras.execute_values(
            cur, f"INSERT INTO {schema}.chat_members (chat_id, user_id) VALUES %s ON CONFLICT DO NOTHING", vals
        )
    if member_driver_ids:
        vals = [(chat_id, did) for did in member_driver_ids]
        psycopg2.extras.execute_values(
            cur, f"INSERT INTO {schema}.chat_members (chat_id, driver_id) VALUES %s", vals
        )

    conn.commit()
    return resp(201, {'chat_id': chat_id})


def send_message(cur, conn, schema, user, event):
    body = json.loads(event.get('body') or '{}')
    chat_id = body.get('chat_id')
    content = body.get('content', '').strip()
    subject = body.get('subject', '').strip() or None
    message_type = body.get('message_type', 'message')
    if message_type not in ('message', 'notification'):
        message_type = 'message'

    if not chat_id or not content:
        return resp(400, {'error': 'chat_id и content обязательны'})

    cur.execute(
        f"SELECT 1 FROM {schema}.chat_members WHERE chat_id = %s AND user_id = %s",
        (chat_id, user['id'])
    )
    if not cur.fetchone():
        return resp(403, {'error': 'Нет доступа к чату'})

    cur.execute(
        f"INSERT INTO {schema}.chat_messages (chat_id, sender_user_id, content, subject, message_type) "
        f"VALUES (%s, %s, %s, %s, %s) RETURNING id, created_at",
        (chat_id, user['id'], content, subject, message_type)
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
        f"cm.sender_user_id, "
        f"COALESCE(du.full_name, dr.full_name) as sender_name "
        f"FROM {schema}.chat_messages cm "
        f"LEFT JOIN {schema}.dashboard_users du ON du.id = cm.sender_user_id "
        f"LEFT JOIN {schema}.drivers dr ON dr.id = cm.sender_driver_id "
        f"WHERE cm.chat_id = %s AND cm.is_pinned = TRUE "
        f"ORDER BY cm.pinned_at DESC",
        (chat_id,)
    )
    return resp(200, {'pinned': cur.fetchall()})


def get_routes_list(cur, schema):
    """Список маршрутов. TTL 5 минут — данные меняются редко."""
    cached = cache_get(f'routes:{schema}')
    if cached is None:
        cur.execute(
            f"SELECT id, route_number, name FROM {schema}.routes "
            f"WHERE is_active = TRUE ORDER BY route_number"
        )
        cached = cur.fetchall()
        cache_set(f'routes:{schema}', cached, ttl=300)
    return resp(200, {'routes': cached})


def get_vehicles_list(cur, schema):
    """Список транспорта. TTL 5 минут — данные меняются редко."""
    cached = cache_get(f'vehicles:{schema}')
    if cached is None:
        cur.execute(
            f"SELECT v.id, v.board_number, v.model, v.label, "
            f"r.route_number "
            f"FROM {schema}.vehicles v "
            f"LEFT JOIN {schema}.routes r ON r.id = v.assigned_route_id "
            f"WHERE v.transport_status = 'active' ORDER BY v.board_number"
        )
        cached = cur.fetchall()
        cache_set(f'vehicles:{schema}', cached, ttl=300)
    return resp(200, {'vehicles': cached})


def get_filters(cur, schema):
    """Все уникальные значения для фильтрации ТС и водителей. TTL 5 мин."""
    cached = cache_get(f'filters:{schema}')
    if cached is None:
        cur.execute(
            f"SELECT DISTINCT transport_type FROM {schema}.vehicles "
            f"WHERE transport_status = 'active' AND transport_type IS NOT NULL ORDER BY transport_type"
        )
        vehicle_types = [r['transport_type'] for r in cur.fetchall()]

        cur.execute(
            f"SELECT DISTINCT model FROM {schema}.vehicles "
            f"WHERE transport_status = 'active' AND model IS NOT NULL ORDER BY model"
        )
        vehicle_models = [r['model'] for r in cur.fetchall()]

        cur.execute(
            f"SELECT DISTINCT fuel_type FROM {schema}.vehicles "
            f"WHERE transport_status = 'active' AND fuel_type IS NOT NULL ORDER BY fuel_type"
        )
        fuel_types = [r['fuel_type'] for r in cur.fetchall()]

        cur.execute(
            f"SELECT DISTINCT manufacture_year FROM {schema}.vehicles "
            f"WHERE transport_status = 'active' AND manufacture_year IS NOT NULL ORDER BY manufacture_year DESC"
        )
        years = [r['manufacture_year'] for r in cur.fetchall()]

        cur.execute(
            f"SELECT DISTINCT color FROM {schema}.vehicles "
            f"WHERE transport_status = 'active' AND color IS NOT NULL AND color != '' ORDER BY color"
        )
        colors = [r['color'] for r in cur.fetchall()]

        cur.execute(
            f"SELECT DISTINCT manufacturer FROM {schema}.vehicles "
            f"WHERE transport_status = 'active' AND manufacturer IS NOT NULL AND manufacturer != '' ORDER BY manufacturer"
        )
        manufacturers = [r['manufacturer'] for r in cur.fetchall()]

        cur.execute(
            f"SELECT DISTINCT vehicle_type FROM {schema}.drivers "
            f"WHERE is_active = true AND vehicle_type IS NOT NULL ORDER BY vehicle_type"
        )
        driver_vehicle_types = [r['vehicle_type'] for r in cur.fetchall()]

        cur.execute(
            f"SELECT DISTINCT shift_status FROM {schema}.drivers "
            f"WHERE is_active = true AND shift_status IS NOT NULL ORDER BY shift_status"
        )
        shift_statuses = [r['shift_status'] for r in cur.fetchall()]

        cur.execute(
            f"SELECT DISTINCT driver_status FROM {schema}.drivers "
            f"WHERE is_active = true AND driver_status IS NOT NULL ORDER BY driver_status"
        )
        driver_statuses = [r['driver_status'] for r in cur.fetchall()]

        cur.execute(
            f"SELECT v.transport_type, v.model, v.board_number, v.id::text "
            f"FROM {schema}.vehicles v "
            f"WHERE v.transport_status = 'active' ORDER BY v.transport_type, v.model, v.board_number"
        )
        vehicle_index = cur.fetchall()

        cur.execute(
            f"SELECT d.id, d.vehicle_type, d.vehicle_number, d.route_number "
            f"FROM {schema}.drivers d WHERE d.is_active = true"
        )
        driver_index = cur.fetchall()

        cached = {
            'vehicle_types': vehicle_types,
            'vehicle_models': vehicle_models,
            'fuel_types': fuel_types,
            'years': years,
            'colors': colors,
            'manufacturers': manufacturers,
            'driver_vehicle_types': driver_vehicle_types,
            'shift_statuses': shift_statuses,
            'driver_statuses': driver_statuses,
            'vehicle_index': vehicle_index,
            'driver_index': driver_index,
        }
        cache_set(f'filters:{schema}', cached, ttl=300)
    return resp(200, cached)


def add_members(cur, conn, schema, user, event):
    """Добавить участников в существующий чат."""
    body = json.loads(event.get('body') or '{}')
    chat_id = body.get('chat_id')
    user_ids = body.get('user_ids', [])
    driver_ids = body.get('driver_ids', [])

    if not chat_id:
        return resp(400, {'error': 'chat_id обязателен'})
    if not user_ids and not driver_ids:
        return resp(400, {'error': 'Укажите хотя бы одного участника'})

    cur.execute(
        f"SELECT 1 FROM {schema}.chat_members WHERE chat_id = %s AND user_id = %s",
        (chat_id, user['id'])
    )
    if not cur.fetchone():
        return resp(403, {'error': 'Нет доступа к чату'})

    added = 0
    if user_ids:
        psycopg2.extras.execute_values(
            cur, f"INSERT INTO {schema}.chat_members (chat_id, user_id) VALUES %s ON CONFLICT DO NOTHING",
            [(chat_id, uid) for uid in user_ids]
        )
        added += cur.rowcount
    if driver_ids:
        for did in driver_ids:
            cur.execute(
                f"SELECT 1 FROM {schema}.chat_members WHERE chat_id = %s AND driver_id = %s",
                (chat_id, did)
            )
            if not cur.fetchone():
                cur.execute(
                    f"INSERT INTO {schema}.chat_members (chat_id, driver_id) VALUES (%s, %s)",
                    (chat_id, did)
                )
                added += 1

    conn.commit()
    # Инвалидируем кеш пользователей — онлайн-список изменился
    cache_del(f'users:{schema}')
    return resp(200, {'added': added})