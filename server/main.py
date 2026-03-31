"""
FastAPI обёртка для Cloud Functions проекта ТрамДиспетч.
Преобразует HTTP-запросы FastAPI в формат event/context Cloud Functions.

Запуск:
    uvicorn main:app --host 0.0.0.0 --port 8000 --reload
"""

import json
import importlib
import sys
import os
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

backend_path = Path(__file__).parent.parent / "backend"
sys.path.insert(0, str(backend_path))

app = FastAPI(title="ТрамДиспетч API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

FUNCTION_MODULES = {
    "driver-auth": None,
    "driver-manage": None,
    "driver-messages": None,
}


def load_function(name: str):
    if FUNCTION_MODULES[name] is None:
        module_path = f"{name.replace('-', '_')}"
        spec = importlib.util.spec_from_file_location(
            module_path,
            str(backend_path / name / "index.py")
        )
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        FUNCTION_MODULES[name] = module
    return FUNCTION_MODULES[name]


class FakeContext:
    def __init__(self):
        self.request_id = "local-server"


async def build_event(request: Request, extra_path: str = "") -> dict:
    body = ""
    if request.method in ("POST", "PUT", "PATCH", "DELETE"):
        raw = await request.body()
        body = raw.decode("utf-8") if raw else ""

    headers = dict(request.headers)
    if "authorization" in headers:
        headers["X-Authorization"] = headers["authorization"]
    if "x-auth-token" in headers:
        headers["X-Auth-Token"] = headers["x-auth-token"]

    query_params = dict(request.query_params) if request.query_params else None

    return {
        "httpMethod": request.method,
        "headers": headers,
        "queryStringParameters": query_params,
        "body": body,
        "path": extra_path or "/",
        "isBase64Encoded": False,
        "requestContext": {
            "identity": {
                "sourceIp": request.client.host if request.client else "127.0.0.1"
            }
        },
    }


def make_response(result: dict):
    from fastapi.responses import Response
    status_code = result.get("statusCode", 200)
    resp_headers = result.get("headers", {})
    body = result.get("body", "")
    return Response(
        content=body,
        status_code=status_code,
        headers=resp_headers,
        media_type="application/json",
    )


# === driver-auth ===

@app.api_route("/api/driver-auth", methods=["GET", "POST", "OPTIONS"])
async def driver_auth(request: Request):
    module = load_function("driver-auth")
    event = await build_event(request)
    result = module.handler(event, FakeContext())
    return make_response(result)


# === driver-manage ===

@app.api_route("/api/driver-manage", methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"])
async def driver_manage(request: Request):
    module = load_function("driver-manage")
    event = await build_event(request)
    result = module.handler(event, FakeContext())
    return make_response(result)


# === driver-messages ===

@app.api_route("/api/driver-messages", methods=["GET", "POST", "OPTIONS"])
async def driver_messages(request: Request):
    module = load_function("driver-messages")
    event = await build_event(request)
    result = module.handler(event, FakeContext())
    return make_response(result)


@app.api_route("/api/driver-messages/{path:path}", methods=["PUT", "OPTIONS"])
async def driver_messages_sub(request: Request, path: str):
    module = load_function("driver-messages")
    event = await build_event(request, extra_path=f"/{path}")
    result = module.handler(event, FakeContext())
    return make_response(result)


# === Health check ===

@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "tramdisp-api"}
