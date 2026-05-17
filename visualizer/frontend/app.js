// tools/visualizer/frontend/app.js
//
// P20 (Phase 10H): single-page Material Design 3 frontend for the
// STM32 FPST visualizer. Vanilla ES module, no build step. Talks to
// the FastAPI backend (P19) via fetch.

const $ = (sel) => document.querySelector(sel);

// -------------------------------------------------------------------
// Tiny snackbar wrapper. Material Web doesn't ship a snackbar (yet),
// so we paint a minimal one ourselves.
// -------------------------------------------------------------------

function toast(msg, kind = 'info') {
  let bar = document.getElementById('toast-bar');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'toast-bar';
    Object.assign(bar.style, {
      position: 'fixed',
      bottom: '24px',
      left: '50%',
      transform: 'translateX(-50%)',
      background: 'var(--md-sys-color-on-surface)',
      color: 'var(--md-sys-color-surface)',
      padding: '12px 20px',
      borderRadius: '8px',
      fontSize: '14px',
      maxWidth: '90vw',
      boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
      zIndex: '9999',
      opacity: '0',
      transition: 'opacity 200ms cubic-bezier(0.2, 0, 0, 1)',
    });
    document.body.appendChild(bar);
  }
  bar.textContent = msg;
  bar.style.background = kind === 'error'
    ? 'var(--md-sys-color-error)'
    : 'var(--md-sys-color-on-surface)';
  bar.style.opacity = '1';
  clearTimeout(bar._timeout);
  bar._timeout = setTimeout(() => { bar.style.opacity = '0'; }, 3500);
}

// -------------------------------------------------------------------
// API helpers
// -------------------------------------------------------------------

async function api(path, opts = {}) {
  const res = await fetch(path, opts);
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      if (body && body.detail) detail = body.detail;
    } catch { /* swallow */ }
    throw new Error(`${res.status}: ${detail}`);
  }
  return res;
}

async function apiJson(path, opts = {}) {
  const res = await api(path, opts);
  return res.json();
}

// -------------------------------------------------------------------
// Health pill
// -------------------------------------------------------------------

async function refreshHealth() {
  const pill = $('#health-pill');
  const dot = pill.querySelector('.dot');
  const text = $('#health-text');
  dot.className = 'dot dot-loading';
  text.textContent = 'connecting…';
  try {
    const data = await apiJson('/api/health');
    dot.className = 'dot dot-ok';
    text.textContent = `${data.port} @ ${data.baud}`;
  } catch (err) {
    dot.className = 'dot dot-fail';
    text.textContent = 'disconnected';
  }
}

// -------------------------------------------------------------------
// Status card
// -------------------------------------------------------------------

async function refreshStatus() {
  try {
    const data = await apiJson('/api/stat');
    $('#sensor-value').textContent = data.sensor === 1 ? 'Connected' : 'Missing';
    $('#mask-value').textContent = `0x${data.mask.toString(16).toUpperCase().padStart(4, '0')}`;
    const chips = $('#slots-chips');
    chips.innerHTML = '';
    if (!data.enrolled_slots.length) {
      const empty = document.createElement('span');
      empty.className = 'chip';
      empty.style.background = 'var(--md-sys-color-surface-container-high)';
      empty.style.color = 'var(--md-sys-color-on-surface-variant)';
      empty.textContent = 'none';
      chips.appendChild(empty);
    } else {
      for (const slot of data.enrolled_slots) {
        const chip = document.createElement('span');
        chip.className = 'chip';
        chip.textContent = `Slot ${slot}`;
        chip.style.animationDelay = `${slot * 30}ms`;
        chips.appendChild(chip);
      }
    }
  } catch (err) {
    toast(`STAT failed: ${err.message}`, 'error');
  }
}

// -------------------------------------------------------------------
// Image capture
// -------------------------------------------------------------------

let lastImgUrl = null;

