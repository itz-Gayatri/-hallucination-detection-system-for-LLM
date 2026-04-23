/**
 * TruthGuard AI — Content Script
 * Injects "Verify with TruthGuard AI" button after every assistant response,
 * including short math answers like "4", "2+2=4", etc.
 */

const TRUTHGUARD_URL = 'http://localhost:5173';

let tgWindow = null;

function openTruthGuard(text) {
  const encoded = encodeURIComponent(text.slice(0, 10000));
  const url = `${TRUTHGUARD_URL}?text=${encoded}`;
  if (!tgWindow || tgWindow.closed) {
    tgWindow = window.open(url, 'truthguardTab');
  } else {
    tgWindow.location.href = url;
    tgWindow.focus();
  }
}

function getResponseText(el) {
  const prose = el.querySelector('.markdown, [class*="prose"]');
  return (prose || el).innerText?.trim() || '';
}

function createVerifyButton(container) {
  const btn = document.createElement('button');
  btn.className = 'tg-verify-btn';
  btn.setAttribute('aria-label', 'Verify this response with TruthGuard AI');
  btn.innerHTML = `
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" stroke-width="2.5" aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
    Verify with TruthGuard AI
  `;
  btn.addEventListener('click', () => {
    const text = getResponseText(container);
    if (text) openTruthGuard(text);
  });
  return btn;
}

// ─── Per-container stability tracker ─────────────────────────────────────────
const stabilityMap = new WeakMap();

function hasButton(container) {
  return container.querySelector('.tg-btn-wrapper') !== null;
}

function scheduleButtonForContainer(container) {
  if (hasButton(container)) return;

  const currentLength = getResponseText(container).length;

  if (!stabilityMap.has(container)) {
    stabilityMap.set(container, { timer: null, lastLength: -1 });
  }

  const state = stabilityMap.get(container);
  clearTimeout(state.timer);
  state.lastLength = currentLength;

  state.timer = setTimeout(() => {
    if (hasButton(container)) return;
    const text = getResponseText(container);
    if (!text) return;
    if (text.length !== state.lastLength) return; // still changing

    const wrapper = document.createElement('div');
    wrapper.className = 'tg-btn-wrapper';
    wrapper.appendChild(createVerifyButton(container));
    container.appendChild(wrapper);
  }, 1500);
}

// ─── Selectors for assistant response containers ──────────────────────────────
const SELECTORS = [
  '[data-message-author-role="assistant"]',
  '.agent-turn',
];

function scanForResponses() {
  for (const selector of SELECTORS) {
    document.querySelectorAll(selector).forEach(scheduleButtonForContainer);
  }
}

// ─── MutationObserver ─────────────────────────────────────────────────────────
let scanTimer = null;

const observer = new MutationObserver(() => {
  clearTimeout(scanTimer);
  scanTimer = setTimeout(scanForResponses, 500);
});

observer.observe(document.body, { childList: true, subtree: true });
setTimeout(scanForResponses, 1500);
