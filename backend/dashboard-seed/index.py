"""Seed начальных данных: очистка демо и создание по одному из каждого (v3)"""
import json
import os
import hashlib
import psycopg2
from psycopg2.extras import RealDictCursor

DSN = os.environ.get('DATABASE_URL', '')

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
}


def resp(status, body):
    return {
        'statusCode': status,
        'headers': {**CORS, 'Content-Type': 'application/json'},
        'body': json.dumps(body, default=str, ensure_ascii=False),
    }


def hash_pw(pw: str) -> str:
    return hashlib.sha256(pw.encode()).hexdigest()


def handler(event, context):
    """Seed dashboard demo data.

    GET ?reset=1 — очистить демо-данные и создать минимальный набор (по одному на роль/тип).
    GET без параметров — только проверка и создание недостающего (старое поведение).
    """
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    params = event.get('queryStringParameters') or {}
    reset = params.get('reset') in ('1', 'true', 'yes')

    conn = psycopg2.connect(DSN)
    cur = conn.cursor(cursor_factory=RealDictCursor)
    results = []

    try:
        # ── 1. Organization ──────────────────────────────────────────────
        cur.execute("SELECT id FROM organizations LIMIT 1")
        org = cur.fetchone()
        if not org:
            cur.execute(
                "INSERT INTO organizations (name, inn, contact_email, contact_phone) "
                "VALUES ('ГЭТ — Городской электротранспорт', '6600000001', "
                "'info@get-city.ru', '+7 (343) 000-00-01') RETURNING id"
            )
            org_id = cur.fetchone()['id']
            results.append('Организация создана')
        else:
            org_id = org['id']
            results.append('Организация уже есть')

        # ── 2. Reset — очищаем демо-данные ──────────────────────────────
        if reset:
            # Порядок критичен: сначала зависимые
            cur.execute("UPDATE chat_messages SET is_pinned = false, pinned_by = NULL")
            cur.execute("UPDATE chat_messages SET sender_driver_id = NULL")
            cur.execute("UPDATE chat_messages SET sender_user_id = NULL WHERE sender_user_id IS NOT NULL")
            # Обнуляем счётчики и помечаем как удалённые (soft)
            # Поскольку DELETE запрещён миграциями, используем UPDATE is_active=false
            cur.execute("UPDATE chats SET is_active = false")
            cur.execute("UPDATE drivers SET is_active = false")
            cur.execute("UPDATE vehicles SET transport_status = 'decommissioned'")
            cur.execute("UPDATE routes SET is_active = false")
            # Пользователи дашборда: оставляем только mrm_admins/корневых, демо пометим через password_hash='disabled'
            results.append('Демо-данные очищены (soft reset)')

        # ── 3. Dashboard users — по одному на каждую роль ──────────────
        users_data = [
            ('ADM01', 'Администратор Системы', 'admin', 'admin123', '+7 (900) 300-00-01'),
            ('DSP01', 'Диспетчер Главный', 'dispatcher', 'disp123', '+7 (900) 301-00-01'),
            ('TCH01', 'Технолог Главный', 'technician', 'tech123', '+7 (900) 302-00-01'),
            ('PRS01', 'Кадровик', 'personnel', 'prs123', '+7 (900) 303-00-01'),
        ]

        user_ids = {}
        for emp_id, name, role, pw, phone in users_data:
            cur.execute("SELECT id FROM dashboard_users WHERE employee_id = %s", (emp_id,))
            row = cur.fetchone()
            if not row:
                cur.execute(
                    "INSERT INTO dashboard_users (employee_id, full_name, role, password_hash, phone, is_active) "
                    "VALUES (%s, %s, %s, %s, %s, true) RETURNING id",
                    (emp_id, name, role, hash_pw(pw), phone),
                )
                user_ids[role] = cur.fetchone()['id']
                results.append(f'{role}: {emp_id} создан')
            else:
                cur.execute(
                    "UPDATE dashboard_users SET password_hash = %s, is_active = true, full_name = %s "
                    "WHERE employee_id = %s",
                    (hash_pw(pw), name, emp_id),
                )
                user_ids[role] = row['id']
                results.append(f'{role}: {emp_id} уже есть')

        # ── 4. Routes — по одному на тип ТС (tram, trolleybus, bus, electrobus, technical) ──
        routes_data = [
            ('TR1', 'Депо — Центр', 'tram', '#22c55e', 12.5, 35, 'active'),
            ('TB1', 'Вокзал — Университет', 'trolleybus', '#a855f7', 9.8, 28, 'active'),
            ('BS1', 'Аэропорт — Центр', 'bus', '#ef4444', 22.1, 55, 'active'),
            ('EB1', 'Новый район — Парк', 'electrobus', '#14b8a6', 15.2, 40, 'active'),
            ('TH1', 'Техническое депо', 'technical', '#f97316', 5.0, 15, 'active'),
        ]

        route_ids = {}
        for num, name, ttype, color, dist, avg_t, status in routes_data:
            cur.execute("SELECT id FROM routes WHERE route_number = %s", (num,))
            row = cur.fetchone()
            if not row:
                cur.execute(
                    """INSERT INTO routes (organization_id, route_number, name, transport_type, color,
                       distance_km, avg_time_min, route_status, is_active)
                       VALUES (%s, %s, %s, %s, %s, %s, %s, %s, true) RETURNING id""",
                    (org_id, num, name, ttype, color, dist, avg_t, status),
                )
                route_ids[ttype] = cur.fetchone()['id']
                results.append(f'Маршрут {num} ({ttype}) создан')
            else:
                cur.execute(
                    "UPDATE routes SET is_active = true, route_status = 'active' WHERE id = %s",
                    (row['id'],)
                )
                route_ids[ttype] = row['id']
                results.append(f'Маршрут {num} уже есть')

        # ── 5. Vehicles — по одному на тип ТС ─────────────────────────
        vehicles_data = [
            ('TM-001', 'tram', '71-631', 200, 2022, 'Уралтрансмаш', 'TM-001'),
            ('TB-001', 'trolleybus', 'ВМЗ-5298', 115, 2021, 'ВМЗ', 'TB-001'),
            ('BS-001', 'bus', 'ЛиАЗ-5292', 110, 2023, 'ЛиАЗ', 'BS-001'),
            ('EB-001', 'electrobus', 'КамАЗ-6282', 85, 2024, 'КамАЗ', 'EB-001'),
            ('TH-001', 'technical', 'ГАЗ-3309', 3, 2020, 'ГАЗ', 'TH-001'),
        ]

        vehicle_ids = {}
        for label, ttype, model, cap, year, manuf, board in vehicles_data:
            cur.execute("SELECT id FROM vehicles WHERE label = %s", (label,))
            row = cur.fetchone()
            if not row:
                cur.execute(
                    """INSERT INTO vehicles (organization_id, label, transport_type, model, capacity,
                       manufacture_year, transport_status, mileage, manufacturer, board_number,
                       assigned_route_id, fuel_type)
                       VALUES (%s, %s, %s, %s, %s, %s, 'active', %s, %s, %s, %s, %s) RETURNING id""",
                    (
                        org_id, label, ttype, model, cap, year,
                        (2026 - year) * 18000, manuf, board,
                        route_ids.get(ttype),
                        'electric' if ttype in ('tram', 'trolleybus', 'electrobus') else ('diesel' if ttype == 'bus' else 'gas'),
                    ),
                )
                vehicle_ids[ttype] = cur.fetchone()['id']
                results.append(f'ТС {label} ({ttype}) создано')
            else:
                cur.execute(
                    "UPDATE vehicles SET transport_status = 'active', assigned_route_id = %s WHERE id = %s",
                    (route_ids.get(ttype), row['id'])
                )
                vehicle_ids[ttype] = row['id']
                results.append(f'ТС {label} уже есть')

        # ── 6. Drivers — по одному на тип ТС ──────────────────────────
        drivers_data = [
            ('D0001', 'Водитель Трамвая', 'tram', 'TM-001', 'TR1', '11110001', '+7 (900) 400-00-01'),
            ('D0002', 'Водитель Троллейбуса', 'trolleybus', 'TB-001', 'TB1', '11110002', '+7 (900) 400-00-02'),
            ('D0003', 'Водитель Автобуса', 'bus', 'BS-001', 'BS1', '11110003', '+7 (900) 400-00-03'),
            ('D0004', 'Водитель Электробуса', 'electrobus', 'EB-001', 'EB1', '11110004', '+7 (900) 400-00-04'),
            ('D0005', 'Водитель Технического ТС', 'technical', 'TH-001', 'TH1', '11110005', '+7 (900) 400-00-05'),
        ]

        driver_ids = {}
        for emp_id, name, vtype, vnum, rnum, pin, phone in drivers_data:
            cur.execute("SELECT id FROM drivers WHERE employee_id = %s", (emp_id,))
            row = cur.fetchone()
            if not row:
                cur.execute(
                    """INSERT INTO drivers (employee_id, full_name, pin, vehicle_type, vehicle_number,
                       route_number, shift_start, phone, is_active, shift_status, driver_status)
                       VALUES (%s, %s, %s, %s, %s, %s, '08:00', %s, true, 'on_shift', 'active') RETURNING id""",
                    (emp_id, name, pin, vtype, vnum, rnum, phone),
                )
                driver_ids[vtype] = cur.fetchone()['id']
                results.append(f'Водитель {emp_id} ({vtype}) создан')
            else:
                cur.execute(
                    """UPDATE drivers SET is_active = true, shift_status = 'on_shift',
                       driver_status = 'active', full_name = %s, vehicle_type = %s,
                       vehicle_number = %s, route_number = %s WHERE id = %s""",
                    (name, vtype, vnum, rnum, row['id'])
                )
                driver_ids[vtype] = row['id']
                results.append(f'Водитель {emp_id} уже есть')

            # Привязываем ТС к водителю
            if driver_ids.get(vtype) and vehicle_ids.get(vtype):
                cur.execute(
                    "UPDATE vehicles SET assigned_driver_id = %s WHERE id = %s",
                    (driver_ids[vtype], vehicle_ids[vtype]),
                )

        # ── 7. Chats — один чат (сообщения) + одно уведомление ─────────
        admin_id = user_ids.get('admin')
        dispatcher_id = user_ids.get('dispatcher')
        technician_id = user_ids.get('technician')
        personnel_id = user_ids.get('personnel')

        all_user_ids = [admin_id, dispatcher_id, technician_id, personnel_id]
        all_driver_ids = [driver_ids.get(t) for t in ('tram', 'trolleybus', 'bus', 'electrobus', 'technical')]

        # ── Демо-чат сообщений ──
        cur.execute(
            "SELECT id FROM chats WHERE title = %s AND is_active = true",
            ('Общий чат — все роли',)
        )
        row = cur.fetchone()
        if not row:
            cur.execute(
                """INSERT INTO chats (title, created_by, default_type, is_active)
                   VALUES (%s, %s, 'message', true) RETURNING id""",
                ('Общий чат — все роли', dispatcher_id or admin_id),
            )
            chat_id = cur.fetchone()['id']
            # Добавляем всех пользователей + водителей
            for uid in all_user_ids:
                if uid:
                    cur.execute(
                        "INSERT INTO chat_members (chat_id, user_id, role) VALUES (%s, %s, 'member')",
                        (chat_id, uid),
                    )
            for did in all_driver_ids:
                if did:
                    cur.execute(
                        "INSERT INTO chat_members (chat_id, driver_id, role) VALUES (%s, %s, 'member')",
                        (chat_id, did),
                    )
            # Приветственное сообщение
            cur.execute(
                """INSERT INTO chat_messages (chat_id, sender_user_id, content, message_type, status)
                   VALUES (%s, %s, %s, 'message', 'sent')""",
                (chat_id, dispatcher_id or admin_id,
                 'Добро пожаловать в общий чат! Здесь могут общаться все участники: администратор, диспетчер, технолог, кадровик и водители.')
            )
            cur.execute("UPDATE chats SET last_message_at = NOW() WHERE id = %s", (chat_id,))
            results.append(f'Чат "Общий чат" создан (id={chat_id})')
        else:
            results.append(f'Чат "Общий чат" уже есть (id={row["id"]})')

        # ── Демо-канал уведомлений ──
        cur.execute(
            "SELECT id FROM chats WHERE title = %s AND is_active = true",
            ('Уведомления системы',)
        )
        row = cur.fetchone()
        if not row:
            cur.execute(
                """INSERT INTO chats (title, created_by, default_type, is_active)
                   VALUES (%s, %s, 'notification', true) RETURNING id""",
                ('Уведомления системы', admin_id or dispatcher_id),
            )
            notif_chat_id = cur.fetchone()['id']
            for uid in all_user_ids:
                if uid:
                    cur.execute(
                        "INSERT INTO chat_members (chat_id, user_id, role) VALUES (%s, %s, 'member')",
                        (notif_chat_id, uid),
                    )
            for did in all_driver_ids:
                if did:
                    cur.execute(
                        "INSERT INTO chat_members (chat_id, driver_id, role) VALUES (%s, %s, 'member')",
                        (notif_chat_id, did),
                    )
            cur.execute(
                """INSERT INTO chat_messages (chat_id, sender_user_id, content, subject, message_type, status)
                   VALUES (%s, %s, %s, %s, 'notification', 'sent')""",
                (notif_chat_id, admin_id or dispatcher_id,
                 'Система запущена. Все службы работают в штатном режиме.',
                 'Системное уведомление')
            )
            cur.execute("UPDATE chats SET last_message_at = NOW() WHERE id = %s", (notif_chat_id,))
            results.append(f'Канал уведомлений создан (id={notif_chat_id})')
        else:
            results.append(f'Канал уведомлений уже есть (id={row["id"]})')

        conn.commit()

        # ── 8. Stats ────────────────────────────────────────────────────
        stats = {}
        cur.execute("SELECT COUNT(*) AS c FROM drivers WHERE is_active = true")
        stats['drivers_active'] = cur.fetchone()['c']
        cur.execute("SELECT COUNT(*) AS c FROM vehicles WHERE transport_status = 'active'")
        stats['vehicles_active'] = cur.fetchone()['c']
        cur.execute("SELECT COUNT(*) AS c FROM routes WHERE is_active = true")
        stats['routes_active'] = cur.fetchone()['c']
        cur.execute("SELECT COUNT(*) AS c FROM chats WHERE is_active = true")
        stats['chats_active'] = cur.fetchone()['c']
        cur.execute("SELECT COUNT(*) AS c FROM chat_messages")
        stats['messages_total'] = cur.fetchone()['c']
        cur.execute("SELECT COUNT(*) AS c FROM dashboard_users WHERE is_active = true")
        stats['users_active'] = cur.fetchone()['c']

        return resp(200, {
            'results': results,
            'total': len(results),
            'reset': reset,
            'stats': stats,
        })
    except Exception as e:
        conn.rollback()
        return resp(500, {'error': str(e), 'results': results})
    finally:
        cur.close()
        conn.close()