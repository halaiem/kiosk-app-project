"""API заявок на обслуживание ТС: полный жизненный цикл, комментарии, переадресация, уведомления email+push, настройки, архив"""
import json
import os
import psycopg2
import psycopg2.extras
import base64
import uuid

DSN = os.environ.get('DATABASE_URL', '')
CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Dashboard-Token',
    'Access-Control-Max-Age': '86400',
}

ALL_STATUSES = ['new', 'reviewing', 'in_progress', 'needs_clarification', 'approved', 'rejected', 'resolved', 'closed', 'cancelled', 'expired']
STATUS_LABELS = {
    'new': 'Новая', 'reviewing': 'На рассмотрении', 'in_progress': 'В работе',
    'needs_clarification': 'Требует уточнения', 'approved': 'Одобрена', 'rejected': 'Отклонена',
    'resolved': 'Решено', 'closed': 'Закрыта', 'cancelled': 'Отменена', 'expired': 'Просрочена',
    'needs_info': 'Требует информации',
}

ROLE_LABELS = {
    'admin': 'Администратор', 'dispatcher': 'Диспетчер',
    'technician': 'Технолог', 'mechanic': 'Механик',
    'engineer': 'Инженер', 'manager': 'Управляющий',
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
        "SELECT du.id, du.employee_id, du.full_name, du.role "
        "FROM dashboard_sessions ds JOIN dashboard_users du ON du.id = ds.user_id "
        "WHERE ds.session_token = %s AND ds.is_active = true", (token,))
    row = cur.fetchone()
    return {'id': row['id'], 'employeeId': row['employee_id'], 'name': row['full_name'], 'role': row['role']} if row else None


def log_action(cur, request_id, user, action, old_status=None, new_status=None, comment=None, metadata=None):
    cur.execute(
        "INSERT INTO service_logs (request_id, user_id, user_name, user_role, action, old_status, new_status, comment, metadata) "
        "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)",
        (request_id, user['id'], user['name'], user['role'], action, old_status, new_status, comment,
         json.dumps(metadata) if metadata else None))


def send_notification(cur, request_id, user_id, notif_type, title, message=''):
    cur.execute(
        "INSERT INTO ticket_notifications (request_id, user_id, type, title, message) VALUES (%s, %s, %s, %s, %s)",
        (request_id, user_id, notif_type, title, message))


def notify_creator(cur, request_id, notif_type, title, message=''):
    cur.execute("SELECT created_by_user_id FROM service_requests WHERE id = %s", (request_id,))
    row = cur.fetchone()
    if row and row['created_by_user_id']:
        send_notification(cur, request_id, row['created_by_user_id'], notif_type, title, message)


def get_setting(cur, key, default=None):
    cur.execute("SELECT value FROM ticket_settings WHERE key = %s", (key,))
    row = cur.fetchone()
    return row['value'] if row else default


_NOTIF_EVENTS_CACHE = None
_NOTIF_EVENTS_CACHE_AT = 0

def get_notif_events(cur):
    import time
    global _NOTIF_EVENTS_CACHE, _NOTIF_EVENTS_CACHE_AT
    now = time.time()
    if _NOTIF_EVENTS_CACHE is not None and now - _NOTIF_EVENTS_CACHE_AT < 60:
        return _NOTIF_EVENTS_CACHE
    val = get_setting(cur, 'notif_events', {})
    if isinstance(val, str):
        try:
            val = json.loads(val)
        except Exception:
            val = {}
    _NOTIF_EVENTS_CACHE = val if isinstance(val, dict) else {}
    _NOTIF_EVENTS_CACHE_AT = now
    return _NOTIF_EVENTS_CACHE


NOTIF_TYPE_TO_EVENT = {
    'new_request':    'on_new_request',
    'status_changed': 'on_status_change',
    'new_comment':    'on_comment',
    'forwarded':      'on_forward',
    'forwarded_to_you': 'on_forward',
    'approved':       'on_approved',
    'rejected':       'on_rejected',
    'resolved':       'on_resolved',
    'closed':         'on_closed',
    'cancelled':      'on_cancelled',
    'needs_clarification': 'on_needs_clarification',
}


# ═══════════════════════════════════════════════════════════════
# EMAIL УВЕДОМЛЕНИЯ
# ═══════════════════════════════════════════════════════════════
def send_email_notification(to_email, to_name, subject, html_body, text_body):
    smtp_host = os.environ.get('SMTP_HOST', '')
    smtp_port = int(os.environ.get('SMTP_PORT', '587'))
    smtp_user = os.environ.get('SMTP_USER', '')
    smtp_pass = os.environ.get('SMTP_PASS', '')
    smtp_from = os.environ.get('SMTP_FROM', smtp_user)

    if not smtp_host or not smtp_user or not smtp_pass or not to_email:
        return False

    try:
        import smtplib
        from email.mime.text import MIMEText
        from email.mime.multipart import MIMEMultipart

        msg = MIMEMultipart('alternative')
        msg['From'] = f"Система заявок <{smtp_from}>"
        msg['To'] = f"{to_name} <{to_email}>" if to_name else to_email
        msg['Subject'] = subject
        msg.attach(MIMEText(text_body, 'plain', 'utf-8'))
        msg.attach(MIMEText(html_body, 'html', 'utf-8'))

        with smtplib.SMTP(smtp_host, smtp_port, timeout=10) as server:
            server.starttls()
            server.login(smtp_user, smtp_pass)
            server.send_message(msg)
        return True
    except Exception:
        return False


def build_email_html(title, request_number, status_label, message, extra_rows=None):
    rows_html = ''
    if extra_rows:
        for label, value in extra_rows:
            rows_html += f'<tr><td style="padding:6px 12px;color:#888;font-size:13px;width:140px">{label}</td><td style="padding:6px 12px;font-size:13px">{value}</td></tr>'

    return f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;background:#f5f5f5;margin:0;padding:20px">
