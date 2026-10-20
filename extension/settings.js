import { normalizeRepository } from './config.js';
const form = document.querySelector('#settings-form');
const enabled = document.querySelector('#enabled');
const repositories = document.querySelector('#repositories');
const scriptOptions = document.querySelector('#script-options');
const selectedScripts = () => [...scriptOptions.querySelectorAll('input:checked')].map(input => input.value);
const status = document.querySelector('#status');
const save = document.querySelector('#save');
function announce(message, error = false) { status.textContent = message; status.dataset.error = String(error); }
function renderScriptOptions(trusted) {
  const names = new Set();
  for (const line of repositories.value.split(/\r?\n/)) {
    try { names.add(normalizeRepository(line)); } catch { /* Invalid entries are reported on save. */ }
  }
  scriptOptions.replaceChildren();
  for (const repository of names) {
    const label = document.createElement('label');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox'; checkbox.value = repository; checkbox.checked = trusted.includes(repository);
    label.append(checkbox, document.createTextNode(` Allow scripts in ${repository}`));
    scriptOptions.append(label);
  }
}
function show(settings) {
  enabled.checked = settings.enabled; repositories.value = settings.repositories.join('\n');
  renderScriptOptions(settings.scriptRepositories);
}
repositories.addEventListener('input', () => renderScriptOptions(selectedScripts()));
async function request(message) {
  const response = await chrome.runtime.sendMessage(message);
  if (!response?.ok) throw new Error(response?.error || 'The extension did not respond. Reload this page and try again.');
  return response;
}
form.addEventListener('submit', async event => {
  event.preventDefault(); save.disabled = true; announce('Saving…');
  try {
    const { settings, ruleCount } = await request({ type: 'save-settings', settings: { enabled: enabled.checked, repositories: repositories.value.split(/\r?\n/), scriptRepositories: selectedScripts() } });
    show(settings);
    announce(!settings.enabled ? 'Saved. Previews are paused.' : `Saved. ${ruleCount} ${ruleCount === 1 ? 'repository' : 'repositories'} enabled.`);
  } catch (error) { announce(error.message, true); }
  finally { save.disabled = false; }
});
save.disabled = true;
request({ type: 'read-settings' }).then(({ settings }) => {
  show(settings); announce(settings.repositories.length ? 'Your settings are loaded.' : 'Add a repository to get started.'); save.disabled = false;
}).catch(error => announce(error.message, true));