async function captureImage() {
  const overlay = $('#image-overlay');
  const img = $('#captured-img');
  const btnCap = $('#btn-capture-img');
  const btnDl = $('#btn-download-img');

  // The R307's GenImg call only waits ~500 ms for a finger before it
  // returns NO_FINGER. Asking the user to "place finger now" *after*
  // pressing Capture is racy. Instead: ask first, give them a 1.5 s
  // window to put the finger down, then issue the request.
  if (!confirm('Place your finger on the R307 sensor, then click OK to capture.')) {
    return;
  }
  toast('Hold finger steady…');
  overlay.hidden = false;
  btnCap.disabled = true;
  await new Promise(r => setTimeout(r, 400));      // brief settle
  try {
    const res = await api('/api/img', { method: 'POST' });
    const blob = await res.blob();
    if (lastImgUrl) URL.revokeObjectURL(lastImgUrl);
    lastImgUrl = URL.createObjectURL(blob);
    img.src = lastImgUrl;
    img.classList.add('loaded');
    $('#img-frame').textContent = res.headers.get('X-Frame-Id') || '—';
    $('#img-len').textContent = res.headers.get('X-Payload-Len') || '—';
    btnDl.disabled = false;
    toast('Image captured');
  } catch (err) {
    toast(`Image capture failed: ${err.message}`, 'error');
  } finally {
    overlay.hidden = true;
    btnCap.disabled = false;
  }
}

function downloadImage() {
  if (!lastImgUrl) return;
  const a = document.createElement('a');
  a.href = lastImgUrl;
  a.download = `fp_${Date.now()}.png`;
  a.click();
}

// -------------------------------------------------------------------
// Templates / Char Live
// -------------------------------------------------------------------

function renderHex(hex) {
  // Group every 2 hex chars (= 1 byte) and wrap every 16 bytes (32 chars
  // + 15 spaces) so the grid is readable.
  const bytes = [];
  for (let i = 0; i < hex.length; i += 2) bytes.push(hex.substr(i, 2));
  const lines = [];
  for (let i = 0; i < bytes.length; i += 16) {
    const offset = i.toString(16).padStart(4, '0');
    lines.push(`${offset}  ${bytes.slice(i, i + 16).join(' ')}`);
  }
  return lines.join('\n');
}

// Convert a hex string to a Uint8Array. Used by the heatmap and stats
// helpers below — the API returns bytes as a hex string (small wire
// format, no base64 padding noise) and we only need to parse it once.
function hexToBytes(hex) {
  const n = (hex.length >> 1);
  const out = new Uint8Array(n);
  for (let i = 0; i < n; ++i) out[i] = parseInt(hex.substr(i << 1, 2), 16);
  return out;
}

// Pull the active MD3 primary token from the current theme so the
// heatmap colours match the rest of the UI (and update automatically
// when the user toggles dark/light).
function readPrimaryRGB() {
  const css = getComputedStyle(document.documentElement)
    .getPropertyValue('--md-sys-color-primary').trim();
  // accepts #rgb / #rrggbb only — the theme tokens never use rgb()/hsl()
  if (css.startsWith('#')) {
    const hex = css.length === 4
      ? css.slice(1).split('').map(c => c + c).join('')
      : css.slice(1);
    return [
      parseInt(hex.substr(0, 2), 16),
      parseInt(hex.substr(2, 2), 16),
      parseInt(hex.substr(4, 2), 16),
    ];
  }
  return [0x00, 0x69, 0x6b]; // light-mode primary fallback
}