<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)">
  <div style="background:#1e293b;padding:20px 24px">
    <p style="margin:0;color:#94a3b8;font-size:12px;letter-spacing:.5px;text-transform:uppercase">Система управления заявками</p>
    <h1 style="margin:6px 0 0;color:#fff;font-size:20px">{title}</h1>
  </div>
  <div style="padding:20px 24px">
    <table style="width:100%;border-collapse:collapse;background:#f8fafc;border-radius:8px;overflow:hidden;margin-bottom:16px">
      <tr><td style="padding:6px 12px;color:#888;font-size:13px;width:140px">Заявка</td>
          <td style="padding:6px 12px;font-size:13px;font-family:monospace;font-weight:bold">{request_number}</td></tr>
      <tr style="background:#fff"><td style="padding:6px 12px;color:#888;font-size:13px">Статус</td>
          <td style="padding:6px 12px;font-size:13px;font-weight:bold;color:#0f172a">{status_label}</td></tr>
      {rows_html}
    </table>
    <div style="background:#f0f9ff;border-left:4px solid #0ea5e9;padding:12px 16px;border-radius:0 8px 8px 0;margin-bottom:16px">
      <p style="margin:0;color:#0c4a6e;font-size:14px">{message}</p>
    </div>
    <p style="margin:0;color:#94a3b8;font-size:12px">Это автоматическое сообщение системы управления заявками. Отвечать на него не нужно.</p>
  </div>
