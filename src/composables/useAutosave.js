export function createAutosave(save, { delay = 450, onSaving = () => {}, onSaved = () => {}, onError = () => {} } = {}) {
  let timer;
  return {
    schedule(value) {
      onSaving();
      clearTimeout(timer);
      timer = setTimeout(async () => {
        try {
          await save(value);
          onSaved();
        } catch (error) {
          onError(error);
        }
      }, delay);
    },
    cancel() { clearTimeout(timer); },
  };
}
