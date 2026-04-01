"""Vehicle diagnostics: диагностика ТС, отчёты о проблемах, API интеграции"""
import json
import os
import uuid
import psycopg2

DSN = os.environ.get('DATABASE_URL', '')

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Dashboard-Token, X-Auth-Token',
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

def get_driver(cur, headers):
    token = headers.get('X-Auth-Token') or headers.get('x-auth-token')
    if not token:
        return None
    cur.execute(
        "SELECT d.id, d.full_name, d.vehicle_number, d.route_number "
        "FROM driver_sessions ds JOIN drivers d ON d.id = ds.driver_id "
        "WHERE ds.session_token = %s AND ds.is_online = true",
        (token,)
    )
    row = cur.fetchone()
    if row:
        cur.execute("UPDATE driver_sessions SET last_seen = now() WHERE session_token = %s", (token,))
        return {'id': row[0], 'name': row[1], 'vehicleNumber': row[2], 'routeNumber': row[3]}
    return None

def handler(event, context):
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    method = event.get('httpMethod', 'GET')
    qs = event.get('queryStringParameters') or {}
    action = qs.get('action', '')
    headers = event.get('headers') or {}

    conn = psycopg2.connect(DSN)
    cur = conn.cursor()

    try:
        # --- Driver endpoints (X-Auth-Token) ---
        if action in ('vehicle_status', 'report_issue'):
            driver = get_driver(cur, headers)
            if not driver:
                conn.commit()
                return resp(401, {'error': 'Не авторизован (водитель)'})

            if action == 'vehicle_status':
                return handle_vehicle_status(cur, conn, driver)
            if action == 'report_issue' and method == 'POST':
                return handle_report_issue(cur, conn, driver, event)
            return resp(405, {'error': 'Method not allowed'})

        # --- Dashboard endpoints (X-Dashboard-Token) ---
        user = get_user(cur, headers)
        if not user:
            conn.commit()
            return resp(401, {'error': 'Не авторизован'})

        if action == 'issues':
            return handle_issues(cur, conn, user)
        if action == 'resolve_issue' and method == 'PUT':
            return handle_resolve_issue(cur, conn, user, event)
        if action == 'tech_reports':
            return handle_tech_reports(cur, conn, user)
        if action == 'diagnostic_apis':
            return handle_diagnostic_apis(cur, conn, user)
        if action == 'create_api' and method == 'POST':
            return handle_create_api(cur, conn, user, event)
        if action == 'update_api' and method == 'PUT':
            return handle_update_api(cur, conn, user, event)
        if action == 'vehicle_diagnostics':
            return handle_vehicle_diagnostics(cur, conn, user, qs)
        if action == 'mock_diagnostics' and method == 'POST':
            return handle_mock_diagnostics(cur, conn, user, event)

        return resp(400, {'error': 'Неизвестный action'})

    finally:
        cur.close()
        conn.close()


# ─── Driver: vehicle_status ──────────────────────────────────────────────────

def handle_vehicle_status(cur, conn, driver):
    # Find vehicle assigned to this driver
    cur.execute(
        "SELECT id, label FROM vehicles WHERE assigned_driver_id = %s AND transport_status = 'active' LIMIT 1",
        (driver['id'],)
    )
    vehicle = cur.fetchone()
    if not vehicle:
        conn.commit()
        return resp(200, {
            'summary': {'ok': 0, 'warning': 0, 'critical': 0, 'total': 0},
            'checks': [],
            'vehicleNumber': driver.get('vehicleNumber')
        })

    vehicle_id, vehicle_number = vehicle

    cur.execute("""
        SELECT id, check_code, check_name, category, severity, short_description,
               full_description, detected_at
        FROM vehicle_diagnostics
        WHERE vehicle_id = %s AND status = 'active'
        ORDER BY
            CASE severity WHEN 'critical' THEN 0 WHEN 'warning' THEN 1 ELSE 2 END,
            detected_at DESC
    """, (vehicle_id,))
    rows = cur.fetchall()

    checks = []
    counts = {'ok': 0, 'warning': 0, 'critical': 0}
    for r in rows:
        sev = r[4] or 'info'
        if sev in counts:
            counts[sev] += 1
        else:
            counts['ok'] += 1
        checks.append({
            'id': r[0], 'checkCode': r[1], 'checkName': r[2],
            'category': r[3], 'severity': sev,
            'shortDescription': r[5], 'fullDescription': r[6],
            'detectedAt': r[7]
        })

    total = counts['ok'] + counts['warning'] + counts['critical']

    conn.commit()
    return resp(200, {
        'summary': {**counts, 'total': total},
        'checks': checks,
        'vehicleNumber': vehicle_number
    })


