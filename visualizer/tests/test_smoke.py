"""tools/visualizer/tests/test_smoke.py

P21 (Phase 10I) minimal smoke test. Launches Playwright against the
running FastAPI backend (assumed to be at http://localhost:8000) and
verifies the page renders the expected Material Design 3 chrome.

Run locally:
    pip install playwright pytest pytest-playwright
    playwright install chromium
    # in another shell:
    cd tools/visualizer/backend
    set STM32_PORT=COM3 && uvicorn main:app --port 8000
    # then:
    pytest tools/visualizer/tests/test_smoke.py -v

The smoke test is intentionally narrow — it does not exercise the
serial path (no STM32 needed; the API endpoints return 502/503 if
the device is absent, which is fine for asserting that the **frontend
itself** loaded). For full E2E, hook up STM32 and exercise capture
flows manually.
"""

import pytest

playwright = pytest.importorskip("playwright.sync_api")
sync_playwright = playwright.sync_playwright


BASE_URL = "http://localhost:8000"


def test_page_loads_with_md3_chrome():
    """The page should boot, render the topbar, and contain the four
    main cards. Material Web Components live behind shadow DOM so we
    look for our own data attributes / text content instead."""
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.goto(BASE_URL, wait_until="networkidle", timeout=15_000)

        # Topbar
        assert "P13 Biometric Door Lock" in page.locator(".brand h1").inner_text()

        # Health pill — text fills in once /api/health responds
        page.wait_for_function(
            "document.querySelector('#health-text').textContent.trim().length > 0",
            timeout=5_000,
        )

        # All four major cards present
        for card_id in ("#status-card", "#image-card", "#template-card", "#match-card"):
            assert page.locator(card_id).is_visible(), f"missing {card_id}"

        # Capture image button is wired (Material Web Components render
        # the actual button inside shadow DOM; the host element itself
        # must exist).
        assert page.locator("#btn-capture-img").count() == 1
        assert page.locator("#btn-match").count() == 1

        browser.close()


def test_health_endpoint_returns_port_info():
    """Sanity check that the FastAPI app surfaces the configured port."""
    import json
    import urllib.request
    with urllib.request.urlopen(f"{BASE_URL}/api/health", timeout=5) as r:
        data = json.loads(r.read().decode())
    assert data["ok"] is True
    assert "port" in data
    assert "baud" in data
