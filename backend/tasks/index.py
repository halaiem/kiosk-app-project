"""API задач: CRUD, вложения S3, голосовые комментарии, архив"""
import json
import os
import uuid
import base64
import psycopg2
import psycopg2.extras
import boto3
from botocore.exceptions import ClientError

DSN = os.environ.get('DATABASE_URL', '')
AWS_KEY = os.environ.get('AWS_ACCESS_KEY_ID', '')
AWS_SECRET = os.environ.get('AWS_SECRET_ACCESS_KEY', '')
CDN_BASE = f"https://cdn.poehali.dev/projects/{AWS_KEY}/bucket"
MAX_FILE_BYTES = 20 * 1024 * 1024  # 20 MB

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


def get_s3():
    return boto3.client(
        's3',
        endpoint_url='https://bucket.poehali.dev',
        aws_access_key_id=AWS_KEY,
        aws_secret_access_key=AWS_SECRET,
    )


def upload_to_s3(data_bytes: bytes, key: str, content_type: str) -> str:
    s3 = get_s3()
    s3.put_object(Bucket='files', Key=key, Body=data_bytes, ContentType=content_type)
    return f"{CDN_BASE}/{key}"


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


def handler(event, context):
    """Задачи: CRUD, вложения S3, голосовые комментарии, архив"""
    if event.get('httpMethod') == 'OPTIONS':
        return resp(200, '')

    headers = {k: v for k, v in (event.get('headers') or {}).items()}
    method = event.get('httpMethod', 'GET')
    qs = event.get('queryStringParameters') or {}
    action = qs.get('action', 'list')

    conn = psycopg2.connect(DSN)
    conn.autocommit = True
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    # ── SIDEBAR CONFIG (get без авторизации) ───────────────────────
    if action == 'sidebar_config_get' and method == 'GET':
        role = qs.get('role', '')
        cur.execute("SELECT config FROM sidebar_configs WHERE role = %s", (role,))
        row = cur.fetchone()
        cur.close(); conn.close()
        return resp(200, {'config': dict(row['config']) if row else None})

    if action == 'sidebar_config_all' and method == 'GET':
        cur.execute("SELECT role, config FROM sidebar_configs")
        rows = {r['role']: dict(r['config']) for r in cur.fetchall()}
        cur.close(); conn.close()
        return resp(200, {'configs': rows})

    user = get_user(cur, headers)
    if not user:
        cur.close(); conn.close()
        return resp(401, {'error': 'Не авторизован'})

    if action == 'sidebar_config_save' and method == 'POST':
        body = json.loads(event.get('body') or '{}')
        role = body.get('role', '')
        config = body.get('config', {})
        if not role:
            cur.close(); conn.close()
            return resp(400, {'error': 'Укажите role'})
        cur.execute(
            "INSERT INTO sidebar_configs (role, config) VALUES (%s, %s) "
            "ON CONFLICT (role) DO UPDATE SET config = EXCLUDED.config, updated_at = NOW()",
            (role, json.dumps(config))
        )
        cur.close(); conn.close()
        return resp(200, {'message': 'Сохранено'})

    # ── LIST ────────────────────────────────────────────────────────
    if action == 'list' and method == 'GET':
        status_filter = qs.get('status')
        category_filter = qs.get('category')
        priority_filter = qs.get('priority')
        search = qs.get('search', '').strip()
        archived = qs.get('archived', 'false') == 'true'

        where = ["t.is_archived = " + ("true" if archived else "false")]
        params = []

        if status_filter and status_filter != 'all':
            where.append("t.status = %s"); params.append(status_filter)
        if category_filter and category_filter != 'all':
            where.append("t.category = %s"); params.append(category_filter)
        if priority_filter and priority_filter != 'all':
            where.append("t.priority = %s"); params.append(priority_filter)
        if search:
            where.append("(t.title ILIKE %s OR t.description ILIKE %s OR creator.full_name ILIKE %s OR COALESCE(assignee.full_name,'') ILIKE %s)")
            q = f"%{search}%"; params.extend([q, q, q, q])

        where_sql = " WHERE " + " AND ".join(where)
        cur.execute(
            "SELECT t.id, t.title, t.description, t.priority, t.status, t.category, "
            "t.is_archived, t.lifetime_hours, "
            "t.assignee_user_id, t.created_by_user_id, t.due_date, t.created_at, t.updated_at, t.completed_at, "
            "creator.full_name AS creator_name, creator.role AS creator_role, "
            "assignee.full_name AS assignee_name, assignee.role AS assignee_role, "
            "(SELECT COUNT(*) FROM task_comments tc WHERE tc.task_id = t.id) AS comment_count, "
            "(SELECT COUNT(*) FROM task_attachments ta WHERE ta.task_id = t.id) AS attachment_count "
            "FROM tasks t "
            "JOIN dashboard_users creator ON creator.id = t.created_by_user_id "
            "LEFT JOIN dashboard_users assignee ON assignee.id = t.assignee_user_id"
            + where_sql +
            " ORDER BY CASE t.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END, t.created_at DESC LIMIT 300",
            params
        )
        tasks = [dict(r) for r in cur.fetchall()]

        if not archived:
            cur.execute("SELECT status, COUNT(*) AS cnt FROM tasks WHERE is_archived = false GROUP BY status")
            counts = {r['status']: r['cnt'] for r in cur.fetchall()}
            cur.execute("SELECT COUNT(*) AS total FROM tasks WHERE is_archived = false")
            counts['all'] = cur.fetchone()['total']
        else:
            cur.execute("SELECT COUNT(*) AS total FROM tasks WHERE is_archived = true")
            counts = {'all': cur.fetchone()['total']}

        cur.close(); conn.close()
        return resp(200, {'tasks': tasks, 'counts': counts})

    # ── USERS ────────────────────────────────────────────────────────
    if action == 'users' and method == 'GET':
        cur.execute("SELECT id, full_name, role FROM dashboard_users WHERE is_active = true ORDER BY full_name")
        users = [dict(r) for r in cur.fetchall()]
        cur.close(); conn.close()
        return resp(200, {'users': users})

    # ── CREATE ───────────────────────────────────────────────────────
    if action == 'create' and method == 'POST':
        body = json.loads(event.get('body') or '{}')
        title = (body.get('title') or '').strip()
        if not title:
            cur.close(); conn.close()
            return resp(400, {'error': 'Укажите название задачи'})

        description = (body.get('description') or '').strip()
        priority = body.get('priority', 'medium')
        category = body.get('category', 'other')
        assignee_user_id = body.get('assignee_user_id')
        due_date = body.get('due_date')
        lifetime_hours = body.get('lifetime_hours')

        cur.execute(
            "INSERT INTO tasks (title, description, priority, category, assignee_user_id, created_by_user_id, due_date, lifetime_hours) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s, %s) RETURNING id",
            (title, description, priority, category, assignee_user_id or None, user['id'], due_date or None, lifetime_hours or None)
        )
        task_id = cur.fetchone()['id']

        # Upload attachments if provided
        uploaded = []
        for att in (body.get('attachments') or [])[:10]:
            file_data = att.get('data', '')
            file_name = att.get('name', 'file')
            content_type = att.get('type', 'application/octet-stream')
            try:
                raw = base64.b64decode(file_data)
                if len(raw) > MAX_FILE_BYTES:
                    continue
                ext = file_name.rsplit('.', 1)[-1].lower() if '.' in file_name else 'bin'
                key = f"tasks/{task_id}/attachments/{uuid.uuid4().hex}.{ext}"
                cdn_url = upload_to_s3(raw, key, content_type)
                cur.execute(
                    "INSERT INTO task_attachments (task_id, user_id, file_name, file_size, content_type, s3_key, cdn_url) "
                    "VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id",
                    (task_id, user['id'], file_name, len(raw), content_type, key, cdn_url)
                )
                att_id = cur.fetchone()['id']
                uploaded.append({'id': att_id, 'name': file_name, 'url': cdn_url, 'type': content_type, 'size': len(raw)})
            except Exception:
                continue

        cur.close(); conn.close()
        return resp(201, {'id': task_id, 'message': 'Задача создана', 'attachments': uploaded})

    # ── UPDATE ───────────────────────────────────────────────────────
    if action == 'update' and method == 'PUT':
        body = json.loads(event.get('body') or '{}')
        task_id = body.get('id')
        if not task_id:
            cur.close(); conn.close()
            return resp(400, {'error': 'Укажите id задачи'})

        sets = ["updated_at = NOW()"]
        params = []
        for field in ('title', 'description', 'priority', 'status', 'category'):
            if field in body and body[field] is not None:
                sets.append(f"{field} = %s"); params.append(body[field])
        if 'assignee_user_id' in body:
            sets.append("assignee_user_id = %s"); params.append(body['assignee_user_id'] or None)
        if 'due_date' in body:
            sets.append("due_date = %s"); params.append(body['due_date'] or None)
        if body.get('status') == 'done':
            sets.append("completed_at = NOW()")
        elif body.get('status') and body['status'] != 'done':
            sets.append("completed_at = NULL")

        params.append(task_id)
        cur.execute(f"UPDATE tasks SET {', '.join(sets)} WHERE id = %s", params)
        cur.close(); conn.close()
        return resp(200, {'message': 'Задача обновлена'})

    # ── ATTACHMENTS GET ──────────────────────────────────────────────
    if action == 'attachments' and method == 'GET':
        task_id = qs.get('task_id')
        if not task_id:
            cur.close(); conn.close()
            return resp(400, {'error': 'Укажите task_id'})
        cur.execute(
            "SELECT ta.id, ta.file_name, ta.file_size, ta.content_type, ta.cdn_url, ta.created_at, "
            "du.full_name AS uploader_name FROM task_attachments ta "
            "JOIN dashboard_users du ON du.id = ta.user_id WHERE ta.task_id = %s ORDER BY ta.created_at",
            (task_id,)
        )
        attachments = [dict(r) for r in cur.fetchall()]
        cur.close(); conn.close()
        return resp(200, {'attachments': attachments})

    # ── COMMENTS GET ─────────────────────────────────────────────────
    if action == 'comments' and method == 'GET':
        task_id = qs.get('task_id')
        if not task_id:
            cur.close(); conn.close()
            return resp(400, {'error': 'Укажите task_id'})
        cur.execute(
            "SELECT tc.id, tc.message, tc.created_at, tc.file_url, tc.file_name, "
            "tc.file_size, tc.content_type, tc.is_voice, tc.voice_transcript, "
            "du.full_name AS user_name, du.role AS user_role "
            "FROM task_comments tc JOIN dashboard_users du ON du.id = tc.user_id "
            "WHERE tc.task_id = %s ORDER BY tc.created_at ASC",
            (task_id,)
        )
        comments = [dict(r) for r in cur.fetchall()]
        cur.close(); conn.close()
        return resp(200, {'comments': comments})

    # ── ADD COMMENT ──────────────────────────────────────────────────
    if action == 'add_comment' and method == 'POST':
        body = json.loads(event.get('body') or '{}')
        task_id = body.get('task_id')
        message = (body.get('message') or '').strip()
        file_data = body.get('file_data')
        file_name = body.get('file_name', '')
        file_content_type = body.get('file_type', 'application/octet-stream')
        is_voice = bool(body.get('is_voice', False))

        if not task_id:
            cur.close(); conn.close()
            return resp(400, {'error': 'Укажите task_id'})

        file_url = None
        file_size = None
        voice_transcript = None

        if file_data:
            try:
                raw = base64.b64decode(file_data)
                if len(raw) > MAX_FILE_BYTES:
                    cur.close(); conn.close()
                    return resp(400, {'error': 'Файл слишком большой (макс 20 МБ)'})
                ext = file_name.rsplit('.', 1)[-1].lower() if '.' in file_name else ('ogg' if is_voice else 'bin')
                folder = 'voice' if is_voice else 'files'
                key = f"tasks/{task_id}/comments/{folder}/{uuid.uuid4().hex}.{ext}"
                file_url = upload_to_s3(raw, key, file_content_type)
                file_size = len(raw)
                if not file_name:
                    file_name = f"voice_{uuid.uuid4().hex[:8]}.{ext}" if is_voice else 'file'

                # Transcribe with Yandex SpeechKit
                if is_voice:
                    speechkit_key = os.environ.get('YANDEX_SPEECHKIT_KEY', '')
                    if speechkit_key:
                        try:
                            import urllib.request
                            req = urllib.request.Request(
                                'https://stt.api.cloud.yandex.net/speech/v1/stt:recognize?lang=ru-RU&format=oggopus',
                                data=raw,
                                headers={'Authorization': f'Api-Key {speechkit_key}', 'Content-Type': 'audio/ogg'},
                                method='POST'
                            )
                            with urllib.request.urlopen(req, timeout=15) as r:
                                voice_transcript = json.loads(r.read()).get('result', '')
                        except Exception:
                            voice_transcript = None
            except Exception as e:
                cur.close(); conn.close()
                return resp(500, {'error': f'Ошибка загрузки: {str(e)}'})

        if not message and not file_url:
            cur.close(); conn.close()
            return resp(400, {'error': 'Укажите сообщение или прикрепите файл'})

        final_message = message or (voice_transcript or '')
        cur.execute(
            "INSERT INTO task_comments (task_id, user_id, message, file_url, file_name, file_size, content_type, is_voice, voice_transcript) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING id",
            (task_id, user['id'], final_message, file_url, file_name or None,
             file_size, file_content_type if file_url else None, is_voice, voice_transcript)
        )
        comment_id = cur.fetchone()['id']
        cur.execute("UPDATE tasks SET updated_at = NOW() WHERE id = %s", (task_id,))
        cur.close(); conn.close()
        return resp(201, {'id': comment_id, 'message': 'Комментарий добавлен',
                          'file_url': file_url, 'voice_transcript': voice_transcript})

    # ── ARCHIVE ─────────────────────────────────────────────────────
    if action == 'archive' and method == 'POST':
        body = json.loads(event.get('body') or '{}')
        ids = body.get('ids', [])
        archive_val = body.get('archive', True)
        if not ids or not isinstance(ids, list):
            cur.close(); conn.close()
            return resp(400, {'error': 'Укажите ids'})
        placeholders = ','.join(['%s'] * len(ids))
        cur.execute(f"UPDATE tasks SET is_archived = %s, updated_at = NOW() WHERE id IN ({placeholders})",
                    [archive_val] + ids)
        cur.close(); conn.close()
        return resp(200, {'message': 'Обновлено'})

    # ── DELETE ──────────────────────────────────────────────────────
    if action == 'delete' and method == 'POST':
        body = json.loads(event.get('body') or '{}')
        ids = body.get('ids', [])
        if not ids or not isinstance(ids, list):
            cur.close(); conn.close()
            return resp(400, {'error': 'Укажите ids'})
        placeholders = ','.join(['%s'] * len(ids))
        cur.execute(f"DELETE FROM task_comments WHERE task_id IN ({placeholders})", ids)
        cur.execute(f"DELETE FROM task_attachments WHERE task_id IN ({placeholders})", ids)
        cur.execute(f"DELETE FROM tasks WHERE id IN ({placeholders})", ids)
        cur.close(); conn.close()
        return resp(200, {'message': 'Удалено'})

    cur.close(); conn.close()
    return resp(400, {'error': 'Неизвестное действие'})