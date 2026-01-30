from __future__ import annotations

import argparse
import atexit
import hashlib
import json
import logging
from logging.handlers import RotatingFileHandler
import os
from pathlib import Path
import shutil
import socket
import sqlite3
import subprocess
import sys
import threading
import time
from datetime import datetime, timezone
import http.client
from typing import Optional


PROJECT_ROOT = Path(__file__).resolve().parent
UI_DIR = PROJECT_ROOT / "ui"
LOG_FILE = PROJECT_ROOT / "debug.log"


def setup_logging(debug: bool) -> logging.Logger:
    # Ensure Windows console can handle Unicode (Next.js uses symbols like "⨯").
    if os.name == "nt":
        try:
            if hasattr(sys.stdout, "reconfigure"):
                sys.stdout.reconfigure(encoding="utf-8", errors="replace")
            if hasattr(sys.stderr, "reconfigure"):
                sys.stderr.reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            pass

    logger = logging.getLogger("tor_calculator")
    logger.setLevel(logging.DEBUG if debug else logging.INFO)

    fmt = logging.Formatter(
        fmt="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    file_handler = RotatingFileHandler(
        LOG_FILE, maxBytes=5 * 1024 * 1024, backupCount=3, encoding="utf-8"
    )
    file_handler.setFormatter(fmt)
    file_handler.setLevel(logging.DEBUG)

    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(fmt)
    console_handler.setLevel(logging.DEBUG if debug else logging.INFO)

    # Avoid duplicate handlers if app is reloaded in-process
    if not any(isinstance(h, RotatingFileHandler) for h in logger.handlers):
        logger.addHandler(file_handler)
    # RotatingFileHandler/FileHandler is also a StreamHandler, so exclude file handlers here.
    if not any(
        isinstance(h, logging.StreamHandler) and not isinstance(h, logging.FileHandler)
        for h in logger.handlers
    ):
        logger.addHandler(console_handler)

    logger.debug("Logging initialized. debug=%s log_file=%s", debug, str(LOG_FILE))
    return logger


def is_port_open(host: str, port: int, timeout_s: float = 0.25) -> bool:
    try:
        with socket.create_connection((host, port), timeout=timeout_s):
            return True
    except OSError:
        return False


def is_http_healthy(host: str, port: int, timeout_s: float = 2.0) -> bool:
    """
    Checks that the server not only listens, but also responds to HTTP within timeout.
    This prevents "black screen" when a hung process keeps the port open.
    """
    try:
        conn = http.client.HTTPConnection(host, port, timeout=timeout_s)
        conn.request("GET", "/")
        resp = conn.getresponse()
        # Drain a bit to complete the request
        resp.read(256)
        return 200 <= resp.status < 500
    except Exception:
        return False
    finally:
        try:
            conn.close()
        except Exception:
            pass


def wait_for_http(host: str, port: int, timeout_s: float, logger: logging.Logger) -> None:
    deadline = time.time() + timeout_s
    while time.time() < deadline:
        if is_http_healthy(host, port, timeout_s=2.0):
            logger.debug("HTTP is healthy: %s:%d", host, port)
            return
        time.sleep(0.1)
    raise TimeoutError(f"UI server did not become healthy in time ({host}:{port})")


def pick_free_port(host: str, preferred: int, max_tries: int = 25) -> int:
    if not is_port_open(host, preferred):
        return preferred
    for p in range(preferred + 1, preferred + 1 + max_tries):
        if not is_port_open(host, p):
            return p
    # fall back to ephemeral port
    s = socket.socket()
    try:
        s.bind((host, 0))
        return int(s.getsockname()[1])
    finally:
        s.close()


