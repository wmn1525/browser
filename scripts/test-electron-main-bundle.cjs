const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const mainBundle = readFileSync(join(__dirname, '..', 'out', 'main', 'main.js'), 'utf8');

assert.equal(
  mainBundle.includes('findProcess("name"'),
  false,
  'electron main bundle must not call the find-process module namespace as a function'
);

assert.equal(
  mainBundle.includes('.default("name", "firefox"'),
  true,
  'electron main bundle should call find-process default export explicitly'
);

console.log('electron main bundle import ok');