# ─── Driver: report_issue ────────────────────────────────────────────────────

def handle_report_issue(cur, conn, driver, event):
    body = json.loads(event.get('body') or '{}')
    message = (body.get('message') or '').strip()
    if not message:
        return resp(400, {'error': 'message обязательно'})

    diagnostic_id = body.get('diagnosticId') or None
    severity = body.get('severity', 'warning')

    # Find vehicle assigned to driver
    cur.execute(
        "SELECT id FROM vehicles WHERE assigned_driver_id = %s AND transport_status = 'active' LIMIT 1",
        (driver['id'],)
    )
    veh = cur.fetchone()
    vehicle_id = veh[0] if veh else None

    # Find current route
    cur.execute(
        "SELECT id FROM routes WHERE route_number = %s AND is_active = true LIMIT 1",
        (driver.get('routeNumber'),)
    )
    rt = cur.fetchone()
    route_id = rt[0] if rt else None

    report_id = str(uuid.uuid4())
    cur.execute("""
        INSERT INTO vehicle_issue_reports
            (id, vehicle_id, driver_id, route_id, diagnostic_id, message, severity,
             report_status, dispatcher_notified, technician_notified, created_at, updated_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s, 'new', false, false, now(), now())
    """, (report_id, vehicle_id, driver['id'], route_id, diagnostic_id, message, severity))

    conn.commit()
    return resp(201, {'id': report_id, 'ok': True})


# ─── Dashboard: issues ───────────────────────────────────────────────────────

def handle_issues(cur, conn, user):
    cur.execute("""
        SELECT vir.id, vir.message, vir.severity, vir.report_status,
               vir.dispatcher_notified, vir.technician_notified,
               vir.resolved_at, vir.resolution_notes,
               vir.created_at, vir.updated_at,
               v.label AS vehicle_number, d.full_name AS driver_name,
               r.route_number, vir.diagnostic_id,
               du.full_name AS resolved_by_name
        FROM vehicle_issue_reports vir
        LEFT JOIN vehicles v ON v.id = vir.vehicle_id
        LEFT JOIN drivers d ON d.id = vir.driver_id
        LEFT JOIN routes r ON r.id = vir.route_id
        LEFT JOIN dashboard_users du ON du.id = vir.resolved_by
        ORDER BY
            CASE vir.report_status WHEN 'new' THEN 0 WHEN 'seen_dispatcher' THEN 1
                WHEN 'in_progress' THEN 2 WHEN 'seen_technician' THEN 3 ELSE 4 END,
            vir.created_at DESC
    """)
    rows = cur.fetchall()
    issues = []
    for r in rows:
        issues.append({
            'id': r[0], 'message': r[1], 'severity': r[2],
            'reportStatus': r[3], 'dispatcherNotified': r[4],
            'technicianNotified': r[5], 'resolvedAt': r[6],
            'resolutionNotes': r[7], 'createdAt': r[8],
            'updatedAt': r[9], 'vehicleNumber': r[10],
            'driverName': r[11], 'routeNumber': r[12],
            'diagnosticId': r[13], 'resolvedByName': r[14]
        })
    conn.commit()
    return resp(200, {'issues': issues})


# ─── Dashboard: resolve_issue ────────────────────────────────────────────────

def handle_resolve_issue(cur, conn, user, event):
    body = json.loads(event.get('body') or '{}')
    issue_id = body.get('id')
    if not issue_id:
        return resp(400, {'error': 'id обязателен'})

    resolution_notes = body.get('resolutionNotes', '')

    cur.execute("""
        UPDATE vehicle_issue_reports
        SET report_status = 'resolved', resolved_at = now(), resolved_by = %s,
            resolution_notes = %s, updated_at = now()
        WHERE id = %s
    """, (user['id'], resolution_notes, issue_id))

    # Also resolve linked diagnostic if present
    cur.execute("""
        UPDATE vehicle_diagnostics
        SET status = 'resolved', resolved_at = now()
        WHERE id = (SELECT diagnostic_id FROM vehicle_issue_reports WHERE id = %s AND diagnostic_id IS NOT NULL)
    """, (issue_id,))

    conn.commit()
    return resp(200, {'ok': True})


