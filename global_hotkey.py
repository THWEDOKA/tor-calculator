from __future__ import annotations

import ctypes
import logging
import os
import threading
import time
from collections.abc import Callable
from typing import Optional


HOTKEY_CHOICES = {
    "backslash": 0xDC,
    "f1": 0x70,
    "f2": 0x71,
    "f3": 0x72,
    "f4": 0x73,
    "f5": 0x74,
    "f6": 0x75,
    "f7": 0x76,
    "f8": 0x77,
    "f9": 0x78,
    "f10": 0x79,
    "f11": 0x7A,
    "f12": 0x7B,
    "insert": 0x2D,
    "home": 0x24,
    "end": 0x23,
    "page-up": 0x21,
    "page-down": 0x22,
    "pause": 0x13,
    "scroll-lock": 0x91,
}
DEFAULT_HOTKEY_KEY = "backslash"
DEFAULT_HOTKEY_PRESS_COUNT = 2
HOTKEY_SEQUENCE_TIMEOUT_SECONDS = 0.65
MIN_HOTKEY_PRESS_COUNT = 1
MAX_HOTKEY_PRESS_COUNT = 5


def normalize_hotkey_config(key: object, press_count: object) -> tuple[str, int]:
    normalized_key = str(key or "").strip().lower()
    if normalized_key not in HOTKEY_CHOICES:
        normalized_key = DEFAULT_HOTKEY_KEY

    try:
        normalized_count = int(press_count)
    except (TypeError, ValueError):
        normalized_count = DEFAULT_HOTKEY_PRESS_COUNT
    normalized_count = max(
        MIN_HOTKEY_PRESS_COUNT,
        min(MAX_HOTKEY_PRESS_COUNT, normalized_count),
    )
    return normalized_key, normalized_count


