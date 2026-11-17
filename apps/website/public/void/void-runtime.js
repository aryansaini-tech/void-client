/* The iframe owns its listeners, observers, frames and GPU resources. */
window.createVoidRuntimeScope = function () {
  const abort = new AbortController();
  const frames = new Set(), timers = new Set(), observers = new Set(), releases = new Set();
  let disposed = false;
  const scope = {
    get disposed() { return disposed; },
    on(target, type, handler, options = {}) {
      if (!disposed) target.addEventListener(type, handler, { ...(typeof options === 'boolean' ? { capture: options } : options), signal: abort.signal });
    },
    requestFrame(callback) {
      if (disposed) return 0;
      const id = window.requestAnimationFrame(time => { frames.delete(id); if (!disposed) callback(time); });
      frames.add(id); return id;
    },
    cancelFrame(id) { window.cancelAnimationFrame(id); frames.delete(id); },
    setTimer(callback, delay) {
      if (disposed) return 0;
      const id = window.setTimeout(() => { timers.delete(id); if (!disposed) callback(); }, delay);
      timers.add(id); return id;
    },
    clearTimer(id) { window.clearTimeout(id); timers.delete(id); },
    observeWith(Base) {
      return class extends Base {
        constructor(...args) { super(...args); observers.add(this); }
        disconnect() { super.disconnect(); observers.delete(this); }
      };
    },
    add(release) { if (disposed) release(); else releases.add(release); },
    get stats() { return { disposed, frames: frames.size, timers: timers.size, observers: observers.size, resources: releases.size }; },
    dispose() {
      if (disposed) return;
      disposed = true; abort.abort();
      frames.forEach(window.cancelAnimationFrame); frames.clear();
      timers.forEach(window.clearTimeout); timers.clear();
      observers.forEach(observer => observer.disconnect()); observers.clear();
      [...releases].reverse().forEach(release => release()); releases.clear();
      window.dispatchEvent(new Event('void-scene-dispose'));
    },
  };
  scope.on(window, 'pagehide', event => { if (!event.persisted) scope.dispose(); });
  window.__voidRuntime = scope;
  return scope;
};