# ─── Dashboard: tech_reports ─────────────────────────────────────────────────

def handle_tech_reports(cur, conn, user):
    cur.execute("""
        SELECT vd.id, vd.check_code, vd.check_name, vd.category, vd.severity,
               vd.status, vd.short_description, vd.full_description, vd.raw_data,
               vd.detected_at, vd.resolved_at, vd.created_at,
               v.label AS vehicle_number, d.full_name AS driver_name,
               r.route_number, vda.api_name, vda.api_type
        FROM vehicle_diagnostics vd
        LEFT JOIN vehicles v ON v.id = vd.vehicle_id
        LEFT JOIN drivers d ON d.id = vd.driver_id
        LEFT JOIN routes r ON r.id = vd.route_id
        LEFT JOIN vehicle_diagnostic_apis vda ON vda.id = vd.api_source_id
        ORDER BY vd.detected_at DESC
        LIMIT 500
    """)
    rows = cur.fetchall()
    reports = []
    for r in rows:
        reports.append({
            'id': r[0], 'checkCode': r[1], 'checkName': r[2],
            'category': r[3], 'severity': r[4], 'status': r[5],
            'shortDescription': r[6], 'fullDescription': r[7],
            'rawData': r[8], 'detectedAt': r[9], 'resolvedAt': r[10],
            'createdAt': r[11], 'vehicleNumber': r[12],
            'driverName': r[13], 'routeNumber': r[14],
            'apiName': r[15], 'apiType': r[16]
        })
    conn.commit()
    return resp(200, {'reports': reports})


# ─── Dashboard: diagnostic_apis ──────────────────────────────────────────────

def handle_diagnostic_apis(cur, conn, user):
    cur.execute("""
        SELECT vda.id, vda.vehicle_id, v.label AS vehicle_number, vda.api_name,
               vda.api_type, vda.api_url, vda.poll_interval_sec, vda.is_active,
               vda.created_at, vda.updated_at
        FROM vehicle_diagnostic_apis vda
        LEFT JOIN vehicles v ON v.id = vda.vehicle_id
        ORDER BY vda.created_at DESC
    """)
    rows = cur.fetchall()
    apis = []
    for r in rows:
        apis.append({
            'id': r[0], 'vehicleId': r[1], 'vehicleNumber': r[2],
            'apiName': r[3], 'apiType': r[4], 'apiUrl': r[5],
            'pollInterval': r[6], 'isActive': r[7],
            'createdAt': r[8], 'updatedAt': r[9]
        })
    conn.commit()
    return resp(200, {'apis': apis})


# ─── Dashboard: create_api ───────────────────────────────────────────────────

def handle_create_api(cur, conn, user, event):
    body = json.loads(event.get('body') or '{}')
    vehicle_id = body.get('vehicleId')
    api_name = (body.get('apiName') or '').strip()
    api_type = body.get('apiType', 'fema')
    api_url = (body.get('apiUrl') or '').strip()
    api_key = body.get('apiKey') or None
    poll_interval = body.get('pollInterval', 60)

    if not vehicle_id or not api_name or not api_url:
        return resp(400, {'error': 'vehicleId, apiName и apiUrl обязательны'})

    api_id = str(uuid.uuid4())
    cur.execute("""
        INSERT INTO vehicle_diagnostic_apis
            (id, vehicle_id, api_name, api_type, api_url, api_key,
             poll_interval_sec, is_active, created_at, updated_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s, true, now(), now())
    """, (api_id, vehicle_id, api_name, api_type, api_url, api_key, poll_interval))

    conn.commit()
    return resp(201, {'id': api_id, 'ok': True})


# ─── Dashboard: update_api ───────────────────────────────────────────────────

def handle_update_api(cur, conn, user, event):
    body = json.loads(event.get('body') or '{}')
    api_id = body.get('id')
    if not api_id:
        return resp(400, {'error': 'id обязателен'})

    updates = []
    params = []
    field_map = {
        'apiName': 'api_name', 'apiUrl': 'api_url', 'apiKey': 'api_key',
        'pollInterval': 'poll_interval_sec', 'isActive': 'is_active'
    }
    for js_key, db_col in field_map.items():
        if js_key in body:
            updates.append(f"{db_col} = %s")
            params.append(body[js_key])

    if not updates:
        return resp(400, {'error': 'Нет полей для обновления'})

    updates.append("updated_at = now()")
    params.append(api_id)
    cur.execute(f"UPDATE vehicle_diagnostic_apis SET {', '.join(updates)} WHERE id = %s", params)
    conn.commit()
    return resp(200, {'ok': True})


