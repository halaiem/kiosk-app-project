"""CRUD для dashboard: маршруты, транспорт, расписание, документы, водители, алерты, статистика (v2)"""
import json
import os
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

def get_user(cur, headers):
    token = headers.get('X-Dashboard-Token') or headers.get('x-dashboard-token')
    if not token:
        return None
    cur.execute(
        "SELECT du.id, du.employee_id, du.full_name, du.role FROM dashboard_sessions ds JOIN dashboard_users du ON du.id = ds.user_id WHERE ds.session_token = %s AND ds.is_active = true",
        (token,)
    )
    row = cur.fetchone()
    if row:
        cur.execute("UPDATE dashboard_sessions SET last_seen = now() WHERE session_token = %s", (token,))
        return {'id': row[0], 'employeeId': row[1], 'name': row[2], 'role': row[3]}
    return None

def log_action(cur, user, action, target, details=''):
    if user:
        cur.execute(
            "INSERT INTO audit_logs (user_id, user_name, action, target, details) VALUES (%s, %s, %s, %s, %s)",
            (user['id'], user['name'], action, target, details)
        )

def handler(event, context):
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    method = event.get('httpMethod', 'GET')
    qs = event.get('queryStringParameters') or {}
    entity = qs.get('entity', '')
    headers = event.get('headers') or {}

    conn = psycopg2.connect(DSN)
    cur = conn.cursor()

    try:
        user = get_user(cur, headers)
        if not user:
            conn.commit()
            return resp(401, {'error': 'Не авторизован'})

        if entity == 'stats':
            return handle_stats(cur, conn, user)
        if entity == 'drivers':
            return handle_drivers(method, qs, event, cur, conn, user)
        if entity == 'routes':
            return handle_routes(method, qs, event, cur, conn, user)
        if entity == 'vehicles':
            return handle_vehicles(method, qs, event, cur, conn, user)
        if entity == 'schedule':
            return handle_schedule(method, qs, event, cur, conn, user)
        if entity == 'documents':
            return handle_documents(method, qs, event, cur, conn, user)
        if entity == 'messages':
            return handle_messages(method, qs, event, cur, conn, user)
        if entity == 'alerts':
            return handle_alerts(method, qs, event, cur, conn, user)
        if entity == 'logs':
            return handle_logs(cur, conn, user)

        return resp(400, {'error': 'Укажите entity: stats, drivers, routes, vehicles, schedule, documents, messages, alerts, logs'})

    finally:
        cur.close()
        conn.close()


def handle_stats(cur, conn, user):
    cur.execute("SELECT COUNT(*) FROM drivers WHERE is_active = true")
    total_drivers = cur.fetchone()[0]

    cur.execute("""
        SELECT COUNT(DISTINCT d.id) FROM drivers d
        JOIN driver_sessions ds ON ds.driver_id = d.id AND ds.is_online = true
        WHERE d.is_active = true
    """)
    active_drivers = cur.fetchone()[0]

    cur.execute("SELECT COUNT(*) FROM routes WHERE is_active = true")
    active_routes = cur.fetchone()[0]

    cur.execute("SELECT COUNT(*) FROM vehicles WHERE transport_status = 'active'")
    total_vehicles = cur.fetchone()[0]

    cur.execute("SELECT COUNT(*) FROM messages WHERE message_type = 'urgent' AND is_read = false AND sender = 'driver'")
    unresolved_alerts = cur.fetchone()[0]

    conn.commit()
    return resp(200, {
        'stats': {
            'activeDrivers': active_drivers,
            'totalDrivers': total_drivers,
            'activeRoutes': active_routes,
            'unresolvedAlerts': unresolved_alerts,
            'avgDelay': 0,
            'onTimePercent': 95,
            'totalVehicles': total_vehicles
        }
    })