// Paint a 32-column heatmap of `bytes` onto `canvas`. Each cell is one
// byte, coloured by value (0 = surface-container, 255 = primary). Rows
// are sized to fit the canvas height; payload sizes 256/512/768 give
// 8/16/24 rows respectively. Returns the row count for stats display.
function drawHeatmap(canvas, bytes) {
  if (!canvas) return 0;
  const cols = 32;
  const rows = Math.max(1, Math.ceil(bytes.length / cols));
  // Match the canvas' internal pixel resolution to the byte grid so the
  // browser handles the upscaling (with image-rendering: pixelated each
  // byte stays a crisp square).
  canvas.width = cols;
  canvas.height = rows;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(cols, rows);
  const [pr, pg, pb] = readPrimaryRGB();
  for (let i = 0; i < cols * rows; ++i) {
    const v = i < bytes.length ? bytes[i] : 0;
    const t = v / 255;
    // simple linear blend between dim background and primary
    const r = Math.round(0x1a + (pr - 0x1a) * t);
    const g = Math.round(0x22 + (pg - 0x22) * t);
    const b = Math.round(0x22 + (pb - 0x22) * t);
    const j = i * 4;
    img.data[j + 0] = r;
    img.data[j + 1] = g;
    img.data[j + 2] = b;
    img.data[j + 3] = 0xFF;
  }
  ctx.putImageData(img, 0, 0);
  return rows;
}

// Paint a XOR diff between two byte arrays onto `canvas`. Identical
// bytes go grey; differing bytes go red, brightness proportional to the
// magnitude of the difference. Lengths may differ — the shorter array
// is padded with zeros so the diff still shows where the longer one
// has unique tail bytes.
function drawDiffHeatmap(canvas, a, b) {
  if (!canvas) return;
  const cols = 32;
  const len = Math.max(a.length, b.length);
  const rows = Math.max(1, Math.ceil(len / cols));
  canvas.width = cols;
  canvas.height = rows;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(cols, rows);
  for (let i = 0; i < cols * rows; ++i) {
    const va = i < a.length ? a[i] : 0;
    const vb = i < b.length ? b[i] : 0;
    const d = (va ^ vb);
    const j = i * 4;
    if (d === 0) {
      // shared byte — dim grey neutral
      img.data[j + 0] = 0x32;
      img.data[j + 1] = 0x3a;
      img.data[j + 2] = 0x3a;
    } else {
      // differing — red, intensity by popcount of XOR (0..8) gives a
      // smoother gradient than raw XOR magnitude
      let popcount = 0;
      for (let k = d; k; k >>= 1) popcount += (k & 1);
      const t = popcount / 8;
      img.data[j + 0] = Math.round(0x60 + 0x9F * t);
      img.data[j + 1] = Math.round(0x10 * (1 - t));
      img.data[j + 2] = Math.round(0x10 * (1 - t));
    }
    img.data[j + 3] = 0xFF;
  }
  ctx.putImageData(img, 0, 0);
}

function templateStats(bytes) {
  let nonZero = 0;
  const seen = new Uint8Array(256);
  for (const b of bytes) {
    if (b !== 0) nonZero += 1;
    seen[b] = 1;
  }
  let unique = 0;
  for (let i = 0; i < 256; ++i) if (seen[i]) unique += 1;
  const pct = bytes.length ? Math.round((nonZero / bytes.length) * 100) : 0;
  return {
    len: bytes.length,
    nonZero, unique,
    summary: `len=${bytes.length}  non-zero=${nonZero} (${pct}%)  unique-values=${unique}`,
  };
}

function setTemplateView(label, hex, frameId, slot) {
  const bytes = hexToBytes(hex);
  $('#template-hex').textContent = renderHex(hex);
  drawHeatmap($('#template-heatmap'), bytes);
  $('#template-stats').textContent = templateStats(bytes).summary;
  const slotPart = slot != null ? `  slot=${slot}` : '';
  $('#template-meta').textContent =
    `${label}${slotPart}  len=${bytes.length}  frame_id=${frameId}`;
}

