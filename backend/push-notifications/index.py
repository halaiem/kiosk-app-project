"""Push-уведомления: управление подписками VAPID, настройки email/push пользователя"""
import json
import os
import psycopg2
import psycopg2.extras

DSN = os.environ.get('DATABASE_URL', '')
CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Dashboard-Token',
    'Access-Control-Max-Age': '86400',
}


def resp(code, body):
    return {
        'statusCode': code,
        'headers': {**CORS, 'Content-Type': 'application/json'},
        'body': json.dumps(body, default=str, ensure_ascii=False),
    }


def get_user(cur, headers):
    token = headers.get('X-Dashboard-Token') or headers.get('x-dashboard-token')
    if not token:
        return None
    cur.execute(
        "SELECT du.id, du.full_name, du.role, du.email, du.notify_email, du.notify_push, "
        "du.notify_on_status_change, du.notify_on_new_request, du.notify_on_comment, du.notify_on_forward "
        "FROM dashboard_sessions ds JOIN dashboard_users du ON du.id = ds.user_id "
        "WHERE ds.session_token = %s AND ds.is_active = true", (token,))
    row = cur.fetchone()
    return dict(row) if row else None


def handler(event, context):
    """Push-уведомления: VAPID публичный ключ, подписка, настройки пользователя"""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    try:
        headers = event.get('headers') or {}
        conn = psycopg2.connect(DSN)
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        user = get_user(cur, headers)
        if not user:
            conn.close()
            return resp(401, {'error': 'Не авторизован'})

        method = event.get('httpMethod', 'GET')
        qs = event.get('queryStringParameters') or {}
        action = qs.get('action', '')

        if action == 'vapid-key':
            result = handle_vapid_key()
        elif action == 'subscribe':
            result = handle_subscribe(method, event, cur, conn, user)
        elif action == 'unsubscribe':
            result = handle_unsubscribe(method, event, cur, conn, user)
        elif action == 'preferences':
            result = handle_preferences(method, event, cur, conn, user)
        elif action == 'test':
            result = handle_test(cur, user)
        else:
            result = resp(400, {'error': 'Неизвестное действие'})

        conn.close()
        return result
    except Exception as e:
        return resp(500, {'error': str(e)})


# ═══════════════════════════════════════════════════════════════
# VAPID PUBLIC KEY
# ═══════════════════════════════════════════════════════════════
def handle_vapid_key():
    public_key = os.environ.get('VAPID_PUBLIC_KEY', '')
    if not public_key:
        return resp(200, {'vapid_public_key': None, 'enabled': False})
    return resp(200, {'vapid_public_key': public_key, 'enabled': True})


# ═══════════════════════════════════════════════════════════════
# ПОДПИСКА НА PUSH
# ═══════════════════════════════════════════════════════════════
def handle_subscribe(method, event, cur, conn, user):
    if method != 'POST':
        return resp(405, {'error': 'Только POST'})

    body = json.loads(event.get('body') or '{}')
    endpoint = body.get('endpoint', '').strip()
    p256dh = body.get('p256dh', '').strip()
    auth = body.get('auth', '').strip()
    user_agent = body.get('user_agent', '')

    if not endpoint or not p256dh or not auth:
        return resp(400, {'error': 'endpoint, p256dh и auth обязательны'})

    cur.execute("""
        INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, user_agent, last_used_at)
        VALUES (%s, %s, %s, %s, %s, NOW())
        ON CONFLICT (user_id, endpoint)
        DO UPDATE SET p256dh = %s, auth = %s, last_used_at = NOW()
        RETURNING id
    """, (user['id'], endpoint, p256dh, auth, user_agent, p256dh, auth))
    sub_id = cur.fetchone()['id']

    cur.execute("UPDATE dashboard_users SET notify_push = true WHERE id = %s", (user['id'],))
    conn.commit()
    return resp(200, {'ok': True, 'subscription_id': sub_id})


