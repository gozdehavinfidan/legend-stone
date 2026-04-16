/* ============================================
   What A Toy! — Progressive Contact Form
   Module purpose: toggle between mailto card and fetch-backed form via data-contact-endpoint.
   Owner: Agent 4 content-js · team whatatoy-impl
   Date: 2026-04-16
   ============================================ */

import { qs } from './utils.js';

export function initContact() {
  const form = qs('[data-contact-form]');
  const card = qs('[data-contact-card]');
  if (!form && !card) return;

  const endpoint = (form?.getAttribute('data-contact-endpoint') || '').trim();

  if (!endpoint) {
    if (form) {
      form.setAttribute('hidden', '');
      form.setAttribute('aria-hidden', 'true');
    }
    if (card) {
      card.removeAttribute('hidden');
      card.setAttribute('aria-hidden', 'false');
    }
    return;
  }

  if (card) {
    card.setAttribute('hidden', '');
    card.setAttribute('aria-hidden', 'true');
  }
  if (!form) return;

  form.removeAttribute('hidden');
  form.setAttribute('aria-hidden', 'false');
  wireSubmit(form, endpoint);
}

function wireSubmit(form, endpoint) {
  const status = qs('[data-contact-status]', form);
  const submitBtn = qs('button[type="submit"], [data-contact-submit]', form);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    setStatus(status, 'sending', 'Sending your message…');
    submitBtn?.setAttribute('disabled', '');
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        body: new FormData(form),
        headers: { 'Accept': 'application/json' },
      });
      if (!res.ok) throw new Error(`Form submission failed: ${res.status}`);
      form.reset();
      setStatus(status, 'success', 'Thanks! We received your message.');
    } catch (err) {
      console.error('[contact] submission failed:', err);
      setStatus(status, 'error', 'Something went wrong. Please try again or email us directly.');
    } finally {
      submitBtn?.removeAttribute('disabled');
    }
  });
}

function setStatus(el, state, message) {
  if (!el) return;
  el.dataset.state = state;
  el.textContent = message;
  el.setAttribute('role', state === 'error' ? 'alert' : 'status');
}
