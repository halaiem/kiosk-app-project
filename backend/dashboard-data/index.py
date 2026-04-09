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

        if entity == 'templates':
            return handle_templates(method, qs, event, cur, conn, user)

        if entity == 'batch' and method == 'GET':
            return handle_batch(cur, conn, user)

        return resp(400, {'error': 'Укажите entity: stats, drivers, routes, vehicles, schedule, documents, messages, alerts, logs, templates, batch'})

    finally:
        cur.close()
        conn.close()


def _fetch_stats(cur):
    cur.execute("""
        SELECT
            (SELECT COUNT(*) FROM drivers WHERE is_active = true) as total_drivers,
            (SELECT COUNT(DISTINCT d.id) FROM drivers d JOIN driver_sessions ds ON ds.driver_id = d.id AND ds.is_online = true WHERE d.is_active = true) as active_drivers,
            (SELECT COUNT(*) FROM routes WHERE is_active = true) as active_routes,
            (SELECT COUNT(*) FROM vehicles WHERE transport_status = 'active') as total_vehicles,
            (SELECT COUNT(*) FROM messages WHERE message_type = 'urgent' AND is_read = false AND sender = 'driver') as unresolved_alerts
    """)
    r = cur.fetchone()
    return {
        'activeDrivers': r[1], 'totalDrivers': r[0], 'activeRoutes': r[2],
        'unresolvedAlerts': r[4], 'avgDelay': 0, 'onTimePercent': 95, 'totalVehicles': r[3]
    }

def handle_stats(cur, conn, user):
    conn.commit()
    return resp(200, {'stats': _fetch_stats(cur)})