async function fetchTpl() {
  const slot = parseInt($('#tpl-slot').value, 10);
  if (!Number.isFinite(slot) || slot < 1 || slot > 9) {
    toast('Slot must be 1..9', 'error');
    return;
  }
  try {
    const data = await apiJson(`/api/tpl/${slot}`);
    setTemplateView('TPL_SLOT', data.hex, data.frame_id, data.slot);
  } catch (err) {
    toast(`TPL failed: ${err.message}`, 'error');
  }
}

async function fetchChar() {
  if (!confirm('Place your finger on the R307 sensor, then click OK to capture.')) {
    return;
  }
  toast('Hold finger steady…');
  await new Promise(r => setTimeout(r, 400));
  try {
    const data = await apiJson('/api/char', { method: 'POST' });
    setTemplateView('CHAR_LIVE', data.hex, data.frame_id, null);
    toast('Characteristic captured');
  } catch (err) {
    toast(`CHAR LIVE failed: ${err.message}`, 'error');
  }
}

// -------------------------------------------------------------------
// Match
// -------------------------------------------------------------------

// AS608 / R307 confirmation-code dictionary. Values come from the
// public R307 datasheet; missing codes are surfaced as "unknown" so the
// UI never silently swallows a future addition. cc==0x00 is the only
// success case — every other byte means the chip rejected the pair (or
// the upstream call failed).
const R307_CC_LABELS = {
  0x00: 'OK / MATCH',
  0x01: 'packet recv error',
  0x02: 'no finger',
  0x03: 'enroll fail',
  0x04: 'image messy',
  0x05: 'image too few features',
  0x06: 'image too smudgy',
  0x07: 'image too small',
  0x08: 'NO_MATCH',
  0x09: 'not found in library',
  0x0A: 'merge fail (combine error)',
  0x0B: 'invalid library slot',
  0x0C: 'read template error',
  0x0D: 'upload template error',
  0x0E: 'cannot receive subsequent packets',
  0x0F: 'upload image error',
  0x10: 'delete template fail',
  0x11: 'clear library fail',
  0x13: 'wrong password',
  0x15: 'no valid image in buffer',
  0x18: 'flash r/w error',
  0x1F: 'fingerprint database full',
  0x20: 'invalid handshake address',
};

function ccLabel(cc) {
  const text = R307_CC_LABELS[cc] || 'unknown';
  return `0x${cc.toString(16).padStart(2, '0').toUpperCase()} ${text}`;
}

// Highlight the band whose [data-min, nextDataMin) range contains the
// score. Removes .active from all bands first so toggling between match
// runs doesn't leave stale highlights behind.
function highlightScoreBand(score) {
  const bands = Array.from(document.querySelectorAll('#match-bands .band'));
  bands.forEach(b => b.classList.remove('active'));
  // sorted ascending by data-min already (HTML order)
  let activeIdx = 0;
  for (let i = 0; i < bands.length; ++i) {
    const min = parseInt(bands[i].dataset.min, 10);
    if (score >= min) activeIdx = i;
  }
  bands[activeIdx].classList.add('active');
}

