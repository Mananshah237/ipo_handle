import { readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  return (await Promise.all(entries.map(e => e.isDirectory() ? walk(`${dir}/${e.name}`) : [`${dir}/${e.name}`]))).flat();
}
const files = (await walk('out')).filter(p => !p.endsWith('sw.js') && !p.includes('/data/') && !p.endsWith('.map'));
const hash = createHash('sha256');
for (const path of files.sort()) hash.update(await readFile(path));
const assets = [...new Set(['/', '/allotments/', ...files.map(p => p.slice(3))])];
const source = await readFile('public/sw.js', 'utf8');
await writeFile('out/sw.js', source.replace('/* BUILD_VERSION */ "dev"', JSON.stringify(hash.digest('hex').slice(0, 16))).replace('/* SHELL_ASSETS */ ["/", "/allotments/", "/manifest.json"]', JSON.stringify(assets)));
