"""Управление учётными записями администраторов МРМ для планшетов"""
import json
import os
import hashlib
import psycopg2
import psycopg2.extras

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Dashboard-Token',
}

def resp(code, body):
    return {'statusCode': code, 'headers': {**CORS, 'Content-Type': 'application/json'},
            'body': json.dumps(body, ensure_ascii=False, default=str)}

def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])

def get_schema():
    return os.environ.get('MAIN_DB_SCHEMA', 't_p25163990_kiosk_app_project')

def hash_pw(pw: str) -> str:
    return hashlib.sha256(pw.encode()).hexdigest()

def check_admin(event, cur, schema):
    token = (event.get('headers') or {}).get('X-Dashboard-Token') or \
            (event.get('headers') or {}).get('x-dashboard-token')
    if not token:
        return None, resp(401, {'error': 'Не авторизован'})
    cur.execute(
        f"SELECT du.id, du.role, du.full_name FROM {schema}.dashboard_sessions ds "
        f"JOIN {schema}.dashboard_users du ON du.id = ds.user_id "
        f"WHERE ds.session_token = %s AND ds.is_active = true", (token,)
    )
    r = cur.fetchone()
    if not r or r['role'] != 'admin':
        return None, resp(403, {'error': 'Доступ только для администратора'})
    return {'id': r['id'], 'role': r['role'], 'name': r['full_name']}, None