def _windows_get_listen_pid(port: int, logger: logging.Logger) -> Optional[int]:
    try:
        out = subprocess.check_output(
            [
                "powershell",
                "-NoProfile",
                "-Command",
                f"Get-NetTCPConnection -LocalPort {int(port)} -State Listen -ErrorAction SilentlyContinue | "
                "Select-Object -First 1 -ExpandProperty OwningProcess",
            ],
            text=True,
            encoding="utf-8",
            errors="replace",
        ).strip()
        if not out:
            return None
        return int(out)
    except Exception:
        logger.debug("Could not determine owning PID for port %s", port, exc_info=True)
        return None


def _windows_get_commandline(pid: int, logger: logging.Logger) -> str:
    try:
        out = subprocess.check_output(
            [
                "powershell",
                "-NoProfile",
                "-Command",
                f"Get-CimInstance Win32_Process -Filter 'ProcessId={int(pid)}' | "
                "Select-Object -ExpandProperty CommandLine",
            ],
            text=True,
            encoding="utf-8",
            errors="replace",
        )
        return (out or "").strip()
    except Exception:
        logger.debug("Could not read command line for PID %s", pid, exc_info=True)
        return ""


def _windows_kill_pid(pid: int, logger: logging.Logger) -> bool:
    try:
        proc = subprocess.run(
            ["taskkill", "/PID", str(int(pid)), "/T", "/F"],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            encoding="utf-8",
            errors="replace",
        )
        logger.warning("Killed PID %s. taskkill output: %s", pid, (proc.stdout or "").strip())
        return proc.returncode == 0
    except Exception:
        logger.exception("Failed to kill PID %s", pid)
        return False


def _pick_package_manager(logger: logging.Logger) -> list[str]:
    # Prefer pnpm (lockfile exists), fall back to npm if needed.
    # On Windows, pnpm/npm are usually .cmd wrappers (CreateProcess can't run them unless we point to *.cmd).
    candidates_pnpm = ["pnpm.cmd", "pnpm"] if os.name == "nt" else ["pnpm"]
    candidates_npm = ["npm.cmd", "npm"] if os.name == "nt" else ["npm"]

    for exe in candidates_pnpm:
        if shutil.which(exe):
            return [exe]
    for exe in candidates_npm:
        if shutil.which(exe):
            logger.warning("pnpm not found in PATH, falling back to npm.")
            return [exe]
    raise RuntimeError("Neither pnpm nor npm found in PATH. Install Node.js + pnpm.")


def _check_node_version(min_major: int, logger: logging.Logger) -> None:
    node = shutil.which("node")
    if not node:
        raise RuntimeError("Node.js not found in PATH. Install Node.js (>= 18).")

    try:
        out = subprocess.check_output([node, "-v"], text=True, encoding="utf-8", errors="replace").strip()
    except Exception as e:
        raise RuntimeError(f"Failed to check Node.js version: {e}") from e

    # Expected like "v20.11.1"
    v = out.lstrip().lstrip("v")
    major_str = v.split(".", 1)[0]
    try:
        major = int(major_str)
    except ValueError:
        logger.warning("Could not parse Node.js version: %r", out)
        return

    if major < min_major:
        raise RuntimeError(
            f"Node.js {out} is too old for this UI. Install Node.js >= {min_major} (recommended: 20 LTS)."
        )


def start_next_server(
    *,
    ui_dir: Path,
    port: int,
    dev: bool,
    logger: logging.Logger,
) -> subprocess.Popen:
    pm = _pick_package_manager(logger)

    # Next accepts -p/--port. We pass args via the package manager.
    if pm[0].lower().startswith("pnpm"):
        cmd = pm + ["-C", str(ui_dir), "dev" if dev else "start", "--", "-p", str(port)]
    else:
        # npm: run script in a subfolder via --prefix
        cmd = pm + [
            "--prefix",
            str(ui_dir),
            "run",
            "dev" if dev else "start",
            "--",
            "-p",
            str(port),
        ]

    env = os.environ.copy()
    env.setdefault("NODE_ENV", "development" if dev else "production")
    env["PORT"] = str(port)

    logger.info("Starting UI server: %s", " ".join(cmd))
    proc = subprocess.Popen(
        cmd,
        cwd=str(ui_dir),
        env=env,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        encoding="utf-8",
        errors="replace",
        bufsize=1,
    )

    def _pump_output() -> None:
        try:
            assert proc.stdout is not None
            for line in proc.stdout:
                logger.info("[ui] %s", line.rstrip())
        except Exception:
            logger.exception("Failed to read UI server output.")

    # Read server output in a lightweight background thread.
    import threading

    t = threading.Thread(target=_pump_output, name="ui-log-pump", daemon=True)
    t.start()
    return proc