</div>
</body></html>"""


def _send_to_user(cur, user_id, notif_type, title, message, request_id, sr_number, sr_title, extra_rows, email_allowed, push_allowed):
    cur.execute(
        "SELECT id, role, email, full_name, notify_email, notify_push, notify_on_status_change, "
        "notify_on_new_request, notify_on_comment, notify_on_forward "
        "FROM dashboard_users WHERE id = %s", (user_id,))
    user = cur.fetchone()
    if not user:
        return

    send_notification(cur, request_id, user_id, notif_type, title, message)

    pref_map = {
        'status_changed': 'notify_on_status_change',
        'new_request': 'notify_on_new_request',
        'forwarded': 'notify_on_forward',
        'forwarded_to_you': 'notify_on_forward',
        'new_comment': 'notify_on_comment',
    }
    pref_key = pref_map.get(notif_type, 'notify_on_status_change')
    if not user.get(pref_key, True):
        return

    if email_allowed and user.get('notify_email') and user.get('email'):
        html = build_email_html(title, sr_number, sr_title, message, extra_rows)
        text = f"{title}\n\nЗаявка: {sr_number}\n{sr_title}\n\n{message}"
        send_email_notification(user['email'], user['full_name'], title, html, text)

    if push_allowed and user.get('notify_push'):
        send_push_to_user(cur, user_id, title, message, request_id)


def notify_user_full(cur, user_id, notif_type, title, message, request_id, sr_number='', sr_title='', extra_rows=None):
    events = get_notif_events(cur)
    event_key = NOTIF_TYPE_TO_EVENT.get(notif_type, 'on_status_change')
    event_cfg = events.get(event_key, {})
    email_allowed = event_cfg.get('email', True) if isinstance(event_cfg, dict) else True
    push_allowed = event_cfg.get('push', True) if isinstance(event_cfg, dict) else True
    _send_to_user(cur, user_id, notif_type, title, message, request_id, sr_number, sr_title, extra_rows, email_allowed, push_allowed)


def notify_creator_full(cur, request_id, notif_type, title, message, sr_number='', sr_title='', extra_rows=None):
    cur.execute("SELECT created_by_user_id FROM service_requests WHERE id = %s", (request_id,))
    row = cur.fetchone()
    if row and row['created_by_user_id']:
        notify_user_full(cur, row['created_by_user_id'], notif_type, title, message,
                         request_id, sr_number, sr_title, extra_rows)


def notify_by_recipients(cur, request_id, notif_type, title, message, sr_number='', sr_title='', extra_rows=None, exclude_user_id=None):
    """Отправляет уведомление согласно настройкам recipients из ticket_settings."""
    events = get_notif_events(cur)
    event_key = NOTIF_TYPE_TO_EVENT.get(notif_type, 'on_status_change')
    event_cfg = events.get(event_key, {}) if isinstance(events, dict) else {}
    if not isinstance(event_cfg, dict):
        event_cfg = {}

    email_allowed = event_cfg.get('email', True)
    push_allowed = event_cfg.get('push', True)
    recipients_cfg = event_cfg.get('recipients', {})
    if not isinstance(recipients_cfg, dict):
        recipients_cfg = {'creator': True, 'assignee': True}

    cur.execute("""
        SELECT created_by_user_id, assigned_to_user_id, target_role
        FROM service_requests WHERE id = %s
    """, (request_id,))
    sr = cur.fetchone()
    if not sr:
        return

    notified = set()

    def _notify(uid):
        if uid and uid != exclude_user_id and uid not in notified:
            notified.add(uid)
            _send_to_user(cur, uid, notif_type, title, message, request_id, sr_number, sr_title, extra_rows, email_allowed, push_allowed)

    if recipients_cfg.get('creator') and sr['created_by_user_id']:
        _notify(sr['created_by_user_id'])

    if recipients_cfg.get('assignee') and sr['assigned_to_user_id']:
        _notify(sr['assigned_to_user_id'])

    role_keys = ['dispatcher', 'technician', 'mechanic', 'admin']
    extra_roles = [r for r in role_keys if recipients_cfg.get(r)]
    if extra_roles:
        placeholders = ','.join(['%s'] * len(extra_roles))
        cur.execute(f"SELECT id FROM dashboard_users WHERE role IN ({placeholders}) AND is_active = true", extra_roles)
        for row in cur.fetchall():
            _notify(row['id'])


# ═══════════════════════════════════════════════════════════════
# WEB PUSH УВЕДОМЛЕНИЯ
# ═══════════════════════════════════════════════════════════════
def send_push_to_user(cur, user_id, title, body, request_id=None):
    vapid_private = os.environ.get('VAPID_PRIVATE_KEY', '')
    vapid_public = os.environ.get('VAPID_PUBLIC_KEY', '')
    vapid_email = os.environ.get('VAPID_EMAIL', '')

    if not vapid_private or not vapid_public:
        return

    cur.execute("SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = %s", (user_id,))
    subs = cur.fetchall()
    if not subs:
        return

    try:
        from pywebpush import webpush, WebPushException
        payload = json.dumps({
            'title': title,
            'body': body,
            'icon': '/favicon.ico',
            'badge': '/favicon.ico',
            'data': {'request_id': request_id},
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
            except WebPushException as e:
                if '410' in str(e) or '404' in str(e):
                    cur.execute("UPDATE push_subscriptions SET endpoint = endpoint WHERE endpoint = %s AND user_id = %s",
                                (sub['endpoint'], user_id))
    except ImportError:
        pass


def handler(event, context):
    """API заявок: полный жизненный цикл, комментарии, переадресация, уведомления, настройки"""
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

        handlers = {
            'requests': lambda: handle_requests(method, qs, event, cur, conn, user),
            'logs': lambda: handle_logs(qs, cur, user),
            'docs': lambda: handle_docs(method, qs, event, cur, conn, user),
            'email': lambda: handle_email(method, event, cur, conn, user),
            'stats': lambda: handle_stats(cur, user),
            'export': lambda: handle_export(qs, cur, user),
            'routing': lambda: handle_routing(method, event, cur, conn, user),
            'comments': lambda: handle_comments(method, qs, event, cur, conn, user),
            'forward': lambda: handle_forward(method, event, cur, conn, user),
            'notifications': lambda: handle_ticket_notifications(method, qs, event, cur, conn, user),
            'settings': lambda: handle_settings(method, event, cur, conn, user),
            'archive': lambda: handle_archive(qs, cur, user),
        }

        result = handlers.get(action, lambda: resp(400, {'error': 'Неизвестное действие'}))()
        conn.close()
        return result
    except Exception as e:
        import traceback
        return resp(500, {'error': str(e)})


# ═══════════════════════════════════════════════════════════════
# ЗАЯВКИ
# ═══════════════════════════════════════════════════════════════
def handle_requests(method, qs, event, cur, conn, user):
    if method == 'GET':
        request_id = qs.get('id')
        if request_id:
            cur.execute("""
                SELECT sr.*, du_c.full_name as creator_name, du_a.full_name as assignee_name,
                       du_c.role as creator_role
                FROM service_requests sr
                LEFT JOIN dashboard_users du_c ON du_c.id = sr.created_by_user_id
                LEFT JOIN dashboard_users du_a ON du_a.id = sr.assigned_to_user_id
                WHERE sr.id = %s
            """, (int(request_id),))
            row = cur.fetchone()
            if not row:
                return resp(404, {'error': 'Заявка не найдена'})
            cur.execute("SELECT * FROM service_logs WHERE request_id = %s ORDER BY created_at", (int(request_id),))
            logs = cur.fetchall()
            cur.execute("SELECT * FROM ticket_comments WHERE request_id = %s ORDER BY created_at", (int(request_id),))
            comments = cur.fetchall()
            return resp(200, {'request': dict(row), 'logs': [dict(l) for l in logs], 'comments': [dict(c) for c in comments]})

        tab = qs.get('tab', 'assigned')
        status_filter = qs.get('status')
        priority_filter = qs.get('priority')
        category_filter = qs.get('category')
        vehicle_filter = qs.get('vehicle_label')
        creator_filter = qs.get('creator_id')
        date_from = qs.get('date_from')
        date_to = qs.get('date_to')

        where = []
        params = []

        if status_filter and status_filter != 'all':
            where.append("sr.status = %s")
            params.append(status_filter)
        if priority_filter and priority_filter != 'all':
            where.append("sr.priority = %s")
            params.append(priority_filter)
        if category_filter and category_filter != 'all':
            where.append("sr.category = %s")
            params.append(category_filter)
        if vehicle_filter:
            where.append("sr.vehicle_label ILIKE %s")
            params.append(f'%{vehicle_filter}%')
        if creator_filter:
            where.append("sr.created_by_user_id = %s")
            params.append(int(creator_filter))
        if date_from:
            where.append("sr.created_at >= %s")
            params.append(date_from)
        if date_to:
            where.append("sr.created_at <= %s")
            params.append(date_to)

        role = user['role']
        if tab == 'sent':
            where.append("sr.created_by_user_id = %s")
            params.append(user['id'])
        elif tab == 'assigned':
            if role == 'admin':
                pass
            else:
                where.append("(sr.assigned_to_user_id = %s OR sr.target_role = %s OR sr.assigned_to_user_id IS NULL)")
                params.extend([user['id'], role])
        else:
            if role in ('mechanic', 'technician', 'dispatcher', 'engineer', 'manager'):
                where.append("(sr.assigned_to_user_id = %s OR sr.target_role = %s OR sr.created_by_user_id = %s OR sr.assigned_to_user_id IS NULL)")
                params.extend([user['id'], role, user['id']])

        search = qs.get('search', '').strip()
        if search:
            where.append("(sr.request_number ILIKE %s OR sr.title ILIKE %s OR sr.vehicle_label ILIKE %s OR du_c.full_name ILIKE %s)")
            q = f'%{search}%'
            params.extend([q, q, q, q])

        where.append("sr.status NOT IN ('closed', 'cancelled', 'expired')")

        where_clause = ("WHERE " + " AND ".join(where)) if where else ""

        cur.execute(f"""
            SELECT sr.*, du_c.full_name as creator_name, du_a.full_name as assignee_name,
                   du_c.role as creator_role,
                   (SELECT COUNT(*) FROM ticket_comments tc WHERE tc.request_id = sr.id) as comment_count
            FROM service_requests sr
            LEFT JOIN dashboard_users du_c ON du_c.id = sr.created_by_user_id
            LEFT JOIN dashboard_users du_a ON du_a.id = sr.assigned_to_user_id
            {where_clause}
            ORDER BY
              CASE sr.priority WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END,
              sr.created_at DESC
            LIMIT 500
        """, params)
        rows = cur.fetchall()
        return resp(200, {'requests': [dict(r) for r in rows]})

    if method == 'POST':
        body = json.loads(event.get('body') or '{}')
        title = body.get('title', '').strip()
        if not title:
            return resp(400, {'error': 'Укажите заголовок заявки'})

        prefixes = get_setting(cur, 'number_prefixes', {})
        role_prefix = prefixes.get(user['role'], 'SR') if isinstance(prefixes, dict) else 'SR'
        cur.execute("SELECT nextval('service_request_number_seq')")
        seq = cur.fetchone()['nextval']
        req_number = f"{role_prefix}-{seq:05d}"

        vehicle_id = body.get('vehicle_id')
        vehicle_label = body.get('vehicle_label', '')
        if vehicle_id and not vehicle_label:
            cur.execute("SELECT label FROM vehicles WHERE id = %s", (vehicle_id,))
            vrow = cur.fetchone()
            if vrow:
                vehicle_label = vrow['label']

        target_role = body.get('target_role', '')
        assigned_to = body.get('assigned_to')

        if not assigned_to and target_role:
            cur.execute("SELECT id FROM dashboard_users WHERE role = %s AND is_active = true ORDER BY id LIMIT 1", (target_role,))
            arow = cur.fetchone()
            if arow:
                assigned_to = arow['id']
        elif not assigned_to:
            cur.execute("SELECT id FROM dashboard_users WHERE role = 'mechanic' AND is_active = true ORDER BY id LIMIT 1")
            mrow = cur.fetchone()
            assigned_to = mrow['id'] if mrow else None

        processing_times = get_setting(cur, 'processing_time', {})
        prio = body.get('priority', 'normal')
        deadline_hours = processing_times.get(prio, 48) if isinstance(processing_times, dict) else 48

        cur.execute("""
            INSERT INTO service_requests (
                request_number, vehicle_id, vehicle_label, source, source_type,
                created_by_user_id, created_by_role, assigned_to_user_id,
                title, description, priority, category, equipment_info, diagnostic_code,
                target_role, deadline_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW() + interval '%s hours')
            RETURNING id, request_number
        """, (
            req_number, vehicle_id, vehicle_label,
            body.get('source', user['role']),
            body.get('source_type', 'request'),
            user['id'], user['role'], assigned_to,
            title, body.get('description', ''),
            prio, body.get('category', ''),
            body.get('equipment_info', ''),
            body.get('diagnostic_code', ''),
            target_role or None,
            str(int(deadline_hours)),
        ))
        new = cur.fetchone()
        log_action(cur, new['id'], user, 'created', None, 'new',
                   f'Заявка {req_number} создана', {'title': title, 'vehicle': vehicle_label})

        notify_by_recipients(cur, new['id'], 'new_request',
                             f'Новая заявка {req_number}',
                             f'{title} — от {user["name"]} ({ROLE_LABELS.get(user["role"], user["role"])})',
                             req_number, title,
                             [('ТС', vehicle_label or '—'), ('Приоритет', prio)],
                             exclude_user_id=user['id'])

        conn.commit()
        return resp(201, {'id': new['id'], 'request_number': new['request_number']})

    if method == 'PUT':
        body = json.loads(event.get('body') or '{}')
        request_id = body.get('id') or qs.get('id')
        if not request_id:
            return resp(400, {'error': 'Укажите id заявки'})

        cur.execute("SELECT * FROM service_requests WHERE id = %s", (int(request_id),))
        sr = cur.fetchone()
        if not sr:
            return resp(404, {'error': 'Заявка не найдена'})

        old_status = sr['status']
        new_status = body.get('status', old_status)

        sets = []
        params = []

        for field in ('title', 'description', 'priority', 'category', 'equipment_info',
                      'assigned_to_user_id', 'diagnostic_code'):
            if field in body:
                sets.append(f"{field} = %s")
                params.append(body[field])

        if new_status != old_status:
            sets.append("status = %s")
            params.append(new_status)

            if new_status == 'reviewing':
                sets.append("review_started_at = NOW()")
            elif new_status == 'in_progress':
                sets.append("work_started_at = NOW()")
            elif new_status == 'resolved':
                sets.append("resolved_at = NOW()")
                for rf in ('resolved_by_name', 'resolved_by_position', 'resolved_by_employee_id', 'resolution_note'):
                    if rf in body:
                        sets.append(f"{rf} = %s")
                        params.append(body[rf])
            elif new_status == 'rejected':
                if body.get('rejection_reason'):
                    sets.append("rejection_reason = %s")
                    params.append(body['rejection_reason'])
            elif new_status == 'cancelled':
                if body.get('cancellation_reason'):
                    sets.append("cancellation_reason = %s")
                    params.append(body['cancellation_reason'])
            elif new_status == 'closed':
                sets.append("closed_at = NOW()")
            elif new_status == 'expired':
                sets.append("expired_at = NOW()")

            status_label = STATUS_LABELS.get(new_status, new_status)
            extra = [('Исполнитель', user['name']), ('Роль', ROLE_LABELS.get(user['role'], user['role']))]
            if new_status == 'rejected' and body.get('rejection_reason'):
                extra.append(('Причина', body['rejection_reason']))
            elif new_status == 'cancelled' and body.get('cancellation_reason'):
                extra.append(('Причина', body['cancellation_reason']))
            elif new_status == 'resolved' and body.get('resolution_note'):
                extra.append(('Решение', body['resolution_note'][:120]))
            notif_type_for_status = {
                'approved': 'approved', 'rejected': 'rejected', 'resolved': 'resolved',
                'closed': 'closed', 'cancelled': 'cancelled', 'needs_clarification': 'needs_clarification',
            }.get(new_status, 'status_changed')
            notify_by_recipients(cur, int(request_id), notif_type_for_status,
                                 f'Заявка {sr["request_number"]}: {status_label}',
                                 body.get('comment', f'Статус изменён на «{status_label}»'),
                                 sr['request_number'], sr['title'], extra,
                                 exclude_user_id=user['id'])

        if sets:
            sets.append("updated_at = NOW()")
            params.append(int(request_id))
            cur.execute(f"UPDATE service_requests SET {', '.join(sets)} WHERE id = %s", params)
            action_name = 'status_changed' if new_status != old_status else 'updated'
            log_action(cur, int(request_id), user, action_name, old_status, new_status,
                       body.get('comment', ''), body.get('metadata'))
            conn.commit()

        return resp(200, {'ok': True, 'old_status': old_status, 'new_status': new_status})

    return resp(405, {'error': 'Method not allowed'})


# ═══════════════════════════════════════════════════════════════
# КОММЕНТАРИИ (ДИАЛОГ)
# ═══════════════════════════════════════════════════════════════
def handle_comments(method, qs, event, cur, conn, user):
    if method == 'GET':
        request_id = qs.get('request_id')
        if not request_id:
            return resp(400, {'error': 'Укажите request_id'})
        cur.execute("SELECT * FROM ticket_comments WHERE request_id = %s ORDER BY created_at", (int(request_id),))
        return resp(200, {'comments': [dict(r) for r in cur.fetchall()]})

    if method == 'POST':
        body = json.loads(event.get('body') or '{}')
        request_id = body.get('request_id')
        message = body.get('message', '').strip()
        if not request_id or not message:
            return resp(400, {'error': 'Укажите request_id и message'})

        cur.execute("""
            INSERT INTO ticket_comments (request_id, user_id, user_name, user_role, message)
            VALUES (%s, %s, %s, %s, %s) RETURNING id, created_at
        """, (int(request_id), user['id'], user['name'], user['role'], message))
        comment = cur.fetchone()

        cur.execute("SELECT created_by_user_id, assigned_to_user_id, request_number FROM service_requests WHERE id = %s", (int(request_id),))
        sr = cur.fetchone()
        if sr:
            notify_by_recipients(cur, int(request_id), 'new_comment',
                                 f'Комментарий к заявке {sr["request_number"]}',
                                 f'{user["name"]}: {message[:120]}',
                                 sr['request_number'], sr.get('title', ''),
                                 exclude_user_id=user['id'])

        log_action(cur, int(request_id), user, 'comment_added', comment=message)
        conn.commit()
        return resp(201, {'id': comment['id'], 'created_at': str(comment['created_at'])})

    return resp(405, {'error': 'Method not allowed'})


# ═══════════════════════════════════════════════════════════════
# ПЕРЕАДРЕСАЦИЯ
# ═══════════════════════════════════════════════════════════════
def handle_forward(method, event, cur, conn, user):
    if method != 'POST':
        return resp(405, {'error': 'Только POST'})

    body = json.loads(event.get('body') or '{}')
    request_id = body.get('request_id')
    to_role = body.get('to_role', '').strip()
    message = body.get('message', '').strip()

    if not request_id or not to_role:
        return resp(400, {'error': 'Укажите request_id и to_role'})

    cur.execute("SELECT * FROM service_requests WHERE id = %s", (int(request_id),))
    sr = cur.fetchone()
    if not sr:
        return resp(404, {'error': 'Заявка не найдена'})

    cur.execute("SELECT id FROM dashboard_users WHERE role = %s AND is_active = true ORDER BY id LIMIT 1", (to_role,))
    target = cur.fetchone()
    new_assigned = target['id'] if target else None

    role_labels = {'admin': 'Администратор', 'dispatcher': 'Диспетчер', 'technician': 'Технолог', 'mechanic': 'Механик'}

    cur.execute("""
        UPDATE service_requests SET
            target_role = %s, assigned_to_user_id = %s,
            forwarded_from_role = %s, forwarded_from_user_id = %s, forwarded_at = NOW(),
            updated_at = NOW()
        WHERE id = %s
    """, (to_role, new_assigned, user['role'], user['id'], int(request_id)))

    log_action(cur, int(request_id), user, 'forwarded', sr['status'], sr['status'],
               f'Переадресовано: {role_labels.get(user["role"], user["role"])} → {role_labels.get(to_role, to_role)}. {message}',
               {'from_role': user['role'], 'to_role': to_role})

    fwd_msg = f'Заявка переадресована роли «{ROLE_LABELS.get(to_role, to_role)}» от {user["name"]}. {message}'
    notify_by_recipients(cur, int(request_id), 'forwarded',
                         f'Заявка {sr["request_number"]} переадресована',
                         fwd_msg, sr['request_number'], sr.get('title', ''),
                         [('Переадресовано', ROLE_LABELS.get(to_role, to_role)), ('Кем', user['name'])],
                         exclude_user_id=user['id'])

    if message:
        cur.execute("""
            INSERT INTO ticket_comments (request_id, user_id, user_name, user_role, message, is_system)
            VALUES (%s, %s, %s, %s, %s, true)
        """, (int(request_id), user['id'], user['name'], user['role'],
              f'📨 Переадресовано → {role_labels.get(to_role, to_role)}: {message}'))

    conn.commit()
    return resp(200, {'ok': True, 'new_target_role': to_role})


# ═══════════════════════════════════════════════════════════════
# УВЕДОМЛЕНИЯ О ЗАЯВКАХ
# ═══════════════════════════════════════════════════════════════
def handle_ticket_notifications(method, qs, event, cur, conn, user):
    if method == 'GET':
        unread_only = qs.get('unread_only', 'false') == 'true'
        where = "WHERE user_id = %s"
        params = [user['id']]
        if unread_only:
            where += " AND is_read = false"
        cur.execute(f"""
            SELECT tn.*, sr.request_number, sr.title as request_title
            FROM ticket_notifications tn
            LEFT JOIN service_requests sr ON sr.id = tn.request_id
            {where}
            ORDER BY tn.created_at DESC
            LIMIT 100
        """, params)
        rows = cur.fetchall()
        cur.execute("SELECT COUNT(*) as cnt FROM ticket_notifications WHERE user_id = %s AND is_read = false", (user['id'],))
        unread = cur.fetchone()['cnt']
        return resp(200, {'notifications': [dict(r) for r in rows], 'unread_count': unread})

    if method == 'PUT':
        body = json.loads(event.get('body') or '{}')
        notif_id = body.get('id')
        mark_all = body.get('mark_all_read', False)
        if mark_all:
            cur.execute("UPDATE ticket_notifications SET is_read = true WHERE user_id = %s AND is_read = false", (user['id'],))
        elif notif_id:
            cur.execute("UPDATE ticket_notifications SET is_read = true WHERE id = %s AND user_id = %s", (int(notif_id), user['id']))
        conn.commit()
        return resp(200, {'ok': True})

    return resp(405, {'error': 'Method not allowed'})


# ═══════════════════════════════════════════════════════════════
# НАСТРОЙКИ ЗАЯВОК (АДМИН)
# ═══════════════════════════════════════════════════════════════
def handle_settings(method, event, cur, conn, user):
    if method == 'GET':
        cur.execute("SELECT key, value FROM ticket_settings ORDER BY key")
        rows = cur.fetchall()
        settings = {r['key']: r['value'] for r in rows}
        return resp(200, {'settings': settings})

    if method == 'PUT':
        if user['role'] != 'admin':
            return resp(403, {'error': 'Только администратор может менять настройки'})
        body = json.loads(event.get('body') or '{}')
        key = body.get('key', '').strip()
        value = body.get('value')
        if not key:
            return resp(400, {'error': 'Укажите key'})

        cur.execute("""
            INSERT INTO ticket_settings (key, value, updated_at) VALUES (%s, %s, NOW())
            ON CONFLICT (key) DO UPDATE SET value = %s, updated_at = NOW()
        """, (key, json.dumps(value), json.dumps(value)))
        conn.commit()
        return resp(200, {'ok': True})

    return resp(405, {'error': 'Method not allowed'})


# ═══════════════════════════════════════════════════════════════
# АРХИВ ЗАЯВОК
# ═══════════════════════════════════════════════════════════════
def handle_archive(qs, cur, user):
    if user['role'] != 'admin':
        return resp(403, {'error': 'Нет доступа к архиву'})

    status_filter = qs.get('status')
    role_filter = qs.get('role')
    search = qs.get('search', '').strip()
    date_from = qs.get('date_from')
    date_to = qs.get('date_to')
    limit = min(int(qs.get('limit', 200)), 1000)
    offset = int(qs.get('offset', 0))

    where = []
    params = []

    if status_filter and status_filter != 'all':
        where.append("sr.status = %s")
        params.append(status_filter)
    if role_filter and role_filter != 'all':
        where.append("sr.created_by_role = %s")
        params.append(role_filter)
    if search:
        where.append("(sr.request_number ILIKE %s OR sr.title ILIKE %s OR du_c.full_name ILIKE %s)")
        q = f'%{search}%'
        params.extend([q, q, q])
    if date_from:
        where.append("sr.created_at >= %s")
        params.append(date_from)
    if date_to:
        where.append("sr.created_at <= %s")
        params.append(date_to)

    where_clause = ("WHERE " + " AND ".join(where)) if where else ""

    cur.execute(f"""
        SELECT COUNT(*) as total FROM service_requests sr
        LEFT JOIN dashboard_users du_c ON du_c.id = sr.created_by_user_id
        {where_clause}
    """, params)
    total = cur.fetchone()['total']

    params_with_limit = params + [limit, offset]
    cur.execute(f"""
        SELECT sr.*, du_c.full_name as creator_name, du_a.full_name as assignee_name,
               du_c.role as creator_role
        FROM service_requests sr
        LEFT JOIN dashboard_users du_c ON du_c.id = sr.created_by_user_id
        LEFT JOIN dashboard_users du_a ON du_a.id = sr.assigned_to_user_id
        {where_clause}
        ORDER BY sr.created_at DESC
        LIMIT %s OFFSET %s
    """, params_with_limit)
    rows = cur.fetchall()
    return resp(200, {'requests': [dict(r) for r in rows], 'total': total})


# ═══════════════════════════════════════════════════════════════
# ЖУРНАЛ
# ═══════════════════════════════════════════════════════════════
def handle_logs(qs, cur, user):
    request_id = qs.get('request_id')
    limit = min(int(qs.get('limit', 100)), 500)

    if request_id:
        cur.execute("SELECT * FROM service_logs WHERE request_id = %s ORDER BY created_at DESC", (int(request_id),))
    else:
        cur.execute("SELECT * FROM service_logs ORDER BY created_at DESC LIMIT %s", (limit,))
    return resp(200, {'logs': [dict(r) for r in cur.fetchall()]})


# ═══════════════════════════════════════════════════════════════
# СТАТИСТИКА
# ═══════════════════════════════════════════════════════════════
def handle_stats(cur, user):
    role = user['role']
    where = ""
    params = []
    if role in ('mechanic', 'technician', 'dispatcher'):
        where = "WHERE (assigned_to_user_id = %s OR target_role = %s OR created_by_user_id = %s)"
        params = [user['id'], role, user['id']]

    cur.execute(f"""
        SELECT
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE status = 'new') as new,
            COUNT(*) FILTER (WHERE status = 'reviewing') as reviewing,
            COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
            COUNT(*) FILTER (WHERE status = 'needs_clarification') as needs_clarification,
            COUNT(*) FILTER (WHERE status = 'approved') as approved,
            COUNT(*) FILTER (WHERE status = 'rejected') as rejected,
            COUNT(*) FILTER (WHERE status = 'resolved') as resolved,
            COUNT(*) FILTER (WHERE status = 'closed') as closed,
            COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled,
            COUNT(*) FILTER (WHERE status = 'expired') as expired,
            COUNT(*) FILTER (WHERE status = 'needs_info') as needs_info,
            COUNT(*) FILTER (WHERE priority = 'critical' AND status IN ('new','reviewing','in_progress')) as critical,
            COUNT(*) FILTER (WHERE created_by_user_id = %s) as sent_by_me,
            COUNT(*) FILTER (WHERE assigned_to_user_id = %s OR target_role = %s) as assigned_to_me
        FROM service_requests {where}
    """, params + [user['id'], user['id'], role])
    row = cur.fetchone()
    return resp(200, dict(row))


# ═══════════════════════════════════════════════════════════════
# ЭКСПОРТ ЖУРНАЛА
# ═══════════════════════════════════════════════════════════════
def handle_export(qs, cur, user):
    cur.execute("""
        SELECT sr.request_number, sr.title, sr.vehicle_label, sr.priority, sr.status,
               sr.created_at, sr.resolved_at, sr.closed_at,
               sr.resolved_by_name, sr.resolved_by_position, sr.resolved_by_employee_id,
               sr.resolution_note, sr.rejection_reason, sr.cancellation_reason,
               sr.category, sr.source, sr.target_role,
               du_c.full_name as creator, du_a.full_name as assignee
        FROM service_requests sr
        LEFT JOIN dashboard_users du_c ON du_c.id = sr.created_by_user_id
        LEFT JOIN dashboard_users du_a ON du_a.id = sr.assigned_to_user_id
        ORDER BY sr.created_at DESC
        LIMIT 1000
    """)
    rows = cur.fetchall()

    header = "Номер;Заголовок;ТС;Приоритет;Статус;Создана;Решена;Закрыта;Исполнитель;Должность;Таб.номер;Решение;Отклонение;Отмена;Категория;Источник;Направлено;Автор;Назначено"
    lines = [header]
    for r in rows:
        line = ";".join([
            str(r.get(k, '') or '') for k in [
                'request_number', 'title', 'vehicle_label', 'priority', 'status',
                'created_at', 'resolved_at', 'closed_at',
                'resolved_by_name', 'resolved_by_position', 'resolved_by_employee_id',
                'resolution_note', 'rejection_reason', 'cancellation_reason',
                'category', 'source', 'target_role', 'creator', 'assignee'
            ]
        ])
        lines.append(line)

    csv_content = "\n".join(lines)
    return resp(200, {'csv': csv_content, 'count': len(rows)})


# ═══════════════════════════════════════════════════════════════
# ДОКУМЕНТАЦИЯ ТС
# ═══════════════════════════════════════════════════════════════
def handle_docs(method, qs, event, cur, conn, user):
    if method == 'GET':
        vehicle_id = qs.get('vehicle_id')
        model = qs.get('model')
        doc_type = qs.get('doc_type')

        where = []
        params = []
        if vehicle_id:
            where.append("vehicle_id = %s")
            params.append(vehicle_id)
        if model:
            where.append("vehicle_model = %s")
            params.append(model)
        if doc_type:
            where.append("doc_type = %s")
            params.append(doc_type)
        where_clause = ("WHERE " + " AND ".join(where)) if where else ""

        cur.execute(f"""
            SELECT d.*, du.full_name as uploader_name
            FROM ts_documents d
            LEFT JOIN dashboard_users du ON du.id = d.uploaded_by
            {where_clause}
            ORDER BY d.created_at DESC
        """, params)
        return resp(200, {'documents': [dict(r) for r in cur.fetchall()]})

    if method == 'POST':
        if user['role'] not in ('mechanic', 'technician', 'admin'):
            return resp(403, {'error': 'Нет доступа'})

        body = json.loads(event.get('body') or '{}')
        title = body.get('title', '').strip()
        if not title:
            return resp(400, {'error': 'Укажите название документа'})

        file_data = body.get('file_data')
        file_name = body.get('file_name', 'document')
        file_mime = body.get('file_mime', 'application/octet-stream')
        file_url = None
        file_size = 0

        if file_data:
            raw = base64.b64decode(file_data)
            file_size = len(raw)
            ext = file_name.rsplit('.', 1)[-1] if '.' in file_name else 'bin'
            key = f"ts-docs/{uuid.uuid4()}.{ext}"
            import boto3
            s3 = boto3.client('s3',
                              endpoint_url='https://bucket.poehali.dev',
                              aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
                              aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'])
            s3.put_object(Bucket='files', Key=key, Body=raw, ContentType=file_mime)
            file_url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"

        tags = body.get('tags', [])
        cur.execute("""
            INSERT INTO ts_documents (vehicle_id, vehicle_model, manufacturer, doc_type,
                title, description, file_url, file_name, file_size, file_mime, tags, uploaded_by)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (
            body.get('vehicle_id'), body.get('vehicle_model', ''), body.get('manufacturer', ''),
            body.get('doc_type', 'manual'), title, body.get('description', ''),
            file_url, file_name, file_size, file_mime, tags, user['id'],
        ))
        doc_id = cur.fetchone()['id']
        conn.commit()
        return resp(201, {'id': doc_id, 'file_url': file_url})

    if method == 'DELETE':
        doc_id = qs.get('id')
        if not doc_id:
            return resp(400, {'error': 'Укажите id документа'})
        if user['role'] not in ('mechanic', 'admin'):
            return resp(403, {'error': 'Нет доступа'})
        cur.execute("UPDATE ts_documents SET title = title || ' [УДАЛЁН]' WHERE id = %s", (int(doc_id),))
        conn.commit()
        return resp(200, {'ok': True})

    return resp(405, {'error': 'Method not allowed'})