def handle_batch(cur, conn, user):
    stats = _fetch_stats(cur)

    cur.execute("""
        SELECT d.id, d.full_name, d.employee_id, d.vehicle_type, d.vehicle_number,
               d.route_number, d.shift_start, d.is_active, d.phone, d.shift_status, d.rating,
               ds.is_online, ds.last_seen, ds.latitude, ds.longitude, ds.speed,
               d.driver_status, d.status_changed_at, d.status_note, d.pin
        FROM drivers d
        LEFT JOIN driver_sessions ds ON ds.driver_id = d.id AND ds.is_online = true
        WHERE d.is_active = true AND d.driver_status != 'fired'
        ORDER BY d.id
    """)
    drivers = [{'id': r[0], 'name': r[1], 'tabNumber': r[2], 'vehicleType': r[3], 'vehicleNumber': r[4], 'routeNumber': r[5], 'shiftStart': str(r[6]) if r[6] else None, 'isActive': r[7], 'phone': r[8], 'status': r[9] or 'off_shift', 'rating': float(r[10]) if r[10] else 4.5, 'isOnline': bool(r[11]), 'lastSeen': r[12], 'latitude': r[13], 'longitude': r[14], 'speed': r[15], 'driverStatus': r[16] or 'active', 'statusChangedAt': r[17], 'statusNote': r[18], 'pin': r[19]} for r in cur.fetchall()]

    cur.execute("SELECT id, route_number, name, is_active, distance_km, avg_time_min, route_status FROM routes WHERE is_active = true ORDER BY route_number")
    routes = [{'id': r[0], 'number': r[1], 'name': r[2], 'isActive': r[3], 'distance': float(r[4]) if r[4] else 0, 'avgTime': r[5] or 0, 'routeStatus': r[6] or 'active', 'stopsCount': 0, 'assignedVehicles': 0} for r in cur.fetchall()]

    cur.execute("""
        SELECT v.id, v.label, v.transport_type, v.transport_status,
               v.mileage, v.last_maintenance_at, v.next_maintenance_at,
               r.route_number, d.full_name
        FROM vehicles v
        LEFT JOIN routes r ON r.id = v.assigned_route_id
        LEFT JOIN drivers d ON d.id = v.assigned_driver_id
        ORDER BY v.label
    """)
    vehicles = [{'id': r[0], 'number': r[1] or '', 'type': r[2] or 'bus', 'status': r[3] or 'active', 'mileage': r[4] or 0, 'lastMaintenance': str(r[5]) if r[5] else None, 'nextMaintenance': str(r[6]) if r[6] else None, 'routeNumber': r[7] or '', 'driverName': r[8] or ''} for r in cur.fetchall()]

    cur.execute("""
        SELECT a.id, r.route_number, d.full_name, v.label,
               a.shift_start, a.shift_end, a.assignment_status, a.created_at
        FROM assignments a
        LEFT JOIN routes r ON r.id = a.route_id
        LEFT JOIN vehicles v ON v.id = a.vehicle_id
        LEFT JOIN drivers d ON d.id = a.driver_id
        ORDER BY a.shift_start DESC LIMIT 200
    """)
    schedule = [{'id': r[0], 'routeNumber': r[1] or '', 'driverName': r[2] or '', 'vehicleNumber': r[3] or '', 'startTime': str(r[4]) if r[4] else '', 'endTime': str(r[5]) if r[5] else '', 'date': str(r[4])[:10] if r[4] else '', 'status': r[6] or 'planned'} for r in cur.fetchall()]

    cur.execute("""
        SELECT d.id, d.title, d.doc_type, d.status, du.full_name, d.created_at, d.updated_at
        FROM documents d
        LEFT JOIN dashboard_users du ON du.id = d.author_id
        ORDER BY d.updated_at DESC LIMIT 100
    """)
    documents = [{'id': r[0], 'title': r[1] or '', 'type': r[2] or 'instruction', 'status': r[3] or 'draft', 'author': r[4] or '', 'createdAt': str(r[5]) if r[5] else None, 'updatedAt': str(r[6]) if r[6] else None} for r in cur.fetchall()]

    cur.execute("SELECT id, driver_id, text, message_type, is_read, created_at, sender, client_id FROM messages ORDER BY created_at DESC LIMIT 200")
    messages = []
    msg_driver_ids = []
    msg_rows = cur.fetchall()
    for r in msg_rows:
        msg_driver_ids.append(r[1])
    driver_map = {d['id']: d for d in drivers}
    for r in msg_rows:
        drv = driver_map.get(r[1], {})
        messages.append({'id': r[0], 'driverId': r[1], 'driverName': drv.get('name', ''), 'vehicleNumber': drv.get('vehicleNumber', ''), 'routeNumber': drv.get('routeNumber', ''), 'text': r[2] or '', 'type': r[3] or 'normal', 'read': bool(r[4]), 'timestamp': str(r[5]) if r[5] else None, 'sender': r[6], 'clientId': r[7]})

    cur.execute("""
        SELECT m.id, m.driver_id, d.full_name, d.vehicle_number, d.route_number,
               m.text, m.message_type, m.is_read, m.created_at
        FROM messages m
        JOIN drivers d ON d.id = m.driver_id
        WHERE m.message_type = 'urgent' AND m.sender = 'driver'
        ORDER BY m.created_at DESC LIMIT 50
    """)
    alerts = [{'id': r[0], 'driverId': r[1], 'driverName': r[2] or '', 'vehicleNumber': r[3] or '', 'routeNumber': r[4] or '', 'message': r[5] or '', 'type': 'sos', 'level': 'critical', 'timestamp': str(r[8]) if r[8] else None, 'resolved': bool(r[7])} for r in cur.fetchall()]

    conn.commit()
    return resp(200, {'stats': stats, 'drivers': drivers, 'routes': routes, 'vehicles': vehicles, 'schedule': schedule, 'documents': documents, 'messages': messages, 'alerts': alerts})


