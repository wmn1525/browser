const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const buildMac = readText('.github/workflows/build-mac.yml');
const publishR2 = readText('.github/workflows/publish-r2.yml');
const appUpdater = readText('src/main/app-updater.ts');

assert.equal(
  buildMac.includes('releasePrefix: mac-arm64') && buildMac.includes('releasePrefix: mac-x64'),
  true,
  'Build Mac workflow must give each mac arch an isolated R2 prefix.'
);
assert.equal(
  publishR2.includes('releasePrefix: mac-arm64') && publishR2.includes('releasePrefix: mac-x64'),
  true,
  'Publish workflow must give each mac arch an isolated R2 prefix.'
);
assert.equal(
  buildMac.includes("R2_PREFIX: ${{ vars.CF_R2_PREFIX || 'publish' }}/${{ matrix.releasePrefix }}"),
  true,
  'Build Mac workflow must upload mac files below the arch prefix.'
);
assert.equal(
  publishR2.includes("R2_PREFIX: ${{ vars.CF_R2_PREFIX || 'publish' }}/${{ matrix.releasePrefix }}"),
  true,
  'Publish workflow must upload every platform to its configured prefix.'
);
assert.equal(
  appUpdater.includes("mac-${process.arch}") && appUpdater.includes('autoUpdater.setFeedURL'),
  true,
  'Mac updater feed must read latest-mac.yml from the current arch prefix.'
);

console.log('release publish config checks passed.');

function readText(filePath) {
  return readFileSync(path.join(root, filePath), 'utf8');
}
