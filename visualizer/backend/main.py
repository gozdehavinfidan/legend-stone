"""tools/visualizer/backend/main.py

P19 (Phase 10G): FastAPI backend for the Material Design 3 web UI.

Wraps `stm32_link.STM32Link` so each HTTP request becomes one serial
transaction guarded by a thread lock. Endpoints return JSON for the
control plane (PING/STAT) and the structured commands (TPL/CHAR/MATCH);
the IMG endpoint streams the decoded image as a real PNG so the front
end can drop it straight into an `<img>` tag.

Configure the serial port through environment variables:
    STM32_PORT (default "COM3" on Windows, override on Linux/macOS)
    STM32_BAUD (default 115200)

Run:
    cd tools/visualizer/backend
    pip install -r requirements.txt
    set STM32_PORT=COM3        :: Windows
    uvicorn main:app --reload --port 8000

Then open http://localhost:8000 — the FastAPI app also serves the
sibling `frontend/` directory under `/`.
"""

from __future__ import annotations

import json
import os
from pathlib import Path

from fastapi import FastAPI, HTTPException, Response, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from starlette.middleware.base import BaseHTTPMiddleware

import serial
from serial.tools import list_ports

# Local module — sys.path is set by uvicorn cwd; if running as
# `python -m main` from the backend folder, this works out of the box.
from stm32_link import STM32Link, to_png_bytes


# Persistence file lives next to this file so different working dirs on
# different machines pick up the right config. Stored fields: port, baud.
# Lookup order on startup: env var → .port.json → "COM3" default. UI
# updates write back here so the next start picks up the user's last
# choice without needing to re-set env vars.
CONFIG_PATH = Path(__file__).resolve().parent / ".port.json"


def _load_persisted_config() -> tuple[str | None, int | None]:
    if not CONFIG_PATH.exists():
        return None, None
    try:
        cfg = json.loads(CONFIG_PATH.read_text())
        return cfg.get("port"), cfg.get("baud")
    except Exception:
        return None, None


def _save_persisted_config(port: str, baud: int) -> None:
    try:
        CONFIG_PATH.write_text(json.dumps({"port": port, "baud": baud}))
    except OSError:
        # Read-only filesystem (Docker, locked-down kiosk) — log nothing,
        # just don't crash. The runtime port still applies for the
        # current process; the user just has to re-pick after a restart.
        pass


_persist_port, _persist_baud = _load_persisted_config()
PORT = os.environ.get("STM32_PORT") or _persist_port or "COM3"
BAUD = int(os.environ.get("STM32_BAUD") or _persist_baud or 115200)

stm32 = STM32Link(PORT, BAUD)

app = FastAPI(
    title="STM32 FPST Bridge",
    description="P13 Biometric Door Lock — STM32 ↔ PC visualizer (P19/P20)",
    version="0.1.0",
)
# CORS lockdown (security audit C1):
#   The previous wildcard `allow_origins=["*"]` was a drive-by exfil
#   vector — any other tab the user had open could POST to /api/img
#   and steal the live fingerprint while the backend was running. The
#   browser's same-origin policy is the *only* thing that stops that,
#   and a wildcard CORS turns it off. Restore a tight allowlist of
#   the localhost forms the bundled frontend can plausibly load from;
#   any other origin (real site, attacker page) gets blocked by the
#   browser at preflight.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "http://localhost",
        "http://127.0.0.1",
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


class NoCacheMiddleware(BaseHTTPMiddleware):
    """Disable browser cache on every response. Embedded demos churn
    HTML/JS/CSS often; the user kept seeing yesterday's UI because
    Chrome cached the static assets indefinitely. The single-tab
    localhost demo has no perf budget that needs caching anyway."""
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
        return response


app.add_middleware(NoCacheMiddleware)


# -------------------------------------------------------------------
# Error helper
# -------------------------------------------------------------------

