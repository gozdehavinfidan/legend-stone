#!/usr/bin/env python3
"""
tools/visualizer/port_reader.py — STM32 ↔ PC bridge for FPST encrypted frames.

P17 (Phase 10E) per plan §15.3. Minimal CLI that:
  1. Opens the USB-TTL serial link at 115200 8N1 (USART3 PD8/PD9 on STM32).
  2. Sends a command (PING / STAT / TPL / CHAR / IMG / MATCH).
  3. Reads the response — ASCII for control plane (PING/STAT), or an
     FPST encrypted frame for the data plane (TPL/CHAR/IMG/MATCH).
  4. Decrypts FPST payloads using the firmware's rotating XOR demo cipher
     (matches Core/Src/main.c §T fpst_xor_byte). Emits a hex preview, an
     optional raw save, and (for IMG_LIVE) a PGM grayscale conversion.

Requires:  pyserial   (pip install pyserial)

DEMO ONLY. The 16-byte rotating key is hardcoded ("FPSTBIOMETRICDEM"); a
production deployment would derive it from a secure source and swap the
XOR primitive for AES-128-CBC. See COLLAB_BOARD.md TURN-I38 / plan §15.3.

Usage:
    python port_reader.py --port COM3 ping
    python port_reader.py --port COM3 stat
    python port_reader.py --port COM3 tpl 1 --out slot1.bin
    python port_reader.py --port COM3 char --out char.bin
    python port_reader.py --port COM3 img  --out fp.raw
    python port_reader.py --port COM3 match 1 2
"""

import argparse
import struct
import sys
import time

try:
    import serial
except ImportError:
    print("ERROR: pyserial not installed. Run: pip install pyserial", file=sys.stderr)
    sys.exit(1)


DEMO_KEY = b"FPSTBIOMETRICDEM"

TYPE_IMG_LIVE  = 1
TYPE_TPL_SLOT  = 2
TYPE_CHAR_LIVE = 3
TYPE_MATCH     = 4

TYPE_NAMES = {
    1: "IMG_LIVE",
    2: "TPL_SLOT",
    3: "CHAR_LIVE",
    4: "MATCH",
}


# -------------------------------------------------------------------------
# Cipher
# -------------------------------------------------------------------------

def fpst_xor(buf, frame_id):
    """Decrypt (or encrypt — symmetric) buf with the firmware's rotating
    XOR demo cipher. Mirror of fpst_xor_byte() in Core/Src/main.c §T."""
    out = bytearray(len(buf))
    for i, b in enumerate(buf):
        out[i] = b ^ DEMO_KEY[i & 0x0F] ^ ((frame_id + i) & 0xFF)
    return bytes(out)


# -------------------------------------------------------------------------
# Wire reader
# -------------------------------------------------------------------------

def read_exact(ser, n, timeout=10.0):
    """Read exactly n bytes from the serial port or raise TimeoutError.
    Loops over partial reads since pyserial.read() may return short."""
    end = time.time() + timeout
    buf = bytearray()
    while len(buf) < n:
        ser.timeout = max(0.05, end - time.time())
        chunk = ser.read(n - len(buf))
        if not chunk:
            if time.time() >= end:
                raise TimeoutError(
                    f"timeout reading {n} bytes (got {len(buf)})")
            continue
        buf.extend(chunk)
    return bytes(buf)


def find_fpst_magic(ser, timeout=15.0):
    """Skip bytes until the 4-byte 'FPST' magic is consumed."""
    end = time.time() + timeout
    state = 0
    pattern = b"FPST"
    while time.time() < end:
        ser.timeout = 0.1
        b = ser.read(1)
        if not b:
            continue
        c = b[0]
        if c == pattern[state]:
            state += 1
            if state == 4:
                return
        elif c == pattern[0]:
            state = 1
        else:
            state = 0
    raise TimeoutError("FPST magic not found within timeout")