async function runMatch() {
  const a = parseInt($('#match-a').value, 10);
  const b = parseInt($('#match-b').value, 10);
  if (![a, b].every(s => Number.isFinite(s) && s >= 1 && s <= 9)) {
    toast('Slots must be 1..9', 'error');
    return;
  }
  const compareRow = $('#match-compare');
  compareRow.hidden = true;     // hide stale heatmaps until the new pair lands
  try {
    // Fire all three calls in parallel — match runs on the chip, while
    // the two TPL fetches give us the byte data we'll heatmap. The
    // dispatcher serialises them on the wire (single USART link),
    // which is fine; total wall time ≈ tpl_a + tpl_b + match.
    const [data, tplA, tplB] = await Promise.all([
      apiJson('/api/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ a, b }),
      }),
      apiJson(`/api/tpl/${a}`).catch(err => { console.warn('tpl A failed', err); return null; }),
      apiJson(`/api/tpl/${b}`).catch(err => { console.warn('tpl B failed', err); return null; }),
    ]);

    const result = $('#match-result');
    const verdict = $('#match-verdict');
    const ccLab = $('#match-cc-label');
    const detail = $('#match-detail');
    if (data.match) {
      result.classList.remove('mismatch');
      result.classList.add('match');
      verdict.textContent = '✓ MATCH';
    } else {
      result.classList.remove('match');
      result.classList.add('mismatch');
      verdict.textContent = '✗ MISMATCH';
    }
    ccLab.textContent = ccLabel(data.cc);
    const scoreValEl = $('#match-score-value');
    if (scoreValEl) scoreValEl.textContent = data.score.toString();
    detail.textContent =
      `slot_a=${data.slot_a}  slot_b=${data.slot_b}  ` +
      `cc=0x${data.cc.toString(16).padStart(2, '0').toUpperCase()}`;
    highlightScoreBand(data.score);

    // Compare row: only render if BOTH slot reads succeeded; otherwise
    // we can't draw a meaningful diff. The single failure already
    // shows up via console.warn and the band/cc outputs.
    if (tplA && tplB) {
      const bytesA = hexToBytes(tplA.hex);
      const bytesB = hexToBytes(tplB.hex);
      drawHeatmap($('#cmp-a'), bytesA);
      drawHeatmap($('#cmp-b'), bytesB);
      drawDiffHeatmap($('#cmp-diff'), bytesA, bytesB);
      compareRow.hidden = false;
    }
  } catch (err) {
    toast(`MATCH failed: ${err.message}`, 'error');
  }
}

// -------------------------------------------------------------------
// Theme toggle
//
// Three states map to two CSS rules and a localStorage value:
//   - "auto" (no localStorage entry) → :root has no data-theme, the
//     prefers-color-scheme media query in style.css picks the tokens
//   - "light" or "dark" → :root[data-theme="…"] is applied, overriding
//     the OS preference
// First click from "auto" lands on the *opposite* of what the user
// currently sees (read once via window.matchMedia), so the toggle feels
// responsive instead of needing two clicks to escape OS-dark.
// -------------------------------------------------------------------

const THEME_KEY = 'fpst-theme';