def handle_drivers(method, qs, event, cur, conn, user):
    if method == 'GET':
        cur.execute("""
            SELECT d.id, d.full_name, d.employee_id, d.vehicle_type, d.vehicle_number,
                   d.route_number, d.shift_start, d.is_active, d.phone, d.shift_status, d.rating,
                   ds.is_online, ds.last_seen, ds.latitude, ds.longitude, ds.speed
            FROM drivers d
            LEFT JOIN driver_sessions ds ON ds.driver_id = d.id AND ds.is_online = true
            WHERE d.is_active = true
            ORDER BY d.id
        """)
        rows = cur.fetchall()
        drivers = []
        for r in rows:
            drivers.append({
                'id': r[0], 'name': r[1], 'tabNumber': r[2],
                'vehicleType': r[3], 'vehicleNumber': r[4],
                'routeNumber': r[5], 'shiftStart': str(r[6]) if r[6] else None,
                'isActive': r[7], 'phone': r[8],
                'status': r[9] or 'off_shift', 'rating': float(r[10]) if r[10] else 4.5,
                'isOnline': bool(r[11]), 'lastSeen': r[12],
                'latitude': r[13], 'longitude': r[14], 'speed': r[15]
            })
        conn.commit()
        return resp(200, {'drivers': drivers})

    if method == 'POST':
        body = json.loads(event.get('body') or '{}')
        name = body.get('fullName', '').strip()
        pin = body.get('pin', '').strip()
        if not name or not pin:
            return resp(400, {'error': 'fullName и pin обязательны'})

        cur.execute("SELECT pin FROM drivers WHERE pin = %s AND is_active = true", (pin,))
        if cur.fetchone():
            return resp(409, {'error': 'Водитель с таким PIN уже существует'})

        emp_id = body.get('employeeId', '').strip()
        if not emp_id:
            cur.execute("SELECT COALESCE(MAX(CAST(employee_id AS INTEGER)), 0) + 1 FROM drivers WHERE employee_id ~ '^[0-9]+$'")
            next_id = cur.fetchone()[0]
            emp_id = str(next_id).zfill(4)

        cur.execute(
            """INSERT INTO drivers (full_name, pin, employee_id, vehicle_type, vehicle_number, route_number, shift_start, phone, shift_status)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING id""",
            (name, pin, emp_id, body.get('vehicleType', 'tram'), body.get('vehicleNumber'),
             body.get('routeNumber'), body.get('shiftStart'), body.get('phone'), 'off_shift')
        )
        new_id = cur.fetchone()[0]
        log_action(cur, user, 'create_driver', name, f'ID={new_id}, emp={emp_id}')
        conn.commit()
        return resp(201, {'id': new_id, 'employeeId': emp_id})

    if method == 'PUT':
        body = json.loads(event.get('body') or '{}')
        did = body.get('id')
        if not did:
            return resp(400, {'error': 'id обязателен'})

        updates = []
        params = []
        field_map = {
            'fullName': 'full_name', 'pin': 'pin', 'vehicleType': 'vehicle_type',
            'vehicleNumber': 'vehicle_number', 'routeNumber': 'route_number',
            'shiftStart': 'shift_start', 'phone': 'phone', 'shiftStatus': 'shift_status',
            'isActive': 'is_active'
        }
        for js_key, db_col in field_map.items():
            if js_key in body:
                updates.append(f"{db_col} = %s")
                params.append(body[js_key])

        if not updates:
            return resp(400, {'error': 'Нет полей для обновления'})

        params.append(did)
        cur.execute(f"UPDATE drivers SET {', '.join(updates)} WHERE id = %s", params)
        log_action(cur, user, 'update_driver', str(did), json.dumps(body, ensure_ascii=False))
        conn.commit()
        return resp(200, {'ok': True})

    if method == 'DELETE':
        did = qs.get('id')
        if not did:
            return resp(400, {'error': 'id обязателен'})
        cur.execute("UPDATE drivers SET is_active = false WHERE id = %s", (did,))
        log_action(cur, user, 'delete_driver', did, 'Деактивирован')
        conn.commit()
        return resp(200, {'ok': True})

    return resp(405, {'error': 'Method not allowed'})