def resolve_ui_target(ui_dir: Path, logger: logging.Logger) -> tuple[str, Optional[Path]]:
    """
    Returns:
      ("file", path_to_index_html) if a static export is present
      ("server", None) otherwise
    """
    static_index = ui_dir / "out" / "index.html"
    if static_index.exists():
        logger.info("Found static UI export: %s", str(static_index))
        return "file", static_index
    return "server", None


def has_next_production_build(ui_dir: Path) -> bool:
    # `next start` requires a production build produced by `next build`,
    # which is indicated by presence of `.next/BUILD_ID`.
    return (ui_dir / ".next" / "BUILD_ID").exists()


def _parse_bool(value: str | None) -> Optional[bool]:
    if value is None:
        return None
    v = value.strip().lower()
    if v in {"1", "true", "yes", "y", "on"}:
        return True
    if v in {"0", "false", "no", "n", "off"}:
        return False
    return None


def get_data_dir() -> Path:
    override = os.getenv("TORCALC_DATA_DIR")
    if override:
        p = Path(override)
        p.mkdir(parents=True, exist_ok=True)
        return p

    if os.name == "nt":
        base = os.getenv("LOCALAPPDATA") or os.getenv("APPDATA")
        p = (Path(base) if base else PROJECT_ROOT) / "TorCalculator"
    else:
        p = Path.home() / ".tor-calculator"
    p.mkdir(parents=True, exist_ok=True)
    return p


def _utc_iso_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _hash_password(password: str) -> str:
    # For now we use a simple salted sha256 (test accounts only).
    # In the future: migrate to a real password hashing scheme (argon2/bcrypt).
    salt = os.getenv("TORCALC_AUTH_SALT", "torcalc")
    return hashlib.sha256((salt + ":" + password).encode("utf-8")).hexdigest()


