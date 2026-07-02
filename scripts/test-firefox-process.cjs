const assert = require('node:assert/strict');

const {
  normalizeProcessPath,
  isFirefoxProfileProcess,
  findFirefoxProfileProcesses
} = require('../dist/core/firefox-process');

const profileDir = 'C:\\Users\\me\\.imrun-browser\\firefox-profiles\\abc';

assert.equal(
  normalizeProcessPath(`${profileDir}\\prefs.js`),
  'c:/users/me/.imrun-browser/firefox-profiles/abc/prefs.js'
);

assert.equal(
  isFirefoxProfileProcess({
    pid: 1,
    name: 'firefox.exe',
    cmd: `"C:\\Firefox\\firefox.exe" --profile "${profileDir}"`
  }, profileDir),
  true
);

assert.equal(
  isFirefoxProfileProcess({
    pid: 2,
    name: 'chrome.exe',
    cmd: `"C:\\Chrome\\chrome.exe" --profile "${profileDir}"`
  }, profileDir),
  false
);

assert.equal(
  isFirefoxProfileProcess({
    pid: 3,
    name: 'firefox.exe',
    cmd: '"C:\\Firefox\\firefox.exe" --profile "C:\\Users\\me\\other"'
  }, profileDir),
  false
);

findFirefoxProfileProcesses('C:\\imrun\\profile-that-should-not-exist')
  .then((processes) => {
    assert.equal(Array.isArray(processes), true);
    console.log('firefox process matcher ok');
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
