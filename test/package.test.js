import test from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('release ZIP includes notices, excludes unlisted files, and rejects symlink inputs', async () => {
  const root = await mkdtemp(join(tmpdir(), 'viewer-package-'));
  try {
    for (const name of ['extension', 'scripts', 'LICENSE', 'PRIVACY.md']) {
      await cp(new URL(`../${name}`, import.meta.url), join(root, name), { recursive: true });
    }
    await writeFile(join(root, 'extension', '.env'), 'SYNTHETIC_SECRET=do-not-package');
    await mkdir(join(root, 'extension', 'scratch'));
    await writeFile(join(root, 'extension', 'scratch', 'notes.txt'), 'Private draft');
    const build = () => execFileSync('python3', [join(root, 'scripts', 'package.py')], { encoding: 'utf8', stdio: 'pipe' }).trim();
    const archive = build();
    const files = JSON.parse(execFileSync('python3', ['-c',
      'import json,sys,zipfile; z=zipfile.ZipFile(sys.argv[1]); print(json.dumps({name:z.read(name).decode() for name in z.namelist() if not name.endswith(".png")}))',
      archive], { encoding: 'utf8' }));
    assert.deepEqual(Object.keys(files).sort(), ['LICENSE', 'PRIVACY.md', 'config.js', 'manifest.json', 'settings.css', 'settings.html', 'settings.js', 'worker.js'].sort());
    assert.equal(files.LICENSE, await readFile(new URL('../LICENSE', import.meta.url), 'utf8'));
    assert.equal(files['PRIVACY.md'], await readFile(new URL('../PRIVACY.md', import.meta.url), 'utf8'));
    await rm(join(root, 'extension', 'settings.js'));
    await symlink(join(root, 'extension', '.env'), join(root, 'extension', 'settings.js'));
    assert.throws(build, /must not traverse symlinks/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