def _wrap(fn, *args, **kwargs):
    """Run an STM32Link method and translate domain errors to HTTP 5xx."""
    try:
        return fn(*args, **kwargs)
    except (TimeoutError, ValueError) as exc:
        # 502 fits "bad upstream" — the STM32 (upstream of the API) is
        # responding wrongly or not at all.
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except serial.SerialException as exc:
        raise HTTPException(status_code=503, detail=f"serial: {exc}") from exc


# -------------------------------------------------------------------
# Endpoints
# -------------------------------------------------------------------

@app.get("/api/health")
def api_health():
    # Read off the live STM32Link instance instead of the module-level
    # constants — those are the boot defaults and go stale the moment
    # the user reconnects via /api/serial/connect.
    return {"ok": True, "port": stm32.port, "baud": stm32.baud}


@app.get("/api/serial/ports")
def api_serial_ports():
    """Enumerate currently visible OS-level serial ports.

    Each entry is a {device, description} pair so the UI can show
    something like "COM13 — USB-SERIAL CH340" rather than just COM13.
    The currently-active port is flagged so the dropdown can preselect
    it without the UI having to cross-reference /api/health. """
    seen: list[dict] = []
    for p in list_ports.comports():
        seen.append({
            "device": p.device,
            "description": p.description or "",
            "active": (p.device == stm32.port),
        })
    seen.sort(key=lambda e: e["device"])
    return {"ok": True, "current": stm32.port, "baud": stm32.baud, "ports": seen}


class SerialConnectRequest(BaseModel):
    port: str = Field(min_length=1, max_length=64)
    baud: int = Field(default=115200, ge=300, le=4_000_000)


@app.post("/api/serial/connect")
def api_serial_connect(req: SerialConnectRequest):
    """Re-open the serial link on a different port / baud.

    Maps SerialException to 503 (the requested device exists but we
    can't talk to it — usually 'in use by another process' or 'access
    denied'). On success the new (port, baud) gets persisted so the
    next backend start picks them up without env vars.
    """
    try:
        stm32.reconnect(req.port, req.baud)
    except serial.SerialException as exc:
        raise HTTPException(status_code=503, detail=f"serial: {exc}") from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    _save_persisted_config(stm32.port, stm32.baud)
    return {"ok": True, "port": stm32.port, "baud": stm32.baud}


@app.get("/api/ping")
def api_ping():
    return {"ok": True, "response": _wrap(stm32.ping)}


@app.get("/api/stat")
def api_stat():
    return {"ok": True, **_wrap(stm32.stat)}


@app.get("/api/tpl/{slot}")
def api_tpl(slot: int):
    if slot < 1 or slot > 9:
        raise HTTPException(status_code=400, detail="slot must be 1..9")
    return {"ok": True, **_wrap(stm32.tpl, slot)}


@app.post("/api/char")
def api_char():
    return {"ok": True, **_wrap(stm32.char_live)}


@app.post("/api/img")
def api_img():
    """Capture a live image and return it as a PNG so the browser can
    render it in an `<img>` tag without any client-side decoding."""
    result = _wrap(stm32.img_live)
    try:
        png = to_png_bytes(result["raw"])
    except RuntimeError as exc:
        # Pillow missing → fall back to PGM, which the browser cannot
        # display natively but at least keeps the byte stream useful.
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    return Response(
        content=png,
        media_type="image/png",
        headers={
            "X-Frame-Id": str(result["frame_id"]),
            "X-Payload-Len": str(result["len"]),
            "Cache-Control": "no-store",
        },
    )


class MatchRequest(BaseModel):
    a: int = Field(ge=1, le=9)
    b: int = Field(ge=1, le=9)


@app.post("/api/match")
def api_match(req: MatchRequest):
    return {"ok": True, **_wrap(stm32.match, req.a, req.b)}


# -------------------------------------------------------------------
# Static frontend (served on /)
# -------------------------------------------------------------------

FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend"
if FRONTEND_DIR.exists():
    app.mount(
        "/",
        StaticFiles(directory=str(FRONTEND_DIR), html=True),
        name="frontend",
    )