def handle_drivers(method, qs, event, cur, conn, user):
    if method == 'GET':
        include_all = qs.get('include_all') == 'true'
        where_clause = "" if include_all else "WHERE d.is_active = true AND d.driver_status != 'fired'"
        cur.execute(f"""
            SELECT d.id, d.full_name, d.employee_id, d.vehicle_type, d.vehicle_number,
                   d.route_number, d.shift_start, d.is_active, d.phone, d.shift_status, d.rating,
                   ds.is_online, ds.last_seen, ds.latitude, ds.longitude, ds.speed,
                   d.driver_status, d.status_changed_at, d.status_note, d.pin
            FROM drivers d
            LEFT JOIN driver_sessions ds ON ds.driver_id = d.id AND ds.is_online = true
            {where_clause}
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
                'latitude': r[13], 'longitude': r[14], 'speed': r[15],
                'driverStatus': r[16] or 'active', 'statusChangedAt': r[17],
                'statusNote': r[18], 'pin': r[19]
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
        if user['role'] not in ('technician', 'admin'):
            return resp(403, {'error': 'Нет доступа'})

        body = json.loads(event.get('body') or '{}')
        did = body.get('id')
        if not did:
            return resp(400, {'error': 'id обязателен'})

        # PIN change requires technician password verification
        if 'pin' in body:
            tech_password = body.get('techPassword', '')
            if not tech_password:
                return resp(400, {'error': 'Для изменения PIN требуется пароль техника'})
            import hashlib
            pwd_hash = hashlib.sha256(tech_password.encode()).hexdigest()
            cur.execute("SELECT id FROM dashboard_users WHERE id = %s AND password_hash = %s", (user['id'], pwd_hash))
            if not cur.fetchone():
                return resp(403, {'error': 'Неверный пароль техника'})
            # Check PIN uniqueness
            new_pin = body['pin'].strip()
            cur.execute("SELECT id FROM drivers WHERE pin = %s AND is_active = true AND id != %s", (new_pin, did))
            if cur.fetchone():
                return resp(409, {'error': 'Водитель с таким PIN уже существует'})

        updates = []
        params = []
        field_map = {
            'fullName': 'full_name', 'pin': 'pin', 'vehicleType': 'vehicle_type',
            'vehicleNumber': 'vehicle_number', 'routeNumber': 'route_number',
            'shiftStart': 'shift_start', 'phone': 'phone', 'shiftStatus': 'shift_status',
            'isActive': 'is_active', 'driverStatus': 'driver_status',
            'statusNote': 'status_note', 'rating': 'rating', 'employeeId': 'employee_id'
        }
        for js_key, db_col in field_map.items():
            if js_key in body:
                updates.append(f"{db_col} = %s")
                params.append(body[js_key])

        # Handle driver status changes
        new_driver_status = body.get('driverStatus')
        if new_driver_status:
            updates.append("status_changed_at = now()")
            if new_driver_status == 'fired':
                if 'is_active' not in [u.split(' = ')[0] for u in updates]:
                    updates.append("is_active = %s")
                    params.append(False)
                # Remove from active assignments
                cur.execute(
                    "UPDATE assignments SET assignment_status = 'cancelled', updated_at = now() WHERE driver_id = %s AND assignment_status IN ('scheduled', 'active')",
                    (did,)
                )

        if not updates:
            return resp(400, {'error': 'Нет полей для обновления'})

        params.append(did)
        cur.execute(f"UPDATE drivers SET {', '.join(updates)} WHERE id = %s", params)
        log_action(cur, user, 'update_driver', str(did), json.dumps({k: v for k, v in body.items() if k != 'techPassword'}, ensure_ascii=False))
        conn.commit()
        return resp(200, {'ok': True})

    if method == 'DELETE':
        did = qs.get('id')
        if not did:
            return resp(400, {'error': 'id обязателен'})
        cur.execute("UPDATE drivers SET is_active = false, driver_status = 'fired', status_changed_at = now() WHERE id = %s", (did,))
        cur.execute("UPDATE assignments SET assignment_status = 'cancelled', updated_at = now() WHERE driver_id = %s AND assignment_status IN ('scheduled', 'active')", (int(did),))
        log_action(cur, user, 'delete_driver', did, 'Уволен/деактивирован')
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
                   r.route_number, d.full_name,
                   v.vin_number, v.board_number, v.gov_reg_number,
                   v.manufacturer, v.reg_certificate_number, v.documents_info,
                   v.fuel_type, v.color, v.passenger_capacity, v.is_accessible,
                   v.insurance_number, v.insurance_expiry, v.tech_inspection_expiry
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
                'routeNumber': r[11], 'driverName': r[12],
                'vinNumber': r[13], 'boardNumber': r[14], 'govRegNumber': r[15],
                'manufacturer': r[16], 'regCertificateNumber': r[17], 'documentsInfo': r[18],
                'fuelType': r[19], 'vehicleColor': r[20], 'passengerCapacity': r[21],
                'isAccessible': r[22], 'insuranceNumber': r[23],
                'insuranceExpiry': r[24], 'techInspectionExpiry': r[25]
            })
        conn.commit()
        return resp(200, {'vehicles': vehicles})

    if method == 'POST':
        if user['role'] not in ('technician', 'admin'):
            return resp(403, {'error': 'Нет доступа'})

        body = json.loads(event.get('body') or '{}')
        label = body.get('number', '').strip() or body.get('label', '').strip() or body.get('boardNumber', '').strip()
        if not label:
            return resp(400, {'error': 'number/label/boardNumber обязателен'})

        vin = body.get('vinNumber', '').strip() or None
        if vin:
            cur.execute("SELECT id FROM vehicles WHERE vin_number = %s", (vin,))
            if cur.fetchone():
                return resp(409, {'error': 'ТС с таким VIN-номером уже существует'})

        org_id = 1
        cur.execute("SELECT id FROM organizations LIMIT 1")
        org_row = cur.fetchone()
        if org_row:
            org_id = org_row[0]

        cur.execute(
            """INSERT INTO vehicles (organization_id, label, transport_type, license_plate, model,
                   capacity, manufacture_year, transport_status, mileage,
                   vin_number, board_number, gov_reg_number, manufacturer,
                   reg_certificate_number, documents_info, fuel_type, color,
                   passenger_capacity, is_accessible, insurance_number,
                   insurance_expiry, tech_inspection_expiry)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING id""",
            (org_id, label, body.get('type', 'bus'), body.get('licensePlate') or body.get('govRegNumber'),
             body.get('model'), body.get('capacity'), body.get('year'),
             body.get('status', 'active'), body.get('mileage', 0),
             vin, body.get('boardNumber', '').strip() or label,
             body.get('govRegNumber', '').strip() or None, body.get('manufacturer', '').strip() or None,
             body.get('regCertificateNumber', '').strip() or None, body.get('documentsInfo', '').strip() or None,
             body.get('fuelType', '').strip() or None, body.get('vehicleColor', '').strip() or None,
             body.get('passengerCapacity') or None, body.get('isAccessible', False),
             body.get('insuranceNumber', '').strip() or None,
             body.get('insuranceExpiry') or None, body.get('techInspectionExpiry') or None)
        )
        vid = cur.fetchone()[0]
        log_action(cur, user, 'create_vehicle', label, f'VIN: {vin or "—"}, Тип: {body.get("type", "bus")}')
        conn.commit()
        return resp(201, {'id': str(vid)})

    if method == 'PUT':
        if user['role'] not in ('technician', 'admin'):
            return resp(403, {'error': 'Нет доступа'})

        body = json.loads(event.get('body') or '{}')
        vid = body.get('id')
        if not vid:
            return resp(400, {'error': 'id обязателен'})

        vin = body.get('vinNumber', '').strip() if 'vinNumber' in body else None
        if vin:
            cur.execute("SELECT id FROM vehicles WHERE vin_number = %s AND id != %s::uuid", (vin, vid))
            if cur.fetchone():
                return resp(409, {'error': 'ТС с таким VIN-номером уже существует'})

        updates = []
        params = []
        field_map = {
            'number': 'label', 'label': 'label', 'type': 'transport_type',
            'licensePlate': 'license_plate', 'model': 'model', 'capacity': 'capacity',
            'year': 'manufacture_year', 'status': 'transport_status', 'mileage': 'mileage',
            'vinNumber': 'vin_number', 'boardNumber': 'board_number',
            'govRegNumber': 'gov_reg_number', 'manufacturer': 'manufacturer',
            'regCertificateNumber': 'reg_certificate_number', 'documentsInfo': 'documents_info',
            'fuelType': 'fuel_type', 'vehicleColor': 'color',
            'passengerCapacity': 'passenger_capacity', 'isAccessible': 'is_accessible',
            'insuranceNumber': 'insurance_number', 'insuranceExpiry': 'insurance_expiry',
            'techInspectionExpiry': 'tech_inspection_expiry',
            'lastMaintenance': 'last_maintenance_at', 'nextMaintenance': 'next_maintenance_at',
        }
        for js_key, db_col in field_map.items():
            if js_key in body:
                updates.append(f"{db_col} = %s")
                val = body[js_key]
                if isinstance(val, str):
                    val = val.strip() or None
                params.append(val)

        if not updates:
            return resp(400, {'error': 'Нет полей для обновления'})

        updates.append("updated_at = now()")
        params.append(vid)
        cur.execute(f"UPDATE vehicles SET {', '.join(updates)} WHERE id = %s::uuid", params)
        log_action(cur, user, 'update_vehicle', str(vid), json.dumps(body, ensure_ascii=False))
        conn.commit()
        return resp(200, {'ok': True})

    if method == 'DELETE':
        if user['role'] != 'admin':
            return resp(403, {'error': 'Удаление доступно только администратору'})

        vid = qs.get('id')
        if not vid:
            return resp(400, {'error': 'id обязателен'})
        cur.execute("UPDATE vehicles SET transport_status = 'decommissioned', updated_at = now() WHERE id = %s::uuid", (vid,))
        log_action(cur, user, 'decommission_vehicle', vid, 'Списан')
        conn.commit()
        return resp(200, {'ok': True})

    return resp(405, {'error': 'Method not allowed'})


def handle_schedule(method, qs, event, cur, conn, user):
    if method == 'GET':
        cur.execute("""
            SELECT a.id, r.route_number, d.full_name, v.label,
                   a.shift_start, a.shift_end, a.assignment_status, a.created_at,
                   a.driver_id, a.vehicle_id::text, a.route_id::text,
                   a.document_id, a.shift_type, a.notes
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
                'status': r[6] or 'scheduled', 'date': str(r[4].date()) if r[4] else '',
                'driverId': r[8], 'vehicleId': r[9], 'routeId': r[10],
                'documentId': r[11], 'shiftType': r[12] or 'regular', 'notes': r[13]
            })
        conn.commit()
        return resp(200, {'schedule': schedule})

    if method == 'POST':
        if user['role'] not in ('technician', 'admin'):
            return resp(403, {'error': 'Нет доступа'})

        body = json.loads(event.get('body') or '{}')

        action = params.get('action', '') if params else ''
        if action == 'batch':
            assignments = body.get('assignments', [])
            if not assignments or not isinstance(assignments, list):
                return resp(400, {'error': 'assignments[] обязателен'})
            if len(assignments) > 100:
                return resp(400, {'error': 'Максимум 100 назначений за раз'})

            status_labels = {'vacation': 'в отпуске', 'sick_leave': 'на больничном', 'fired': 'уволен'}
            overlap_check = """
                SELECT id FROM assignments
                WHERE assignment_status IN ('scheduled', 'active')
                AND shift_start < %s AND (shift_end IS NULL OR shift_end > %s)
            """
            created = []
            errors = []
            for idx, item in enumerate(assignments):
                v_id = item.get('vehicleId')
                r_id = item.get('routeId')
                d_id = item.get('driverId')
                s_start = item.get('shiftStart')
                s_end = item.get('shiftEnd')
                label = item.get('label', f'#{idx+1}')
                if not v_id or not r_id or not s_start:
                    errors.append({'index': idx, 'label': label, 'error': 'vehicleId, routeId, shiftStart обязательны'})
                    continue
                if d_id:
                    cur.execute("SELECT driver_status, full_name FROM drivers WHERE id = %s", (d_id,))
                    dr_row = cur.fetchone()
                    if dr_row and dr_row[0] in ('vacation', 'sick_leave', 'fired'):
                        errors.append({'index': idx, 'label': label, 'error': f'Водитель {dr_row[1]} {status_labels.get(dr_row[0], "недоступен")}'})
                        continue
                end_val = s_end if s_end else s_start
                cur.execute(overlap_check + " AND vehicle_id = %s", (end_val, s_start, v_id))
                if cur.fetchone():
                    errors.append({'index': idx, 'label': label, 'error': 'ТС уже занято в это время'})
                    continue
                if d_id:
                    cur.execute(overlap_check + " AND driver_id = %s", (end_val, s_start, d_id))
                    if cur.fetchone():
                        errors.append({'index': idx, 'label': label, 'error': 'Водитель уже занят в это время'})
                        continue
                cur.execute(
                    """INSERT INTO assignments (vehicle_id, route_id, driver_id, shift_start, shift_end, assignment_status, shift_type, notes)
                       VALUES (%s, %s, %s, %s, %s, 'scheduled', %s, %s) RETURNING id""",
                    (v_id, r_id, d_id, s_start, s_end, item.get('shiftType', 'regular'), item.get('notes'))
                )
                aid = cur.fetchone()[0]
                created.append({'id': str(aid), 'index': idx, 'label': label})
            if created:
                log_action(cur, user, 'batch_create_assignments', '', f'Создано {len(created)} назначений, ошибок: {len(errors)}')
            conn.commit()
            return resp(200, {'created': created, 'errors': errors})

        vehicle_id = body.get('vehicleId')
        route_id = body.get('routeId')
        driver_id = body.get('driverId')
        shift_start = body.get('shiftStart')
        shift_end = body.get('shiftEnd')
        if not vehicle_id or not route_id or not shift_start:
            return resp(400, {'error': 'vehicleId, routeId, shiftStart обязательны'})

        # Check driver availability status
        if driver_id:
            cur.execute("SELECT driver_status, full_name FROM drivers WHERE id = %s", (driver_id,))
            dr_row = cur.fetchone()
            if dr_row and dr_row[0] in ('vacation', 'sick_leave', 'fired'):
                status_labels = {'vacation': 'в отпуске', 'sick_leave': 'на больничном', 'fired': 'уволен'}
                return resp(400, {'error': f'Водитель {dr_row[1]} {status_labels.get(dr_row[0], "недоступен")}'})

        # Validate no overlapping assignments for vehicle
        overlap_check = """
            SELECT id FROM assignments
            WHERE assignment_status IN ('scheduled', 'active')
            AND shift_start < %s AND (shift_end IS NULL OR shift_end > %s)
        """
        if shift_end:
            cur.execute(overlap_check + " AND vehicle_id = %s", (shift_end, shift_start, vehicle_id))
        else:
            cur.execute(overlap_check + " AND vehicle_id = %s", (shift_start, shift_start, vehicle_id))
        if cur.fetchone():
            return resp(409, {'error': 'Транспортное средство уже занято в это время'})

        # Validate no overlapping assignments for driver
        if driver_id:
            if shift_end:
                cur.execute(overlap_check + " AND driver_id = %s", (shift_end, shift_start, driver_id))
            else:
                cur.execute(overlap_check + " AND driver_id = %s", (shift_start, shift_start, driver_id))
            if cur.fetchone():
                return resp(409, {'error': 'Водитель уже назначен на другую смену в это время'})

        cur.execute(
            """INSERT INTO assignments (vehicle_id, route_id, driver_id, shift_start, shift_end, assignment_status, document_id, shift_type, notes)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING id""",
            (vehicle_id, route_id, driver_id, shift_start, shift_end,
             body.get('status', 'scheduled'), body.get('documentId'), body.get('shiftType', 'regular'), body.get('notes'))
        )
        aid = cur.fetchone()[0]
        log_action(cur, user, 'create_assignment', str(aid), f'Маршрут={route_id}, Водитель={driver_id}')
        conn.commit()
        return resp(201, {'id': str(aid)})

    if method == 'PUT':
        if user['role'] not in ('technician', 'admin'):
            return resp(403, {'error': 'Нет доступа'})

        body = json.loads(event.get('body') or '{}')
        aid = body.get('id')
        if not aid:
            return resp(400, {'error': 'id обязателен'})

        updates = []
        params = []
        field_map = {
            'status': 'assignment_status', 'vehicleId': 'vehicle_id', 'routeId': 'route_id',
            'driverId': 'driver_id', 'shiftStart': 'shift_start', 'shiftEnd': 'shift_end',
            'documentId': 'document_id', 'shiftType': 'shift_type', 'notes': 'notes'
        }
        for js_key, db_col in field_map.items():
            if js_key in body:
                updates.append(f"{db_col} = %s")
                params.append(body[js_key])

        if updates:
            updates.append("updated_at = now()")
            params.append(aid)
            cur.execute(f"UPDATE assignments SET {', '.join(updates)} WHERE id = %s", params)
            log_action(cur, user, 'update_assignment', str(aid), json.dumps(body, ensure_ascii=False))
            conn.commit()
        return resp(200, {'ok': True})

    if method == 'DELETE':
        if user['role'] not in ('technician', 'admin'):
            return resp(403, {'error': 'Нет доступа'})
        aid = qs.get('id')
        if not aid:
            return resp(400, {'error': 'id обязателен'})
        cur.execute("UPDATE assignments SET assignment_status = 'cancelled', updated_at = now() WHERE id = %s", (aid,))
        log_action(cur, user, 'delete_assignment', aid, 'Отменена')
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
        if not did:
            return resp(400, {'error': 'id обязателен'})

        updates = []
        params = []
        field_map = {
            'title': 'title', 'type': 'doc_type', 'status': 'status',
            'content': 'content', 'assignedToDriverId': 'assigned_to_driver_id'
        }
        for js_key, db_col in field_map.items():
            if js_key in body:
                updates.append(f"{db_col} = %s")
                params.append(body[js_key])

        if updates:
            updates.append("updated_at = now()")
            params.append(did)
            cur.execute(f"UPDATE documents SET {', '.join(updates)} WHERE id = %s", params)
            log_action(cur, user, 'update_document', str(did), json.dumps(body, ensure_ascii=False))
            conn.commit()
        return resp(200, {'ok': True})

    if method == 'DELETE':
        did = qs.get('id')
        if not did:
            return resp(400, {'error': 'id обязателен'})
        cur.execute("DELETE FROM documents WHERE id = %s", (did,))
        log_action(cur, user, 'delete_document', did, 'Удалён')
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