# ═══════════════════════════════════════════════════════════════
# EMAIL
# ═══════════════════════════════════════════════════════════════
def handle_email(method, event, cur, conn, user):
    if method != 'POST':
        return resp(405, {'error': 'Только POST'})
    if user['role'] not in ('mechanic', 'technician'):
        return resp(403, {'error': 'Нет доступа'})

    body = json.loads(event.get('body') or '{}')
    recipient_email = body.get('recipient_email', '').strip()
    subject = body.get('subject', '').strip()
    email_body = body.get('body', '').strip()

    if not recipient_email or not subject or not email_body:
        return resp(400, {'error': 'Заполните email, тему и текст'})

    cur.execute("""
        INSERT INTO external_emails (sent_by, sent_by_name, sent_by_role,
            recipient_email, recipient_name, recipient_org, subject, body,
            request_id, vehicle_id, status)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'pending')
        RETURNING id
    """, (
        user['id'], user['name'], user['role'],
        recipient_email, body.get('recipient_name', ''), body.get('recipient_org', ''),
        subject, email_body,
        body.get('request_id'), body.get('vehicle_id'),
    ))
    email_id = cur.fetchone()['id']

    smtp_host = os.environ.get('SMTP_HOST', '')
    smtp_port = int(os.environ.get('SMTP_PORT', '587'))
    smtp_user = os.environ.get('SMTP_USER', '')
    smtp_pass = os.environ.get('SMTP_PASS', '')
    smtp_from = os.environ.get('SMTP_FROM', smtp_user)

    if smtp_host and smtp_user and smtp_pass:
        try:
            import smtplib
            from email.mime.text import MIMEText
            from email.mime.multipart import MIMEMultipart

            msg = MIMEMultipart()
            msg['From'] = f"{user['name']} <{smtp_from}>"
            msg['To'] = recipient_email
            msg['Subject'] = subject
            msg.attach(MIMEText(email_body, 'plain', 'utf-8'))

            with smtplib.SMTP(smtp_host, smtp_port, timeout=15) as server:
                server.starttls()
                server.login(smtp_user, smtp_pass)
                server.send_message(msg)

            cur.execute("UPDATE external_emails SET status = 'sent', sent_at = NOW() WHERE id = %s", (email_id,))
            conn.commit()
            return resp(200, {'id': email_id, 'status': 'sent'})
        except Exception as e:
            cur.execute("UPDATE external_emails SET status = 'failed', error_message = %s WHERE id = %s",
                        (str(e), email_id))
            conn.commit()
            return resp(200, {'id': email_id, 'status': 'failed', 'error': str(e)})
    else:
        conn.commit()
        return resp(200, {'id': email_id, 'status': 'pending', 'note': 'SMTP не настроен, email сохранён в БД'})


