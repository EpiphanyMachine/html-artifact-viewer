const form = document.querySelector('#settings-form');
const enabled = document.querySelector('#enabled');
const repositories = document.querySelector('#repositories');
const status = document.querySelector('#status');
const save = document.querySelector('#save');
function announce(message, error = false) { status.textContent = message; status.dataset.error = String(error); }
function show(settings) { enabled.checked = settings.enabled; repositories.value = settings.repositories.join('\n'); }
async function request(message) {
  const response = await chrome.runtime.sendMessage(message);
  if (!response?.ok) throw new Error(response?.error || 'The extension did not respond. Reload this page and try again.');
  return response;
}
form.addEventListener('submit', async event => {
  event.preventDefault(); save.disabled = true;
  try {
    const { settings, ruleCount } = await request({ type: 'save-settings', settings: { enabled: enabled.checked, repositories: repositories.value.split(/\r?\n/) } });
    show(settings);
    announce(!settings.enabled ? 'Saved. Previews are paused.' : `Saved. ${ruleCount} ${ruleCount === 1 ? 'repository' : 'repositories'} enabled.`);
  } catch (error) { announce(error.message, true); }
  finally { save.disabled = false; }
});
save.disabled = true;
request({ type: 'read-settings' }).then(({ settings }) => {
  show(settings); announce(settings.repositories.length ? 'Your settings are loaded.' : 'Add a repository to get started.'); save.disabled = false;
}).catch(error => announce(error.message, true));
