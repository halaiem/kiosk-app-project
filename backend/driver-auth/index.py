import json
import os
import secrets
import math
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

            cur.execute("""
                SELECT du.full_name FROM messages m
                JOIN dashboard_users du ON du.id = m.dispatcher_id
                WHERE m.driver_id = %s AND m.sender = 'dispatcher' AND m.dispatcher_id IS NOT NULL
                ORDER BY m.created_at DESC LIMIT 1
            """, (driver_id,))
            disp_row = cur.fetchone()
            dispatcher_name = disp_row[0] if disp_row else None

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
                        'shiftStart': str(shift_start) if shift_start else '08:00',
                        'dispatcherName': dispatcher_name
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

        # POST ?action=rate_dispatcher — оценка работы диспетчера при завершении смены
        if method == 'POST' and action == 'rate_dispatcher':
            token = event.get('headers', {}).get('X-Auth-Token', '')
            body = json.loads(event.get('body') or '{}')
            rating = body.get('rating', 0)

            if not isinstance(rating, int) or rating < 1 or rating > 5:
                return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Оценка от 1 до 5'})}

            cur.execute("SELECT driver_id FROM driver_sessions WHERE session_token = %s", (token,))
            sess = cur.fetchone()
            if not sess:
                return {'statusCode': 401, 'headers': headers, 'body': json.dumps({'error': 'Неавторизован'})}

            cur.execute(
                "INSERT INTO dispatcher_ratings (driver_id, session_token, rating) VALUES (%s, %s, %s)",
                (sess[0], token, rating)
            )
            conn.commit()
            return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'ok': True})}

        # POST ?action=heartbeat — обновление онлайн-статуса, координат и проверка гео-зон
        if method == 'POST' and action == 'heartbeat':
            token = event.get('headers', {}).get('X-Auth-Token', '')
            body = json.loads(event.get('body') or '{}')
            lat = body.get('latitude')
            lng = body.get('longitude')
            speed = body.get('speed', 0)

            cur.execute(
                "UPDATE driver_sessions SET last_seen = NOW(), is_online = true, latitude = %s, longitude = %s, speed = %s WHERE session_token = %s RETURNING driver_id",
                (lat, lng, speed, token)
            )
            row = cur.fetchone()
            conn.commit()

            geo_alerts = []
            if lat is not None and lng is not None and row:
                driver_id = row[0]
                geo_alerts = check_geo_zones(cur, conn, driver_id, float(lat), float(lng))

            return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'ok': True, 'geo_alerts': geo_alerts})}

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


def haversine_km(lat1, lon1, lat2, lon2):
    """Расстояние между двумя точками на Земле (км)"""
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def point_in_polygon(lat, lng, coords):
    """Проверка точки внутри полигона (Ray casting)"""
    n = len(coords)
    if n < 3:
        return False
    inside = False
    j = n - 1
    for i in range(n):
        yi, xi = coords[i]
        yj, xj = coords[j]
        if ((yi > lat) != (yj > lat)) and (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi):
            inside = not inside
        j = i
    return inside


def check_geo_zones(cur, conn, driver_id, lat, lng):
    """Проверка водителя относительно активных гео-зон, генерация событий и уведомлений"""
    cur.execute("""
        SELECT gz.id, gz.name, gz.type, gz.coordinates, gz.radius_km, gz.trigger_type,
               gz.nearby_distance_km, gz.notification_template_id,
               nt.title as notif_title, nt.content as notif_content,
               nt.icon as notif_icon, nt.priority as notif_priority
        FROM geo_zones gz
        LEFT JOIN notification_templates nt ON nt.id = gz.notification_template_id
        WHERE gz.is_active = true
    """)
    zones = cur.fetchall()
    if not zones:
        return []

    cur.execute("SELECT full_name FROM drivers WHERE id = %s", (driver_id,))
    dr = cur.fetchone()
    driver_name = dr[0] if dr else ''

    cur.execute("""
        SELECT zone_id, event_type FROM geo_zone_events
        WHERE driver_id = %s AND created_at > NOW() - INTERVAL '10 minutes'
        ORDER BY created_at DESC
    """, (driver_id,))
    recent_events = {}
    for row in cur.fetchall():
        if row[0] not in recent_events:
            recent_events[row[0]] = row[1]

    alerts = []

    for z in zones:
        zone_id, zone_name, zone_type, coordinates, radius_km, trigger_type, nearby_km, notif_tpl_id, notif_title, notif_content, notif_icon, notif_priority = z

        if isinstance(coordinates, str):
            coordinates = json.loads(coordinates)

        if not coordinates:
            continue

        is_inside = False
        distance = None

        if zone_type == 'circle' and len(coordinates) >= 1:
            center = coordinates[0]
            center_lat, center_lng = float(center[0]), float(center[1])
            r = float(radius_km) if radius_km else 1.0
            distance = haversine_km(lat, lng, center_lat, center_lng)
            is_inside = distance <= r

        elif zone_type == 'polygon' and len(coordinates) >= 3:
            poly_coords = [(float(c[0]), float(c[1])) for c in coordinates]
            is_inside = point_in_polygon(lat, lng, poly_coords)
            if not is_inside and coordinates:
                distance = min(haversine_km(lat, lng, float(c[0]), float(c[1])) for c in coordinates)

        elif zone_type == 'marker' and len(coordinates) >= 1:
            m = coordinates[0]
            distance = haversine_km(lat, lng, float(m[0]), float(m[1]))
            is_inside = distance <= 0.1

        elif zone_type == 'line' and len(coordinates) >= 2:
            distance = min(haversine_km(lat, lng, float(c[0]), float(c[1])) for c in coordinates)
            is_inside = distance <= 0.2

        last_event = recent_events.get(zone_id)
        event_type = None

        if trigger_type == 'entry' and is_inside and last_event != 'entry':
            event_type = 'entry'
        elif trigger_type == 'exit' and not is_inside and last_event == 'entry':
            event_type = 'exit'
        elif trigger_type == 'nearby' and nearby_km and distance is not None:
            if distance <= float(nearby_km) and last_event != 'nearby':
                event_type = 'nearby'

        if event_type:
            cur.execute("""
                INSERT INTO geo_zone_events
                (driver_id, driver_name, zone_id, zone_name, event_type, notification_template_id, notification_sent, latitude, longitude, distance_km)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (driver_id, driver_name, zone_id, zone_name, event_type, notif_tpl_id, notif_tpl_id is not None, lat, lng, distance))

            alert = {
                'zone_id': zone_id,
                'zone_name': zone_name,
                'event_type': event_type,
                'distance_km': round(distance, 2) if distance else None,
            }
            if notif_title:
                alert['notification_title'] = notif_title
            if notif_content:
                alert['notification_content'] = notif_content
            if notif_icon:
                alert['notification_icon'] = notif_icon
            if notif_priority:
                alert['notification_priority'] = notif_priority
            alerts.append(alert)

    if alerts:
        conn.commit()

    return alerts