# ─── Dashboard: vehicle_diagnostics ──────────────────────────────────────────

def handle_vehicle_diagnostics(cur, conn, user, qs):
    vehicle_id = qs.get('vehicle_id')
    if not vehicle_id:
        return resp(400, {'error': 'vehicle_id обязателен'})

    cur.execute("""
        SELECT vd.id, vd.check_code, vd.check_name, vd.category, vd.severity,
               vd.status, vd.short_description, vd.full_description, vd.raw_data,
               vd.detected_at, vd.resolved_at,
               d.full_name AS driver_name, r.route_number,
               vda.api_name
        FROM vehicle_diagnostics vd
        LEFT JOIN drivers d ON d.id = vd.driver_id
        LEFT JOIN routes r ON r.id = vd.route_id
        LEFT JOIN vehicle_diagnostic_apis vda ON vda.id = vd.api_source_id
        WHERE vd.vehicle_id = %s
        ORDER BY
            CASE vd.status WHEN 'active' THEN 0 ELSE 1 END,
            CASE vd.severity WHEN 'critical' THEN 0 WHEN 'warning' THEN 1 ELSE 2 END,
            vd.detected_at DESC
    """, (vehicle_id,))
    rows = cur.fetchall()
    diagnostics = []
    for r in rows:
        diagnostics.append({
            'id': r[0], 'checkCode': r[1], 'checkName': r[2],
            'category': r[3], 'severity': r[4], 'status': r[5],
            'shortDescription': r[6], 'fullDescription': r[7],
            'rawData': r[8], 'detectedAt': r[9], 'resolvedAt': r[10],
            'driverName': r[11], 'routeNumber': r[12], 'apiName': r[13]
        })
    conn.commit()
    return resp(200, {'diagnostics': diagnostics})


# ─── Dashboard: mock_diagnostics ─────────────────────────────────────────────

