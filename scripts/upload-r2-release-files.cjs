const { execFileSync } = require('node:child_process');
const { readdirSync } = require('node:fs');
const path = require('node:path');

// 只发布 release 顶层文件，避免把 electron-builder 的解包目录同步到 R2。
const bucket = requiredEnv('R2_BUCKET');
const endpoint = requiredEnv('R2_ENDPOINT');
const prefix = normalizePrefix(process.env.R2_PREFIX || 'publish');
const releaseDir = path.resolve('release');

const files = readdirSync(releaseDir, { withFileTypes: true })
  .filter((item) => item.isFile())
  .map((item) => item.name)
  .filter(isPublishFile)
  .sort((left, right) => left.localeCompare(right));

if (files.length === 0) {
  throw new Error('No release files found to upload.');
}

for (const fileName of files) {
  console.log(`Uploading ${fileName}`);
  const localPath = path.join(releaseDir, fileName);
  const remotePath = `s3://${bucket}/${prefix}${fileName}`;
  execFileSync('aws', [
    's3',
    'cp',
    localPath,
    remotePath,
    '--endpoint-url',
    endpoint
  ], { stdio: 'inherit' });
}

console.log(`Uploaded ${files.length} release file(s) to s3://${bucket}/${prefix}`);

// 仅发布可下载安装包和更新元数据，避免 zip 或 builder 调试文件误传。
function isPublishFile(fileName) {
  if (fileName.endsWith('.zip')) return false;
  if (fileName === 'latest.yml' || fileName === 'latest-mac.yml') return true;
  return ['.dmg', '.exe', '.blockmap'].some((suffix) => fileName.endsWith(suffix));
}

// 统一 R2 前缀格式，保证拼接对象 key 时只有一个尾随斜杠。
function normalizePrefix(value) {
  const clean = value.replace(/^\/+|\/+$/g, '');
  return clean ? `${clean}/` : '';
}

// 发布凭据必须显式配置，避免把文件上传到错误位置。
function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable ${name}.`);
  }
  return value;
}
