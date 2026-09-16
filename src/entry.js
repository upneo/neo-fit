// A failed network/module load must never leave the user on an endless spinner.
try {
  await import('./main.js');
  if ('serviceWorker' in navigator && !['localhost', '127.0.0.1'].includes(location.hostname)) {
    navigator.serviceWorker.register(new URL('./sw.js', import.meta.url), { scope: './' }).catch(() => {});
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