def handle_templates(method, params, event, cur, conn, user):
    if method == 'GET':
        cur.execute("""
            SELECT t.id, t.name, t.description, t.rows, t.created_at, t.updated_at, du.full_name
            FROM assignment_templates t
            LEFT JOIN dashboard_users du ON du.id = t.created_by
            ORDER BY t.updated_at DESC
        """)
        rows = cur.fetchall()
        templates = []
        for r in rows:
            templates.append({
                'id': r[0], 'name': r[1], 'description': r[2] or '',
                'rows': r[3] if isinstance(r[3], list) else json.loads(r[3]) if r[3] else [],
                'createdAt': r[4], 'updatedAt': r[5], 'createdBy': r[6] or ''
            })
        conn.commit()
        return resp(200, {'templates': templates})

    if method == 'POST':
        if user['role'] not in ('technician', 'admin'):
            return resp(403, {'error': 'Нет доступа'})
        body = json.loads(event.get('body') or '{}')
        name = (body.get('name') or '').strip()
        if not name:
            return resp(400, {'error': 'Имя шаблона обязательно'})
        tpl_rows = body.get('rows', [])
        if not isinstance(tpl_rows, list) or len(tpl_rows) == 0:
            return resp(400, {'error': 'Шаблон должен содержать хотя бы одну строку'})
        description = (body.get('description') or '').strip()
        cur.execute(
            "INSERT INTO assignment_templates (name, description, rows, created_by) VALUES (%s, %s, %s, %s) RETURNING id",
            (name, description, json.dumps(tpl_rows, ensure_ascii=False), user['id'])
        )
        tid = cur.fetchone()[0]
        log_action(cur, user, 'create_template', str(tid), f'Шаблон: {name}')
        conn.commit()
        return resp(201, {'id': tid})

    if method == 'PUT':
        if user['role'] not in ('technician', 'admin'):
            return resp(403, {'error': 'Нет доступа'})
        body = json.loads(event.get('body') or '{}')
        tid = body.get('id')
        if not tid:
            return resp(400, {'error': 'id обязателен'})
        updates = []
        vals = []
        if 'name' in body:
            updates.append("name = %s")
            vals.append(body['name'])
        if 'description' in body:
            updates.append("description = %s")
            vals.append(body['description'])
        if 'rows' in body:
            updates.append("rows = %s")
            vals.append(json.dumps(body['rows'], ensure_ascii=False))
        if updates:
            updates.append("updated_at = now()")
            vals.append(tid)
            cur.execute(f"UPDATE assignment_templates SET {', '.join(updates)} WHERE id = %s", vals)
            log_action(cur, user, 'update_template', str(tid), json.dumps(body, ensure_ascii=False))
            conn.commit()
        return resp(200, {'ok': True})

    if method == 'DELETE':
        if user['role'] not in ('technician', 'admin'):
            return resp(403, {'error': 'Нет доступа'})
        tid = (params or {}).get('id')
        if not tid:
            return resp(400, {'error': 'id обязателен'})
        cur.execute("DELETE FROM assignment_templates WHERE id = %s", (tid,))
        log_action(cur, user, 'delete_template', str(tid))
        conn.commit()
        return resp(200, {'ok': True})

    return resp(405, {'error': 'Method not allowed'})