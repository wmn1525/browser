const assert = require('node:assert/strict');
const { existsSync, readFileSync } = require('node:fs');
const { join } = require('node:path');
const { Module } = require('node:module');
const ts = require('typescript');

const root = join(__dirname, '..');

function readProjectFile(relativePath) {
  const absolutePath = join(root, relativePath);
  assert.ok(existsSync(absolutePath), `${relativePath} should exist`);
  return readFileSync(absolutePath, 'utf8');
}

function loadTsModule(relativePath) {
  const sourcePath = join(root, relativePath);
  const source = readProjectFile(relativePath);
  const output = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022
    }
  }).outputText;
  const testModule = new Module(sourcePath, module);
  testModule.filename = sourcePath;
  testModule.paths = Module._nodeModulePaths(root);
  testModule._compile(output, sourcePath);
  return testModule.exports;
}

const featurePage = readProjectFile('src/renderer/src/components/feature/feature-page.tsx');
const automationPage = readProjectFile('src/renderer/src/components/feature/automation-page.tsx');
const sidebar = readProjectFile('src/renderer/src/components/layout/sidebar.tsx');
const openApiPage = readProjectFile('src/renderer/src/components/feature/open-api-page.tsx');
const windowSyncPage = readProjectFile('src/renderer/src/components/feature/window-sync-page.tsx');
const sharedTypes = readProjectFile('src/shared/types.ts');
const windowSyncTypes = readProjectFile('src/shared/window-sync-types.ts');
const preload = readProjectFile('src/preload/preload.ts');
const ipc = readProjectFile('src/main/ipc.ts');

assert.match(featurePage, /AutomationPage/);
assert.match(featurePage, /automation-api-mcp/);
assert.match(featurePage, /automation-window-sync/);
assert.match(sidebar, /automationChildren/);
assert.match(sidebar, /automation-api-mcp/);
assert.match(sidebar, /automation-window-sync/);
assert.match(sidebar, /API&MCP/);
assert.match(sidebar, /窗口同步/);
assert.match(automationPage, /activeTab/);
assert.match(automationPage, /OpenApiPage/);
assert.match(automationPage, /WindowSyncPage/);
assert.doesNotMatch(automationPage, /Segmented/);

assert.match(openApiPage, /copyDocumentation/);
assert.match(openApiPage, /buildOpenApiDocumentation/);
assert.match(openApiPage, /flex-col/);
assert.match(openApiPage, /rounded-xl/);
assert.match(openApiPage, /QuickCall/);
assert.doesNotMatch(openApiPage, /md:grid-cols-3/);
assert.doesNotMatch(openApiPage, /lg:grid-cols-2/);
assert.ok(openApiPage.indexOf('QuickCall') < openApiPage.indexOf('API 文档'), 'quick calls should render above API docs');
assert.doesNotMatch(openApiPage, /lg:grid-cols-3/);
assert.doesNotMatch(openApiPage, /lg:col-span-2/);
assert.doesNotMatch(openApiPage, /xl:grid-cols-2/);
assert.doesNotMatch(openApiPage, /w-\[380px\]/);

const docsModule = loadTsModule('src/renderer/src/components/feature/open-api-docs.ts');
const documentText = docsModule.buildOpenApiDocumentation('http://127.0.0.1:20081/open-api', 'secret-key');
assert.match(documentText, /# API&MCP/);
assert.match(documentText, /MCP/);
assert.match(documentText, /X-API-Key/);
assert.match(documentText, /\/profiles\/\{profile_id\}\/start/);
assert.match(documentText, /wsEndpoint/);

assert.match(windowSyncPage, /WindowSyncPage/);
assert.match(windowSyncPage, /运行中的窗口/);
assert.match(windowSyncPage, /startWindowSync/);
assert.match(windowSyncPage, /syncNavigation/);
assert.match(windowSyncPage, /主控/);

assert.match(windowSyncTypes, /WindowSyncProfile/);
assert.match(windowSyncTypes, /WindowSyncSession/);
assert.match(sharedTypes, /startWindowSync/);
assert.match(preload, /window-sync:start/);
assert.match(ipc, /window-sync:start/);

console.log('automation subpage UI checks passed');