# ═══════════════════════════════════════════════════════════════
# МАРШРУТИЗАЦИЯ ЗАЯВОК (настройки кто кому)
# ═══════════════════════════════════════════════════════════════
def handle_routing(method, event, cur, conn, user):
    if method == 'GET':
        qs = event.get('queryStringParameters') or {}
        from_role = qs.get('from_role')

        if from_role:
            cur.execute(
                "SELECT * FROM service_request_routing WHERE from_role = %s ORDER BY to_role",
                (from_role,))
        else:
            cur.execute("SELECT * FROM service_request_routing ORDER BY from_role, to_role")
        rows = cur.fetchall()
        return resp(200, {'routing': [dict(r) for r in rows]})

    if method == 'PUT':
        if user['role'] != 'admin':
            return resp(403, {'error': 'Только администратор может менять настройки'})
        body = json.loads(event.get('body') or '{}')
        from_role = body.get('from_role', '')
        to_role = body.get('to_role', '')
        is_enabled = body.get('is_enabled', True)

        if not from_role or not to_role:
            return resp(400, {'error': 'Укажите from_role и to_role'})

        cur.execute("""
            INSERT INTO service_request_routing (from_role, to_role, is_enabled)
            VALUES (%s, %s, %s)
            ON CONFLICT (from_role, to_role)
            DO UPDATE SET is_enabled = %s, updated_at = NOW()
        """, (from_role, to_role, is_enabled, is_enabled))
        conn.commit()
        return resp(200, {'ok': True})

    return resp(405, {'error': 'Method not allowed'})