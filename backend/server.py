"""
FastAPI-сервер, объединяющий все 15 cloud-функций проекта.
Каждая функция подключается как отдельный route: /<function-name>/
Входящий запрос преобразуется в формат event/context, вызывается оригинальный handler.
"""

import json
import base64
import time
import importlib
import sys
import os
from pathlib import Path
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware

FUNCTION_NAMES = [
    "dashboard-auth",
    "dashboard-data",
    "dashboard-messages",
    "dashboard-seed",
    "driver-auth",
    "driver-docs",
    "driver-manage",
    "driver-messages",
    "irida-database",
    "irida-files",
    "irida-mrm",
    "irida-shell",
    "service-requests",
    "transcribe",
    "vehicle-diagnostics",
]

app = FastAPI(title="ИРИДА Backend", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

handlers: dict = {}

for name in FUNCTION_NAMES:
    module_dir = Path(__file__).parent / name
    if not (module_dir / "index.py").exists():
        print(f"[WARN] {name}/index.py not found, skipping")
        continue
    module_name = name.replace("-", "_")
    if str(module_dir) not in sys.path:
        sys.path.insert(0, str(module_dir))
    spec = importlib.util.spec_from_file_location(module_name, module_dir / "index.py")
    mod = importlib.util.module_from_spec(spec)
    sys.modules[module_name] = mod
    try:
        spec.loader.exec_module(mod)
        handlers[name] = mod.handler
        print(f"[OK] Loaded {name}")
    except Exception as e:
        print(f"[ERR] Failed to load {name}: {e}")


class FakeContext:
    """Эмуляция контекста cloud-функции."""
    def __init__(self):
        self.request_id = f"local-{int(time.time()*1000)}"
        self.function_name = "local"
        self.memory_limit_in_mb = 256
        self.deadline_ms = int((time.time() + 30) * 1000)


async def build_event(request: Request) -> dict:
    """Преобразует FastAPI Request в event-объект cloud-функции."""
    body_bytes = await request.body()
    body_str = ""
    is_base64 = False

    if body_bytes:
        try:
            body_str = body_bytes.decode("utf-8")
        except UnicodeDecodeError:
            body_str = base64.b64encode(body_bytes).decode("ascii")
            is_base64 = True

    headers_dict = dict(request.headers)

    qs = dict(request.query_params)

    return {
        "httpMethod": request.method,
        "headers": headers_dict,
        "queryStringParameters": qs if qs else None,
        "body": body_str if body_str else None,
        "isBase64Encoded": is_base64,
        "requestContext": {
            "identity": {
                "sourceIp": request.client.host if request.client else "127.0.0.1"
            }
        },
    }


def make_response(result: dict) -> Response:
    """Преобразует результат handler в FastAPI Response."""
    status = result.get("statusCode", 200)
    resp_headers = result.get("headers", {})
    body = result.get("body", "")

    if isinstance(body, dict):
        body = json.dumps(body, ensure_ascii=False)

    content_type = resp_headers.pop("Content-Type", resp_headers.pop("content-type", "application/json"))

    response = Response(
        content=body,
        status_code=status,
        media_type=content_type,
    )

    for k, v in resp_headers.items():
        key_lower = k.lower()
        if key_lower == "access-control-allow-origin":
            continue
        if key_lower == "x-set-cookie":
            response.set_cookie(key="session", value=v)
            continue
        response.headers[k] = str(v)

    return response


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "functions": list(handlers.keys()),
        "count": len(handlers),
    }


for fn_name in FUNCTION_NAMES:
    if fn_name not in handlers:
        continue

    def make_route(name: str):
        handler_fn = handlers[name]

        async def route(request: Request):
            event = await build_event(request)
            ctx = FakeContext()
            ctx.function_name = name
            try:
                result = handler_fn(event, ctx)
                return make_response(result)
            except Exception as e:
                return Response(
                    content=json.dumps({"error": str(e)}, ensure_ascii=False),
                    status_code=500,
                    media_type="application/json",
                )

        return route

    route_fn = make_route(fn_name)
    route_path = f"/{fn_name}"

    app.add_api_route(f"{route_path}", route_fn, methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"])
    app.add_api_route(f"{route_path}/", route_fn, methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"])
    app.add_api_route(f"{route_path}/{{path:path}}", route_fn, methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"])
