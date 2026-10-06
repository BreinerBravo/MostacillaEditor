export function createAutosave(save, { delay = 450, onSaving = () => {}, onSaved = () => {}, onError = () => {} } = {}) {
  let timer;
  let pendingValue;
  let inFlight;
  async function flush() {
    clearTimeout(timer);
    timer = null;
    if (inFlight) await inFlight;
    if (pendingValue === undefined) return;
    const value = pendingValue;
    pendingValue = undefined;
    inFlight = Promise.resolve().then(() => save(value)).then(onSaved, error => {
      pendingValue = value;
      onError(error);
      throw error;
    });
    try { await inFlight; }
    finally { inFlight = null; }
  }
  return {
    schedule(value) {
      pendingValue = value;
      onSaving();
      clearTimeout(timer);
      timer = setTimeout(() => flush().catch(() => {}), delay);
    },
    flush,
    cancel() { clearTimeout(timer); timer = null; pendingValue = undefined; },
  };
}
