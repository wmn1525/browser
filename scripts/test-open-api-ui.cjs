const assert = require('node:assert/strict');
const { existsSync, readFileSync } = require('node:fs');
const { join } = require('node:path');

const root = join(__dirname, '..');
const featurePage = readFileSync(join(root, 'src/renderer/src/components/feature/feature-page.tsx'), 'utf8');
const automationPage = readFileSync(join(root, 'src/renderer/src/components/feature/automation-page.tsx'), 'utf8');
const app = readFileSync(join(root, 'src/renderer/src/App.tsx'), 'utf8');
const types = readFileSync(join(root, 'src/shared/types.ts'), 'utf8');
const preload = readFileSync(join(root, 'src/preload/preload.ts'), 'utf8');
const settingsStore = readFileSync(join(root, 'src/main/open-api-settings-store.ts'), 'utf8');
const pagePath = join(root, 'src/renderer/src/components/feature/open-api-page.tsx');

assert.ok(existsSync(pagePath), 'open api page should exist');
const openApiPage = readFileSync(pagePath, 'utf8');

assert.match(featurePage, /AutomationPage/);
assert.match(automationPage, /OpenApiPage/);
assert.match(automationPage, /API&MCP/);
assert.match(types, /OpenApiInfo/);
assert.match(types, /startOpenApiServer/);
assert.match(preload, /open-api:info/);
assert.match(openApiPage, /getOpenApiInfo/);
assert.match(openApiPage, /regenerateOpenApiKey/);
assert.match(openApiPage, /\/profiles\/PROFILE_ID\/start/);
assert.match(openApiPage, /20081/);
assert.match(settingsStore, /port: 20081/);
assert.doesNotMatch(app, /<Pagination count=\{0\}/);

console.log('open api UI checks passed');