def handle_routes(method, qs, event, cur, conn, user):
    if method == 'GET':
        cur.execute("""
            SELECT id, route_number, name, transport_type, color, is_active,
                   distance_km, avg_time_min, route_status, created_at
            FROM routes ORDER BY route_number
        """)
        rows = cur.fetchall()

        cur.execute("SELECT route_id, COUNT(*) FROM route_stops GROUP BY route_id")
        stops_map = {str(r[0]): r[1] for r in cur.fetchall()}

        routes = []
        for r in rows:
            routes.append({
                'id': str(r[0]), 'routeNumber': r[1], 'number': r[1], 'name': r[2], 'transportType': r[3],
                'color': r[4], 'isActive': r[5],
                'distanceKm': float(r[6]) if r[6] else 0, 'distance': float(r[6]) if r[6] else 0,
                'avgTimeMin': r[7] or 0, 'avgTime': r[7] or 0,
                'stopsCount': stops_map.get(str(r[0]), 0),
                'routeStatus': r[8] or 'active',
                'assignedVehicles': 0,
                'createdAt': r[9]
            })
        conn.commit()
        return resp(200, {'routes': routes})

    if method == 'POST':
        if user['role'] not in ('technician', 'admin'):
            return resp(403, {'error': 'Нет доступа'})

        body = json.loads(event.get('body') or '{}')
        number = body.get('number', '').strip()
        name = body.get('name', '').strip()
        if not number or not name:
            return resp(400, {'error': 'number и name обязательны'})

        org_id = 1
        cur.execute("SELECT id FROM organizations LIMIT 1")
        org_row = cur.fetchone()
        if org_row:
            org_id = org_row[0]

        cur.execute(
            """INSERT INTO routes (organization_id, route_number, name, transport_type, color, distance_km, avg_time_min, route_status)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s) RETURNING id""",
            (org_id, number, name, body.get('transportType', 'bus'), body.get('color', '#3b82f6'),
             body.get('distance', 0), body.get('avgTime', 0), body.get('routeStatus', 'planned'))
        )
        rid = cur.fetchone()[0]
        log_action(cur, user, 'create_route', f'М{number}', name)
        conn.commit()
        return resp(201, {'id': str(rid)})

    if method == 'PUT':
        if user['role'] not in ('technician', 'admin'):
            return resp(403, {'error': 'Нет доступа'})

        body = json.loads(event.get('body') or '{}')
        rid = body.get('id')
        if not rid:
            return resp(400, {'error': 'id обязателен'})

        updates = []
        params = []
        field_map = {
            'number': 'route_number', 'name': 'name', 'transportType': 'transport_type',
            'color': 'color', 'isActive': 'is_active', 'distance': 'distance_km',
            'avgTime': 'avg_time_min', 'routeStatus': 'route_status'
        }
        for js_key, db_col in field_map.items():
            if js_key in body:
                updates.append(f"{db_col} = %s")
                params.append(body[js_key])

        if updates:
            updates.append("updated_at = now()")
            params.append(rid)
            cur.execute(f"UPDATE routes SET {', '.join(updates)} WHERE id = %s", params)
            log_action(cur, user, 'update_route', str(rid), json.dumps(body, ensure_ascii=False))
            conn.commit()
        return resp(200, {'ok': True})

    return resp(405, {'error': 'Method not allowed'})


def handle_vehicles(method, qs, event, cur, conn, user):
    if method == 'GET':
        cur.execute("""
            SELECT v.id, v.label, v.transport_type, v.license_plate, v.model,
                   v.capacity, v.manufacture_year, v.transport_status,
                   v.mileage, v.last_maintenance_at, v.next_maintenance_at,
                   r.route_number, d.full_name
            FROM vehicles v
            LEFT JOIN routes r ON r.id = v.assigned_route_id
            LEFT JOIN drivers d ON d.id = v.assigned_driver_id
            ORDER BY v.label
        """)
        rows = cur.fetchall()
        vehicles = []
        for r in rows:
            status_map = {'active': 'active', 'maintenance': 'maintenance', 'decommissioned': 'offline'}
            vehicles.append({
                'id': str(r[0]), 'number': r[1], 'type': r[2], 'licensePlate': r[3],
                'model': r[4], 'capacity': r[5], 'year': r[6],
                'status': status_map.get(r[7], r[7]),
                'mileage': r[8] or 0, 'lastMaintenance': r[9], 'nextMaintenance': r[10],
                'routeNumber': r[11], 'driverName': r[12]
            })
        conn.commit()
        return resp(200, {'vehicles': vehicles})

    if method == 'POST':
        if user['role'] not in ('technician', 'admin'):
            return resp(403, {'error': 'Нет доступа'})

        body = json.loads(event.get('body') or '{}')
        label = body.get('number', '').strip() or body.get('label', '').strip()
        if not label:
            return resp(400, {'error': 'number/label обязателен'})

        org_id = 1
        cur.execute("SELECT id FROM organizations LIMIT 1")
        org_row = cur.fetchone()
        if org_row:
            org_id = org_row[0]

        cur.execute(
            """INSERT INTO vehicles (organization_id, label, transport_type, license_plate, model, capacity, manufacture_year, transport_status, mileage)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING id""",
            (org_id, label, body.get('type', 'bus'), body.get('licensePlate'),
             body.get('model'), body.get('capacity'), body.get('year'),
             body.get('status', 'active'), body.get('mileage', 0))
        )
        vid = cur.fetchone()[0]
        log_action(cur, user, 'create_vehicle', label, f'Тип: {body.get("type", "bus")}')
        conn.commit()
        return resp(201, {'id': str(vid)})

    return resp(405, {'error': 'Method not allowed'})