function currentEffectiveTheme() {
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme) {
  // Empty string = "auto" (delete the attribute). The CSS @media rule then
  // takes over again. We don't expose "auto" via a click, but on first load
  // we deliberately leave the attribute off so OS preference wins.
  if (theme === 'light' || theme === 'dark') {
    document.documentElement.setAttribute('data-theme', theme);
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
  const icon = $('#theme-icon');
  if (icon) {
    // Show the icon for the *target* of the next click (so the affordance
    // hints at what pressing the button will do): if we're currently dark,
    // show the sun.
    const effective = theme || currentEffectiveTheme();
    icon.textContent = effective === 'dark' ? 'light_mode' : 'dark_mode';
  }
}

function toggleTheme() {
  const next = currentEffectiveTheme() === 'dark' ? 'light' : 'dark';
  localStorage.setItem(THEME_KEY, next);
  applyTheme(next);
}

// -------------------------------------------------------------------
// Wiring
// -------------------------------------------------------------------

// -------------------------------------------------------------------
// Serial-port configurator dialog
//
// Lets the user pick a different COM port without editing env vars or
// restarting uvicorn. Backend persists the choice to .port.json so the
// next backend launch reuses it. On a different machine entirely, the
// user just opens the page, picks the new port, hits Connect.
// -------------------------------------------------------------------

async function loadPorts(preselect) {
  const data = await apiJson('/api/serial/ports');
  const sel = $('#port-select');
  sel.innerHTML = '';
  if (!data.ports.length) {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = 'no serial ports detected';
    opt.disabled = true;
    sel.appendChild(opt);
  } else {
    for (const p of data.ports) {
      const opt = document.createElement('option');
      opt.value = p.device;
      // pyserial descriptions on Windows almost always duplicate the
      // COM number at the end ("Prolific USB-to-Serial Comm Port
      // (COM13)") — strip it so the dropdown reads cleanly without
      // overflowing the dialog. Also cap to ~36 chars total so a
      // verbose description never blows past the card width.
      let desc = (p.description || '').replace(/\s*\(COM\d+\)\s*$/i, '');
      if (desc.length > 36) desc = desc.slice(0, 33) + '…';
      opt.textContent = desc ? `${p.device} — ${desc}` : p.device;
      if (p.device === (preselect || data.current)) opt.selected = true;
      sel.appendChild(opt);
    }
  }
  $('#port-baud').value = data.baud;
  $('#port-dialog-current').textContent = `${data.current} @ ${data.baud}`;
  return data;
}

function setDialogStatus(msg, kind) {
  const el = $('#port-dialog-status');
  el.textContent = msg || '';
  el.classList.remove('is-error', 'is-success');
  if (kind === 'error')   el.classList.add('is-error');
  if (kind === 'success') el.classList.add('is-success');
}

async function openPortDialog() {
  setDialogStatus('');
  try {
    await loadPorts();
  } catch (err) {
    setDialogStatus(`failed to list ports: ${err.message}`, 'error');
  }
  $('#port-dialog').showModal();
}

async function refreshPortList() {
  const btn = $('#port-refresh');
  btn.classList.add('spinning');
  try {
    await loadPorts($('#port-select').value);
    setDialogStatus('port list refreshed', 'success');
  } catch (err) {
    setDialogStatus(`refresh failed: ${err.message}`, 'error');
  } finally {
    setTimeout(() => btn.classList.remove('spinning'), 500);
  }
}

async function submitPortConnect() {
  const port = $('#port-select').value;
  const baud = parseInt($('#port-baud').value, 10);
  if (!port) {
    setDialogStatus('pick a port first', 'error');
    return;
  }
  if (!Number.isFinite(baud) || baud < 300) {
    setDialogStatus('baud must be ≥ 300', 'error');
    return;
  }
  const connectBtn = $('#port-connect');
  connectBtn.disabled = true;
  setDialogStatus(`connecting to ${port} @ ${baud}…`);
  try {
    const data = await apiJson('/api/serial/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ port, baud }),
    });
    setDialogStatus(`connected to ${data.port} @ ${data.baud}`, 'success');
    toast(`connected: ${data.port} @ ${data.baud}`);
    // Refresh the topbar pill + status card so they reflect the new
    // device immediately, not on the next manual click.
    await refreshHealth();
    await refreshStatus();
    setTimeout(() => $('#port-dialog').close(), 600);
  } catch (err) {
    setDialogStatus(`connect failed: ${err.message}`, 'error');
    toast(`connect failed: ${err.message}`, 'error');
  } finally {
    connectBtn.disabled = false;
  }
}

// -------------------------------------------------------------------
// Wiring
// -------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
  $('#refresh-status').addEventListener('click', refreshStatus);
  $('#btn-capture-img').addEventListener('click', captureImage);
  $('#btn-download-img').addEventListener('click', downloadImage);
  $('#btn-fetch-tpl').addEventListener('click', fetchTpl);
  $('#btn-fetch-char').addEventListener('click', fetchChar);
  $('#btn-match').addEventListener('click', runMatch);
  $('#theme-toggle').addEventListener('click', toggleTheme);

  $('#health-pill').addEventListener('click', openPortDialog);
  $('#port-cancel').addEventListener('click', () => $('#port-dialog').close());
  $('#port-connect').addEventListener('click', submitPortConnect);
  $('#port-refresh').addEventListener('click', refreshPortList);

  // Restore the user's saved choice if any; otherwise stay in "auto" so
  // the OS preference wins and the icon still reflects what's on screen.
  applyTheme(localStorage.getItem(THEME_KEY) || '');

  refreshHealth();
  refreshStatus();
});
