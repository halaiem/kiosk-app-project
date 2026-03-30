import json
import os
import secrets
import psycopg2


def handler(event: dict, context) -> dict:
    """Аутентификация водителя по PIN-коду и управление сессией"""

    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': {'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, X-User-Id, X-Auth-Token, X-Session-Id', 'Access-Control-Max-Age': '86400'}, 'body': ''}

    headers = {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'}
    method = event.get('httpMethod', 'GET')
    params = event.get('queryStringParameters') or {}
    action = params.get('action', '')

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()

    try:
        # POST ?action=login — вход по табельному номеру + PIN
        if method == 'POST' and action == 'login':
            body = json.loads(event.get('body') or '{}')
            employee_id = body.get('employee_id', '').strip()
            pin = body.get('pin', '').strip()

            if not employee_id or not pin:
                return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Табельный номер и PIN обязательны'})}

            cur.execute("SELECT id, full_name, vehicle_type, vehicle_number, route_number, shift_start FROM drivers WHERE employee_id = %s AND pin = %s AND is_active = true", (employee_id, pin))
            driver = cur.fetchone()

            if not driver:
                return {'statusCode': 401, 'headers': headers, 'body': json.dumps({'error': 'Неверный PIN'})}

            driver_id, full_name, vehicle_type, vehicle_number, route_number, shift_start = driver
            token = secrets.token_hex(32)

            cur.execute("UPDATE driver_sessions SET is_online = false WHERE driver_id = %s", (driver_id,))
            cur.execute(
                "INSERT INTO driver_sessions (driver_id, session_token, started_at, last_seen, is_online) VALUES (%s, %s, NOW(), NOW(), true)",
                (driver_id, token)
            )
            conn.commit()

            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({
                    'token': token,
                    'driver': {
                        'id': driver_id,
                        'name': full_name,
                        'vehicleType': vehicle_type,
                        'vehicleNumber': vehicle_number,
                        'routeNumber': route_number,
                        'shiftStart': str(shift_start) if shift_start else '08:00'
                    }
                })
            }

        # POST ?action=logout — выход
        if method == 'POST' and action == 'logout':
            token = event.get('headers', {}).get('X-Auth-Token', '')
            if token:
                cur.execute("UPDATE driver_sessions SET is_online = false WHERE session_token = %s", (token,))
                conn.commit()
            return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'ok': True})}

        # POST ?action=heartbeat — обновление онлайн-статуса и координат
        if method == 'POST' and action == 'heartbeat':
            token = event.get('headers', {}).get('X-Auth-Token', '')
            body = json.loads(event.get('body') or '{}')
            lat = body.get('latitude')
            lng = body.get('longitude')
            speed = body.get('speed', 0)

            cur.execute(
                "UPDATE driver_sessions SET last_seen = NOW(), is_online = true, latitude = %s, longitude = %s, speed = %s WHERE session_token = %s",
                (lat, lng, speed, token)
            )
            conn.commit()
            return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'ok': True})}

        # GET — список онлайн водителей (для диспетчера)
        if method == 'GET':
            cur.execute("""
                SELECT d.id, d.full_name, d.vehicle_type, d.vehicle_number, d.route_number,
                       s.is_online, s.last_seen, s.latitude, s.longitude, s.speed
                FROM drivers d
                LEFT JOIN driver_sessions s ON s.driver_id = d.id AND s.is_online = true
                WHERE d.is_active = true
                ORDER BY s.is_online DESC NULLS LAST, d.full_name
            """)
            rows = cur.fetchall()
            drivers = []
            for r in rows:
                drivers.append({
                    'id': r[0], 'name': r[1], 'vehicleType': r[2], 'vehicleNumber': r[3],
                    'routeNumber': r[4], 'isOnline': bool(r[5]), 'lastSeen': str(r[6]) if r[6] else None,
                    'latitude': r[7], 'longitude': r[8], 'speed': r[9] or 0
                })
            return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'drivers': drivers})}

        return {'statusCode': 404, 'headers': headers, 'body': json.dumps({'error': 'Not found'})}

    finally:
        cur.close()
        conn.close()