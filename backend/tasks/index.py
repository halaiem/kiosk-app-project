"""API управления задачами: создание, обновление, комментарии, список"""
import json
import os
import psycopg2
import psycopg2.extras

DSN = os.environ.get('DATABASE_URL', '')
CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
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


def handler(event, context):
    """Управление задачами — CRUD, комментарии, назначение исполнителей"""
    if event.get('httpMethod') == 'OPTIONS':
        return resp(200, '')

    headers = {k: v for k, v in (event.get('headers') or {}).items()}
    method = event.get('httpMethod', 'GET')
    qs = event.get('queryStringParameters') or {}
    action = qs.get('action', 'list')

    conn = psycopg2.connect(DSN)
    conn.autocommit = True
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    user = get_user(cur, headers)
    if not user:
        cur.close(); conn.close()
        return resp(401, {'error': 'Не авторизован'})

    if action == 'list' and method == 'GET':
        status_filter = qs.get('status')
        category_filter = qs.get('category')
        priority_filter = qs.get('priority')
        search = qs.get('search', '').strip()

        where = []
        params = []

        if status_filter and status_filter != 'all':
            where.append("t.status = %s")
            params.append(status_filter)
        if category_filter and category_filter != 'all':
            where.append("t.category = %s")
            params.append(category_filter)
        if priority_filter and priority_filter != 'all':
            where.append("t.priority = %s")
            params.append(priority_filter)
        if search:
            where.append("(t.title ILIKE %s OR t.description ILIKE %s OR creator.full_name ILIKE %s OR COALESCE(assignee.full_name, '') ILIKE %s)")
            q = f"%{search}%"
            params.extend([q, q, q, q])

        where_sql = (" WHERE " + " AND ".join(where)) if where else ""

        cur.execute(
            "SELECT t.id, t.title, t.description, t.priority, t.status, t.category, "
            "t.assignee_user_id, t.created_by_user_id, t.due_date, t.created_at, t.updated_at, t.completed_at, "
            "creator.full_name AS creator_name, creator.role AS creator_role, "
            "assignee.full_name AS assignee_name, assignee.role AS assignee_role, "
            "(SELECT COUNT(*) FROM task_comments tc WHERE tc.task_id = t.id) AS comment_count "
            "FROM tasks t "
            "JOIN dashboard_users creator ON creator.id = t.created_by_user_id "
            "LEFT JOIN dashboard_users assignee ON assignee.id = t.assignee_user_id"
            + where_sql +
            " ORDER BY CASE t.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END, t.created_at DESC "
            "LIMIT 200",
            params
        )
        tasks = [dict(r) for r in cur.fetchall()]

        cur.execute(
            "SELECT status, COUNT(*) AS cnt FROM tasks GROUP BY status"
        )
        counts = {r['status']: r['cnt'] for r in cur.fetchall()}
        cur.execute("SELECT COUNT(*) AS total FROM tasks")
        counts['all'] = cur.fetchone()['total']

        cur.close(); conn.close()
        return resp(200, {'tasks': tasks, 'counts': counts})

    if action == 'users' and method == 'GET':
        cur.execute(
            "SELECT id, full_name, role FROM dashboard_users WHERE is_active = true ORDER BY full_name"
        )
        users = [dict(r) for r in cur.fetchall()]
        cur.close(); conn.close()
        return resp(200, {'users': users})

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

        cur.execute(
            "INSERT INTO tasks (title, description, priority, category, assignee_user_id, created_by_user_id, due_date) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id",
            (title, description, priority, category, assignee_user_id or None, user['id'], due_date or None)
        )
        task_id = cur.fetchone()['id']
        cur.close(); conn.close()
        return resp(201, {'id': task_id, 'message': 'Задача создана'})

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
                sets.append(f"{field} = %s")
                params.append(body[field])

        if 'assignee_user_id' in body:
            sets.append("assignee_user_id = %s")
            params.append(body['assignee_user_id'] or None)

        if 'due_date' in body:
            sets.append("due_date = %s")
            params.append(body['due_date'] or None)

        if body.get('status') == 'done':
            sets.append("completed_at = NOW()")
        elif body.get('status') and body['status'] != 'done':
            sets.append("completed_at = NULL")

        params.append(task_id)
        cur.execute(f"UPDATE tasks SET {', '.join(sets)} WHERE id = %s", params)
        cur.close(); conn.close()
        return resp(200, {'message': 'Задача обновлена'})

    if action == 'comments' and method == 'GET':
        task_id = qs.get('task_id')
        if not task_id:
            cur.close(); conn.close()
            return resp(400, {'error': 'Укажите task_id'})

        cur.execute(
            "SELECT tc.id, tc.message, tc.created_at, "
            "du.full_name AS user_name, du.role AS user_role "
            "FROM task_comments tc JOIN dashboard_users du ON du.id = tc.user_id "
            "WHERE tc.task_id = %s ORDER BY tc.created_at ASC",
            (task_id,)
        )
        comments = [dict(r) for r in cur.fetchall()]
        cur.close(); conn.close()
        return resp(200, {'comments': comments})

    if action == 'add_comment' and method == 'POST':
        body = json.loads(event.get('body') or '{}')
        task_id = body.get('task_id')
        message = (body.get('message') or '').strip()
        if not task_id or not message:
            cur.close(); conn.close()
            return resp(400, {'error': 'Укажите task_id и message'})

        cur.execute(
            "INSERT INTO task_comments (task_id, user_id, message) VALUES (%s, %s, %s) RETURNING id",
            (task_id, user['id'], message)
        )
        comment_id = cur.fetchone()['id']
        cur.execute("UPDATE tasks SET updated_at = NOW() WHERE id = %s", (task_id,))
        cur.close(); conn.close()
        return resp(201, {'id': comment_id, 'message': 'Комментарий добавлен'})

    cur.close(); conn.close()
    return resp(400, {'error': 'Неизвестное действие'})
