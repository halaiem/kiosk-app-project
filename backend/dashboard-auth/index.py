"""Аутентификация персонала dashboard (диспетчер, техник, администратор)"""
import json
import os
import hashlib
import secrets
import psycopg2

DSN = os.environ.get('DATABASE_URL', '')

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Dashboard-Token',
    'Access-Control-Max-Age': '86400',
}

def resp(status, body):
    return {'statusCode': status, 'headers': {**CORS, 'Content-Type': 'application/json'}, 'body': json.dumps(body, default=str)}

def hash_pw(pw):
    return hashlib.sha256(pw.encode()).hexdigest()

def handler(event, context):
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    method = event.get('httpMethod', 'GET')
    qs = event.get('queryStringParameters') or {}
    action = qs.get('action', '')

    conn = psycopg2.connect(DSN)
    cur = conn.cursor()

    try:
        if method == 'POST' and action == 'login':
            body = json.loads(event.get('body') or '{}')
            emp_id = body.get('employee_id', '').strip()
            password = body.get('password', '').strip()
            if not emp_id or not password:
                return resp(400, {'error': 'employee_id и password обязательны'})

            cur.execute(
                "SELECT id, full_name, role, password_hash, is_active FROM dashboard_users WHERE employee_id = %s",
                (emp_id,)
            )
            row = cur.fetchone()
            if not row:
                return resp(401, {'error': 'Неверный ID или пароль'})

            uid, name, role, pw_hash, active = row
            if not active:
                return resp(403, {'error': 'Учётная запись заблокирована'})
            if hash_pw(password) != pw_hash:
                return resp(401, {'error': 'Неверный ID или пароль'})

            token = secrets.token_hex(32)

            cur.execute("UPDATE dashboard_sessions SET is_active = false WHERE user_id = %s AND is_active = true", (uid,))

            cur.execute(
                "INSERT INTO dashboard_sessions (user_id, session_token) VALUES (%s, %s)",
                (uid, token)
            )

            cur.execute("UPDATE dashboard_users SET last_login_at = now() WHERE id = %s", (uid,))

            cur.execute(
                "INSERT INTO audit_logs (user_id, user_name, action, target, details) VALUES (%s, %s, 'login', 'dashboard', %s)",
                (uid, name, f'Вход в систему — {role}')
            )

            conn.commit()
            return resp(200, {
                'token': token,
                'user': {'id': uid, 'employeeId': emp_id, 'name': name, 'role': role}
            })

        if method == 'POST' and action == 'logout':
            token = (event.get('headers') or {}).get('X-Dashboard-Token') or (event.get('headers') or {}).get('x-dashboard-token')
            if not token:
                return resp(400, {'error': 'Нет токена'})

            cur.execute(
                "SELECT ds.user_id, du.full_name FROM dashboard_sessions ds JOIN dashboard_users du ON du.id = ds.user_id WHERE ds.session_token = %s AND ds.is_active = true",
                (token,)
            )
            row = cur.fetchone()
            if row:
                cur.execute("UPDATE dashboard_sessions SET is_active = false WHERE session_token = %s", (token,))
                cur.execute(
                    "INSERT INTO audit_logs (user_id, user_name, action, target, details) VALUES (%s, %s, 'logout', 'dashboard', 'Выход из системы')",
                    (row[0], row[1])
                )
                conn.commit()
            return resp(200, {'ok': True})

        if method == 'GET' and action == 'me':
            token = (event.get('headers') or {}).get('X-Dashboard-Token') or (event.get('headers') or {}).get('x-dashboard-token')
            if not token:
                return resp(401, {'error': 'Не авторизован'})

            cur.execute(
                "SELECT du.id, du.employee_id, du.full_name, du.role, du.is_active FROM dashboard_sessions ds JOIN dashboard_users du ON du.id = ds.user_id WHERE ds.session_token = %s AND ds.is_active = true",
                (token,)
            )
            row = cur.fetchone()
            if not row:
                return resp(401, {'error': 'Сессия истекла'})

            cur.execute("UPDATE dashboard_sessions SET last_seen = now() WHERE session_token = %s", (token,))
            conn.commit()
            return resp(200, {
                'user': {'id': row[0], 'employeeId': row[1], 'name': row[2], 'role': row[3], 'isActive': row[4]}
            })

        if method == 'GET' and action == 'users':
            token = (event.get('headers') or {}).get('X-Dashboard-Token') or (event.get('headers') or {}).get('x-dashboard-token')
            if not token:
                return resp(401, {'error': 'Не авторизован'})
            cur.execute(
                "SELECT du.role FROM dashboard_sessions ds JOIN dashboard_users du ON du.id = ds.user_id WHERE ds.session_token = %s AND ds.is_active = true",
                (token,)
            )
            r = cur.fetchone()
            if not r or r[0] != 'admin':
                return resp(403, {'error': 'Доступ только для администратора'})

            cur.execute("SELECT id, employee_id, full_name, role, phone, is_active, last_login_at, created_at FROM dashboard_users ORDER BY id")
            rows = cur.fetchall()
            users = [{'id': r[0], 'employeeId': r[1], 'name': r[2], 'role': r[3], 'phone': r[4], 'isActive': r[5], 'lastLogin': r[6], 'createdAt': r[7]} for r in rows]
            return resp(200, {'users': users})

        if method == 'POST' and action == 'create_user':
            token = (event.get('headers') or {}).get('X-Dashboard-Token') or (event.get('headers') or {}).get('x-dashboard-token')
            if not token:
                return resp(401, {'error': 'Не авторизован'})
            cur.execute(
                "SELECT du.id, du.role, du.full_name FROM dashboard_sessions ds JOIN dashboard_users du ON du.id = ds.user_id WHERE ds.session_token = %s AND ds.is_active = true",
                (token,)
            )
            r = cur.fetchone()
            if not r or r[1] != 'admin':
                return resp(403, {'error': 'Доступ только для администратора'})
            admin_id, _, admin_name = r

            body = json.loads(event.get('body') or '{}')
            emp_id = body.get('employee_id', '').strip()
            name = body.get('full_name', '').strip()
            role = body.get('role', '').strip()
            password = body.get('password', '').strip()
            phone = body.get('phone', '').strip() or None

            if not emp_id or not name or not role or not password:
                return resp(400, {'error': 'employee_id, full_name, role, password обязательны'})
            if role not in ('dispatcher', 'technician', 'admin', 'mechanic', 'engineer', 'manager'):
                return resp(400, {'error': 'role должен быть dispatcher, technician, admin, mechanic, engineer или manager'})

            cur.execute("SELECT id FROM dashboard_users WHERE employee_id = %s", (emp_id,))
            if cur.fetchone():
                return resp(409, {'error': f'Пользователь с ID {emp_id} уже существует'})

            cur.execute(
                "INSERT INTO dashboard_users (employee_id, full_name, role, password_hash, phone) VALUES (%s, %s, %s, %s, %s) RETURNING id",
                (emp_id, name, role, hash_pw(password), phone)
            )
            new_id = cur.fetchone()[0]

            cur.execute(
                "INSERT INTO audit_logs (user_id, user_name, action, target, details) VALUES (%s, %s, 'create_user', %s, %s)",
                (admin_id, admin_name, name, f'Создан {role} — {emp_id}')
            )
            conn.commit()
            return resp(201, {'id': new_id, 'employeeId': emp_id, 'name': name, 'role': role})

        if method == 'PUT' and action == 'update_user':
            token = (event.get('headers') or {}).get('X-Dashboard-Token') or (event.get('headers') or {}).get('x-dashboard-token')
            if not token:
                return resp(401, {'error': 'Не авторизован'})
            cur.execute(
                "SELECT du.id, du.role, du.full_name FROM dashboard_sessions ds JOIN dashboard_users du ON du.id = ds.user_id WHERE ds.session_token = %s AND ds.is_active = true",
                (token,)
            )
            r = cur.fetchone()
            if not r or r[1] != 'admin':
                return resp(403, {'error': 'Доступ только для администратора'})
            admin_id, _, admin_name = r

            body = json.loads(event.get('body') or '{}')
            user_id = body.get('id')
            if not user_id:
                return resp(400, {'error': 'id обязателен'})

            updates = []
            params = []
            if 'password' in body and body['password']:
                updates.append("password_hash = %s")
                params.append(hash_pw(body['password']))
            if 'is_active' in body:
                updates.append("is_active = %s")
                params.append(body['is_active'])
            if 'full_name' in body:
                updates.append("full_name = %s")
                params.append(body['full_name'])
            if 'phone' in body:
                updates.append("phone = %s")
                params.append(body['phone'])
            if 'role' in body:
                updates.append("role = %s")
                params.append(body['role'])

            if not updates:
                return resp(400, {'error': 'Нет полей для обновления'})

            updates.append("updated_at = now()")
            params.append(user_id)

            cur.execute(f"UPDATE dashboard_users SET {', '.join(updates)} WHERE id = %s", params)
            cur.execute(
                "INSERT INTO audit_logs (user_id, user_name, action, target, details) VALUES (%s, %s, 'update_user', %s, %s)",
                (admin_id, admin_name, str(user_id), json.dumps({k: v for k, v in body.items() if k != 'password'}, ensure_ascii=False))
            )
            conn.commit()
            return resp(200, {'ok': True})

        if method == 'DELETE' and action == 'delete_user':
            token = (event.get('headers') or {}).get('X-Dashboard-Token') or (event.get('headers') or {}).get('x-dashboard-token')
            if not token:
                return resp(401, {'error': 'Не авторизован'})
            cur.execute(
                "SELECT du.id, du.role, du.full_name FROM dashboard_sessions ds JOIN dashboard_users du ON du.id = ds.user_id WHERE ds.session_token = %s AND ds.is_active = true",
                (token,)
            )
            r = cur.fetchone()
            if not r or r[1] != 'admin':
                return resp(403, {'error': 'Доступ только для администратора'})
            admin_id, _, admin_name = r

            uid = qs.get('id')
            if not uid:
                return resp(400, {'error': 'id обязателен'})

            cur.execute("UPDATE dashboard_users SET is_active = false, updated_at = now() WHERE id = %s", (uid,))
            cur.execute("UPDATE dashboard_sessions SET is_active = false WHERE user_id = %s", (uid,))
            cur.execute(
                "INSERT INTO audit_logs (user_id, user_name, action, target, details) VALUES (%s, %s, 'delete_user', %s, 'Пользователь деактивирован')",
                (admin_id, admin_name, uid)
            )
            conn.commit()
            return resp(200, {'ok': True})

        if method == 'GET' and action == 'logs':
            token = (event.get('headers') or {}).get('X-Dashboard-Token') or (event.get('headers') or {}).get('x-dashboard-token')
            if not token:
                return resp(401, {'error': 'Не авторизован'})
            cur.execute(
                "SELECT du.role FROM dashboard_sessions ds JOIN dashboard_users du ON du.id = ds.user_id WHERE ds.session_token = %s AND ds.is_active = true",
                (token,)
            )
            r = cur.fetchone()
            if not r or r[0] != 'admin':
                return resp(403, {'error': 'Доступ только для администратора'})

            limit = int(qs.get('limit', '200'))
            cur.execute("SELECT id, user_name, action, target, details, created_at FROM audit_logs ORDER BY created_at DESC LIMIT %s", (limit,))
            rows = cur.fetchall()
            logs = [{'id': r[0], 'userName': r[1], 'action': r[2], 'target': r[3], 'details': r[4], 'createdAt': r[5]} for r in rows]
            return resp(200, {'logs': logs})

        return resp(404, {'error': 'Неизвестный action'})

    finally:
        cur.close()
        conn.close()