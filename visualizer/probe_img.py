"""Diagnostic probe: send IMG LIVE\r\n on COM14 and dump raw response.

Goal: determine whether the firmware actually emits the 'FPST' magic, an
ASCII ERR line, or nothing at all when /api/img is requested. This bypasses
the FastAPI layer and the magic-finder so we see the wire as-is.

Usage:
    python probe_img.py                # uses COM14 by default
    python probe_img.py --port COM14   # explicit
"""

from __future__ import annotations

import argparse
import sys
import time

import serial


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", default="COM14")
    ap.add_argument("--baud", type=int, default=115200)
    ap.add_argument("--cmd", default="IMG LIVE",
                    help="command to send (default: IMG LIVE)")
    ap.add_argument("--read-secs", type=float, default=12.0,
                    help="read window in seconds")
    ap.add_argument("--max-bytes", type=int, default=400,
                    help="max bytes to display")
    args = ap.parse_args()

    print(f"opening {args.port} @ {args.baud}")
    ser = serial.Serial(args.port, args.baud, timeout=0.2)
    time.sleep(0.2)
    # Drain whatever boot/banner garbage is sitting in the OS buffer.
    ser.write(b"\r\n\r\n")
    time.sleep(0.2)
    ser.reset_input_buffer()

    payload = (args.cmd + "\r\n").encode("ascii")
    print(f"sending: {payload!r} (byte-by-byte 5 ms)")
    for byte in payload:
        ser.write(bytes([byte]))
        time.sleep(0.005)

    print("place finger NOW — reading for", args.read_secs, "seconds")
    deadline = time.time() + args.read_secs
    captured = bytearray()
    while time.time() < deadline and len(captured) < args.max_bytes:
        ser.timeout = 0.2
        chunk = ser.read(args.max_bytes - len(captured))
        if chunk:
            captured.extend(chunk)
            # Early exit if we already saw FPST magic
            if b"FPST" in captured:
                # keep reading a bit more so we see what follows the magic
                ser.timeout = 0.5
                more = ser.read(64)
                if more:
                    captured.extend(more)
                break

    ser.close()
    print()
    print(f"--- captured {len(captured)} bytes ---")
    print("repr:", repr(bytes(captured[:args.max_bytes])))
    print()
    print("--- hex dump ---")
    for i in range(0, len(captured), 16):
        chunk = captured[i:i + 16]
        hexs = " ".join(f"{b:02x}" for b in chunk)
        ascii_ = "".join(chr(b) if 0x20 <= b < 0x7f else "." for b in chunk)
        print(f"{i:04x}  {hexs:<48}  {ascii_}")

    print()
    if b"FPST" in captured:
        idx = captured.index(b"FPST")
        print(f"+++ 'FPST' magic found at offset {idx}")
        if idx + 11 <= len(captured):
            hdr = captured[idx + 4: idx + 11]
            ftype = hdr[0]
            length = int.from_bytes(hdr[1:5], "little")
            frame_id = int.from_bytes(hdr[5:7], "little")
            print(f"    type={ftype} length={length} frame_id={frame_id}")
    elif b"ERR " in captured:
        idx = captured.index(b"ERR ")
        end = captured.find(b"\r", idx)
        if end < 0:
            end = captured.find(b"\n", idx)
        if end < 0:
            end = len(captured)
        print(f"!!! ERR line: {bytes(captured[idx:end])!r}")
    elif not captured:
        print("??? no bytes received — firmware not responding "
              "(check flash, USART3 wiring PD8/PD9, COM14 vs COM12)")
    else:
        print("??? unrecognised response — neither FPST nor ERR")

    return 0


if __name__ == "__main__":
    sys.exit(main())
