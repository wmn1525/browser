import type { WindowSyncCapturedEvent } from './window-sync-types';

type WindowSyncEventPayload<Type extends WindowSyncCapturedEvent['type']> =
  Extract<WindowSyncCapturedEvent, { readonly type: Type }>['payload'];

/** 主控页面通过 console.debug 上报同步事件时使用的稳定前缀。 */
export const WINDOW_SYNC_PREFIX = '__IMRUN_SYNC__';

/** 注入到主控窗口的轻量事件采集脚本。 */
export const WINDOW_SYNC_MASTER_SCRIPT = `
(() => {
  if (window.__imrunSyncInstalled) return 'installed';
  const prefix = '${WINDOW_SYNC_PREFIX}';
  const state = { lastUrl: location.href, inputTimer: 0, scrollTimer: 0, moveFrame: 0, movePayload: null };
  const esc = (value) => {
    try { return CSS.escape(String(value)); } catch { return String(value).replace(/([^a-zA-Z0-9_-])/g, '\\\\$1'); }
  };
  const attrEsc = (value) => String(value).replace(/\\\\/g, '\\\\\\\\').replace(/"/g, '\\\\"');
  const selector = (node) => {
    if (!node || node.nodeType !== 1) return '';
    if (node.id) return '#' + esc(node.id);
    const direct = node.getAttribute('data-testid') || node.getAttribute('data-test') || node.getAttribute('name');
    if (direct) {
      const attr = node.getAttribute('data-testid') ? 'data-testid' : (node.getAttribute('data-test') ? 'data-test' : 'name');
      const candidate = node.localName.toLowerCase() + '[' + attr + '="' + attrEsc(direct) + '"]';
      try { if (document.querySelectorAll(candidate).length === 1) return candidate; } catch {}
    }
    const parts = [];
    let current = node;
    while (current && current.nodeType === 1 && parts.length < 6) {
      let part = current.localName.toLowerCase();
      const parent = current.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children).filter((item) => item.localName === current.localName);
        if (siblings.length > 1) part += ':nth-of-type(' + (siblings.indexOf(current) + 1) + ')';
      }
      parts.unshift(part);
      current = parent;
    }
    return parts.join(' > ');
  };
  const point = (event) => ({
    x: Number(event.clientX || 0),
    y: Number(event.clientY || 0),
    rx: window.innerWidth ? Number(event.clientX || 0) / window.innerWidth : 0,
    ry: window.innerHeight ? Number(event.clientY || 0) / window.innerHeight : 0
  });
  const emit = (type, payload) => {
    try {
      console.debug(prefix + JSON.stringify({ type, payload, href: location.href, ts: Date.now() }));
    } catch {}
  };
  const emitInput = (type, event) => {
    const target = event.target;
    if (!target || target.nodeType !== 1) return;
    const tag = String(target.tagName || '').toLowerCase();
    if (!['input', 'textarea', 'select'].includes(tag) && !target.isContentEditable) return;
    emit(type, {
      selector: selector(target),
      tag,
      inputType: target.type || '',
      value: target.isContentEditable ? target.innerText : (typeof target.value === 'string' ? target.value : ''),
      checked: typeof target.checked === 'boolean' ? !!target.checked : null
    });
  };
  const emitScroll = (target) => {
    if (target && target.nodeType === 1 && target !== document.body && target !== document.documentElement) {
      const maxY = Math.max(0, Number(target.scrollHeight || 0) - Number(target.clientHeight || 0));
      const maxX = Math.max(0, Number(target.scrollWidth || 0) - Number(target.clientWidth || 0));
      emit('scroll', {
        mode: 'element',
        selector: selector(target),
        scrollTop: Number(target.scrollTop || 0),
        scrollLeft: Number(target.scrollLeft || 0),
        ratioX: maxX ? Number(target.scrollLeft || 0) / maxX : 0,
        ratioY: maxY ? Number(target.scrollTop || 0) / maxY : 0
      });
      return;
    }
    const maxY = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight) - window.innerHeight;
    const maxX = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth;
    emit('scroll', {
      mode: 'window',
      x: Number(window.scrollX || 0),
      y: Number(window.scrollY || 0),
      ratioX: maxX > 0 ? Number(window.scrollX || 0) / maxX : 0,
      ratioY: maxY > 0 ? Number(window.scrollY || 0) / maxY : 0
    });
  };
  const emitNavigate = () => {
    if (state.lastUrl === location.href) return;
    state.lastUrl = location.href;
    emit('navigate', { url: location.href });
  };
  for (const name of ['pushState', 'replaceState']) {
    const original = history[name];
    history[name] = function (...args) {
      const result = original.apply(this, args);
      window.setTimeout(emitNavigate, 0);
      return result;
    };
  }
  document.addEventListener('click', (event) => emit('click', { ...point(event), selector: selector(event.target), button: Number(event.button || 0), ctrlKey: !!event.ctrlKey, shiftKey: !!event.shiftKey, altKey: !!event.altKey, metaKey: !!event.metaKey }), true);
  document.addEventListener('input', (event) => { window.clearTimeout(state.inputTimer); state.inputTimer = window.setTimeout(() => emitInput('input', event), 40); }, true);
  document.addEventListener('change', (event) => emitInput('change', event), true);
  document.addEventListener('keydown', (event) => { if (['Enter', 'Tab', 'Escape'].includes(event.key) || event.ctrlKey || event.metaKey || event.altKey) emit('keydown', { selector: selector(event.target), key: event.key, code: event.code, ctrlKey: !!event.ctrlKey, shiftKey: !!event.shiftKey, altKey: !!event.altKey, metaKey: !!event.metaKey }); }, true);
  document.addEventListener('scroll', (event) => { const target = event.target && event.target !== document ? event.target : null; window.clearTimeout(state.scrollTimer); state.scrollTimer = window.setTimeout(() => emitScroll(target), 80); }, true);
  document.addEventListener('mousemove', (event) => {
    state.movePayload = point(event);
    if (state.moveFrame) return;
    state.moveFrame = window.requestAnimationFrame(() => { state.moveFrame = 0; if (state.movePayload) emit('mouseMove', state.movePayload); state.movePayload = null; });
  }, true);
  window.addEventListener('hashchange', emitNavigate, true);
  window.addEventListener('popstate', emitNavigate, true);
  window.setInterval(emitNavigate, 700);
  window.__imrunSyncInstalled = true;
  return 'installed';
})();
`;

