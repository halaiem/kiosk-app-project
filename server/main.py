"""
FastAPI обёртка для Cloud Functions проекта ИРИДА.
Автоматически подхватывает все функции из /backend и создаёт роуты /api/<имя-функции>.

Запуск:
    uvicorn main:app --host 0.0.0.0 --port 8000 --reload
"""

import json
import importlib
import importlib.util
import sys
import os
import time
import base64
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

backend_path = Path(__file__).parent.parent / "backend"

app = FastAPI(title="ИРИДА API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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
    "export-db",
]

loaded_modules: dict = {}


def load_function(name: str):
    if name not in loaded_modules:
        module_dir = backend_path / name
        index_file = module_dir / "index.py"
        if not index_file.exists():
            raise FileNotFoundError(f"Function {name}/index.py not found")
        module_name = f"fn_{name.replace('-', '_')}"
        if str(module_dir) not in sys.path:
            sys.path.insert(0, str(module_dir))
        spec = importlib.util.spec_from_file_location(module_name, str(index_file))
        module = importlib.util.module_from_spec(spec)
        sys.modules[module_name] = module
        spec.loader.exec_module(module)
        loaded_modules[name] = module
    return loaded_modules[name]


class FakeContext:
    def __init__(self, function_name: str = "local"):
        self.request_id = f"self-hosted-{int(time.time() * 1000)}"
        self.function_name = function_name
        self.memory_limit_in_mb = 256
        self.deadline_ms = int((time.time() + 30) * 1000)


async def build_event(request: Request, extra_path: str = "") -> dict:
    body_str = ""
    is_base64 = False

    if request.method in ("POST", "PUT", "PATCH", "DELETE"):
        raw = await request.body()
        if raw:
            try:
                body_str = raw.decode("utf-8")
            except UnicodeDecodeError:
                body_str = base64.b64encode(raw).decode("ascii")
                is_base64 = True

    headers = dict(request.headers)
    if "authorization" in headers:
        headers["X-Authorization"] = headers["authorization"]
    if "cookie" in headers:
        headers["X-Cookie"] = headers["cookie"]

    query_params = dict(request.query_params) if request.query_params else None

    return {
        "httpMethod": request.method,
        "headers": headers,
        "queryStringParameters": query_params,
        "body": body_str if body_str else None,
        "path": extra_path or "/",
        "isBase64Encoded": is_base64,
        "requestContext": {
            "identity": {
                "sourceIp": request.client.host if request.client else "127.0.0.1"
            }
        },
    }


def make_response(result: dict) -> Response:
    status_code = result.get("statusCode", 200)
    resp_headers = result.get("headers", {})
    body = result.get("body", "")

    if isinstance(body, dict):
        body = json.dumps(body, ensure_ascii=False)

    content_type = resp_headers.pop("Content-Type", resp_headers.pop("content-type", "application/json"))

    response = Response(
        content=body,
        status_code=status_code,
        media_type=content_type,
    )

    for k, v in resp_headers.items():
        key_lower = k.lower()
        if key_lower == "access-control-allow-origin":
            continue
        if key_lower == "x-set-cookie":
            response.headers["Set-Cookie"] = str(v)
            continue
        response.headers[k] = str(v)

    return response


@app.get("/api/health")
async def health():
    available = []
    for name in FUNCTION_NAMES:
        index_file = backend_path / name / "index.py"
        if index_file.exists():
            available.append(name)
    return {
        "status": "ok",
        "service": "irida-api",
        "functions_total": len(FUNCTION_NAMES),
        "functions_available": len(available),
        "functions": available,
    }


for fn_name in FUNCTION_NAMES:
    index_file = backend_path / fn_name / "index.py"
    if not index_file.exists():
        print(f"[WARN] {fn_name}/index.py not found, skipping route")
        continue

    def create_handler(name: str):
        async def handler(request: Request):
            module = load_function(name)
            event = await build_event(request)
            ctx = FakeContext(function_name=name)
            try:
                result = module.handler(event, ctx)
                return make_response(result)
            except Exception as e:
                import traceback
                traceback.print_exc()
                return Response(
                    content=json.dumps({"error": str(e)}, ensure_ascii=False),
                    status_code=500,
                    media_type="application/json",
                )

        async def handler_with_path(request: Request, path: str = ""):
            module = load_function(name)
            event = await build_event(request, extra_path=f"/{path}")
            ctx = FakeContext(function_name=name)
            try:
                result = module.handler(event, ctx)
                return make_response(result)
            except Exception as e:
                import traceback
                traceback.print_exc()
                return Response(
                    content=json.dumps({"error": str(e)}, ensure_ascii=False),
                    status_code=500,
                    media_type="application/json",
                )

        return handler, handler_with_path

    h, h_sub = create_handler(fn_name)
    safe_name = fn_name.replace("-", "_")

    app.add_api_route(
        f"/api/{fn_name}",
        h,
        methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        name=f"{safe_name}_root",
    )
    app.add_api_route(
        f"/api/{fn_name}/{{path:path}}",
        h_sub,
        methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        name=f"{safe_name}_sub",
    )
    print(f"[OK] Route /api/{fn_name}")