def init_db(conn: sqlite3.Connection, *, use_test_auth: bool, logger: logging.Logger) -> None:
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
          username TEXT PRIMARY KEY,
          password_hash TEXT NOT NULL,
          status TEXT NOT NULL
        )
        """
    )
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS transactions (
          id INTEGER PRIMARY KEY,
          amount REAL NOT NULL,
          comment TEXT NOT NULL DEFAULT '',
          created_at TEXT NOT NULL
        )
        """
    )
    conn.execute("CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC)")
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        )
        """
    )

    if use_test_auth:
        test_accounts: dict[str, dict[str, str]] = {
            "ettore": {"password": "ettore633ytbloger", "status": "media"},
            "triazov": {"password": "winner123234", "status": "developer"},
        }
        for username, data in test_accounts.items():
            conn.execute(
                """
                INSERT OR IGNORE INTO users(username, password_hash, status)
                VALUES (?, ?, ?)
                """,
                (username, _hash_password(data["password"]), data["status"]),
            )
        logger.info("Test auth enabled: %d accounts ensured.", len(test_accounts))

    conn.commit()


class DesktopApi:
    def __init__(self, logger: logging.Logger, *, data_dir: Path, db_path: Path, use_test_auth: bool):
        self._logger = logger
        self._window = None
        self._data_dir = data_dir
        self._db_path = db_path
        self._lock = threading.Lock()
        self._conn = sqlite3.connect(str(db_path), check_same_thread=False)
        self._conn.row_factory = sqlite3.Row
        init_db(self._conn, use_test_auth=use_test_auth, logger=logger)

    def bind_window(self, window) -> None:
        self._window = window

    def reload(self) -> bool:
        self._logger.info("Reload requested")
        if not self._window:
            return False
        try:
            self._window.evaluate_js("location.reload()")
            return True
        except Exception:
            self._logger.exception("Reload failed")
            return False

    def toggle_devtools(self) -> bool:
        self._logger.info("Devtools toggle requested")
        if not self._window:
            return False
        try:
            # pywebview exposes this in supported backends (e.g., EdgeChromium/WebView2)
            self._window.show_devtools()
            return True
        except Exception:
            self._logger.exception("Devtools not available or failed to open")
            return False

    def ping(self) -> str:
        return "pong"

    def window_minimize(self) -> bool:
        if not self._window:
            return False
        try:
            self._window.minimize()
            return True
        except Exception:
            self._logger.exception("window_minimize failed")
            return False

    def window_close(self) -> bool:
        if not self._window:
            return False
        try:
            self._window.destroy()
            return True
        except Exception:
            self._logger.exception("window_close failed")
            return False

    def get_app_info(self) -> dict:
        return {
            "ok": True,
            "app": "TorCalculator",
            "version": "0.0.1",
            "dataDir": str(self._data_dir),
            "dbPath": str(self._db_path),
        }

    def auth_login(self, username: str, password: str) -> dict:
        try:
            u = (username or "").strip().lower()
            if not u or not password:
                return {"ok": False, "error": "EMPTY_CREDENTIALS"}
            with self._lock:
                row = self._conn.execute(
                    "SELECT username, password_hash, status FROM users WHERE username = ?",
                    (u,),
                ).fetchone()
            if not row:
                return {"ok": False, "error": "INVALID_CREDENTIALS"}
            if _hash_password(password) != row["password_hash"]:
                return {"ok": False, "error": "INVALID_CREDENTIALS"}
            return {"ok": True, "user": {"username": row["username"], "status": row["status"]}}
        except Exception:
            self._logger.exception("auth_login failed")
            return {"ok": False, "error": "INTERNAL_ERROR"}

    def transactions_list(self) -> dict:
        try:
            with self._lock:
                rows = self._conn.execute(
                    "SELECT id, amount, comment, created_at FROM transactions ORDER BY created_at DESC"
                ).fetchall()
            items = [
                {
                    "id": int(r["id"]),
                    "amount": float(r["amount"]),
                    "comment": r["comment"] or "",
                    "createdAt": r["created_at"],
                }
                for r in rows
            ]
            return {"ok": True, "items": items}
        except Exception:
            self._logger.exception("transactions_list failed")
            return {"ok": False, "error": "INTERNAL_ERROR"}

    def transaction_add(self, amount: float | str, comment: str = "") -> dict:
        try:
            try:
                num = float(amount)
            except Exception:
                return {"ok": False, "error": "INVALID_AMOUNT"}

            tx_id = int(time.time() * 1000)
            created_at = _utc_iso_now()
            comm = (comment or "").strip()
            with self._lock:
                self._conn.execute(
                    "INSERT INTO transactions(id, amount, comment, created_at) VALUES (?, ?, ?, ?)",
                    (tx_id, num, comm, created_at),
                )
                self._conn.commit()
            return {
                "ok": True,
                "item": {"id": tx_id, "amount": num, "comment": comm, "createdAt": created_at},
            }
        except Exception:
            self._logger.exception("transaction_add failed")
            return {"ok": False, "error": "INTERNAL_ERROR"}

    def transaction_delete(self, tx_id: int) -> dict:
        try:
            with self._lock:
                cur = self._conn.execute("DELETE FROM transactions WHERE id = ?", (int(tx_id),))
                self._conn.commit()
            return {"ok": True, "deleted": cur.rowcount}
        except Exception:
            self._logger.exception("transaction_delete failed")
            return {"ok": False, "error": "INTERNAL_ERROR"}

    def transactions_clear(self) -> dict:
        try:
            with self._lock:
                self._conn.execute("DELETE FROM transactions")
                self._conn.commit()
            return {"ok": True}
        except Exception:
            self._logger.exception("transactions_clear failed")
            return {"ok": False, "error": "INTERNAL_ERROR"}

    def _choose_save_path(self, *, default_name: str, file_types: list[str]) -> Optional[str]:
        if not self._window:
            return None
        try:
            # dialog_type=10 corresponds to SAVE_DIALOG
            paths = self._window.create_file_dialog(
                dialog_type=10,
                save_filename=default_name,
                file_types=file_types,
            )
            if not paths:
                return None
            return str(paths[0])
        except Exception:
            self._logger.exception("Failed to open save dialog")
            return None

    def export_csv(self) -> dict:
        """
        Export all transactions to CSV with UTF-8 BOM and ';' delimiter.
        """
        try:
            filename = f"tor-calculator-export-{datetime.now().strftime('%Y-%m-%d')}.csv"
            path = self._choose_save_path(default_name=filename, file_types=["CSV (*.csv)"])
            if not path:
                return {"ok": False, "error": "CANCELLED"}

            with self._lock:
                rows = self._conn.execute(
                    "SELECT amount, comment, created_at FROM transactions ORDER BY created_at DESC"
                ).fetchall()

            lines = ["Сумма;Комментарий;Дата"]
            for r in rows:
                amount = str(r["amount"])
                comment = (r["comment"] or "").replace("\n", " ").replace("\r", " ")
                # Escape quotes for CSV-ish format
                comment = comment.replace('"', '""')
                if ";" in comment or '"' in comment:
                    comment = f'"{comment}"'
                created = str(r["created_at"])
                lines.append(f"{amount};{comment};{created}")

            content = "\ufeff" + "\n".join(lines)
            Path(path).write_text(content, encoding="utf-8")
            return {"ok": True, "path": path, "count": len(rows)}
        except Exception:
            self._logger.exception("export_csv failed")
            return {"ok": False, "error": "INTERNAL_ERROR"}

    def backup_json(self) -> dict:
        """
        Save a JSON backup of all transactions.
        """
        try:
            filename = f"tor-calculator-backup-{datetime.now().strftime('%Y-%m-%d')}.json"
            path = self._choose_save_path(default_name=filename, file_types=["JSON (*.json)"])
            if not path:
                return {"ok": False, "error": "CANCELLED"}

            with self._lock:
                rows = self._conn.execute(
                    "SELECT id, amount, comment, created_at FROM transactions ORDER BY created_at DESC"
                ).fetchall()

            items = [
                {
                    "id": int(r["id"]),
                    "amount": float(r["amount"]),
                    "comment": r["comment"] or "",
                    "createdAt": str(r["created_at"]),
                }
                for r in rows
            ]
            payload = {
                "app": "TorCalculator",
                "version": "0.0.1",
                "exportedAt": _utc_iso_now(),
                "transactions": items,
            }
            Path(path).write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
            return {"ok": True, "path": path, "count": len(items)}
        except Exception:
            self._logger.exception("backup_json failed")
            return {"ok": False, "error": "INTERNAL_ERROR"}

    def close(self) -> None:
        try:
            with self._lock:
                self._conn.close()
        except Exception:
            pass


def inject_hotkeys(window, logger: logging.Logger) -> None:
    # Hotkeys are handled inside the web page and call back into Python API:
    # - F5 or Ctrl+R: reload
    # - F12 or Ctrl+Shift+I: devtools
    js = r"""
