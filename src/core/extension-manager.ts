import AdmZip from 'adm-zip';
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync
} from 'node:fs';
import { basename, dirname, extname, isAbsolute, join, relative, resolve } from 'node:path';

import type { ManagedExtensionEngine, ManagedExtensionSource } from '../shared/types';

const chromiumPackageSuffixes = new Set(['.zip', '.crx']);
const firefoxPackageSuffixes = new Set(['.xpi', '.zip']);

export interface PersistExtensionRequest {
  readonly rootDir: string;
  readonly engine: ManagedExtensionEngine;
  readonly extensionId: string;
  readonly displayName: string;
}

export interface PersistUploadedExtensionRequest extends PersistExtensionRequest {
  readonly sourcePath: string;
}

export interface PersistFolderExtensionRequest extends PersistExtensionRequest {
  readonly folderPath: string;
}

export interface PersistedExtensionFiles {
  readonly name: string;
  readonly source: ManagedExtensionSource;
  readonly fileName: string;
  readonly storedPath: string;
  readonly unpackedPath?: string;
  readonly effectivePath: string;
}

interface FirefoxManifest {
  readonly browser_specific_settings?: {
    readonly gecko?: {
      readonly id?: string;
    };
  };
  readonly applications?: {
    readonly gecko?: {
      readonly id?: string;
    };
  };
}

/** 保存上传扩展包，并返回启动时真正使用的路径。 */
export function persistUploadedExtension(request: PersistUploadedExtensionRequest): PersistedExtensionFiles {
  const sourcePath = resolve(request.sourcePath);
  if (!existsSync(sourcePath)) {
    throw new Error(`扩展文件不存在: ${sourcePath}`);
  }

  const suffix = extname(sourcePath).toLowerCase();
  ensureSupportedPackage(request.engine, suffix);

  const engineDir = getExtensionDir(request.rootDir, request.engine, request.extensionId);
  rmSync(engineDir, { recursive: true, force: true });
  mkdirSync(engineDir, { recursive: true });

  const fileName = basename(sourcePath);
  const storedPath = join(engineDir, fileName);
  const raw = readSourceFile(sourcePath);
  writeFileSync(storedPath, raw);

  if (request.engine === 'chromium') {
    const unpackedPath = join(engineDir, 'unpacked');
    const zipBytes = suffix === '.crx' ? extractZipPayloadFromCrx(raw) : raw;
    safeExtractZip(zipBytes, unpackedPath);
    const effectivePath = discoverExtensionDirectoryRoot(unpackedPath);
    ensureManifest(effectivePath, 'Chrome 扩展里没有找到 manifest.json');
    return toPersisted(request.displayName, 'package', fileName, storedPath, unpackedPath, effectivePath);
  }

  const firefoxPath = suffix === '.xpi' ? storedPath : storedPath.replace(/\.[^.]+$/, '.xpi');
  if (firefoxPath !== storedPath) {
    writeFileSync(firefoxPath, raw);
    rmSync(storedPath, { force: true });
  }
  return toPersisted(request.displayName, 'package', basename(firefoxPath), firefoxPath, undefined, firefoxPath);
}

/** 导入本地扩展目录；Chromium 保留目录，Firefox 打包为 XPI。 */
export function persistExtensionFolder(request: PersistFolderExtensionRequest): PersistedExtensionFiles {
  const folderPath = resolve(request.folderPath);
  if (!existsSync(folderPath)) {
    throw new Error(`扩展文件夹不存在: ${folderPath}`);
  }
  if (!statSync(folderPath).isDirectory()) {
    throw new Error('请选择扩展文件夹，而不是文件');
  }

  const extensionRoot = discoverExtensionDirectoryRoot(folderPath);
  ensureManifest(extensionRoot, '扩展文件夹里没有找到 manifest.json');

  const engineDir = getExtensionDir(request.rootDir, request.engine, request.extensionId);
  rmSync(engineDir, { recursive: true, force: true });
  mkdirSync(engineDir, { recursive: true });

  if (request.engine === 'chromium') {
    const unpackedPath = join(engineDir, 'unpacked');
    copyDirectory(extensionRoot, unpackedPath);
    const effectivePath = discoverExtensionDirectoryRoot(unpackedPath);
    ensureManifest(effectivePath, 'Chrome 扩展文件夹里没有找到 manifest.json');
    return toPersisted(request.displayName, 'folder', basename(extensionRoot), unpackedPath, unpackedPath, effectivePath);
  }

  const fileName = `${safeFolderName(basename(extensionRoot))}.xpi`;
  const storedPath = join(engineDir, fileName);
  zipDirectory(extensionRoot, storedPath);
  return toPersisted(request.displayName, 'folder', basename(extensionRoot), storedPath, undefined, storedPath);
}

/** 从 CRX 文件中定位真正的 ZIP 内容，兼容常见 CRX 头部。 */
export function extractZipPayloadFromCrx(raw: Buffer): Buffer {
  const index = raw.indexOf(Buffer.from('PK\u0003\u0004', 'binary'));
  if (index < 0) {
    throw new Error('CRX 文件解析失败，未找到扩展内容');
  }
  return raw.subarray(index);
}

