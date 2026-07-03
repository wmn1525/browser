const { execFileSync } = require('node:child_process');
const { rmSync, writeFileSync } = require('node:fs');
const path = require('node:path');

// 清理 R2 发布目录：保留最近版本安装包，删除旧版本文件和误传的解包目录。
const bucket = requiredEnv('R2_BUCKET');
const endpoint = requiredEnv('R2_ENDPOINT');
const prefix = normalizePrefix(process.env.R2_PREFIX || 'publish');
const keepCount = Number.parseInt(process.env.R2_KEEP_RELEASES || '5', 10);

if (!Number.isInteger(keepCount) || keepCount < 1) {
  throw new Error('R2_KEEP_RELEASES must be a positive integer.');
}

const objects = listObjects();
const versions = collectVersions(objects);
const retainedVersions = new Set([...versions].sort(compareVersions).reverse().slice(0, keepCount));
const deleteKeys = objects
  .map((item) => item.Key)
  .filter((key) => key && shouldDeleteKey(key, retainedVersions));

if (deleteKeys.length === 0) {
  console.log(`R2 cleanup skipped. Retained versions: ${[...retainedVersions].join(', ') || '-'}`);
  process.exit(0);
}

let deletePayloadIndex = 0;
for (const keys of chunk(deleteKeys, 1000)) {
  const payloadFile = `.r2-delete-objects-${process.pid}-${deletePayloadIndex}.json`;
  deletePayloadIndex += 1;
  writeFileSync(payloadFile, JSON.stringify({ Objects: keys.map((Key) => ({ Key })) }));

  try {
    execFileSync('aws', [
      's3api',
      'delete-objects',
      '--bucket',
      bucket,
      '--endpoint-url',
      endpoint,
      '--delete',
      `file://${payloadFile}`
    ], { stdio: 'inherit' });
  } finally {
    rmSync(payloadFile, { force: true });
  }
}

console.log(`R2 cleanup deleted ${deleteKeys.length} object(s). Retained versions: ${[...retainedVersions].join(', ') || '-'}`);

function listObjects() {
  const output = execFileSync('aws', [
    's3api',
    'list-objects-v2',
    '--bucket',
    bucket,
    '--prefix',
    prefix,
    '--endpoint-url',
    endpoint,
    '--output',
    'json'
  ], { encoding: 'utf8' });
  const data = JSON.parse(output);
  return Array.isArray(data.Contents) ? data.Contents : [];
}

function collectVersions(objects) {
  const versions = new Set();
  for (const item of objects) {
    const version = getVersionFromKey(item.Key || '');
    if (version) versions.add(version);
  }
  return versions;
}

function shouldDeleteKey(key, retainedVersions) {
  // 解包目录是 electron-builder 的中间产物，不作为下载或更新文件发布。
  if (key.startsWith(`${prefix}win-unpacked/`) || isUnpackedMacAppKey(key)) {
    return true;
  }

  const version = getVersionFromKey(key);
  return Boolean(version && !retainedVersions.has(version));
}

function getVersionFromKey(key) {
  let fileName = path.posix.basename(key);
  while (/\.(?:blockmap|dmg|exe|zip|yml)$/.test(fileName)) {
    fileName = fileName.replace(/\.(?:blockmap|dmg|exe|zip|yml)$/, '');
  }
  const versionStem = fileName.replace(/-(?:arm64|x64)$/, '');
  return versionStem.match(/\b\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/)?.[0];
}

function isUnpackedMacAppKey(key) {
  const relativeKey = key.startsWith(prefix) ? key.slice(prefix.length) : key;
  return /^[^/]+\.app\//.test(relativeKey) || /^mac-(?:arm64|x64)\/[^/]+\.app\//.test(relativeKey);
}

function compareVersions(left, right) {
  const leftParts = parseVersion(left);
  const rightParts = parseVersion(right);
  for (let index = 0; index < 3; index += 1) {
    if (leftParts.numbers[index] !== rightParts.numbers[index]) {
      return leftParts.numbers[index] - rightParts.numbers[index];
    }
  }

  if (leftParts.suffix === rightParts.suffix) return 0;
  if (!leftParts.suffix) return 1;
  if (!rightParts.suffix) return -1;
  return leftParts.suffix.localeCompare(rightParts.suffix);
}

function parseVersion(version) {
  const [numbers, suffix = ''] = version.split('-', 2);
  return {
    numbers: numbers.split('.').map((part) => Number.parseInt(part, 10)),
    suffix
  };
}

function chunk(items, size) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function normalizePrefix(value) {
  const clean = value.replace(/^\/+|\/+$/g, '');
  return clean ? `${clean}/` : '';
}

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable ${name}.`);
  }
  return value;
}
