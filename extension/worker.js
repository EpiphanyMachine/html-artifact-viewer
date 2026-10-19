import { EMPTY_CONFIG, normalizeConfig, makeRules } from './config.js';

async function readSettings() {
  const { settings } = await chrome.storage.local.get('settings');
  return settings ? normalizeConfig(settings) : { ...EMPTY_CONFIG, repositories: [] };
}

async function applySettings(input) {
  const settings = normalizeConfig(input);
  const before = await chrome.declarativeNetRequest.getDynamicRules();
  const rules = makeRules(settings);
  await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: before.map(rule => rule.id), addRules: rules });
  try {
    await chrome.storage.local.set({ settings });
  } catch (error) {
    await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: rules.map(rule => rule.id), addRules: before });
    throw error;
  }
  return { settings, ruleCount: rules.length };
}

// Serialize changes so simultaneous settings tabs cannot leave rules and storage out of sync.
let updates = Promise.resolve();
function save(input) {
  const result = updates.then(() => applySettings(input));
  updates = result.catch(() => {});
  return result;
}

chrome.runtime.onInstalled.addListener(({ reason }) => {
  readSettings().then(save).then(() => {
    if (reason === 'install') return chrome.runtime.openOptionsPage();
  }).catch(error => console.error('Could not initialize viewer settings:', error.message));
});

chrome.action.onClicked.addListener(() => { chrome.runtime.openOptionsPage(); });

chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (sender.id !== chrome.runtime.id) return false;
  const task = message?.type === 'read-settings' ? readSettings().then(settings => ({ settings }))
    : message?.type === 'save-settings' ? save(message.settings) : null;
  if (!task) return false;
  task.then(result => respond({ ok: true, ...result }), error => respond({ ok: false, error: error.message }));
  return true;
});
