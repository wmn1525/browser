const assert = require('node:assert/strict');
const { rm } = require('node:fs/promises');
const { homedir } = require('node:os');
const { join } = require('node:path');

const { FirefoxProfileLauncher } = require('../dist/core/firefox-profile-launcher');
const { findFirefoxProfileProcesses } = require('../dist/core/firefox-process');

const executablePath = process.env.FIREFOX_PATH || join(
  homedir(),
  '.imrun-browser',
  'kernels',
  'firefox-140-esr',
  'core',
  'firefox.exe'
);
const profileId = `codex-close-test-${Date.now()}`;
const profileDir = join(homedir(), '.imrun-browser', 'firefox-profiles', profileId);
const launcher = new FirefoxProfileLauncher();

async function waitUntil(getValue, predicate, timeoutMs) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const value = await getValue();
    if (predicate(value)) {
      return value;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return getValue();
}

async function main() {
  let exited = false;
  await launcher.launch({
    id: profileId,
    startUrls: ['about:blank']
  }, executablePath, () => {
    exited = true;
  });

  const running = await waitUntil(
    () => findFirefoxProfileProcesses(profileDir),
    (processes) => processes.length > 0,
    10000
  );
  assert.ok(running.length > 0, 'Firefox process should be detected before close');

  await launcher.close(profileId);

  const remaining = await waitUntil(
    () => findFirefoxProfileProcesses(profileDir),
    (processes) => processes.length === 0,
    10000
  );
  assert.equal(remaining.length, 0, 'Firefox process should be gone after close');
  assert.equal(exited, true, 'close should notify launcher exit');
  await rm(profileDir, { recursive: true, force: true });
  console.log('firefox launch close ok');
}

main().catch(async (error) => {
  console.error(error);
  await launcher.close(profileId).catch(() => undefined);
  await rm(profileDir, { recursive: true, force: true }).catch(() => undefined);
  process.exit(1);
});
