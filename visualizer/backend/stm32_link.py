"""tools/visualizer/backend/stm32_link.py

Wrapper around the STM32 FPST serial protocol used by both the CLI
port_reader.py and the FastAPI backend. Holds a single serial handle
plus a thread lock so concurrent web requests don't interleave on the
single-conversation USART link.

Mirrors the cipher and frame layout in firmware Core/Src/main.c §T.
"""

from __future__ import annotations

import io
import struct
import threading
import time
from contextlib import contextmanager
from typing import Iterator, Optional

import serial


DEMO_KEY = b"FPSTBIOMETRICDEM"

TYPE_IMG_LIVE = 1
TYPE_TPL_SLOT = 2
TYPE_CHAR_LIVE = 3
TYPE_MATCH = 4

TYPE_NAMES = {1: "IMG_LIVE", 2: "TPL_SLOT", 3: "CHAR_LIVE", 4: "MATCH"}

# Hard cap on a single FPST frame's payload (security audit H1).
# The header carries a 32-bit length; without a sanity bound a buggy
# firmware or a hostile USB-TTL replacement could declare 0xFFFFFFFF
# and force the backend into a 4 GB allocation / read loop. The
# largest legitimate payload we ever produce is IMG_LIVE at 36864
# bytes (256x288 4-bit packed); 65536 leaves comfortable headroom
# for future template variants without ever approaching DoS territory.
FPST_MAX_PAYLOAD = 65536


def fpst_xor(buf: bytes, frame_id: int) -> bytes:
    """Symmetric demo cipher: matches firmware fpst_xor_byte() exactly."""
    out = bytearray(len(buf))
    for i, b in enumerate(buf):
        out[i] = b ^ DEMO_KEY[i & 0x0F] ^ ((frame_id + i) & 0xFF)
    return bytes(out)


def unpack_4bit_to_pixels(payload: bytes) -> bytes:
    """Expand 4-bit packed grayscale (256x288 image) to 8-bit pixels."""
    if len(payload) != 36864:
        raise ValueError(f"expected 36864 bytes, got {len(payload)}")
    pixels = bytearray()
    for b in payload:
        pixels.append(((b >> 4) & 0x0F) << 4)
        pixels.append((b & 0x0F) << 4)
    return bytes(pixels)


def to_pgm_bytes(payload: bytes) -> bytes:
    """Wrap unpacked pixels with a P5 PGM header (256x288, 255 maxval)."""
    pixels = unpack_4bit_to_pixels(payload)
    return b"P5\n256 288\n255\n" + pixels


def to_png_bytes(payload: bytes) -> bytes:
    """Encode the unpacked image as PNG. Requires Pillow."""
    try:
        from PIL import Image
    except ImportError as exc:
        raise RuntimeError("Pillow not installed; pip install Pillow") from exc
    pixels = unpack_4bit_to_pixels(payload)
    img = Image.frombytes("L", (256, 288), pixels)
    bio = io.BytesIO()
    img.save(bio, format="PNG")
    return bio.getvalue()


