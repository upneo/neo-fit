// A failed network/module load must never leave the user on an endless spinner.
function showUpdate(registration) {
  if (document.getElementById('app-update')) return;
  const bar = document.createElement('aside');
  bar.id = 'app-update';
  bar.className = 'update-banner';
  bar.setAttribute('role', 'status');
  const text = document.createElement('span');
  text.textContent = 'Доступно обновление NEO FIT';
  const button = document.createElement('button');
  button.className = 'btn accent small';
  button.textContent = 'Обновить';
  button.addEventListener('click', async () => {
    button.disabled = true;
    try {
      await globalThis.neoFitPrepareUpdate?.();
      sessionStorage.setItem('neo-fit:update-reload', '1');
      registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
    } catch (error) {
      button.disabled = false;
      text.textContent = error?.message || 'Сначала дождись сохранения';
    }
  });
  bar.append(text, button);
  document.body.append(bar);
}
try {
  await import('./main.js');
  if ('serviceWorker' in navigator && !['localhost', '127.0.0.1'].includes(location.hostname)) {
    const registration = await navigator.serviceWorker.register(new URL('./sw.js', import.meta.url), { scope: './', updateViaCache: 'none' });
    if (registration.waiting && navigator.serviceWorker.controller) showUpdate(registration);
    registration.addEventListener('updatefound', () => {
      const worker = registration.installing;
      worker?.addEventListener('statechange', () => {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) showUpdate(registration);
      });
    });
    let reloading = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloading || sessionStorage.getItem('neo-fit:update-reload') !== '1') return;
      reloading = true;
      sessionStorage.removeItem('neo-fit:update-reload');
      location.reload();
    });
    registration.update().catch(() => {});
  }
} catch (error) {
  const root = document.getElementById('root');
  root.replaceChildren();
  const panel = document.createElement('section'); panel.className = 'boot';
  const title = document.createElement('h1'); title.textContent = 'Не удалось открыть NEO FIT';
  const text = document.createElement('p'); text.textContent = error?.message || 'Проверь подключение и попробуй снова.';
  const button = document.createElement('button'); button.className = 'btn primary'; button.textContent = 'Обновить страницу'; button.onclick = () => location.reload();
  panel.append(title, text, button); root.append(panel);
}