/** 根据主控事件构造跟随窗口执行脚本，所有数据都先 JSON 化避免拼接注入。 */
export function buildFollowerExpression(event: WindowSyncCapturedEvent): string {
  if (event.type === 'click') return buildClickExpression(event.payload);
  if (event.type === 'input' || event.type === 'change') return buildInputExpression(event.payload);
  if (event.type === 'scroll') return buildScrollExpression(event.payload);
  if (event.type === 'keydown') return buildKeyboardExpression(event.payload);
  if (event.type === 'mouseMove') return buildMouseMoveExpression(event.payload);
  return 'true';
}

function buildClickExpression(payload: WindowSyncEventPayload<'click'>): string {
  return `
(() => {
  const payload = ${JSON.stringify(payload)};
  let target = null;
  try { target = payload.selector ? document.querySelector(payload.selector) : null; } catch {}
  if (!target) target = document.elementFromPoint(Math.round(payload.rx * window.innerWidth), Math.round(payload.ry * window.innerHeight));
  if (!target) return false;
  target.focus?.();
  const rect = target.getBoundingClientRect();
  const init = { bubbles: true, cancelable: true, composed: true, clientX: rect.left + Math.max(1, rect.width / 2), clientY: rect.top + Math.max(1, rect.height / 2), button: payload.button, ctrlKey: payload.ctrlKey, shiftKey: payload.shiftKey, altKey: payload.altKey, metaKey: payload.metaKey };
  for (const name of ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click']) target.dispatchEvent(new MouseEvent(name, init));
  target.click?.();
  return true;
})()
`;
}