class STM32Link:
    """Thread-safe singleton-style wrapper around the FPST serial link."""

    def __init__(self, port: str, baud: int = 115200) -> None:
        self.port = port
        self.baud = baud
        self.ser: Optional[serial.Serial] = None
        self._lock = threading.Lock()

    # ---- connection management --------------------------------------

    def open(self) -> None:
        if self.ser is None or not self.ser.is_open:
            self.ser = serial.Serial(self.port, self.baud, timeout=1.0)
            time.sleep(0.2)
            # Boot banner + USB-TTL line settling can leave a garbage
            # byte in the STM32-side `s_usart3_cmd[]` accumulator. The
            # next real "PING\r\n" then appends to that junk and the
            # dispatcher answers `ERR unknown cmd`. Sending two empty
            # CR/LF lines first force-empties any partial command
            # (handle_byte() skips empty lines) and lets us drain the
            # error replies that result, leaving a clean slate.
            self._slow_write(b"\r\n\r\n")
            time.sleep(0.2)
            self.ser.reset_input_buffer()

    def reconnect(self, port: str, baud: int) -> None:
        """Tear down the current handle and reopen on the given port/baud.

        Acquires the same thread lock used by every command path so an
        in-flight serial transaction completes before we close. Raises
        serial.SerialException if the new handle can't open — caller
        should map that to an HTTP error and leave port/baud unchanged
        in that case (we revert the fields below, so a subsequent
        request still talks to the previous device).
        """
        with self._lock:
            old_port, old_baud = self.port, self.baud
            try:
                self.close()
                self.port = port
                self.baud = int(baud)
                self.open()
            except Exception:
                # Restore the old values so callers don't get stuck with
                # a half-applied state if open() fails on the new port.
                self.port = old_port
                self.baud = old_baud
                # Best-effort reopen on the old device so subsequent
                # requests don't all fail until the user retries.
                try:
                    self.open()
                except Exception:
                    pass
                raise

    def _slow_write(self, data: bytes, gap_s: float = 0.005) -> None:
        """Byte-by-byte write with a short gap so the STM32 FSM has
        time to drain its USART3 RX register between bytes.

        The F407 USART has only a 1-byte hardware FIFO and
        usart3_poll_rx() only runs once per FSM tick. With LCD render
        plus RTC reads in the same loop a tick can take longer than
        87 us (one byte time at 115200 baud), so back-to-back bytes
        overrun the register and the firmware sees something like
        'G\\r\\n' instead of 'PING\\r\\n' — the dispatcher then
        answers ERR unknown cmd. 5 ms per byte is conservative and
        could be tightened once an interrupt-driven RX ring buffer
        lands.
        """
        assert self.ser is not None
        for byte in data:
            self.ser.write(bytes([byte]))
            time.sleep(gap_s)

    def close(self) -> None:
        if self.ser is not None and self.ser.is_open:
            self.ser.close()

    @contextmanager
    def _claim(self) -> Iterator[serial.Serial]:
        with self._lock:
            self.open()
            assert self.ser is not None
            yield self.ser

    # ---- low-level reads --------------------------------------------

    def _read_exact(self, n: int, timeout: float) -> bytes:
        assert self.ser is not None
        end = time.time() + timeout
        buf = bytearray()
        while len(buf) < n:
            self.ser.timeout = max(0.05, end - time.time())
            chunk = self.ser.read(n - len(buf))
            if not chunk:
                if time.time() >= end:
                    raise TimeoutError(
                        f"timeout reading {n} bytes (got {len(buf)})")
                continue
            buf.extend(chunk)
        return bytes(buf)

    def _find_magic(self, timeout: float) -> None:
        """Skip bytes until the 4-byte 'FPST' magic is consumed.

        While searching, also watch for an ASCII `ERR ...\\r\\n` reply —
        the firmware emits these on bad commands or no-finger conditions
        (e.g. `ERR no finger gc=02`). Returning a raw "FPST magic not
        found" timeout in that case hides the real cause from the UI;
        instead we surface the ERR line so the FastAPI handler can map
        it to a clean 502 with the device's own error string.
        """
        assert self.ser is not None
        end = time.time() + timeout
        state = 0
        pat = b"FPST"
        line_buf = bytearray()
        while time.time() < end:
            self.ser.timeout = 0.1
            b = self.ser.read(1)
            if not b:
                continue
            c = b[0]

            # Accumulate plaintext line for ERR detection. CR/LF
            # terminates a line; if it starts with "ERR ", surface it.
            if c == 0x0D or c == 0x0A:
                if line_buf:
                    text = bytes(line_buf).decode("ascii", errors="replace")
                    if text.startswith("ERR "):
                        raise ValueError(f"firmware: {text}")
                    line_buf.clear()
            elif 0x20 <= c < 0x7F:
                if len(line_buf) < 64:
                    line_buf.append(c)
            else:
                # Non-printable byte; reset the accumulator so a real
                # FPST magic in binary stream doesn't get mistaken for
                # ASCII garbage.
                line_buf.clear()

            # FPST magic state machine
            if c == pat[state]:
                state += 1
                if state == 4:
                    return
            elif c == pat[0]:
                state = 1
            else:
                state = 0
        raise TimeoutError("FPST magic not found")

    def _read_frame(
        self, magic_timeout: float = 15.0, payload_timeout: float = 15.0
    ) -> tuple[int, int, bytes]:
        self._find_magic(magic_timeout)
        rest = self._read_exact(7, timeout=2.0)
        type_byte = rest[0]
        length = struct.unpack("<I", rest[1:5])[0]
        frame_id = struct.unpack("<H", rest[5:7])[0]
        # Reject obviously-bogus lengths before allocating / reading.
        # A spoofed header with length=0xFFFFFFFF would otherwise stall
        # the backend in a 4 GB read.
        if length > FPST_MAX_PAYLOAD:
            raise ValueError(
                f"FPST length {length} exceeds {FPST_MAX_PAYLOAD} "
                f"(frame_id={frame_id}, type=0x{type_byte:02X})")
        payload_enc = self._read_exact(length, timeout=payload_timeout)
        cksum_bytes = self._read_exact(2, timeout=2.0)
        expected = struct.unpack("<H", cksum_bytes)[0]
        actual = sum(payload_enc) & 0xFFFF
        if expected != actual:
            raise ValueError(
                f"FPST checksum mismatch (expected 0x{expected:04X}, "
                f"got 0x{actual:04X}, frame_id={frame_id})")
        payload = fpst_xor(payload_enc, frame_id)
        return type_byte, frame_id, payload

    # ---- public commands --------------------------------------------

    def ping(self) -> str:
        with self._claim() as ser:
            self._slow_write(b"PING\r\n")
            line = ser.readline().decode("ascii", errors="replace").strip()
        return line

    def stat(self) -> dict:
        with self._claim() as ser:
            self._slow_write(b"STAT\r\n")
            line = ser.readline().decode("ascii", errors="replace").strip()
        mask = 0
        sensor = 0
        for token in line.split():
            if token.startswith("mask="):
                try:
                    mask = int(token[5:], 16)
                except ValueError:
                    mask = 0
            elif token.startswith("sensor="):
                try:
                    sensor = int(token[7:])
                except ValueError:
                    sensor = 0
        slots = [i for i in range(1, 10) if mask & (1 << i)]
        return {"raw": line, "mask": mask, "sensor": sensor,
                "enrolled_slots": slots}

    def tpl(self, slot: int) -> dict:
        with self._claim() as ser:
            self._slow_write(f"TPL {slot}\r\n".encode("ascii"))
            type_byte, frame_id, payload = self._read_frame()
        if type_byte != TYPE_TPL_SLOT:
            raise ValueError(f"unexpected type 0x{type_byte:02X}")
        if not payload:
            raise ValueError("empty TPL payload")
        return {
            "type": TYPE_NAMES[type_byte],
            "frame_id": frame_id,
            "slot": payload[0],
            "len": len(payload) - 1,
            "hex": payload[1:].hex(),
        }

    def char_live(self) -> dict:
        with self._claim() as ser:
            self._slow_write(b"CHAR LIVE\r\n")
            type_byte, frame_id, payload = self._read_frame()
        if type_byte != TYPE_CHAR_LIVE:
            raise ValueError(f"unexpected type 0x{type_byte:02X}")
        return {
            "type": TYPE_NAMES[type_byte],
            "frame_id": frame_id,
            "len": len(payload),
            "hex": payload.hex(),
        }

    def img_live(self) -> dict:
        with self._claim() as ser:
            self._slow_write(b"IMG LIVE\r\n")
            type_byte, frame_id, payload = self._read_frame(
                magic_timeout=15.0, payload_timeout=15.0)
        if type_byte != TYPE_IMG_LIVE:
            raise ValueError(f"unexpected type 0x{type_byte:02X}")
        return {
            "type": TYPE_NAMES[type_byte],
            "frame_id": frame_id,
            "len": len(payload),
            "raw": payload,  # binary; caller serialises (PNG/PGM/base64)
        }

    def match(self, a: int, b: int) -> dict:
        if not (1 <= a <= 9 and 1 <= b <= 9):
            raise ValueError("slots must be 1..9")
        with self._claim() as ser:
            self._slow_write(f"MATCH {a} {b}\r\n".encode("ascii"))
            type_byte, frame_id, payload = self._read_frame()
        if type_byte != TYPE_MATCH:
            raise ValueError(f"unexpected type 0x{type_byte:02X}")
        if len(payload) != 5:
            raise ValueError(f"MATCH payload len {len(payload)}, expected 5")
        slot_a, slot_b, cc, score_hi, score_lo = payload
        score = (score_hi << 8) | score_lo
        return {
            "type": TYPE_NAMES[type_byte],
            "frame_id": frame_id,
            "slot_a": slot_a,
            "slot_b": slot_b,
            "cc": cc,
            "score": score,
            "match": (cc == 0),
        }