/** 安全解压 ZIP，拒绝写入目标目录之外的路径。 */
export function safeExtractZip(zipBytes: Buffer, targetDir: string): void {
  const root = resolve(targetDir);
  const zip = new AdmZip(zipBytes);
  mkdirSync(root, { recursive: true });

  for (const entry of zip.getEntries()) {
    const target = resolve(root, entry.entryName);
    ensureInsideDirectory(root, target);
    if (entry.isDirectory) {
      mkdirSync(target, { recursive: true });
      continue;
    }

    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, entry.getData());
  }
}

/** Firefox XPI 文件名优先使用 manifest 中稳定的 gecko id。 */
export function getFirefoxExtensionTargetName(extensionPath: string): string {
  const fallbackName = basename(extensionPath);
  try {
    const zip = new AdmZip(extensionPath);
    const entry = zip.getEntry('manifest.json');
    if (!entry) {
      return fallbackName;
    }

    const manifest: FirefoxManifest = JSON.parse(entry.getData().toString('utf8'));
    const addonId = manifest.browser_specific_settings?.gecko?.id ?? manifest.applications?.gecko?.id;
    return addonId?.trim() ? `${addonId.trim()}.xpi` : fallbackName;
  } catch {
    return fallbackName;
  }
}

/** 删除指定扩展的全部本地文件。 */
export function removeExtensionStorage(rootDir: string, engine: ManagedExtensionEngine, extensionId: string): void {
  rmSync(getExtensionDir(rootDir, engine, extensionId), { recursive: true, force: true });
}

/** 找到真正的扩展根目录，只有一个 manifest 子目录时自动下钻。 */
export function discoverExtensionDirectoryRoot(sourceDir: string): string {
  const manifestAtRoot = join(sourceDir, 'manifest.json');
  if (existsSync(manifestAtRoot)) {
    return sourceDir;
  }

  const manifestFiles = findManifestFiles(sourceDir);
  if (manifestFiles.length === 0) {
    return sourceDir;
  }
  if (manifestFiles.length === 1) {
    return dirname(manifestFiles[0]);
  }
  throw new Error('所选文件夹里找到多个 manifest.json，请选择具体的扩展根目录');
}

/** 复制扩展文件夹，先清理旧目录以避免残留文件混入。 */
function copyDirectory(sourceDir: string, targetDir: string): void {
  rmSync(targetDir, { recursive: true, force: true });
  cpSync(sourceDir, targetDir, { recursive: true });
}

/** 把 Firefox 扩展目录打包为 XPI。 */
function zipDirectory(sourceDir: string, targetPath: string): void {
  mkdirSync(dirname(targetPath), { recursive: true });
  const zip = new AdmZip();
  zip.addLocalFolder(sourceDir);
  zip.writeZip(targetPath);
}

/** 将目录名清理为可用文件名，避免生成空白或非法 XPI 名称。 */
function safeFolderName(value: string): string {
  const cleaned = value.replace(/[^A-Za-z0-9._-]+/g, '_').replace(/^[._-]+|[._-]+$/g, '');
  return cleaned || 'extension';
}

/** 校验导入包后缀，避免把任意文件当作扩展处理。 */
function ensureSupportedPackage(engine: ManagedExtensionEngine, suffix: string): void {
  if (engine === 'chromium' && !chromiumPackageSuffixes.has(suffix)) {
    throw new Error('Chrome 扩展只支持 zip 或 crx 文件');
  }
  if (engine === 'firefox' && !firefoxPackageSuffixes.has(suffix)) {
    throw new Error('Firefox 扩展只支持 xpi 或 zip 文件');
  }
}

/** manifest.json 是本地扩展目录能被浏览器识别的最低要求。 */
function ensureManifest(extensionRoot: string, message: string): void {
  if (!existsSync(join(extensionRoot, 'manifest.json'))) {
    throw new Error(message);
  }
}

/** 扩展目录按 engine 和 id 分组，删除时可以精准定位。 */
function getExtensionDir(rootDir: string, engine: ManagedExtensionEngine, extensionId: string): string {
  return join(resolve(rootDir), engine, extensionId);
}

/** 读取扩展包文件，独立函数方便统一错误位置。 */
function readSourceFile(sourcePath: string): Buffer {
  return readFileSync(sourcePath);
}

/** 统一生成持久化结果，显示名为空时回落到文件名。 */
function toPersisted(
  displayName: string,
  source: ManagedExtensionSource,
  fileName: string,
  storedPath: string,
  unpackedPath: string | undefined,
  effectivePath: string
): PersistedExtensionFiles {
  return {
    name: displayName.trim() || basename(fileName, extname(fileName)),
    source,
    fileName,
    storedPath,
    unpackedPath,
    effectivePath
  };
}

/** 检查 ZIP entry 解压目标仍位于目标目录内。 */
function ensureInsideDirectory(root: string, target: string): void {
  const next = relative(root, target);
  if (next.startsWith('..') || isAbsolute(next)) {
    throw new Error('扩展文件路径非法');
  }
}

/** 递归搜索 manifest.json，用于定位用户选中的扩展根目录。 */
function findManifestFiles(sourceDir: string): readonly string[] {
  const results: string[] = [];
  for (const name of readdirSync(sourceDir)) {
    const path = join(sourceDir, name);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      results.push(...findManifestFiles(path));
      continue;
    }
    if (name === 'manifest.json') {
      results.push(path);
    }
  }
  return results;
}
