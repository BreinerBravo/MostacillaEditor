export function registerServiceWorker({ beforeUpdate = async () => {} } = {}) {
  if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
  let registrationPromise;
  window.addEventListener('load', () => {
    registrationPromise = navigator.serviceWorker.register('./sw.js').catch(() => null);
  });

  const button = document.querySelector('#app-update-button');
  if (!button) return;
  button.addEventListener('click', async () => {
    const originalLabel = button.textContent;
    button.disabled = true;
    button.textContent = 'Actualizando…';
    try {
      await beforeUpdate();
      const registration = await (registrationPromise || navigator.serviceWorker.ready);
      if (!registration) throw new Error('No se pudo conectar con el service worker.');

      let installingWorker = registration.installing;
      let foundWorker;
      const onUpdateFound = () => { foundWorker = registration.installing; };
      registration.addEventListener('updatefound', onUpdateFound, { once: true });
      await registration.update();
      installingWorker ||= foundWorker || registration.installing;

      if (installingWorker) {
        await waitForActivation(installingWorker);
      }
      window.location.reload();
    } catch (error) {
      button.disabled = false;
      button.textContent = originalLabel;
      window.dispatchEvent(new CustomEvent('app-update-error', { detail: error }));
    }
  });
}

function waitForActivation(worker) {
  if (worker.state === 'activated') return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => finish(new Error('La actualización tardó demasiado. Intenta de nuevo.')), 30000);
    const onStateChange = () => {
      if (worker.state === 'activated') finish();
      else if (worker.state === 'redundant') finish(new Error('No se pudo instalar la actualización.'));
    };
    function finish(error) {
      clearTimeout(timeout);
      worker.removeEventListener('statechange', onStateChange);
      error ? reject(error) : resolve();
    }
    worker.addEventListener('statechange', onStateChange);
    onStateChange();
  });
}
