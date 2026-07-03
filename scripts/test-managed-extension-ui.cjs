const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const root = join(__dirname, '..');
const featurePage = readFileSync(join(root, 'src/renderer/src/components/feature/feature-page.tsx'), 'utf8');
const managedPage = readFileSync(join(root, 'src/renderer/src/components/feature/managed-extensions-page.tsx'), 'utf8');
const appsTab = readFileSync(join(root, 'src/renderer/src/components/profiles/profile-apps-tab.tsx'), 'utf8');
const formDraft = readFileSync(join(root, 'src/renderer/src/components/profiles/profile-form-draft.ts'), 'utf8');

assert.match(featurePage, /ManagedExtensionsPage/);
assert.match(managedPage, /importManagedExtensionPackage/);
assert.match(managedPage, /importManagedExtensionFolder/);
assert.match(managedPage, /updateManagedExtension/);
assert.match(managedPage, /deleteManagedExtension/);
assert.match(appsTab, /disabledGlobalExtensionIds/);
assert.match(formDraft, /disabledGlobalExtensionIds/);

console.log('managed extension UI checks passed');