def handle_schedule(method, qs, event, cur, conn, user):
    if method == 'GET':
        cur.execute("""
            SELECT a.id, r.route_number, d.full_name, v.label,
                   a.shift_start, a.shift_end, a.assignment_status, a.created_at
            FROM assignments a
            LEFT JOIN routes r ON r.id = a.route_id
            LEFT JOIN vehicles v ON v.id = a.vehicle_id
            LEFT JOIN drivers d ON d.id = a.driver_id
            ORDER BY a.shift_start DESC
        """)
        rows = cur.fetchall()
        schedule = []
        for r in rows:
            schedule.append({
                'id': str(r[0]), 'routeNumber': r[1] or '', 'driverName': r[2] or '',
                'vehicleNumber': r[3] or '', 'startTime': r[4], 'endTime': r[5],
                'status': r[6] or 'scheduled', 'date': str(r[4].date()) if r[4] else ''
            })
        conn.commit()
        return resp(200, {'schedule': schedule})

    if method == 'POST':
        if user['role'] not in ('technician', 'admin'):
            return resp(403, {'error': 'Нет доступа'})

        body = json.loads(event.get('body') or '{}')
        vehicle_id = body.get('vehicleId')
        route_id = body.get('routeId')
        shift_start = body.get('shiftStart')
        if not vehicle_id or not route_id or not shift_start:
            return resp(400, {'error': 'vehicleId, routeId, shiftStart обязательны'})

        cur.execute(
            """INSERT INTO assignments (vehicle_id, route_id, driver_id, shift_start, shift_end, assignment_status)
               VALUES (%s, %s, %s, %s, %s, %s) RETURNING id""",
            (vehicle_id, route_id, body.get('driverId'), shift_start,
             body.get('shiftEnd'), body.get('status', 'scheduled'))
        )
        aid = cur.fetchone()[0]
        log_action(cur, user, 'create_assignment', str(aid), f'Маршрут={route_id}')
        conn.commit()
        return resp(201, {'id': str(aid)})

    if method == 'PUT':
        body = json.loads(event.get('body') or '{}')
        aid = body.get('id')
        if not aid:
            return resp(400, {'error': 'id обязателен'})
        status = body.get('status')
        if status:
            cur.execute("UPDATE assignments SET assignment_status = %s, updated_at = now() WHERE id = %s", (status, aid))
            log_action(cur, user, 'update_assignment', str(aid), f'Статус → {status}')
            conn.commit()
        return resp(200, {'ok': True})

    return resp(405, {'error': 'Method not allowed'})


def handle_documents(method, qs, event, cur, conn, user):
    if method == 'GET':
        cur.execute("""
            SELECT d.id, d.title, d.doc_type, d.status, d.author_id, du.full_name,
                   d.assigned_to_driver_id, dr.full_name, d.created_at, d.updated_at
            FROM documents d
            LEFT JOIN dashboard_users du ON du.id = d.author_id
            LEFT JOIN drivers dr ON dr.id = d.assigned_to_driver_id
            ORDER BY d.updated_at DESC
        """)
        rows = cur.fetchall()
        docs = []
        for r in rows:
            docs.append({
                'id': r[0], 'title': r[1], 'type': r[2], 'status': r[3],
                'authorId': r[4], 'author': r[5] or '', 'assignedToId': r[6],
                'assignedTo': r[7] or '', 'createdAt': r[8], 'updatedAt': r[9]
            })
        conn.commit()
        return resp(200, {'documents': docs})

    if method == 'POST':
        body = json.loads(event.get('body') or '{}')
        title = body.get('title', '').strip()
        doc_type = body.get('type', '').strip()
        if not title or not doc_type:
            return resp(400, {'error': 'title и type обязательны'})

        cur.execute(
            """INSERT INTO documents (title, doc_type, status, author_id, assigned_to_driver_id, content)
               VALUES (%s, %s, %s, %s, %s, %s) RETURNING id""",
            (title, doc_type, body.get('status', 'draft'), user['id'],
             body.get('assignedToDriverId'), body.get('content'))
        )
        did = cur.fetchone()[0]
        log_action(cur, user, 'create_document', title, f'Тип: {doc_type}')
        conn.commit()
        return resp(201, {'id': did})

    if method == 'PUT':
        body = json.loads(event.get('body') or '{}')
        did = body.get('id')
        status = body.get('status')
        if not did or not status:
            return resp(400, {'error': 'id и status обязательны'})

        cur.execute("UPDATE documents SET status = %s, updated_at = now() WHERE id = %s", (status, did))
        log_action(cur, user, 'update_document', str(did), f'Статус → {status}')
        conn.commit()
        return resp(200, {'ok': True})

    return resp(405, {'error': 'Method not allowed'})