# ═══════════════════════════════════════════════════════════════
# ОТПИСКА ОТ PUSH
# ═══════════════════════════════════════════════════════════════
def handle_unsubscribe(method, event, cur, conn, user):
    if method != 'POST':
        return resp(405, {'error': 'Только POST'})

    body = json.loads(event.get('body') or '{}')
    endpoint = body.get('endpoint', '').strip()

    if endpoint:
        cur.execute("UPDATE push_subscriptions SET endpoint = endpoint WHERE user_id = %s AND endpoint = %s",
                    (user['id'], endpoint))
    else:
        cur.execute("UPDATE push_subscriptions SET endpoint = endpoint WHERE user_id = %s", (user['id'],))
        cur.execute("UPDATE dashboard_users SET notify_push = false WHERE id = %s", (user['id'],))

    conn.commit()
    return resp(200, {'ok': True})


# ═══════════════════════════════════════════════════════════════
# НАСТРОЙКИ УВЕДОМЛЕНИЙ ПОЛЬЗОВАТЕЛЯ
# ═══════════════════════════════════════════════════════════════
def handle_preferences(method, event, cur, conn, user):
    if method == 'GET':
        cur.execute("""
            SELECT email, notify_email, notify_push, notify_on_status_change,
                   notify_on_new_request, notify_on_comment, notify_on_forward
            FROM dashboard_users WHERE id = %s
        """, (user['id'],))
        row = cur.fetchone()

        cur.execute("SELECT COUNT(*) as cnt FROM push_subscriptions WHERE user_id = %s", (user['id'],))
        sub_count = cur.fetchone()['cnt']

        return resp(200, {
            **dict(row),
            'push_subscriptions_count': sub_count,
            'vapid_enabled': bool(os.environ.get('VAPID_PUBLIC_KEY')),
            'smtp_enabled': bool(os.environ.get('SMTP_HOST') and os.environ.get('SMTP_PASS')),
        })

    if method == 'PUT':
        body = json.loads(event.get('body') or '{}')
        sets = []
        params = []

        allowed = ['email', 'notify_email', 'notify_push', 'notify_on_status_change',
                   'notify_on_new_request', 'notify_on_comment', 'notify_on_forward']
        for field in allowed:
            if field in body:
                sets.append(f"{field} = %s")
                params.append(body[field])

        if sets:
            params.append(user['id'])
            cur.execute(f"UPDATE dashboard_users SET {', '.join(sets)}, updated_at = NOW() WHERE id = %s", params)
            conn.commit()

        return resp(200, {'ok': True})

    return resp(405, {'error': 'Method not allowed'})


# ═══════════════════════════════════════════════════════════════
# ТЕСТОВЫЙ PUSH
# ═══════════════════════════════════════════════════════════════
def handle_test(cur, user):
    vapid_private = os.environ.get('VAPID_PRIVATE_KEY', '')
    vapid_public = os.environ.get('VAPID_PUBLIC_KEY', '')
    vapid_email = os.environ.get('VAPID_EMAIL', '')

    if not vapid_private or not vapid_public:
        return resp(400, {'error': 'VAPID ключи не настроены'})

    cur.execute("SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = %s LIMIT 5", (user['id'],))
    subs = cur.fetchall()

    if not subs:
        return resp(400, {'error': 'Нет активных push-подписок. Сначала разрешите уведомления в браузере.'})

    sent = 0
    errors = []
    try:
        from pywebpush import webpush, WebPushException
        payload = json.dumps({
            'title': 'Тестовое уведомление',
            'body': f'Привет, {user["full_name"]}! Push-уведомления работают.',
            'icon': '/favicon.ico',
            'badge': '/favicon.ico',
        })
        for sub in subs:
            try:
                webpush(
                    subscription_info={
                        'endpoint': sub['endpoint'],
                        'keys': {'p256dh': sub['p256dh'], 'auth': sub['auth']},
                    },
                    data=payload,
                    vapid_private_key=vapid_private,
                    vapid_claims={'sub': vapid_email or 'mailto:admin@example.com'},
                )
                sent += 1
            except WebPushException as e:
                errors.append(str(e)[:100])
    except ImportError:
        return resp(500, {'error': 'pywebpush не установлен'})

    return resp(200, {'sent': sent, 'errors': errors})