def handler(event, context):
    """CRUD для администраторов МРМ планшетов + авторизация с планшета"""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': {**CORS, 'Access-Control-Max-Age': '86400'}, 'body': ''}

    method = event.get('httpMethod', 'GET')
    qs = event.get('queryStringParameters') or {}
    action = qs.get('action', '')
    schema = get_schema()
    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    try:
        # POST ?action=login — вход МРМ-администратора с планшета
        if method == 'POST' and action == 'login':
            body = json.loads(event.get('body') or '{}')
            login = body.get('login', '').strip()
            password = body.get('password', '').strip()
            if not login or not password:
                return resp(400, {'error': 'Логин и пароль обязательны'})
            cur.execute(
                f"SELECT id, full_name, login, admin_pin, kiosk_exit_password "
                f"FROM {schema}.mrm_admins "
                f"WHERE login = %s AND password_hash = %s AND is_active = true",
                (login, hash_pw(password))
            )
            row = cur.fetchone()
            if not row:
                return resp(401, {'error': 'Неверный логин или пароль'})
            ip = (event.get('requestContext') or {}).get('identity', {}).get('sourceIp') or ''
            cur.execute(
                f"UPDATE {schema}.mrm_admins SET last_seen_at = now(), last_tablet_ip = %s WHERE id = %s",
                (ip, row['id'])
            )
            conn.commit()
            return resp(200, {
                'mrmAdmin': {
                    'id': row['id'],
                    'fullName': row['full_name'],
                    'login': row['login'],
                    'adminPin': row['admin_pin'],
                    'kioskExitPassword': row['kiosk_exit_password'],
                }
            })

        # POST ?action=verify_exit — проверка служебного пароля для выхода из киоска
        if method == 'POST' and action == 'verify_exit':
            body = json.loads(event.get('body') or '{}')
            mrm_id = body.get('mrmId')
            password = body.get('password', '').strip()
            if not mrm_id or not password:
                return resp(400, {'error': 'mrmId и password обязательны'})
            cur.execute(
                f"SELECT kiosk_exit_password FROM {schema}.mrm_admins WHERE id = %s AND is_active = true",
                (mrm_id,)
            )
            row = cur.fetchone()
            if not row:
                return resp(404, {'error': 'Администратор не найден'})
            if row['kiosk_exit_password'] != password:
                return resp(403, {'error': 'Неверный служебный пароль'})
            cur.execute(
                f"UPDATE {schema}.mrm_admins SET last_seen_at = now() WHERE id = %s", (mrm_id,)
            )
            conn.commit()
            return resp(200, {'ok': True})

        # POST ?action=verify_pin — проверка admin PIN
        if method == 'POST' and action == 'verify_pin':
            body = json.loads(event.get('body') or '{}')
            mrm_id = body.get('mrmId')
            pin = body.get('pin', '').strip()
            if not mrm_id or not pin:
                return resp(400, {'error': 'mrmId и pin обязательны'})
            cur.execute(
                f"SELECT admin_pin FROM {schema}.mrm_admins WHERE id = %s AND is_active = true",
                (mrm_id,)
            )
            row = cur.fetchone()
            if not row:
                return resp(404, {'error': 'Администратор не найден'})
            if row['admin_pin'] != pin:
                return resp(403, {'error': 'Неверный PIN'})
            return resp(200, {'ok': True})

        # GET — список всех МРМ-администраторов
        if method == 'GET':
            user, err = check_admin(event, cur, schema)
            if err:
                return err
            cur.execute(
                f"SELECT id, full_name, login, admin_pin, kiosk_exit_password, "
                f"is_active, last_seen_at, last_tablet_ip, created_at "
                f"FROM {schema}.mrm_admins ORDER BY id"
            )
            rows = cur.fetchall()
            admins = []
            for r in rows:
                admins.append({
                    'id': r['id'],
                    'fullName': r['full_name'],
                    'login': r['login'],
                    'adminPin': r['admin_pin'],
                    'kioskExitPassword': r['kiosk_exit_password'],
                    'isActive': r['is_active'],
                    'lastSeenAt': str(r['last_seen_at']) if r['last_seen_at'] else None,
                    'lastTabletIp': r['last_tablet_ip'],
                    'createdAt': str(r['created_at']),
                })
            return resp(200, {'admins': admins})

        # POST — создать МРМ-администратора
        if method == 'POST':
            user, err = check_admin(event, cur, schema)
            if err:
                return err
            body = json.loads(event.get('body') or '{}')
            full_name = body.get('fullName', '').strip()
            login = body.get('login', '').strip()
            password = body.get('password', '').strip()
            kiosk_exit_password = body.get('kioskExitPassword', '').strip()
            admin_pin = body.get('adminPin', '').strip()

            if not full_name or not login or not password or not kiosk_exit_password or not admin_pin:
                return resp(400, {'error': 'Все поля обязательны'})

            cur.execute(f"SELECT id FROM {schema}.mrm_admins WHERE login = %s", (login,))
            if cur.fetchone():
                return resp(409, {'error': f'Логин {login} уже занят'})

            cur.execute(
                f"INSERT INTO {schema}.mrm_admins "
                f"(full_name, login, password_hash, kiosk_exit_password, admin_pin) "
                f"VALUES (%s, %s, %s, %s, %s) RETURNING id",
                (full_name, login, hash_pw(password), kiosk_exit_password, admin_pin)
            )
            new_id = cur.fetchone()['id']
            cur.execute(
                f"INSERT INTO {schema}.audit_logs (user_id, user_name, action, target, details) "
                f"VALUES (%s, %s, 'create_mrm_admin', %s, %s)",
                (user['id'], user['name'], full_name, f'Создан МРМ-администратор: {login}')
            )
            conn.commit()
            return resp(201, {'id': new_id, 'login': login, 'fullName': full_name})

        # PUT — обновить МРМ-администратора
        if method == 'PUT':
            user, err = check_admin(event, cur, schema)
            if err:
                return err
            body = json.loads(event.get('body') or '{}')
            admin_id = body.get('id')
            if not admin_id:
                return resp(400, {'error': 'id обязателен'})

            updates = []
            params = []
            if 'fullName' in body:
                updates.append("full_name = %s"); params.append(body['fullName'])
            if 'login' in body:
                cur.execute(f"SELECT id FROM {schema}.mrm_admins WHERE login = %s AND id != %s", (body['login'], admin_id))
                if cur.fetchone():
                    return resp(409, {'error': f'Логин {body["login"]} уже занят'})
                updates.append("login = %s"); params.append(body['login'])
            if 'password' in body and body['password']:
                updates.append("password_hash = %s"); params.append(hash_pw(body['password']))
            if 'kioskExitPassword' in body and body['kioskExitPassword']:
                updates.append("kiosk_exit_password = %s"); params.append(body['kioskExitPassword'])
            if 'adminPin' in body and body['adminPin']:
                updates.append("admin_pin = %s"); params.append(body['adminPin'])
            if 'isActive' in body:
                updates.append("is_active = %s"); params.append(body['isActive'])

            if not updates:
                return resp(400, {'error': 'Нет полей для обновления'})
            updates.append("updated_at = now()")
            params.append(admin_id)
            cur.execute(f"UPDATE {schema}.mrm_admins SET {', '.join(updates)} WHERE id = %s", params)
            conn.commit()
            return resp(200, {'ok': True})

        # DELETE — удалить МРМ-администратора
        if method == 'DELETE':
            user, err = check_admin(event, cur, schema)
            if err:
                return err
            admin_id = qs.get('id')
            if not admin_id:
                return resp(400, {'error': 'id обязателен'})
            cur.execute(f"UPDATE {schema}.mrm_admins SET is_active = false, updated_at = now() WHERE id = %s", (admin_id,))
            conn.commit()
            return resp(200, {'ok': True})

        return resp(405, {'error': 'Method not allowed'})

    finally:
        conn.close()