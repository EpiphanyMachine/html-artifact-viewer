import { readdir, readFile, access } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
const root=new URL('../',import.meta.url);
const manifest=JSON.parse(await readFile(new URL('extension/manifest.json',root),'utf8'));
for(const name of await readdir(new URL('extension/',root))) {
 if(name.endsWith('.js')) execFileSync(process.execPath,['--check',new URL(`extension/${name}`,root).pathname]);
}
for(const file of [manifest.background.service_worker,manifest.options_ui.page,...Object.values(manifest.icons)]) await access(new URL(`extension/${file}`,root));
const scripts=await Promise.all(['config.js','worker.js','settings.js'].map(name=>readFile(new URL(`extension/${name}`,root),'utf8')));
if(scripts.some(text=>/\b(fetch|XMLHttpRequest|WebSocket|sendBeacon)\s*\(/.test(text))) throw new Error('Runtime contains a network client. Review the privacy contract before changing this check.');
console.log('JavaScript syntax, manifest paths, and no-network-client contract checked.');
