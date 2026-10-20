import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { normalizeConfig, makeRules } from '../extension/config.js';
const config = repositories => ({ enabled: true, repositories, scriptRepositories: [] });

test('accepts repository slugs and GitHub URLs, normalizes case and removes duplicates', () => {
  assert.deepEqual(normalizeConfig(config([' Org/Docs ', 'https://github.com/org/docs/', '', 'person/project.ui'])), config(['org/docs', 'person/project.ui']));
});
test('rejects ambiguous URLs, credentials, tokens, paths and wildcard repositories', () => {
  for (const value of ['*/*', 'org/*', 'org/repo/main', 'org/..', 'org/.', 'https://github.com.evil.test/org/docs', 'https://user:pass@github.com/org/docs', 'https://github.com/org/docs?token=private', 'https://github.com/org/docs#section', 'org/with space', '-org/docs', 'org/repo?x']) {
    assert.throws(() => normalizeConfig(config([value])), undefined, value);
  }
  assert.throws(() => normalizeConfig({ repositories: [] }));
  assert.throws(() => normalizeConfig(config([null])));
  assert.throws(() => normalizeConfig(config(Array.from({length:101},(_,i)=>`org/repo-${i}`))));
});
test('empty configuration and paused previews install no rules', () => {
  assert.deepEqual(makeRules(config([])), []);
  assert.deepEqual(makeRules({ enabled: false, repositories: ['org/docs'] }), []);
});
test('matches only the selected repository on the exact raw host, including branches and private URLs', () => {
  const [rule] = makeRules(config(['org/project.ui']));
  const regex = new RegExp(rule.condition.regexFilter, 'i');
  for (const url of ['https://raw.githubusercontent.com/org/project.ui/main/report.html', 'https://raw.githubusercontent.com/Org/Project.ui/refs/heads/feature/new/report.HTM?token=synthetic', 'https://raw.githubusercontent.com/org/project.ui/abc123/report.html']) assert.ok(regex.test(url),url);
  for (const url of ['http://raw.githubusercontent.com/org/project.ui/main/report.html','https://raw.githubusercontent.com.evil.test/org/project.ui/main/report.html','https://raw.githubusercontent.com/org/project-ui/main/report.html','https://raw.githubusercontent.com/org/project.ui-other/main/report.html','https://raw.githubusercontent.com/other/project.ui/main/report.html','https://raw.githubusercontent.com/org/project.ui/main/report.json','https://raw.githubusercontent.com/org/project.ui/main/report.html.js','https://raw.githubusercontent.com/org/project.ui/main/file.txt?filename=report.html']) assert.equal(regex.test(url),false,url);
  assert.deepEqual(rule.condition.resourceTypes,['main_frame']);
});
test('runtime permissions and policy stay local and omit content-reading capabilities', async () => {
  const manifest=JSON.parse(await readFile(new URL('../extension/manifest.json',import.meta.url)));
  assert.deepEqual(manifest.host_permissions,['https://raw.githubusercontent.com/*']);
  assert.deepEqual(manifest.permissions.sort(),['declarativeNetRequestWithHostAccess','storage'].sort());
  assert.equal(manifest.content_scripts,undefined);
  assert.equal(manifest.externally_connectable,undefined);
  const headers=makeRules(config(['org/docs']))[0].action.responseHeaders;
  const policy=headers.find(h=>h.header==='Content-Security-Policy').value;
  assert.ok(policy.includes("connect-src 'none'"));
  assert.ok(policy.includes("script-src 'none'"));
  assert.ok(policy.includes('sandbox;'));
  assert.equal(policy.includes('allow-downloads'), false);
  assert.equal(headers.find(h=>h.header==='Referrer-Policy').value,'no-referrer');
});

test('old settings migrate to scripts-off and trust is confined to configured repositories', () => {
  assert.deepEqual(normalizeConfig({ enabled: true, repositories: ['org/docs'] }), config(['org/docs']));
  const trusted = normalizeConfig({ ...config(['org/docs']), scriptRepositories: ['Org/Docs', 'org/docs'] });
  assert.deepEqual(trusted.scriptRepositories, ['org/docs']);
  for (const scriptRepositories of ['org/docs', [null], ['other/repo'], ['org/*']]) {
    assert.throws(() => normalizeConfig({ ...config(['org/docs']), scriptRepositories }));
  }
});
test('script opt-in is per repository and never enables downloads', () => {
  const rules = makeRules({ ...config(['org/docs', 'org/passive']), scriptRepositories: ['org/docs'] });
  const policies = rules.map(rule => rule.action.responseHeaders.find(header => header.header === 'Content-Security-Policy').value);
  assert.ok(policies[0].includes("sandbox allow-scripts; script-src 'unsafe-inline'"));
  assert.ok(policies[1].includes("sandbox; script-src 'none'"));
  assert.ok(policies.every(policy => !policy.includes('allow-downloads')));
});
