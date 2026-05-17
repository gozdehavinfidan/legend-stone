# FPST·13 — Forensic Console

A web-based visualizer for an STM32F407 biometric door-lock firmware.
It hooks into a second UART on the microcontroller and surfaces
everything the **R307 fingerprint sensor** returns — raw image,
compressed minutiae template, on-chip match score — in a Material-Design
shell styled like a scientific instrument panel.

> Built for the EEE316 final project (a fully bare-metal CMSIS
> biometric door lock on the STM32F407G-DISC1). Useful as a reference
> for anyone integrating an AS608/R307-family fingerprint module with
> a microcontroller and wanting to actually *see* what the sensor is
> doing.

---

## Why this exists

The R307 is a closed-box module: it captures a fingerprint, runs a
proprietary minutiae algorithm internally on its own MCU, and only
exposes a handful of "yes/no + score" answers over its serial protocol.
That makes it easy to integrate into a door lock — and impossible to
demo visually. You press a finger, the door clicks, and nobody knows
what the sensor saw.

This console fills that gap. It re-encodes the chip's outputs (raw
36 KB image, characteristic file, match score, library mask) into
small **FPST frames**, ships them to the PC over a second UART, and
renders them in the browser:

- the **raw 256 × 288 grayscale image** the optical sensor captures
- the **compressed minutiae template** (256–768 bytes of opaque blob)
  drawn as a 32-column byte heatmap
- two stored templates compared side-by-side with a **per-byte XOR
  diff** so you can see *where* in the data they disagree
- the chip's match verdict (`cc==0x00`) + raw 16-bit similarity score

so a viewer (or a course examiner) can watch exactly what flows out of
the sensor at every step of an unlock. Built primarily for the project
demo; secondarily as a reusable diagnostic for the AS608/R307 family.

---

## Sensor

**R307 fingerprint module** (AS608 family) — the cheap-and-cheerful
optical fingerprint reader that ships on countless Aliexpress door-lock
kits.

| Spec                | Value                                       |
|---------------------|---------------------------------------------|
| Image resolution    | 256 × 288 px, 4-bit packed grayscale        |
| Image payload       | 36 864 bytes                                |
| Template (char-file)| 256–768 bytes (clone-variant dependent)     |
| Internal library    | 200 slots, on-chip flash, non-volatile      |
| Score range         | 16-bit field; algorithm output ≪ 65535      |
| Voltage             | 3.3 V or 5 V; UART is TTL 3.3 V             |
| Protocol            | 57 600 8-N-1, AS608 packet framing          |

The firmware drives the sensor via `USART2` at 57 600 baud; the
visualizer's data stream rides on a separate `USART3` (PD8/PD9) at
115 200 baud so the PC link can't disturb sensor traffic.

---

## Architecture

```
  R307 sensor                           USART2 @ 57 600 8N1
       │
       ▼
  STM32F407G-DISC1            ← Core/Src/main.c (bare-metal CMSIS)
       │
       ▼  USART3 @ 115 200 (PD8/PD9, ASCII commands + FPST frames)
       │
  USB-TTL adapter (CH340 / FT232 / CP210x)
       │
       ▼
  FastAPI backend             ← tools/visualizer/backend/
       │     pyserial · Pillow · FPST decoder
       ▼
  Material Web shell          ← tools/visualizer/frontend/
       │     vanilla JS, no build step, ESM CDN
       ▼
  your browser
```

The firmware is strictly **register-level CMSIS** (no HAL, no LL, no
CubeMX) — that's a hard course requirement for the door-lock project
itself. The visualizer side is allowed to use whatever Python / JS
libraries make the demo nice.

---

## Hardware

| Part                       | Used for                                                  |
|----------------------------|-----------------------------------------------------------|
| STM32F407G-DISC1           | Bare-metal target running the firmware                    |
| R307 fingerprint module    | Capture + on-chip matching                                |
| USB ↔ TTL adapter (3.3 V)  | Bridges USART3 to the PC over USB                         |
| 4×4 keypad, 16×2 LCD, …    | Used by the door-lock proper; not required for visualizer |

Pinout (visualizer-relevant only):

| STM32 pin   | Role                          | Connects to                 |
|-------------|-------------------------------|-----------------------------|
| `PA2`       | USART2 TX (sensor RX)         | R307 yellow wire            |
| `PA3`       | USART2 RX (sensor TX)         | R307 white wire             |
| `PD8`       | USART3 TX → PC                | USB-TTL adapter RX          |
| `PD9`       | USART3 RX ← PC                | USB-TTL adapter TX          |
| `GND`       | common ground                 | adapter GND + sensor GND    |
| `5V`        | sensor + adapter VCC          | from the discovery USB rail |

---

## Setup

```bash
git clone <this repo>
cd tools/visualizer
python -m venv .venv
.venv\Scripts\pip install -r backend/requirements.txt   # Windows
# or:  .venv/bin/pip install -r backend/requirements.txt   # Linux/macOS
```