def read_frame(ser, magic_timeout=15.0, payload_timeout=15.0):
    """Read one full FPST frame, decrypt, and return
    (type, frame_id, plaintext_payload). Raises on transport/decode errors.

    Frame layout (matches firmware Core/Src/main.c §T):
        4 magic 'FPST' (consumed by find_fpst_magic)
        1 type
        4 length (LE32)
        2 frame_id (LE16)
        N encrypted payload
        2 checksum (LE16, sum of encrypted payload bytes mod 65536)
    """
    find_fpst_magic(ser, timeout=magic_timeout)
    rest = read_exact(ser, 7, timeout=2.0)
    type_byte = rest[0]
    length = struct.unpack("<I", rest[1:5])[0]
    frame_id = struct.unpack("<H", rest[5:7])[0]

    payload_enc = read_exact(ser, length, timeout=payload_timeout)
    cksum_bytes = read_exact(ser, 2, timeout=2.0)
    expected = struct.unpack("<H", cksum_bytes)[0]
    actual = sum(payload_enc) & 0xFFFF
    if expected != actual:
        # TURN-I40 codex BLOCKER fix: hard-fail on checksum mismatch.
        # Letting corrupt bytes through silently saves bogus biometric
        # data to disk, exactly the failure mode the cksum is meant
        # to catch.
        raise ValueError(
            f"FPST checksum mismatch (expected 0x{expected:04X}, "
            f"got 0x{actual:04X}, frame_id={frame_id})")
    payload = fpst_xor(payload_enc, frame_id)
    return type_byte, frame_id, payload


# -------------------------------------------------------------------------
# Sub-commands
# -------------------------------------------------------------------------

def cmd_ping(ser):
    ser.write(b"PING\r\n")
    line = ser.readline().decode("ascii", errors="replace").strip()
    print(f"PING -> {line!r}")


def cmd_stat(ser):
    ser.write(b"STAT\r\n")
    line = ser.readline().decode("ascii", errors="replace").strip()
    print(f"STAT -> {line!r}")


def cmd_tpl(ser, slot, out_path=None):
    ser.write(f"TPL {slot}\r\n".encode("ascii"))
    type_byte, frame_id, payload = read_frame(ser)
    print(f"frame: type={TYPE_NAMES.get(type_byte)} frame_id={frame_id} "
          f"payload_len={len(payload)}")
    if type_byte != TYPE_TPL_SLOT:
        raise ValueError(f"unexpected type 0x{type_byte:02X} "
                         f"(expected TPL_SLOT)")
    if len(payload) < 1:
        # TURN-I40 codex robustness: guard against empty payload before
        # indexing payload[0] for the slot id.
        raise ValueError("empty TPL payload")
    slot_id = payload[0]
    template = payload[1:]
    print(f"  slot={slot_id} template_len={len(template)}")
    print(f"  hex[0:32]: {template[:32].hex()}")
    if out_path:
        with open(out_path, "wb") as f:
            f.write(template)
        print(f"  saved -> {out_path}")


def cmd_char(ser, out_path=None):
    print("CHAR LIVE -> place finger on sensor, then press ENTER...")
    input()
    ser.write(b"CHAR LIVE\r\n")
    type_byte, frame_id, payload = read_frame(ser)
    print(f"frame: type={TYPE_NAMES.get(type_byte)} frame_id={frame_id} "
          f"payload_len={len(payload)}")
    if type_byte != TYPE_CHAR_LIVE:
        # TURN-I40 codex BLOCKER fix: validate frame type before saving.
        raise ValueError(f"unexpected type 0x{type_byte:02X} "
                         f"(expected CHAR_LIVE)")
    print(f"  hex[0:32]: {payload[:32].hex()}")
    if out_path:
        with open(out_path, "wb") as f:
            f.write(payload)
        print(f"  saved -> {out_path}")


def unpack_4bit_to_pgm(payload, out_path):
    """The R307 image is 256x288 pixels packed as 4-bit per pixel, two
    pixels per byte (high nibble = left, low nibble = right). Total
    payload = 256 * 288 / 2 = 36864 bytes. We expand to 8-bit PGM by
    shifting each nibble left by 4 (so 0..15 maps to 0..240)."""
    if len(payload) != 36864:
        raise ValueError(f"expected 36864 bytes, got {len(payload)}")
    pixels = bytearray()
    for b in payload:
        pixels.append(((b >> 4) & 0x0F) << 4)
        pixels.append((b & 0x0F) << 4)
    with open(out_path, "wb") as f:
        f.write(b"P5\n256 288\n255\n")
        f.write(pixels)


