"""Seed начальных данных для dashboard — организация, пользователи, маршруты, транспорт (v2)"""
import json
import os
import hashlib
import psycopg2

DSN = os.environ.get('DATABASE_URL', '')

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
}

def resp(status, body):
    return {'statusCode': status, 'headers': {**CORS, 'Content-Type': 'application/json'}, 'body': json.dumps(body, default=str)}

def hash_pw(pw):
    return hashlib.sha256(pw.encode()).hexdigest()

def handler(event, context):
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    conn = psycopg2.connect(DSN)
    cur = conn.cursor()

    results = []

    cur.execute("SELECT COUNT(*) FROM organizations")
    if cur.fetchone()[0] == 0:
        cur.execute("""
            INSERT INTO organizations (name, inn, contact_email, contact_phone)
            VALUES ('ГЭТ — Городской электротранспорт', '6600000001', 'info@get-city.ru', '+7 (343) 000-00-01')
        """)
        results.append('Организация создана')
    else:
        results.append('Организация уже есть')

    users_data = [
        ('D001', 'Смирнова Елена Викторовна', 'dispatcher', 'disp123', '+7 (900) 111-01-01'),
        ('D002', 'Козлов Артём Дмитриевич', 'dispatcher', 'disp123', '+7 (900) 111-01-02'),
        ('T001', 'Васильев Олег Николаевич', 'technician', 'tech123', '+7 (900) 222-01-01'),
        ('T002', 'Морозова Анна Сергеевна', 'technician', 'tech123', '+7 (900) 222-01-02'),
        ('A001', 'Петров Максим Андреевич', 'admin', 'admin123', '+7 (900) 333-01-01'),
    ]

    for emp_id, name, role, pw, phone in users_data:
        cur.execute("SELECT id FROM dashboard_users WHERE employee_id = %s", (emp_id,))
        if not cur.fetchone():
            cur.execute(
                "INSERT INTO dashboard_users (employee_id, full_name, role, password_hash, phone) VALUES (%s, %s, %s, %s, %s)",
                (emp_id, name, role, hash_pw(pw), phone)
            )
            results.append(f'Пользователь {emp_id} ({role}) создан')
        else:
            cur.execute("UPDATE dashboard_users SET password_hash = %s WHERE employee_id = %s", (hash_pw(pw), emp_id))
            results.append(f'Пользователь {emp_id} уже есть, пароль обновлён')

    cur.execute("SELECT id FROM organizations LIMIT 1")
    org_id = cur.fetchone()[0]

    routes_data = [
        ('5', 'Депо Северное — Депо Южное', 'tram', '#22c55e', 18.5, 52, 'active'),
        ('3', 'ЖД Вокзал — Микрорайон Восток', 'tram', '#3b82f6', 12.3, 38, 'active'),
        ('7', 'Центр — Промзона', 'trolleybus', '#a855f7', 9.8, 28, 'active'),
        ('9', 'Площадь Мира — Аэропорт', 'bus', '#ef4444', 22.1, 65, 'active'),
        ('11', 'Депо Западное — Университет', 'tram', '#f59e0b', 14.7, 42, 'active'),
        ('12', 'Старый город — Новый район', 'trolleybus', '#06b6d4', 7.2, 22, 'active'),
        ('14', 'Проспект Мира — Южный вокзал', 'bus', '#ec4899', 16.0, 45, 'active'),
        ('1', 'Центральный рынок — Заречный район', 'tram', '#84cc16', 11.1, 32, 'active'),
    ]

    for num, name, ttype, color, dist, avg_t, status in routes_data:
        cur.execute("SELECT id FROM routes WHERE route_number = %s", (num,))
        if not cur.fetchone():
            cur.execute(
                """INSERT INTO routes (organization_id, route_number, name, transport_type, color, distance_km, avg_time_min, route_status)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s)""",
                (org_id, num, name, ttype, color, dist, avg_t, status)
            )
            results.append(f'Маршрут М{num} создан')
        else:
            results.append(f'Маршрут М{num} уже есть')

    vehicles_data = [
        ('ТМ-3407', 'tram', '71-623', 190, 2015),
        ('ТМ-0001', 'tram', '71-623', 190, 2018),
        ('ТМ-2105', 'tram', '71-631', 200, 2020),
        ('ТМ-1502', 'tram', '71-623', 190, 2016),
        ('ТБ-1205', 'trolleybus', 'ВМЗ-5298', 115, 2017),
        ('ТБ-0803', 'trolleybus', 'Тролза-5265', 100, 2019),
        ('ТБ-0912', 'trolleybus', 'ВМЗ-5298', 115, 2016),
        ('АБ-5501', 'bus', 'ЛиАЗ-5292', 110, 2021),
        ('АБ-5502', 'bus', 'ЛиАЗ-5292', 110, 2021),
        ('АБ-3301', 'bus', 'НефАЗ-5299', 105, 2019),
        ('ТМ-9999', 'tram', '71-623', 190, 2022),
        ('ТБ-7701', 'trolleybus', 'Тролза-5265', 100, 2020),
    ]

    for label, ttype, model, cap, year in vehicles_data:
        cur.execute("SELECT id FROM vehicles WHERE label = %s", (label,))
        if not cur.fetchone():
            cur.execute(
                """INSERT INTO vehicles (organization_id, label, transport_type, model, capacity, manufacture_year, transport_status, mileage)
                   VALUES (%s, %s, %s, %s, %s, %s, 'active', %s)""",
                (org_id, label, ttype, model, cap, year, (2026 - year) * 18000)
            )
            results.append(f'ТС {label} создано')
        else:
            results.append(f'ТС {label} уже есть')

    cur.execute("UPDATE drivers SET phone = '+7 (900) 100-01-01' WHERE id = 1 AND phone IS NULL")
    cur.execute("UPDATE drivers SET phone = '+7 (900) 100-01-02' WHERE id = 2 AND phone IS NULL")
    cur.execute("UPDATE drivers SET phone = '+7 (900) 100-01-03' WHERE id = 3 AND phone IS NULL")
    cur.execute("UPDATE drivers SET phone = '+7 (900) 100-01-04' WHERE id = 6 AND phone IS NULL")

    conn.commit()
    cur.close()
    conn.close()

    return resp(200, {'results': results, 'total': len(results)})