Backend dependencies: `fastapi`, `uvicorn`, `pyserial`, `pillow`.
Frontend has **no build step** — Material Web Components are pulled
straight from `esm.run` via an `<script type="importmap">`.

---

## Running

1. **Flash** the firmware. From STM32CubeIDE: *Run → Debug* (or use
   `arm-none-eabi-gdb` + `openocd` if you prefer).
2. **Plug in** the USB-TTL adapter. Note the COM port it enumerates as
   (Windows: Device Manager → Ports; Linux: `dmesg | tail`).
3. **Start the backend**:

   ```bash
   cd tools/visualizer/backend
   ../.venv/Scripts/python -m uvicorn main:app --port 8000
   ```

   Override the default port up front with `STM32_PORT=COM13` (or
   `/dev/ttyUSB0`). Once you've connected once via the UI, the backend
   persists the choice to `backend/.port.json` so subsequent launches
   pick up the same port without env vars.

4. **Open** the URL uvicorn prints on startup (port `8000` by default)
   in your browser. The shell handshakes with the firmware on its own;
   click the connection pill in the topbar to switch ports without
   restarting the backend.

---

## What the UI shows

| Card                            | Lives off                  | What you see                                                                                                |
|---------------------------------|----------------------------|-------------------------------------------------------------------------------------------------------------|
| **Sensor / Library**            | `PING` + `STAT`            | sensor presence, enrolled-slot bitmap, per-slot chips                                                       |
| **Live Image Capture**          | `IMG LIVE`                 | the 36 KB raw fingerprint image decoded to PNG and rendered with crosshair corners                          |
| **Templates & Characteristics** | `TPL <slot>` / `CHAR LIVE` | hex grid + 32-column byte heatmap + density stats (`len, non-zero %, unique-values`)                        |
| **Match two slots**             | `MATCH a b`                | verdict (`cc=0x00 / 0x08`), big numeric score, 4-band confidence meter, slot A / slot B / XOR-diff heatmaps |

Plus a topbar **theme toggle** (dark instrument panel ↔ light blueprint
paper) and a **port configurator dialog** that lists all serial ports
visible to the OS and lets you reconnect on the fly.

---

## Notes & limits (honest)

- **Demo cipher.** Frames going over USART3 are XOR-obfuscated with a
  16-byte rotating key — it dodges casual sniffing on a USB-TTL line
  and nothing more. *Don't ship this layer to production.*
- **Match score is opaque.** The protocol field is 16-bit (`0..65535`)
  but the R307's matcher in practice produces small numbers; the bands
  in the UI are observation-based buckets, not a chip-published spec.
  The chip's own threshold is closed-source — the verdict (`cc==0x00`)
  is the only authoritative output, the score is informational.
- **Templates are opaque blobs.** R307 doesn't document its internal
  minutiae format; the byte heatmap shows density and zero-padding,
  *not* actual feature points.
- **Bare-metal firmware constraint.** The door-lock firmware is hand-
  written CMSIS — no HAL, no LL, no CubeMX, no FreeRTOS. That's a
  course rule. The visualizer side ignores that rule and uses
  whatever stack made sense.

---

## Repository layout

```
tools/visualizer/
├── README.md             ← this file
├── backend/
│   ├── main.py           ← FastAPI app, endpoints, port persistence
│   ├── stm32_link.py     ← STM32 serial protocol wrapper + FPST decoder
│   └── requirements.txt
├── frontend/
│   ├── index.html        ← single-page Material Web shell
│   ├── style.css         ← palette + layout (Fraunces / Geist / JetBrains Mono)
│   └── app.js            ← all UI logic, no build step
├── port_reader.py        ← CLI alternative to the web UI
├── probe_img.py          ← diagnostic raw-byte probe
└── tests/
    └── test_smoke.py     ← Playwright smoke tests
```

The firmware that this console talks to lives at `Core/Src/main.c` in
the parent project — a single ~3 000-line bare-metal source covering
clock init, USART2/3, SPI2 (SD card), I²C1 (LCD), DS1302 RTC, R307
sensor protocol, FAT32 logging, keypad, FSM, and FPST framing.

---

## Acknowledgements

- **R307 / AS608** — protocol dissected from the public AS608 datasheet
  + Adafruit's Arduino library + a lot of forum reverse engineering.
- **Material Web Components** — the official MD3 implementation from
  Google, pulled from the `esm.run` CDN with no build tooling.
- **Fraunces** (Undercase Type) and **Geist** (Vercel) — the two
  display / UI typefaces that make the shell feel like an instrument
  rather than a generic dashboard.

Course-project artefact, no formal licence — re-use the firmware idiom
or the visualizer code freely for educational purposes; production use
of the demo cipher is expressly not advised.
