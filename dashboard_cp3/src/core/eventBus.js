export function createBus() {
  const listeners = new Map();
  return {
    on(evt, cb) {
      if (!listeners.has(evt)) listeners.set(evt, new Set());
      listeners.get(evt).add(cb);
      return () => listeners.get(evt)?.delete(cb);
    },
    emit(evt, payload) {
      if (listeners.has(evt)) {
        for (const cb of listeners.get(evt)) cb(payload);
      }
    }
  };
}
