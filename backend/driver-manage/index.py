import json
import os
import psycopg2


def handler(event: dict, context) -> dict:
    """Управление водителями: создание, редактирование, список (для администратора/диспетчера)"""

    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': {'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, X-User-Id, X-Auth-Token, X-Session-Id', 'Access-Control-Max-Age': '86400'}, 'body': ''}

    headers = {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'}
    method = event.get('httpMethod', 'GET')
    params = event.get('queryStringParameters') or {}

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()

    try:
        # GET — список всех водителей
        if method == 'GET':
            cur.execute("""
                SELECT d.id, d.full_name, d.pin, d.employee_id, d.vehicle_type, d.vehicle_number, d.route_number,
                       d.shift_start, d.is_active, d.created_at,
                       s.is_online, s.last_seen, d.phone, d.shift_status, d.rating
                FROM drivers d
                LEFT JOIN driver_sessions s ON s.driver_id = d.id AND s.is_online = true
                ORDER BY d.full_name
            """)
            rows = cur.fetchall()
            drivers = []
            for r in rows:
                drivers.append({
                    'id': r[0], 'fullName': r[1], 'pin': r[2], 'employeeId': r[3],
                    'vehicleType': r[4], 'vehicleNumber': r[5], 'routeNumber': r[6],
                    'shiftStart': str(r[7]) if r[7] else None,
                    'isActive': r[8], 'createdAt': str(r[9]),
                    'isOnline': bool(r[10]), 'lastSeen': str(r[11]) if r[11] else None,
                    'phone': r[12], 'shiftStatus': r[13] or 'off_shift', 'rating': float(r[14]) if r[14] else 4.5
                })
            return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'drivers': drivers})}

        # POST — создать водителя
        if method == 'POST':
            body = json.loads(event.get('body') or '{}')
            full_name = body.get('fullName', '').strip()
            pin = body.get('pin', '').strip()
            vehicle_type = body.get('vehicleType', 'tram')
            vehicle_number = body.get('vehicleNumber', '')
            route_number = body.get('routeNumber', '')
            shift_start = body.get('shiftStart', '08:00')

            if not full_name or not pin:
                return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'ФИО и PIN обязательны'})}

            if len(pin) < 4:
                return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'PIN минимум 4 символа'})}

            cur.execute("SELECT id FROM drivers WHERE pin = %s", (pin,))
            if cur.fetchone():
                return {'statusCode': 409, 'headers': headers, 'body': json.dumps({'error': 'PIN уже используется'})}

            cur.execute("SELECT COALESCE(MAX(id), 0) + 1 FROM drivers")
            next_id = cur.fetchone()[0]
            employee_id = body.get('employeeId', '').strip() or str(next_id).zfill(4)

            cur.execute("SELECT id FROM drivers WHERE employee_id = %s", (employee_id,))
            if cur.fetchone():
                employee_id = str(next_id).zfill(4)

            phone = body.get('phone', '').strip() or None

            cur.execute(
                "INSERT INTO drivers (full_name, pin, employee_id, vehicle_type, vehicle_number, route_number, shift_start, phone) VALUES (%s, %s, %s, %s, %s, %s, %s, %s) RETURNING id",
                (full_name, pin, employee_id, vehicle_type, vehicle_number, route_number, shift_start, phone)
            )
            driver_id = cur.fetchone()[0]
            conn.commit()

            return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'id': driver_id, 'employeeId': employee_id, 'ok': True})}

        # PUT — обновить водителя
        if method == 'PUT':
            body = json.loads(event.get('body') or '{}')
            driver_id = body.get('id')
            if not driver_id:
                return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'id обязателен'})}

            fields = []
            values = []
            for field, col in [('fullName', 'full_name'), ('pin', 'pin'), ('vehicleType', 'vehicle_type'),
                                ('vehicleNumber', 'vehicle_number'), ('routeNumber', 'route_number'),
                                ('shiftStart', 'shift_start'), ('isActive', 'is_active')]:
                if field in body:
                    fields.append(f"{col} = %s")
                    values.append(body[field])

            if fields:
                values.append(driver_id)
                cur.execute(f"UPDATE drivers SET {', '.join(fields)} WHERE id = %s", values)
                conn.commit()

            return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'ok': True})}

        # DELETE — деактивировать водителя
        if method == 'DELETE':
            driver_id = params.get('id')
            if driver_id:
                cur.execute("UPDATE drivers SET is_active = false WHERE id = %s", (driver_id,))
                conn.commit()
            return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'ok': True})}

        return {'statusCode': 404, 'headers': headers, 'body': json.dumps({'error': 'Not found'})}

    finally:
        cur.close()
        conn.close()