def cmd_img(ser, out_path):
    print("IMG LIVE -> place finger on sensor, then press ENTER...")
    input()
    ser.write(b"IMG LIVE\r\n")
    # Image transfer needs longer payload timeout: 36864 B at 115200 baud
    # is ~3.2 s of pure UART time + chip-side scan time before stream.
    type_byte, frame_id, payload = read_frame(
        ser, magic_timeout=15.0, payload_timeout=15.0)
    print(f"frame: type={TYPE_NAMES.get(type_byte)} frame_id={frame_id} "
          f"payload_len={len(payload)}")
    if type_byte != TYPE_IMG_LIVE:
        raise ValueError(f"unexpected type 0x{type_byte:02X} "
                         f"(expected IMG_LIVE)")
    with open(out_path, "wb") as f:
        f.write(payload)
    print(f"  saved raw 4-bit packed -> {out_path}")
    pgm_path = out_path.rsplit(".", 1)[0] + ".pgm"
    try:
        unpack_4bit_to_pgm(payload, pgm_path)
        print(f"  unpacked PGM (256x288 8-bit grayscale) -> {pgm_path}")
    except Exception as e:
        print(f"  PGM unpack skipped: {e}", file=sys.stderr)


def cmd_match(ser, a, b):
    ser.write(f"MATCH {a} {b}\r\n".encode("ascii"))
    type_byte, frame_id, payload = read_frame(ser)
    print(f"frame: type={TYPE_NAMES.get(type_byte)} frame_id={frame_id} "
          f"payload_len={len(payload)}")
    if type_byte != TYPE_MATCH:
        raise ValueError(f"unexpected type 0x{type_byte:02X} "
                         f"(expected MATCH)")
    if len(payload) != 5:
        raise ValueError(f"MATCH payload length {len(payload)}, expected 5")
    slot_a, slot_b, cc, score_hi, score_lo = payload
    score = (score_hi << 8) | score_lo
    verdict = "MATCH" if cc == 0x00 else f"MISMATCH (cc=0x{cc:02X})"
    print(f"  slot_a={slot_a} slot_b={slot_b} cc=0x{cc:02X} "
          f"score={score} -> {verdict}")


# -------------------------------------------------------------------------
# Entry point
# -------------------------------------------------------------------------

def main():
    ap = argparse.ArgumentParser(description="STM32 FPST port reader")
    ap.add_argument("--port", required=True,
                    help="Serial port (e.g. COM3 on Windows, /dev/ttyUSB0 on Linux)")
    ap.add_argument("--baud", type=int, default=115200)
    sub = ap.add_subparsers(dest="cmd", required=True)

    sub.add_parser("ping", help="send PING, expect PONG")
    sub.add_parser("stat", help="send STAT, expect mask + sensor")

    p_tpl = sub.add_parser("tpl", help="upload library template by slot id")
    p_tpl.add_argument("slot", type=int)
    p_tpl.add_argument("--out", default=None, help="optional binary save path")

    p_char = sub.add_parser("char", help="capture characteristic file (live finger)")
    p_char.add_argument("--out", default=None)

    p_img = sub.add_parser("img", help="capture raw image (live finger), saves .raw + .pgm")
    p_img.add_argument("--out", default="img.raw")

    p_match = sub.add_parser("match", help="match slot a vs slot b")
    p_match.add_argument("a", type=int)
    p_match.add_argument("b", type=int)

    args = ap.parse_args()

    # TURN-I40 codex robustness: catch transport / decode failures at the
    # top level so the operator sees a clean ERROR line instead of a
    # Python traceback, and the process exits nonzero so shell pipelines
    # detect the failure.
    try:
        with serial.Serial(args.port, args.baud, timeout=1.0) as ser:
            # Drain anything pending (boot banner, leftover bytes from prior session)
            time.sleep(0.2)
            ser.reset_input_buffer()

            if args.cmd == "ping":
                cmd_ping(ser)
            elif args.cmd == "stat":
                cmd_stat(ser)
            elif args.cmd == "tpl":
                cmd_tpl(ser, args.slot, args.out)
            elif args.cmd == "char":
                cmd_char(ser, args.out)
            elif args.cmd == "img":
                cmd_img(ser, args.out)
            elif args.cmd == "match":
                cmd_match(ser, args.a, args.b)
    except (TimeoutError, ValueError, serial.SerialException) as e:
        print(f"ERROR: {type(e).__name__}: {e}", file=sys.stderr)
        sys.exit(2)


if __name__ == "__main__":
    main()
