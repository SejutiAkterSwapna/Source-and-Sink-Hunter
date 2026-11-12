// Small shared UI helpers used by every page: modal dialogs, confirm, toast.

export function el(tag, attrs = {}, ...children) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'text') e.textContent = v;
    else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) {
    if (c === null || c === undefined || c === false) continue;
    e.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return e;
}

/**
 * Open a modal dialog. `build(close)` returns the dialog body.
 * Returns { root, close }. Escape / backdrop close it unless `required`.
 */
export function openModal({ id, labelledBy, required = false, onClose, className = '' }, build) {
  const prevFocus = document.activeElement;
  const overlay = el('div', { class: 'overlay modal-overlay', id });
  const dialog = el('div', { class: `card dialog ${className}`, role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': labelledBy });
  overlay.append(dialog);
  let closed = false;
  const close = (value) => {
    if (closed) return;
    closed = true;
    overlay.remove();
    document.removeEventListener('keydown', onKey, true);
    if (prevFocus && typeof prevFocus.focus === 'function') prevFocus.focus({ preventScroll: true });
    if (onClose) onClose(value);
  };
  const onKey = (e) => {
    if (e.key === 'Escape' && !required) {
      e.stopPropagation();
      close(undefined);
    }
    // keep keyboard shortcuts of the page from firing while typing in a dialog
    if (e.key.length === 1) e.stopPropagation();
    if (e.key === 'Tab') trapFocus(e, dialog);
  };
  overlay.addEventListener('mousedown', (e) => {
    if (e.target === overlay && !required) close(undefined);
  });
  document.addEventListener('keydown', onKey, true);
  dialog.append(build(close));
  document.body.append(overlay);
  const first = dialog.querySelector('[autofocus], input, button');
  if (first) first.focus();
  return { root: overlay, close };
}

function trapFocus(e, container) {
  const items = [...container.querySelectorAll('button, input, a[href], [tabindex]:not([tabindex="-1"])')].filter((x) => !x.disabled);
  if (!items.length) return;
  const first = items[0];
  const last = items[items.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}

/** Promise<boolean> confirm dialog. */
export function confirmDialog({ title, message, confirmText, cancelText, danger = false, id = 'confirm-dialog' }) {
  return new Promise((resolve) => {
    openModal({ id, labelledBy: `${id}-title`, onClose: (v) => resolve(Boolean(v)) }, (close) =>
      el(
        'div',
        {},
        el('h2', { id: `${id}-title`, text: title }),
        el('p', { class: 'muted', text: message }),
        el(
          'div',
          { class: 'dialog-actions' },
          el('button', { class: 'btn btn-ghost', 'data-action': 'cancel', text: cancelText, onclick: () => close(false) }),
          el('button', {
            class: `btn ${danger ? 'btn-danger' : 'btn-primary'}`,
            'data-action': 'confirm',
            text: confirmText,
            autofocus: true,
            onclick: () => close(true),
          }),
        ),
      ),
    );
  });
}

let toastTimer = null;
/** Short message at the bottom of the screen. */
export function toast(message, kind = 'info') {
  let t = document.getElementById('toast');
  if (!t) {
    t = el('div', { id: 'toast', class: 'toast', role: 'status', 'aria-live': 'polite' });
    document.body.append(t);
  }
  t.textContent = message;
  t.dataset.kind = kind;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3200);
}

export function formatDate(ms) {
  if (!ms) return '';
  try {
    return new Date(ms).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return new Date(ms).toISOString();
  }
}