class GlobalHotkeyListener:
    """Observe a configurable global key sequence without consuming its input."""

    def __init__(
        self,
        logger: logging.Logger,
        on_trigger: Callable[[], None],
        *,
        key: str = DEFAULT_HOTKEY_KEY,
        press_count: int = DEFAULT_HOTKEY_PRESS_COUNT,
        sequence_timeout: float = HOTKEY_SEQUENCE_TIMEOUT_SECONDS,
    ):
        self._logger = logger
        self._on_trigger = on_trigger
        self._sequence_timeout = max(0.2, float(sequence_timeout))
        self._lock = threading.Lock()
        self._thread: Optional[threading.Thread] = None
        self._thread_id: Optional[int] = None
        self._ready = threading.Event()
        self._stop_requested = threading.Event()
        self._hook = None
        self._hook_callback = None
        self._pressed_keys: set[int] = set()
        self._sequence_count = 0
        self._last_matching_press = 0.0
        self._key, self._press_count = normalize_hotkey_config(key, press_count)

    @property
    def supported(self) -> bool:
        return os.name == "nt"

    @property
    def running(self) -> bool:
        return bool(self._thread and self._thread.is_alive() and self._hook)

    def config(self) -> tuple[str, int]:
        with self._lock:
            return self._key, self._press_count

    def update(self, key: str, press_count: int) -> tuple[str, int]:
        normalized_key, normalized_count = normalize_hotkey_config(key, press_count)
        with self._lock:
            self._key = normalized_key
            self._press_count = normalized_count
            self._sequence_count = 0
            self._last_matching_press = 0.0
            self._pressed_keys.clear()
        self._logger.info(
            "Global hotkey updated: key=%s presses=%d",
            normalized_key,
            normalized_count,
        )
        return normalized_key, normalized_count

    def start(self) -> bool:
        if not self.supported:
            self._logger.info("Global hotkey is only available on Windows")
            return False
        if self._thread and self._thread.is_alive():
            return self.running

        self._ready.clear()
        self._stop_requested.clear()
        self._thread = threading.Thread(
            target=self._run_windows_hook,
            name="global-hotkey-listener",
            daemon=True,
        )
        self._thread.start()
        self._ready.wait(timeout=2.0)
        return self.running

    def stop(self) -> None:
        self._stop_requested.set()
        thread_id = self._thread_id
        if os.name == "nt" and thread_id:
            try:
                ctypes.windll.user32.PostThreadMessageW(thread_id, 0x0012, 0, 0)
            except Exception:
                self._logger.debug("Could not stop global hotkey message loop", exc_info=True)
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=2.0)
        self._thread = None
        self._thread_id = None
        self._hook = None
        self._hook_callback = None

    def process_key_event(
        self,
        virtual_key: int,
        is_down: bool,
        *,
        event_time: Optional[float] = None,
    ) -> bool:
        """Process one keyboard event. Public for deterministic sequence tests."""
        trigger = False
        now = time.monotonic() if event_time is None else float(event_time)

        with self._lock:
            if not is_down:
                self._pressed_keys.discard(int(virtual_key))
                return False

            virtual_key = int(virtual_key)
            if virtual_key in self._pressed_keys:
                return False
            self._pressed_keys.add(virtual_key)

            expected_key = HOTKEY_CHOICES[self._key]
            if virtual_key != expected_key:
                self._sequence_count = 0
                self._last_matching_press = 0.0
                return False

            if now - self._last_matching_press > self._sequence_timeout:
                self._sequence_count = 0
            self._sequence_count += 1
            self._last_matching_press = now

            if self._sequence_count >= self._press_count:
                self._sequence_count = 0
                self._last_matching_press = 0.0
                trigger = True

        if trigger:
            threading.Thread(
                target=self._trigger_safely,
                name="global-hotkey-trigger",
                daemon=True,
            ).start()
        return trigger

    def _trigger_safely(self) -> None:
        try:
            self._on_trigger()
        except Exception:
            self._logger.exception("Global hotkey callback failed")

    def _run_windows_hook(self) -> None:
        if os.name != "nt":
            self._ready.set()
            return

        user32 = ctypes.windll.user32
        kernel32 = ctypes.windll.kernel32
        wh_keyboard_ll = 13
        wm_keydown = 0x0100
        wm_keyup = 0x0101
        wm_syskeydown = 0x0104
        wm_syskeyup = 0x0105

        class KeyboardEvent(ctypes.Structure):
            _fields_ = [
                ("vkCode", ctypes.c_uint32),
                ("scanCode", ctypes.c_uint32),
                ("flags", ctypes.c_uint32),
                ("time", ctypes.c_uint32),
                ("dwExtraInfo", ctypes.c_size_t),
            ]

        class Message(ctypes.Structure):
            _fields_ = [
                ("hwnd", ctypes.c_void_p),
                ("message", ctypes.c_uint32),
                ("wParam", ctypes.c_size_t),
                ("lParam", ctypes.c_ssize_t),
                ("time", ctypes.c_uint32),
                ("pt_x", ctypes.c_long),
                ("pt_y", ctypes.c_long),
                ("lPrivate", ctypes.c_uint32),
            ]

        hook_proc_type = ctypes.WINFUNCTYPE(
            ctypes.c_ssize_t,
            ctypes.c_int,
            ctypes.c_size_t,
            ctypes.c_ssize_t,
        )

        user32.SetWindowsHookExW.argtypes = [
            ctypes.c_int,
            hook_proc_type,
            ctypes.c_void_p,
            ctypes.c_uint32,
        ]
        user32.SetWindowsHookExW.restype = ctypes.c_void_p
        user32.CallNextHookEx.argtypes = [
            ctypes.c_void_p,
            ctypes.c_int,
            ctypes.c_size_t,
            ctypes.c_ssize_t,
        ]
        user32.CallNextHookEx.restype = ctypes.c_ssize_t
        user32.GetMessageW.argtypes = [
            ctypes.POINTER(Message),
            ctypes.c_void_p,
            ctypes.c_uint32,
            ctypes.c_uint32,
        ]
        user32.GetMessageW.restype = ctypes.c_int
        user32.TranslateMessage.argtypes = [ctypes.POINTER(Message)]
        user32.TranslateMessage.restype = ctypes.c_int
        user32.DispatchMessageW.argtypes = [ctypes.POINTER(Message)]
        user32.DispatchMessageW.restype = ctypes.c_ssize_t
        user32.UnhookWindowsHookEx.argtypes = [ctypes.c_void_p]
        user32.UnhookWindowsHookEx.restype = ctypes.c_int
        kernel32.GetCurrentThreadId.argtypes = []
        kernel32.GetCurrentThreadId.restype = ctypes.c_uint32
        kernel32.GetModuleHandleW.argtypes = [ctypes.c_wchar_p]
        kernel32.GetModuleHandleW.restype = ctypes.c_void_p
        kernel32.GetLastError.argtypes = []
        kernel32.GetLastError.restype = ctypes.c_uint32

        @hook_proc_type
        def hook_callback(code: int, w_param: int, l_param: int) -> int:
            if code >= 0:
                event = ctypes.cast(
                    l_param,
                    ctypes.POINTER(KeyboardEvent),
                ).contents
                if w_param in (wm_keydown, wm_syskeydown):
                    self.process_key_event(event.vkCode, True)
                elif w_param in (wm_keyup, wm_syskeyup):
                    self.process_key_event(event.vkCode, False)
            return user32.CallNextHookEx(self._hook, code, w_param, l_param)

        self._thread_id = int(kernel32.GetCurrentThreadId())
        self._hook_callback = hook_callback
        module_handle = kernel32.GetModuleHandleW(None)
        self._hook = user32.SetWindowsHookExW(
            wh_keyboard_ll,
            hook_callback,
            module_handle,
            0,
        )
        if not self._hook:
            error_code = int(kernel32.GetLastError())
            self._logger.error("Could not install global keyboard hook: %d", error_code)
            self._ready.set()
            return

        self._logger.info("Global keyboard hook installed")
        self._ready.set()
        message = Message()
        try:
            while not self._stop_requested.is_set():
                result = user32.GetMessageW(ctypes.byref(message), None, 0, 0)
                if result <= 0:
                    break
                user32.TranslateMessage(ctypes.byref(message))
                user32.DispatchMessageW(ctypes.byref(message))
        finally:
            if self._hook:
                user32.UnhookWindowsHookEx(self._hook)
            self._hook = None
            self._logger.info("Global keyboard hook stopped")
