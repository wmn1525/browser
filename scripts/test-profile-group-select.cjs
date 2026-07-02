const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const source = readFileSync(join(__dirname, '..', 'src', 'renderer', 'src', 'components', 'profiles', 'profile-form-fields.tsx'), 'utf8');

assert.equal(
  source.includes("value={initialProfile?.groupId ?? 'ungrouped'}"),
  false,
  'profile group select should not be locked by a constant value prop'
);
assert.equal(
  source.includes("defaultValue={initialProfile?.groupId ?? 'ungrouped'}"),
  true,
  'profile group select should use defaultValue so users can choose another group'
);

console.log('profile group select tests passed');
