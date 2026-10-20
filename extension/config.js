export const EMPTY_CONFIG = Object.freeze({ enabled: true, repositories: [], scriptRepositories: [] });
export const MAX_REPOSITORIES = 100;
const OWNER = /^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i;
const REPO = /^[a-z\d_.-]{1,100}$/i;

export function normalizeRepository(input) {
  let value = input.trim();
  if (value.startsWith('https://')) {
    let url;
    try { url = new URL(value); } catch { throw new Error(`Invalid repository: ${value}`); }
    if (url.hostname !== 'github.com' || url.port || url.username || url.password || url.search || url.hash) {
      throw new Error('Use owner/repository or a plain https://github.com/owner/repository URL.');
    }
    value = url.pathname.replace(/^\//, '').replace(/\/$/, '');
  }
  const parts = value.split('/');
  if (parts.length !== 2 || !OWNER.test(parts[0]) || !REPO.test(parts[1]) || ['.', '..'].includes(parts[1])) {
    throw new Error(`Invalid repository “${input}”. Use owner/repository, one per line.`);
  }
  return value.toLowerCase();
}

export function normalizeConfig(input) {
  if (!input || typeof input.enabled !== 'boolean' || !Array.isArray(input.repositories)) {
    throw new Error('Settings need an enabled flag and a repository list.');
  }
  if (input.repositories.some(item => typeof item !== 'string')) throw new Error('Repository names must be text.');
  const repositories = [...new Set(input.repositories.filter(item => item.trim()).map(normalizeRepository))];
  if (repositories.length > MAX_REPOSITORIES) throw new Error(`Add at most ${MAX_REPOSITORIES} repositories.`);
  const scriptInput = input.scriptRepositories ?? [];
  if (!Array.isArray(scriptInput) || scriptInput.some(item => typeof item !== 'string')) {
    throw new Error('Trusted script repositories must be a list of repository names.');
  }
  const scriptRepositories = [...new Set(scriptInput.map(normalizeRepository))];
  if (scriptRepositories.some(repository => !repositories.includes(repository))) {
    throw new Error('Only configured repositories can be trusted to run scripts.');
  }
  return { enabled: input.enabled, repositories, scriptRepositories };
}

function escapePattern(value) { return value.replaceAll('.', '[.]'); }

export function makeRules(input) {
  const config = normalizeConfig(input);
  if (!config.enabled) return [];
  return config.repositories.map((repository, index) => ({
    id: index + 1,
    priority: 1,
    action: {
      type: 'modifyHeaders',
      responseHeaders: [
        { header: 'Content-Type', operation: 'set', value: 'text/html; charset=utf-8' },
        { header: 'Content-Disposition', operation: 'remove' },
        { header: 'Content-Security-Policy', operation: 'set', value: `default-src 'none'; sandbox${config.scriptRepositories.includes(repository) ? ' allow-scripts' : ''}; script-src ${config.scriptRepositories.includes(repository) ? "'unsafe-inline'" : "'none'"}; style-src 'unsafe-inline'; img-src data: blob:; media-src data: blob:; font-src data: blob:; connect-src 'none'; frame-src 'none'; object-src 'none'; form-action 'none'; base-uri 'none'` },
        { header: 'Referrer-Policy', operation: 'set', value: 'no-referrer' }
      ]
    },
    condition: {
      regexFilter: '^https://raw[.]githubusercontent[.]com/' + escapePattern(repository) + '/[^?#]+[.](html|htm)([?].*)?$',
      isUrlFilterCaseSensitive: false,
      resourceTypes: ['main_frame']
    }
  }));
}