(() => {
  try {
    if (window.__torcalcHotkeysInstalled) return true;
    window.__torcalcHotkeysInstalled = true;

    window.addEventListener('keydown', (e) => {
      const key = (e.key || '').toLowerCase();
      const isReload = (e.key === 'F5') || (e.ctrlKey && key === 'r');
      const isDevtools = (e.key === 'F12') || (e.ctrlKey && e.shiftKey && key === 'i');

      if (!window.pywebview || !window.pywebview.api) return;

      if (isReload) {
        e.preventDefault();
        window.pywebview.api.reload();
      }
      if (isDevtools) {
        e.preventDefault();
        window.pywebview.api.toggle_devtools();
      }
    }, { capture: true });

    return true;
  } catch (err) {
    console.error('Hotkeys injection failed', err);
    return false;
  }
})();
"""
    try:
        window.evaluate_js(js)
        logger.debug("Hotkeys injected")
    except Exception:
        logger.exception("Failed to inject hotkeys")


def main() -> int:
    parser = argparse.ArgumentParser(description="TOR Calculator desktop (pywebview)")
    parser.add_argument("--dev", action="store_true", help="Enable development mode")
    # Using "localhost" avoids Next.js dev cross-origin warnings for _next assets.
    parser.add_argument("--host", default="localhost", help="UI server host")
    parser.add_argument("--port", type=int, default=int(os.getenv("TORCALC_PORT", "3000")))
    parser.add_argument(
        "--ui-timeout",
        type=float,
        default=30.0,
        help="Seconds to wait for UI server to start",
    )
    args = parser.parse_args()

    requested_dev = args.dev or os.getenv("TORCALC_DEV", "").strip() in {"1", "true", "yes", "on"}
    dev = requested_dev
    logger = setup_logging(dev)

    if not UI_DIR.exists():
        logger.error("UI folder not found: %s", str(UI_DIR))
        print(f"UI folder not found: {UI_DIR}")
        return 2

    ui_mode, static_index = resolve_ui_target(UI_DIR, logger)
    node_proc: Optional[subprocess.Popen] = None

    try:
        if ui_mode == "file":
            assert static_index is not None
            target = static_index.as_uri()
        else:
            # If user didn't request dev mode but no production build exists, auto-fallback to dev.
            if not requested_dev and not has_next_production_build(UI_DIR):
                logger.warning(
                    'UI production build not found (expected "ui/.next/BUILD_ID"). Falling back to dev mode.'
                )
                dev = True
            _check_node_version(18, logger)
            port = int(args.port)
            dev_lock = UI_DIR / ".next" / "dev" / "lock"

            # If port is already taken, only reuse it if HTTP is healthy.
            if dev and dev_lock.exists():
                # Next.js dev server uses a lock file; we cannot start a second instance.
                if is_http_healthy(args.host, port, timeout_s=2.0):
                    logger.warning(
                        "Next dev lock is present and UI at %s:%d is healthy. Reusing existing dev server.",
                        args.host,
                        port,
                    )
                else:
                    logger.warning(
                        "Next dev lock is present but UI at %s:%d is not responding. Trying to recover...",
                        args.host,
                        port,
                    )

                    if os.name == "nt":
                        pid = _windows_get_listen_pid(port, logger)
                        if pid:
                            cmd = _windows_get_commandline(pid, logger)
                            # Only kill if it looks like *our* Next server process.
                            if str(UI_DIR).lower() in cmd.lower() and "node_modules\\next\\dist\\server\\lib\\start-server.js" in cmd.lower():
                                _windows_kill_pid(pid, logger)
                            else:
                                logger.error(
                                    "Port %d is owned by PID %s but command line does not look like our Next server. "
                                    "Not killing automatically. cmd=%r",
                                    port,
                                    pid,
                                    cmd,
                                )
                        else:
                            logger.warning("Could not find listening PID for port %d.", port)

                    # If lock is stale (no server), remove it.
                    if not is_port_open(args.host, port):
                        try:
                            dev_lock.unlink(missing_ok=True)
                            logger.warning("Removed stale Next dev lock: %s", str(dev_lock))
                        except Exception:
                            logger.exception("Failed to remove Next dev lock: %s", str(dev_lock))

            if is_port_open(args.host, port):
                if is_http_healthy(args.host, port, timeout_s=2.0):
                    logger.warning(
                        "UI port %s:%d is already in use and looks healthy. Reusing existing UI server.",
                        args.host,
                        port,
                    )
                else:
                    # If not in dev (or no lock), we can pick another port. In dev with lock, we already tried to recover.
                    if not dev:
                        logger.warning(
                            "UI port %s:%d is already in use but does not respond to HTTP. Picking another port.",
                            args.host,
                            port,
                        )
                        port = pick_free_port(args.host, port)

            if not is_port_open(args.host, port):
                # In dev, always run `next dev`. In non-dev, try `next start` (expects build already done).
                node_proc = start_next_server(ui_dir=UI_DIR, port=port, dev=dev, logger=logger)

            def _cleanup_proc() -> None:
                if not node_proc:
                    return
                if node_proc.poll() is None:
                    logger.info("Stopping UI server...")
                    node_proc.terminate()
                    try:
                        node_proc.wait(timeout=5)
                    except subprocess.TimeoutExpired:
                        logger.warning("UI server did not stop gracefully, killing.")
                        node_proc.kill()

            atexit.register(_cleanup_proc)

            wait_for_http(args.host, port, args.ui_timeout, logger)
            target = f"http://{args.host}:{port}/"

        import webview

        use_test_auth = _parse_bool(os.getenv("TORCALC_USE_TEST_AUTH"))
        if use_test_auth is None:
            use_test_auth = dev

        data_dir = get_data_dir()
        db_path = data_dir / "torcalc.db"

        api = DesktopApi(logger, data_dir=data_dir, db_path=db_path, use_test_auth=use_test_auth)
        window = webview.create_window(
            title="TOR Calculator",
            url=target,
            width=1200,
            height=800,
            min_size=(900, 650),
            js_api=api,
            # Custom chrome (UI renders its own titlebar)
            frameless=True,
            easy_drag=False,
            resizable=True,
            shadow=True,
            # NOTE: Transparent frameless window with WinForms/Chromium is often click-through
            # and can produce black artifacts. Keep it opaque for stability.
            transparent=False,
            background_color="#0f172a",
        )
        api.bind_window(window)

        def on_loaded() -> None:
            inject_hotkeys(window, logger)
            # Devtools availability depends on the selected renderer.
            # In debug mode, pywebview enables context menu + JS error reporting.

        try:
            window.events.loaded += on_loaded
        except Exception:
            # If events API differs, we still have a working window; hotkeys will just not be injected.
            logger.exception("Could not bind window loaded event")

        if node_proc:
            def on_closed() -> None:
                try:
                    if node_proc.poll() is None:
                        logger.info("Window closed -> stopping UI server...")
                        node_proc.terminate()
                except Exception:
                    logger.exception("Failed to stop UI server on close")

            try:
                window.events.closed += on_closed
            except Exception:
                logger.exception("Could not bind window closed event")

        def _on_shutdown() -> None:
            try:
                api.close()
            except Exception:
                pass

        atexit.register(_on_shutdown)

        # Enable pywebview debug features in dev mode. Prefer EdgeChromium on Windows if available.
        if dev:
            webview.settings["OPEN_DEVTOOLS_IN_DEBUG"] = True

        try:
            if os.name == "nt":
                webview.start(debug=dev, gui="edgechromium")
            else:
                webview.start(debug=dev)
        except Exception:
            logger.exception("Failed to start with preferred GUI backend; falling back.")
            webview.start(debug=dev)
        return 0

    except Exception:
        logger.exception("Fatal error")
        return 1

    finally:
        if node_proc and node_proc.poll() is None:
            try:
                node_proc.terminate()
                node_proc.wait(timeout=3)
            except Exception:
                try:
                    node_proc.kill()
                except Exception:
                    pass


if __name__ == "__main__":
    raise SystemExit(main())