function buildInputExpression(payload: WindowSyncEventPayload<'input'>): string {
  return `
(() => {
  const payload = ${JSON.stringify(payload)};
  let target = null;
  try { target = payload.selector ? document.querySelector(payload.selector) : null; } catch {}
  if (!target) return false;
  target.focus?.();
  if (payload.tag === 'select') target.value = payload.value ?? '';
  else if (payload.inputType === 'checkbox' || payload.inputType === 'radio') target.checked = !!payload.checked;
  else if (target.isContentEditable) target.innerText = payload.value ?? '';
  else if ('value' in target) target.value = payload.value ?? '';
  else return false;
  target.dispatchEvent(new Event('input', { bubbles: true }));
  target.dispatchEvent(new Event('change', { bubbles: true }));
  return true;
})()
`;
}

function buildScrollExpression(payload: WindowSyncEventPayload<'scroll'>): string {
  return `
(() => {
  const payload = ${JSON.stringify(payload)};
  if (payload.mode === 'element' && payload.selector) {
    let target = null;
    try { target = document.querySelector(payload.selector); } catch {}
    if (target) {
      const maxY = Math.max(0, Number(target.scrollHeight || 0) - Number(target.clientHeight || 0));
      const maxX = Math.max(0, Number(target.scrollWidth || 0) - Number(target.clientWidth || 0));
      target.scrollTop = maxY ? Number(payload.ratioY || 0) * maxY : Number(payload.scrollTop || 0);
      target.scrollLeft = maxX ? Number(payload.ratioX || 0) * maxX : Number(payload.scrollLeft || 0);
      return true;
    }
  }
  const maxY = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight) - window.innerHeight;
  const maxX = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth;
  window.scrollTo({ left: maxX ? Number(payload.ratioX || 0) * maxX : Number(payload.x || 0), top: maxY ? Number(payload.ratioY || 0) * maxY : Number(payload.y || 0), behavior: 'auto' });
  return true;
})()
`;
}

function buildKeyboardExpression(payload: WindowSyncEventPayload<'keydown'>): string {
  return `
(() => {
  const payload = ${JSON.stringify(payload)};
  let target = document.activeElement || document.body;
  try { target = payload.selector ? document.querySelector(payload.selector) || target : target; } catch {}
  target.focus?.();
  const init = { key: payload.key, code: payload.code, ctrlKey: payload.ctrlKey, shiftKey: payload.shiftKey, altKey: payload.altKey, metaKey: payload.metaKey, bubbles: true, cancelable: true };
  target.dispatchEvent(new KeyboardEvent('keydown', init));
  target.dispatchEvent(new KeyboardEvent('keyup', init));
  return true;
})()
`;
}

function buildMouseMoveExpression(payload: WindowSyncEventPayload<'mouseMove'>): string {
  return `
(() => {
  const payload = ${JSON.stringify(payload)};
  const id = '__imrun-sync-cursor';
  let cursor = document.getElementById(id);
  if (!cursor) {
    cursor = document.createElement('div');
    cursor.id = id;
    cursor.style.cssText = 'position:fixed;z-index:2147483647;width:12px;height:12px;margin:-6px 0 0 -6px;border-radius:999px;background:#1677ff;border:2px solid #fff;pointer-events:none;box-shadow:0 0 0 3px rgba(22,119,255,.18)';
    document.documentElement.appendChild(cursor);
  }
  cursor.style.transform = 'translate3d(' + Math.round(payload.rx * window.innerWidth) + 'px,' + Math.round(payload.ry * window.innerHeight) + 'px,0)';
  return true;
})()
`;
}
