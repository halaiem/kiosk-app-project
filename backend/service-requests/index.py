"""API заявок на обслуживание ТС: CRUD, журнал, документация, email"""
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


def handler(event, context):
    """API заявок на обслуживание, документации ТС, журнала и email"""
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

        if action == 'requests':
            result = handle_requests(method, qs, event, cur, conn, user)
        elif action == 'logs':
            result = handle_logs(qs, cur, user)
        elif action == 'docs':
            result = handle_docs(method, qs, event, cur, conn, user)
        elif action == 'email':
            result = handle_email(method, event, cur, conn, user)
        elif action == 'stats':
            result = handle_stats(cur, user)
        elif action == 'export':
            result = handle_export(qs, cur, user)
        else:
            result = resp(400, {'error': 'Неизвестное действие'})

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
            cur.execute("SELECT * FROM service_requests WHERE id = %s", (int(request_id),))
            row = cur.fetchone()
            if not row:
                return resp(404, {'error': 'Заявка не найдена'})
            cur.execute("SELECT * FROM service_logs WHERE request_id = %s ORDER BY created_at", (int(request_id),))
            logs = cur.fetchall()
            return resp(200, {'request': dict(row), 'logs': [dict(l) for l in logs]})

        status_filter = qs.get('status')
        assigned = qs.get('assigned_to')
        vehicle_id = qs.get('vehicle_id')

        where = []
        params = []
        if status_filter:
            where.append("sr.status = %s")
            params.append(status_filter)
        if assigned:
            where.append("sr.assigned_to_user_id = %s")
            params.append(int(assigned))
        if vehicle_id:
            where.append("sr.vehicle_id = %s")
            params.append(vehicle_id)

        if user['role'] == 'mechanic' and not assigned:
            where.append("(sr.assigned_to_user_id = %s OR sr.assigned_to_user_id IS NULL)")
            params.append(user['id'])

        where_clause = ("WHERE " + " AND ".join(where)) if where else ""

        cur.execute(f"""
            SELECT sr.*, du_c.full_name as creator_name, du_a.full_name as assignee_name
            FROM service_requests sr
            LEFT JOIN dashboard_users du_c ON du_c.id = sr.created_by_user_id
            LEFT JOIN dashboard_users du_a ON du_a.id = sr.assigned_to_user_id
            {where_clause}
            ORDER BY
              CASE sr.priority WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END,
              sr.created_at DESC
            LIMIT 200
        """, params)
        rows = cur.fetchall()
        return resp(200, {'requests': [dict(r) for r in rows]})

    if method == 'POST':
        body = json.loads(event.get('body') or '{}')
        title = body.get('title', '').strip()
        if not title:
            return resp(400, {'error': 'Укажите заголовок заявки'})

        cur.execute("SELECT nextval('service_request_number_seq')")
        seq = cur.fetchone()['nextval']
        req_number = f"SR-{seq:05d}"

        vehicle_id = body.get('vehicle_id')
        vehicle_label = body.get('vehicle_label', '')
        if vehicle_id and not vehicle_label:
            cur.execute("SELECT label FROM vehicles WHERE id = %s", (vehicle_id,))
            vrow = cur.fetchone()
            if vrow:
                vehicle_label = vrow['label']

        mechanic_ids = []
        cur.execute("SELECT id FROM dashboard_users WHERE role = 'mechanic' AND is_active = true ORDER BY id LIMIT 1")
        mrow = cur.fetchone()
        assigned_to = body.get('assigned_to') or (mrow['id'] if mrow else None)

        cur.execute("""
            INSERT INTO service_requests (
                request_number, vehicle_id, vehicle_label, source, source_type,
                created_by_user_id, created_by_role, assigned_to_user_id,
                title, description, priority, category, equipment_info, diagnostic_code
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id, request_number
        """, (
            req_number, vehicle_id, vehicle_label,
            body.get('source', user['role']),
            body.get('source_type', 'request'),
            user['id'], user['role'], assigned_to,
            title, body.get('description', ''),
            body.get('priority', 'normal'),
            body.get('category', ''),
            body.get('equipment_info', ''),
            body.get('diagnostic_code', ''),
        ))
        new = cur.fetchone()
        log_action(cur, new['id'], user, 'created', None, 'new',
                   f'Заявка {req_number} создана', {'title': title, 'vehicle': vehicle_label})
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

        if new_status == 'resolved':
            sets.append("resolved_at = NOW()")
            for rf in ('resolved_by_name', 'resolved_by_position', 'resolved_by_employee_id', 'resolution_note'):
                if rf in body:
                    sets.append(f"{rf} = %s")
                    params.append(body[rf])

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
# ЖУРНАЛ
# ═══════════════════════════════════════════════════════════════
def handle_logs(qs, cur, user):
    if user['role'] not in ('mechanic', 'technician', 'admin'):
        return resp(403, {'error': 'Нет доступа к журналу'})

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
    cur.execute("""
        SELECT
            COUNT(*) FILTER (WHERE status = 'new') as new_count,
            COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_count,
            COUNT(*) FILTER (WHERE status = 'resolved') as resolved_count,
            COUNT(*) FILTER (WHERE status = 'closed') as closed_count,
            COUNT(*) FILTER (WHERE status = 'needs_info') as needs_info_count,
            COUNT(*) FILTER (WHERE priority = 'critical' AND status IN ('new','in_progress')) as critical_active,
            COUNT(*) as total
        FROM service_requests
    """)
    return resp(200, {'stats': dict(cur.fetchone())})


# ═══════════════════════════════════════════════════════════════
# ЭКСПОРТ ЖУРНАЛА
# ═══════════════════════════════════════════════════════════════
def handle_export(qs, cur, user):
    if user['role'] not in ('mechanic', 'technician', 'admin'):
        return resp(403, {'error': 'Нет доступа'})

    cur.execute("""
        SELECT sr.request_number, sr.title, sr.vehicle_label, sr.priority, sr.status,
               sr.created_at, sr.resolved_at,
               sr.resolved_by_name, sr.resolved_by_position, sr.resolved_by_employee_id,
               sr.resolution_note, sr.category, sr.source,
               du_c.full_name as creator, du_a.full_name as assignee
        FROM service_requests sr
        LEFT JOIN dashboard_users du_c ON du_c.id = sr.created_by_user_id
        LEFT JOIN dashboard_users du_a ON du_a.id = sr.assigned_to_user_id
        ORDER BY sr.created_at DESC
        LIMIT 1000
    """)
    rows = cur.fetchall()

    header = "Номер;Заголовок;ТС;Приоритет;Статус;Создана;Решена;Исполнитель;Должность;Таб.номер;Комментарий;Категория;Источник;Автор;Назначено"
    lines = [header]
    for r in rows:
        line = ";".join([
            str(r.get(k, '') or '') for k in [
                'request_number', 'title', 'vehicle_label', 'priority', 'status',
                'created_at', 'resolved_at',
                'resolved_by_name', 'resolved_by_position', 'resolved_by_employee_id',
                'resolution_note', 'category', 'source', 'creator', 'assignee'
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
        cur.execute("DELETE FROM ts_documents WHERE id = %s", (int(doc_id),))
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