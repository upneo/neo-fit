/** All paths are relative to this module: works at / and GitHub Pages /repo/. */
export async function loadConfiguration() {
  const response = await fetch(new URL('../config.json', import.meta.url), { cache: 'no-store' });
  if (!response.ok) throw new Error('Не удалось загрузить конфигурацию приложения.');
  const c = await response.json();
  if (!c || typeof c !== 'object') throw new Error('Повреждена конфигурация.');
  if (c.publishableKey?.startsWith('sb_secret_')) throw new Error('В конфигурацию нельзя помещать секретный ключ.');
  return Object.freeze(c);
}
export async function loadTemplates() {
  const paths = ['../data/library.json', '../data/programs/neo.json', '../data/programs/vika.json'];
  const results = await Promise.all(paths.map(async p => {
    const r = await fetch(new URL(p, import.meta.url));
    if (!r.ok) throw new Error('Каталог упражнений не загрузился. Обнови страницу.');
    const data = await r.json();
    if (!Array.isArray(data)) throw new Error('Повреждён каталог упражнений.');
    return data;
  }));
  return { library: results[0], neo: results[1], vika: results[2] };
}