def handle_messages(method, qs, event, cur, conn, user):
    if method == 'GET':
        driver_id = qs.get('driver_id')
        limit = int(qs.get('limit', '100'))

        if driver_id:
            cur.execute("""
                SELECT m.id, m.driver_id, d.full_name, d.vehicle_number, d.route_number,
                       m.text, m.sender, m.message_type, m.is_read, m.created_at, m.delivered_at
                FROM messages m
                JOIN drivers d ON d.id = m.driver_id
                WHERE m.driver_id = %s
                ORDER BY m.created_at DESC LIMIT %s
            """, (driver_id, limit))
        else:
            cur.execute("""
                SELECT m.id, m.driver_id, d.full_name, d.vehicle_number, d.route_number,
                       m.text, m.sender, m.message_type, m.is_read, m.created_at, m.delivered_at
                FROM messages m
                JOIN drivers d ON d.id = m.driver_id
                ORDER BY m.created_at DESC LIMIT %s
            """, (limit,))

        rows = cur.fetchall()
        messages = []
        for r in rows:
            messages.append({
                'id': r[0], 'driverId': str(r[1]), 'driverName': r[2],
                'vehicleNumber': r[3] or '', 'routeNumber': r[4] or '',
                'text': r[5], 'direction': 'incoming' if r[6] == 'driver' else 'outgoing',
                'type': r[7] or 'normal', 'read': r[8], 'timestamp': r[9],
                'deliveredAt': r[10]
            })
        conn.commit()
        return resp(200, {'messages': messages})

    if method == 'POST':
        body = json.loads(event.get('body') or '{}')
        driver_id = body.get('driver_id') or body.get('driverId')
        text = body.get('text', '').strip()
        msg_type = body.get('type', 'normal')

        if not driver_id or not text:
            return resp(400, {'error': 'driver_id и text обязательны'})

        cur.execute(
            """INSERT INTO messages (driver_id, sender, text, message_type, dispatcher_id)
               VALUES (%s, 'dispatcher', %s, %s, %s) RETURNING id, created_at""",
            (driver_id, text, msg_type, user['id'])
        )
        row = cur.fetchone()
        log_action(cur, user, 'send_message', f'Водитель #{driver_id}', text[:100])
        conn.commit()
        return resp(201, {'id': row[0], 'createdAt': row[1]})

    return resp(405, {'error': 'Method not allowed'})


def handle_alerts(method, qs, event, cur, conn, user):
    if method == 'GET':
        cur.execute("""
            SELECT m.id, m.driver_id, d.full_name, d.vehicle_number, d.route_number,
                   m.text, m.message_type, m.is_read, m.created_at
            FROM messages m
            JOIN drivers d ON d.id = m.driver_id
            WHERE m.message_type = 'urgent' AND m.sender = 'driver'
            ORDER BY m.created_at DESC LIMIT 50
        """)
        rows = cur.fetchall()
        alerts = []
        for r in rows:
            alerts.append({
                'id': r[0], 'driverId': str(r[1]), 'driverName': r[2],
                'vehicleNumber': r[3] or '', 'routeNumber': r[4] or '',
                'message': r[5], 'type': 'sos', 'level': 'critical',
                'timestamp': r[8], 'resolved': bool(r[7])
            })
        conn.commit()
        return resp(200, {'alerts': alerts})

    if method == 'PUT':
        body = json.loads(event.get('body') or '{}')
        mid = body.get('id')
        if not mid:
            return resp(400, {'error': 'id обязателен'})

        cur.execute("UPDATE messages SET is_read = true WHERE id = %s", (mid,))
        log_action(cur, user, 'resolve_alert', str(mid), f'Решено: {user["name"]}')
        conn.commit()
        return resp(200, {'ok': True})

    return resp(405, {'error': 'Method not allowed for alerts'})


def handle_logs(cur, conn, user):
    if user['role'] != 'admin':
        conn.commit()
        return resp(403, {'error': 'Доступ только для администратора'})

    cur.execute("""
        SELECT id, user_id, user_name, action, target, details, created_at
        FROM audit_logs ORDER BY created_at DESC LIMIT 200
    """)
    rows = cur.fetchall()
    logs = []
    for r in rows:
        logs.append({
            'id': r[0], 'userId': r[1], 'userName': r[2] or '',
            'action': r[3], 'target': r[4] or '', 'details': r[5] or '',
            'createdAt': r[6]
        })
    conn.commit()
    return resp(200, {'logs': logs})