def handle_mock_diagnostics(cur, conn, user, event):
    body = json.loads(event.get('body') or '{}')
    vehicle_id = body.get('vehicleId')
    if not vehicle_id:
        return resp(400, {'error': 'vehicleId обязателен'})

    # Verify vehicle exists
    cur.execute("SELECT id FROM vehicles WHERE id = %s", (vehicle_id,))
    if not cur.fetchone():
        return resp(404, {'error': 'Транспорт не найден'})

    mock_checks = [
        {
            'check_code': 'ENG_TEMP_001',
            'check_name': 'Температура двигателя',
            'category': 'engine',
            'severity': 'ok',
            'short_description': 'Температура двигателя в норме',
            'full_description': 'Температура охлаждающей жидкости: 87°C. Рабочий диапазон: 80-95°C. Все показатели в пределах нормы.',
            'raw_data': json.dumps({'temp_celsius': 87, 'min': 80, 'max': 95, 'unit': 'celsius'})
        },
        {
            'check_code': 'BRK_WEAR_002',
            'check_name': 'Износ тормозных колодок',
            'category': 'brakes',
            'severity': 'warning',
            'short_description': 'Тормозные колодки изношены на 72%',
            'full_description': 'Передние тормозные колодки: износ 72%. Рекомендуется замена при достижении 80%. Задние колодки: износ 45%, в пределах нормы.',
            'raw_data': json.dumps({'front_wear_pct': 72, 'rear_wear_pct': 45, 'threshold': 80})
        },
        {
            'check_code': 'TIRE_PRESS_003',
            'check_name': 'Давление в шинах',
            'category': 'tires',
            'severity': 'critical',
            'short_description': 'Критически низкое давление в шине (переднее левое)',
            'full_description': 'Переднее левое колесо: 1.2 атм (норма 2.2-2.5 атм). Требуется немедленная проверка. Возможен прокол или утечка воздуха. Остальные колёса в норме.',
            'raw_data': json.dumps({'fl': 1.2, 'fr': 2.3, 'rl': 2.4, 'rr': 2.3, 'norm_min': 2.2, 'norm_max': 2.5})
        },
        {
            'check_code': 'ELEC_BAT_004',
            'check_name': 'Напряжение бортовой сети',
            'category': 'electrical',
            'severity': 'ok',
            'short_description': 'Напряжение бортовой сети в норме',
            'full_description': 'Напряжение аккумулятора: 12.6V. Напряжение генератора: 14.1V. Все показатели в пределах нормы.',
            'raw_data': json.dumps({'battery_v': 12.6, 'alternator_v': 14.1})
        },
        {
            'check_code': 'OIL_LVL_005',
            'check_name': 'Уровень масла',
            'category': 'engine',
            'severity': 'warning',
            'short_description': 'Уровень масла ниже рекомендуемого',
            'full_description': 'Уровень моторного масла: 62% от максимума. Рекомендуется долить масло при ближайшем ТО. Качество масла удовлетворительное.',
            'raw_data': json.dumps({'level_pct': 62, 'quality': 'satisfactory', 'next_change_km': 3200})
        },
        {
            'check_code': 'TRANS_TEMP_006',
            'check_name': 'Температура трансмиссии',
            'category': 'transmission',
            'severity': 'ok',
            'short_description': 'Температура трансмиссии в норме',
            'full_description': 'Температура трансмиссионного масла: 78°C. Рабочий диапазон: 60-100°C. Работа трансмиссии без замечаний.',
            'raw_data': json.dumps({'temp_celsius': 78, 'min': 60, 'max': 100})
        },
        {
            'check_code': 'COOL_LVL_007',
            'check_name': 'Уровень охлаждающей жидкости',
            'category': 'cooling',
            'severity': 'critical',
            'short_description': 'Критически низкий уровень охлаждающей жидкости',
            'full_description': 'Уровень ОЖ: 28% от максимума. Критический порог: 30%. Возможна утечка в системе охлаждения. Требуется немедленная остановка и проверка. Риск перегрева двигателя.',
            'raw_data': json.dumps({'level_pct': 28, 'critical_threshold': 30, 'leak_suspected': True})
        },
        {
            'check_code': 'DOOR_SENS_008',
            'check_name': 'Датчики дверей',
            'category': 'body',
            'severity': 'ok',
            'short_description': 'Все двери работают исправно',
            'full_description': 'Проверка всех дверных механизмов и датчиков завершена. Двери 1-4: открытие/закрытие в норме. Концевые выключатели исправны.',
            'raw_data': json.dumps({'doors': {'1': 'ok', '2': 'ok', '3': 'ok', '4': 'ok'}})
        },
        {
            'check_code': 'EXHAUST_009',
            'check_name': 'Система выхлопа (экология)',
            'category': 'emission',
            'severity': 'warning',
            'short_description': 'Повышенный уровень CO в выхлопе',
            'full_description': 'Уровень CO: 3.2% (норма до 2.5%). Рекомендуется проверка каталитического нейтрализатора и настройка системы впрыска топлива при плановом ТО.',
            'raw_data': json.dumps({'co_pct': 3.2, 'norm_max': 2.5, 'nox_ppm': 120, 'nox_max': 200})
        },
        {
            'check_code': 'STEER_010',
            'check_name': 'Гидроусилитель руля',
            'category': 'steering',
            'severity': 'ok',
            'short_description': 'Система ГУР работает в норме',
            'full_description': 'Давление в системе ГУР: 85 бар (норма 80-120 бар). Уровень жидкости ГУР: 91%. Утечки не обнаружены.',
            'raw_data': json.dumps({'pressure_bar': 85, 'fluid_pct': 91, 'leaks': False})
        },
    ]

    inserted_ids = []
    for check in mock_checks:
        diag_id = str(uuid.uuid4())
        cur.execute("""
            INSERT INTO vehicle_diagnostics
                (id, vehicle_id, check_code, check_name, category, severity,
                 status, short_description, full_description, raw_data,
                 detected_at, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, 'active', %s, %s, %s, now(), now())
        """, (
            diag_id, vehicle_id, check['check_code'], check['check_name'],
            check['category'], check['severity'],
            check['short_description'], check['full_description'], check['raw_data']
        ))
        inserted_ids.append(diag_id)

    conn.commit()
    return resp(201, {
        'ok': True,
        'inserted': len(inserted_ids),
        'ids': inserted_ids
    })